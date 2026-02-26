import { MongoClient } from "mongodb";

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
    const cursor = db.collection("vaults").find({});
    const entries = await cursor.toArray();
    const data = entries.map((entry) => {
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
      return row;
    });
    // attach lightweight TVL sparkline (last 14 snapshots per vault)
    const vaultIds = data.map((d) => d.vault_id);
    const regexOr = vaultIds.map((id) => new RegExp("^" + id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$", "i"));
    const sparkSnaps = await db
      .collection("snapshots")
      .find({ vault_id: { $in: regexOr } })
      .sort({ date: 1 })
      .project({ vault_id: 1, total_assets_usd: 1, date: 1, _id: 0 })
      .toArray();
    const idLower = {};
    for (const d of data) idLower[d.vault_id.toLowerCase()] = d.vault_id;
    const sparkMap = {};
    for (const s of sparkSnaps) {
      const key = idLower[s.vault_id.toLowerCase()] || s.vault_id;
      if (!sparkMap[key]) sparkMap[key] = [];
      sparkMap[key].push(s.total_assets_usd || 0);
    }
    for (const d of data) {
      const arr = sparkMap[d.vault_id] || [];
      d.tvl_spark = arr.slice(-14);
    }

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    res.status(200).json(data);
  } catch (err) {
    console.error("Error fetching vaults:", err);
    res.status(500).json({ error: "Failed to fetch vaults" });
  }
}
