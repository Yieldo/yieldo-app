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
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const db = await getDb();
    const coll = db.collection("users");
    const { wallet_address } = req.body;

    if (!wallet_address) {
      return res.status(400).json({ error: "wallet_address required" });
    }

    const address = wallet_address.toLowerCase();
    const now = new Date();

    const existing = await coll.findOne({ wallet_address: address });

    if (existing) {
      // User exists — add to connection history
      await coll.updateOne(
        { wallet_address: address },
        {
          $push: { connection_history: { connected_at: now, ua: req.headers["user-agent"] || "" } },
          $set: { last_connected: now },
          $inc: { connection_count: 1 },
        }
      );
      return res.json({ status: "returning", wallet_address: address });
    }

    // New user
    const doc = {
      wallet_address: address,
      first_connected: now,
      last_connected: now,
      connection_count: 1,
      connection_history: [{ connected_at: now, ua: req.headers["user-agent"] || "" }],
    };
    await coll.insertOne(doc);
    return res.status(201).json({ status: "new", wallet_address: address });
  } catch (err) {
    console.error("Error in users:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
