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
    const { vaultId } = req.query;
    const db = await getDb();
    const entry = await db.collection("vaults").findOne({ _id: vaultId });
    if (!entry) return res.status(404).json({ error: "Vault not found" });

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

    const snapshots = await db
      .collection("snapshots")
      .find({ vault_id: { $regex: new RegExp("^" + vaultId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$", "i") } })
      .sort({ date: 1 })
      .toArray();

    row.snapshots = snapshots.map((s) => ({
      date: s.date,
      net_apy: s.net_apy,
      nav: s.nav,
      total_assets_usd: s.total_assets_usd,
      total_assets_native: s.total_assets_native,
    }));

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    res.status(200).json(row);
  } catch (err) {
    console.error("Error fetching vault:", err);
    res.status(500).json({ error: "Failed to fetch vault" });
  }
}
