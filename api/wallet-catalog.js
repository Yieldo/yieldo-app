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

      // Extract metric value - handles { value: x } wrapper and raw values
      const val = (key) => {
        const d = m[key];
        if (d == null) return null;
        if (typeof d === "object" && "value" in d) return d.value;
        if (typeof d === "number") return d;
        return null;
      };

      // P01 is a nested object with "7d", "30d" keys
      const p01 = m.P01;
      let apy_7d = null;
      let apy_30d = null;
      if (p01 && typeof p01 === "object") {
        if ("value" in p01 && typeof p01.value === "object") {
          apy_7d = p01.value["7d"] ?? null;
          apy_30d = p01.value["30d"] ?? null;
        } else {
          apy_7d = p01["7d"] ?? null;
          apy_30d = p01["30d"] ?? null;
        }
      }

      // Fallback to net_apy from entry root
      if (apy_7d == null) apy_7d = entry.net_apy ?? null;

      return {
        vault_id: entry._id,
        vault_name: entry.name || (entry._id || "").slice(0, 12) + "...",
        vault_address: entry.address || entry._id,
        chain_id: entry.chain_id || 1,
        asset: entry.asset || "usdc",
        source: entry.source || null,
        apy_7d,
        apy_30d,
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
