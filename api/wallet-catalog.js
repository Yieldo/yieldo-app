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
    const entries = await db.collection("vaults").find({}).toArray();

    const data = entries.map((entry) => {
      const m = entry.metrics || {};
      const val = (key) => {
        const d = m[key];
        if (d && typeof d === "object" && "value" in d) return d.value;
        return d ?? null;
      };
      return {
        vault_id: entry._id,
        vault_name: entry.name || (entry._id || "").slice(0, 12) + "...",
        vault_address: entry.address || entry._id,
        chain_id: entry.chain_id || 1,
        asset: entry.asset || "usdc",
        source: entry.source || null,
        apy_7d: val("P01_APIN_7D"),
        apy_30d: val("P01_APIN_30D"),
        tvl_usd: val("C01_USD"),
      };
    });

    // Optional filters
    let filtered = data;
    const { chain_id, asset, sort } = req.query;
    if (chain_id) filtered = filtered.filter(v => v.chain_id === Number(chain_id));
    if (asset) filtered = filtered.filter(v => v.asset.toLowerCase() === asset.toLowerCase());
    if (sort === "apy") filtered.sort((a, b) => (b.apy_7d || 0) - (a.apy_7d || 0));
    if (sort === "tvl") filtered.sort((a, b) => (b.tvl_usd || 0) - (a.tvl_usd || 0));

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
    res.status(200).json(filtered);
  } catch (err) {
    console.error("Error fetching wallet catalog:", err);
    res.status(500).json({ error: "Failed to fetch catalog" });
  }
}
