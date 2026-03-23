import { MongoClient } from "mongodb";

let cachedClient = null;

async function getDb() {
  if (cachedClient) return cachedClient.db("yieldo_wallets");
  const uri = process.env.MONGO_URI_WALLETS || process.env.MONGO_URI;
  const client = new MongoClient(uri);
  await client.connect();
  cachedClient = client;
  return client.db("yieldo_wallets");
}

export default async function handler(req, res) {
  try {
    const db = await getDb();
    const coll = db.collection("wallet_providers");
    const address = req.query.address.toLowerCase();

    if (req.method === "PUT") {
      const { enrolled_vaults } = req.body;
      const result = await coll.updateOne(
        { wallet_address: address },
        { $set: { enrolled_vaults: enrolled_vaults || [], updated_at: new Date() } }
      );
      if (result.matchedCount === 0) return res.status(404).json({ error: "Not registered" });
      return res.json({ success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("Error in wallet-providers/[address]/vaults:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
