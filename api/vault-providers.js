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
    const coll = db.collection("vault_providers");

    if (req.method === "POST") {
      const { wallet_address, name, website, contact_email, vault_address, description } = req.body;
      if (!wallet_address || !name) {
        return res.status(400).json({ error: "wallet_address and name are required" });
      }
      const address = wallet_address.toLowerCase();
      const existing = await coll.findOne({ wallet_address: address });
      if (existing) return res.status(409).json({ error: "Already registered" });

      const doc = {
        wallet_address: address,
        name,
        vault_address: vault_address || "",
        website: website || "",
        contact_email: contact_email || "",
        description: description || "",
        created_at: new Date(),
        updated_at: new Date(),
      };
      await coll.insertOne(doc);
      return res.status(201).json(doc);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("Error in vault-providers:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
