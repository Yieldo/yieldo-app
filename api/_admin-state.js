// Shared helper for the public /api/vaults* routes — pulls the admin-disabled
// vault set from the wallets cluster so disabled vaults don't surface on
// /vault or via direct deep-links. Safe to call frequently: result is cached
// for 30s in module scope.
//
// Env var precedence:
//   MONGO_WALLETS_URI  → use this when wallets DB is on a different cluster
//   MONGO_URI          → fallback (works when both DBs share a cluster)

import { MongoClient } from "mongodb";

let cachedClient = null;
let cachedSet = null;
let cachedAt = 0;
const CACHE_MS = 30_000;

async function getWalletsDb() {
  if (cachedClient) return cachedClient.db("yieldo_wallets");
  const uri = process.env.MONGO_WALLETS_URI || process.env.MONGO_URI;
  if (!uri) return null;
  try {
    const client = new MongoClient(uri);
    await client.connect();
    cachedClient = client;
    return client.db("yieldo_wallets");
  } catch (err) {
    console.error("admin-state: failed to connect to wallets DB:", err);
    return null;
  }
}

export async function getDisabledVaultIds() {
  const now = Date.now();
  if (cachedSet && now - cachedAt < CACHE_MS) return cachedSet;
  const db = await getWalletsDb();
  if (!db) {
    cachedSet = new Set();
    cachedAt = now;
    return cachedSet;
  }
  try {
    const docs = await db.collection("vault_admin_state")
      .find({ enabled: false }, { projection: { vault_id: 1 } })
      .toArray();
    cachedSet = new Set(docs.map(d => d.vault_id).filter(Boolean));
    cachedAt = now;
    return cachedSet;
  } catch (err) {
    console.error("admin-state: query failed:", err);
    cachedSet = new Set();
    cachedAt = now;
    return cachedSet;
  }
}
