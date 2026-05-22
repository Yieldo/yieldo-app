// Internal API: GET /api/internal/vaults
//
// Read-only export of the scored-vault list for the agency's Reply Guy
// pipeline. Auth via shared bearer token in `YIELDO_INTERNAL_TOKEN` env var.
//
// Contract: see 2026-05-22 Eddy handoff spec. Stable fields are slug, name,
// aliases, score, trust_flags, score_changed_at. Optional fields are
// ticker and category.

import { MongoClient } from "mongodb";

const ALLOWED_METHODS = "GET, HEAD, OPTIONS";

let cachedClient = null;
async function getDb() {
  if (cachedClient) return cachedClient.db("yieldo_v1");
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  cachedClient = client;
  return client.db("yieldo_v1");
}


// Try to derive a coarse category from the vault's asset. Agency uses this
// for analytics only — no behavioural gating — so being conservative is fine
// (null for anything we don't recognise).
function deriveCategory(asset, protocol) {
  const a = String(asset || "").toLowerCase();
  if (!a) return null;
  const stables = new Set([
    "usdc", "usdt", "dai", "usds", "pyusd", "ausd", "susd", "usdtb",
    "usdc.e", "wxdai", "xdai", "eurc", "eure", "eurcv", "gho", "nusd",
    "usde", "usr",
  ]);
  const ethLikes = new Set(["weth", "eth", "wsteth", "weeth", "reth", "cbeth", "lsteth", "rseth", "behype"]);
  const btcLikes = new Set(["wbtc", "cbbtc", "lbtc", "ubtc"]);
  if (stables.has(a)) return "stable_lending";
  if (ethLikes.has(a)) return "eth_yield";
  if (btcLikes.has(a)) return "btc_yield";
  if (a === "whype" || a === "hype") return "hype_staking";
  if (a === "gno") return "governance_lending";
  if (a === "sdai") return "stable_lending";
  return null;
}


// Aliases helper. The agency scanner searches X for terms users might post
// to refer to a vault — be generous, no harm in extra coverage. Skip the
// canonical name itself (that's already in `name`).
function buildAliases(name, asset, curator, protocol) {
  const out = new Set();
  const add = (s) => {
    if (!s) return;
    const t = String(s).trim();
    if (!t) return;
    out.add(t);
  };
  const rawName = String(name || "").trim();
  if (!rawName) return [];

  // Lowercase form
  const lc = rawName.toLowerCase();
  add(lc);

  // Without the asset suffix (e.g. "Steakhouse Prime USDC" → "Steakhouse Prime")
  if (asset) {
    const a = String(asset).toLowerCase();
    const stripped = lc.replace(new RegExp(`\\s+${a.replace(/\./g, "\\.")}\\s*$`), "").trim();
    if (stripped && stripped !== lc) add(stripped);
  }

  // Without common filler words
  const filler = new Set(["vault", "fund", "the", "a", "an", "of", "and", "yield", "savings"]);
  const tokens = lc.split(/\s+/);
  const lean = tokens.filter(t => !filler.has(t)).join(" ");
  if (lean && lean !== lc) add(lean);

  // Just the curator name (often how people on X refer to the vault) +
  // curator + asset combo when the name doesn't include it.
  if (curator) {
    add(String(curator).toLowerCase());
    if (asset) add(`${String(curator).toLowerCase()} ${String(asset).toLowerCase()}`);
  }

  // Protocol + asset (e.g. "morpho usdc")
  if (protocol && asset) {
    add(`${String(protocol).toLowerCase()} ${String(asset).toLowerCase()}`);
  }

  // First two tokens (often "Curator Series")
  if (tokens.length >= 2) add(tokens.slice(0, 2).join(" "));

  // Remove canonical and lowercase canonical; agency already has `name`.
  out.delete(rawName);
  out.delete(lc);
  return Array.from(out);
}


// Trust flags: project the indexer's `active_flags` field into a flat
// array of string tokens. We expose flag rule_id codes (e.g. "C08_low_dep",
// "R09_top1_high") + their severity prefixed for clarity. Agency treats
// these as opaque strings; consistency over time is the contract, not the
// vocabulary.
function buildTrustFlags(activeFlags) {
  if (!Array.isArray(activeFlags) || activeFlags.length === 0) return [];
  const out = [];
  for (const f of activeFlags) {
    if (!f || typeof f !== "object") continue;
    const code = f.rule_id || f.code || f.label;
    if (!code) continue;
    const sev = (f.severity || "info").toLowerCase();
    // Only escalate to the agency's PARTNER-tier gate when we mean it.
    if (sev === "critical" || sev === "warning") {
      out.push(String(code));
    }
  }
  return out;
}


// score_changed_at: one aggregation query that returns a Map of
// vault_id → ISO timestamp at which the current score first took its
// present value. Bounded to 7d lookback because:
//   1. Agency only uses this to surface "biggest movers in last 24h" —
//      anything older than that isn't a mover anyway.
//   2. 100 vaults × 168 hourly snapshots = ~17K docs in ONE round trip,
//      vs. 100 separate cursors in the per-vault version that was hitting
//      10s wall-clock.
// Vaults whose score is unchanged across the full 7d window come back as
// null — correct behaviour (they're not movers).
async function buildScoreChangedMap(db) {
  const cutoff = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const result = new Map();
  try {
    const histories = await db.collection("score_snapshots").aggregate([
      { $match: { ts: { $gte: cutoff } } },
      { $sort: { ts: -1 } },
      {
        $group: {
          _id: "$vault_id",
          scores: { $push: { ts: "$ts", score: "$yieldo_score" } },
        },
      },
    ], { allowDiskUse: true }).toArray();

    for (const h of histories) {
      const scores = h.scores;
      if (!Array.isArray(scores) || scores.length === 0) continue;
      // scores[0] is the most recent (we sorted desc above).
      const currentRaw = scores[0].score;
      if (currentRaw == null) continue;
      const current = Math.round(Number(currentRaw));
      let lastSeenAtCurrent = scores[0].ts;
      for (let i = 1; i < scores.length; i++) {
        const s = scores[i].score;
        if (s == null) continue;
        const rounded = Math.round(Number(s));
        if (rounded === current) {
          lastSeenAtCurrent = scores[i].ts;
          continue;
        }
        // First older snapshot with a DIFFERENT score = boundary. The
        // current score took effect at lastSeenAtCurrent's ts.
        result.set(h._id, new Date(lastSeenAtCurrent).toISOString());
        break;
      }
      // No break = score unchanged across entire window. Leave the
      // vault out of the map; caller emits null.
    }
  } catch (e) {
    // On any failure, return empty map — endpoint still returns vault
    // data, just with null score_changed_at for all entries.
  }
  return result;
}


function isValidBearer(req) {
  const expected = process.env.YIELDO_INTERNAL_TOKEN;
  if (!expected) return false; // env not set → reject all requests
  const header = req.headers.authorization || req.headers.Authorization || "";
  if (!header.startsWith("Bearer ")) return false;
  const token = header.slice("Bearer ".length).trim();
  // Constant-time comparison to avoid timing attacks. Length-mismatch
  // returns false fast; same-length runs char-by-char XOR.
  if (token.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < token.length; i++) {
    mismatch |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}


export default async function handler(req, res) {
  res.setHeader("Allow", ALLOWED_METHODS);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET" && req.method !== "HEAD") {
    return res.status(405).json({ error: "method_not_allowed" });
  }
  if (!isValidBearer(req)) {
    return res.status(401).json({ error: "unauthorized" });
  }

  try {
    const db = await getDb();

    // Three independent reads run in parallel: the vault list, admin
    // state (so we drop Listed=off), and the score-change boundary map.
    // Pre-computing the map in one aggregation is what brought the wall-
    // clock from ~10s (100 per-vault cursors) down to <2s.
    const [entries, adminStates, scoreChangedMap] = await Promise.all([
      db.collection("vaults").find({}).toArray(),
      db.collection("vault_admin_state")
        .find({}, { projection: { _id: 1, listed: 1 } })
        .toArray()
        .catch(() => []),
      buildScoreChangedMap(db),
    ]);

    const listedOff = new Set(
      adminStates.filter(a => a.listed === false).map(a => a._id)
    );

    const visible = entries.filter(e => !listedOff.has(e._id));

    const rows = visible.map((e) => {
      const metrics = e.metrics || {};
      const yieldoScoreMetric = metrics.yieldo_score;
      const yieldoScore = yieldoScoreMetric && typeof yieldoScoreMetric === "object"
        ? yieldoScoreMetric.value
        : yieldoScoreMetric;
      const score = yieldoScore != null && Number.isFinite(Number(yieldoScore))
        ? Math.max(0, Math.min(100, Math.round(Number(yieldoScore))))
        : null;

      const activeFlags = e.active_flags || metrics.active_flags || [];
      const curator = e.curator || e.curator_name || null;
      const asset = (e.asset || "").toLowerCase();
      const protocol = e.source || e.protocol || null;

      return {
        // Slug matches our /vault/:id URL routing (chain_id:address form).
        // We also support /vaults/:slug (plural) via vercel.json redirect
        // so the spec's URL shape works.
        slug: e._id,
        name: e.name || e._id,
        aliases: buildAliases(e.name, asset, curator, protocol),
        ticker: null, // not tracked in indexer today; surface null
        score,
        trust_flags: buildTrustFlags(activeFlags),
        category: deriveCategory(asset, protocol),
        score_changed_at: scoreChangedMap.get(e._id) || null,
      };
    });

    // Stable ordering: highest score first, ties alphabetical.
    rows.sort((a, b) => {
      const sa = a.score == null ? -1 : a.score;
      const sb = b.score == null ? -1 : b.score;
      if (sb !== sa) return sb - sa;
      return String(a.name).localeCompare(String(b.name));
    });

    const body = {
      as_of: new Date().toISOString(),
      vaults: rows,
    };

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    // Honour the spec's "5-15 min cache is fine" — agency polls hourly.
    // Edge-cache 5 min; revalidate at hour boundaries when polled.
    res.setHeader("Cache-Control", "private, max-age=0, s-maxage=300, stale-while-revalidate=900");
    if (req.method === "HEAD") return res.status(200).end();
    return res.status(200).json(body);
  } catch (err) {
    console.error("internal/vaults failed", err);
    return res.status(500).json({ error: "internal_error" });
  }
}
