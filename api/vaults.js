import { MongoClient } from "mongodb";
import { applyVaultOverrides as applyCuratorOverride } from "./_vault-overrides.js";
import { getDisabledVaultIds, getVaultAdminFlags } from "./_admin-state.js";

let cachedClient = null;

async function getDb() {
  if (cachedClient) return cachedClient.db("yieldo_v1");
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  cachedClient = client;
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
      db.collection("vaults").find({}).toArray(),
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

    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");
    res.status(200).json(data);
  } catch (err) {
    console.error("Error fetching vaults:", err);
    res.status(500).json({ error: "Failed to fetch vaults" });
  }
}
