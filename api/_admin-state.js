// Shared helper for the public /api/vaults* routes — pulls the admin-disabled
// vault set from the wallets cluster so disabled vaults don't surface on
// /vault or via direct deep-links. Safe to call frequently: result is cached
// for 30s in module scope.
//
// Env var precedence:
//   MONGO_URI_WALLETS  → primary name (matches Vercel env)
//   MONGO_WALLETS_URI  → alias accepted for back-compat
//   MONGO_URI          → fallback when both DBs share a cluster

import { MongoClient } from "mongodb";

let cachedClient = null;
let cachedSet = null;
let cachedFlags = null;  // Map<vault_id, {enabled, deposits_enabled, withdrawals_enabled}>
let cachedAt = 0;
const CACHE_MS = 30_000;

async function getWalletsDb() {
  if (cachedClient) return cachedClient.db("yieldo_wallets");
  const uri =
    process.env.MONGO_URI_WALLETS ||
    process.env.MONGO_WALLETS_URI ||
    process.env.MONGO_URI;
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

// Internal: refresh both caches in one DB roundtrip. Cheaper than two queries.
async function refreshCaches() {
  const db = await getWalletsDb();
  cachedSet = new Set();
  cachedFlags = new Map();
  cachedAt = Date.now();
  if (!db) return;
  try {
    const docs = await db.collection("vault_admin_state").find({}).toArray();
    for (const doc of docs) {
      const id = doc.vault_id;
      if (!id) continue;
      const enabled = doc.enabled !== false; // default true
      if (!enabled) cachedSet.add(id);
      cachedFlags.set(id, {
        enabled,
        deposits_enabled:    doc.deposits_enabled !== false,
        withdrawals_enabled: doc.withdrawals_enabled !== false,
      });
    }
  } catch (err) {
    console.error("admin-state: query failed:", err);
  }
}

async function ensureFresh() {
  if (cachedSet && cachedFlags && Date.now() - cachedAt < CACHE_MS) return;
  await refreshCaches();
}

export async function getDisabledVaultIds() {
  await ensureFresh();
  return cachedSet || new Set();
}

// Returns the per-vault flag map. Vaults that don't appear in
// `vault_admin_state` are NOT in this map — caller should treat absence as
// "fully enabled" (the system default).
export async function getVaultAdminFlags() {
  await ensureFresh();
  return cachedFlags || new Map();
}
