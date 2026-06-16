import { MongoClient } from "mongodb";
import { applyVaultOverrides as applyCuratorOverride } from "./_vault-overrides.js";
import { getDisabledVaultIds, getVaultAdminFlags } from "./_admin-state.js";

// Cache the *connection promise* (not just the client) at module scope so warm
// invocations reuse one connection and concurrent cold requests don't each open
// their own. A bounded pool + short server-selection timeout keeps cold connects
// from hanging on the default 30s when a replica member is slow.
let clientPromise = null;
function getClient() {
  if (!clientPromise) {
    const client = new MongoClient(process.env.MONGO_URI, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 8000,
    });
    clientPromise = client.connect().catch((e) => { clientPromise = null; throw e; });
  }
  return clientPromise;
}

async function getDb() {
  const client = await getClient();
  return client.db("yieldo_v1");
}

export default async function handler(req, res) {
  try {
    const db = await getDb();

    // Fetch vaults, sparklines, and admin state (disabled set + per-vault
    // flags) in parallel. Disabled set hides Listed=off vaults entirely.
    // Per-vault flags surface deposits/withdrawals toggles to the FE so it
    // can grey out the right buttons when admin disabled them.
    const [entries, sparkResults, disabled, adminFlags] = await Promise.all([
      // List view only needs overview + scoring/filter fields — exclude the
      // bulky detail-only metrics (flow_history is ~1.4KB/vault alone). The
      // detail page fetches the full doc via /api/vaults/[vaultId].
      db.collection("vaults").find({}, {
        projection: {
          "metrics.flow_history": 0,
          "metrics.perf_detail": 0,
          "metrics.vaultsfyi_score": 0,
          "metrics._component_counts": 0,
        },
      }).toArray(),
      db.collection("snapshots").aggregate([
        { $sort: { vault_id: 1, date: -1 } },
        { $group: { _id: "$vault_id", snaps: { $push: "$total_assets_usd" } } },
        { $project: { _id: 1, snaps: { $slice: ["$snaps", 14] } } },
      ]).toArray(),
      getDisabledVaultIds(),
      getVaultAdminFlags(),
    ]);

    // Build sparkline map (reverse since we sorted desc)
    const sparkMap = {};
    for (const s of sparkResults) {
      sparkMap[s._id] = (s.snaps || []).reverse();
    }

    const visible = disabled.size > 0
      ? entries.filter(e => !disabled.has(e._id))
      : entries;

    const data = visible.map((entry) => {
      const metrics = entry.metrics || {};
      const row = {
        vault_id: entry._id,
        vault_address: entry.address || entry._id,
        chain_id: entry.chain_id || 1,
        asset: entry.asset || "usdc",
        timestamp: entry.updated_at
          ? new Date(entry.updated_at).toISOString()
          : null,
        vault_name: entry.name || (entry._id || "").slice(0, 12) + "...",
        source: entry.source || null,
        tvl_spark: sparkMap[entry._id] || [],
      };
      for (const [key, metric_data] of Object.entries(metrics)) {
        if (metric_data && typeof metric_data === "object" && "value" in metric_data) {
          let val = metric_data.value;
          if (typeof val === "number" && !Number.isInteger(val)) {
            val = Math.round(val * 10000) / 10000;
          }
          row[key] = val;
        } else {
          row[key] = metric_data;
        }
      }
      // Inline admin-toggle flags so the FE can grey out Deposit/Withdraw
      // buttons consistently with the admin console. Vaults without an
      // admin_state row default to fully enabled (no entry → no override).
      const flags = adminFlags.get(entry._id) || null;
      row.deposits_enabled    = flags ? flags.deposits_enabled : true;
      row.withdrawals_enabled = flags ? flags.withdrawals_enabled : true;
      return applyCuratorOverride(row);
    });

    // Keep this in lock-step with the detail endpoint (/api/vaults/[vaultId].js,
    // s-maxage=30, swr=60). They MUST use the same freshness window or the same
    // vault shows different scores on the list-fed pages (home, /vaultscoring)
    // vs the detail-fed /vault page. The old 24h stale-while-revalidate let the
    // list serve scores up to a DAY old while detail was ~live — that was the
    // home/scoring vs detail score-mismatch. A cron (vercel.json) + the module-
    // scoped connection keep this warm, so a 30s window doesn't cold-start.
    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");
    res.status(200).json(data);
  } catch (err) {
    console.error("Error fetching vaults:", err);
    res.status(500).json({ error: "Failed to fetch vaults" });
  }
}
