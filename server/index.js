import express from "express";
import { MongoClient } from "mongodb";
import cors from "cors";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env from project root
try {
  const envPath = resolve(__dirname, "..", ".env");
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
} catch { /* .env not found, rely on system env vars */ }

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("MONGO_URI is not set. Create a .env file or set the environment variable.");
  process.exit(1);
}
const MONGO_URI_WALLETS = process.env.MONGO_URI_WALLETS;
const DB_NAME = "yieldo_v1";
const WALLETS_DB_NAME = "yieldo_wallets";

const app = express();
app.use(cors());
app.use(express.json());

let db;
let walletsDb;

async function connectDB() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db(DB_NAME);
  console.log("Connected to MongoDB (vaults)");

  if (MONGO_URI_WALLETS) {
    const walletsClient = new MongoClient(MONGO_URI_WALLETS);
    await walletsClient.connect();
    walletsDb = walletsClient.db(WALLETS_DB_NAME);
    console.log("Connected to MongoDB (wallets)");
  }
}

// Server-side cache for /api/vaults (2 min TTL)
let vaultsCache = null;
let vaultsCacheTs = 0;
const VAULTS_CACHE_TTL = 2 * 60 * 1000;

app.get("/api/vaults", async (_req, res) => {
  if (vaultsCache && Date.now() - vaultsCacheTs < VAULTS_CACHE_TTL) {
    return res.json(vaultsCache);
  }
  try {
    // Fetch vaults and sparklines in parallel
    const [entries, sparkResults] = await Promise.all([
      db.collection("vaults").find({}).toArray(),
      // Aggregation: get last 14 snapshots per vault (server-side, not 25K docs)
      db.collection("snapshots").aggregate([
        { $sort: { vault_id: 1, date: -1 } },
        { $group: { _id: "$vault_id", snaps: { $push: "$total_assets_usd" } } },
        { $project: { _id: 1, snaps: { $slice: ["$snaps", 14] } } },
      ]).toArray(),
    ]);

    // Build sparkline map (reverse since we sorted desc)
    const sparkMap = {};
    for (const s of sparkResults) {
      sparkMap[s._id] = (s.snaps || []).reverse();
    }

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
        tvl_spark: sparkMap[entry._id] || [],
      };
      for (const [key, metric_data] of Object.entries(metrics)) {
        if (
          metric_data &&
          typeof metric_data === "object" &&
          "value" in metric_data
        ) {
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

    vaultsCache = data;
    vaultsCacheTs = Date.now();
    res.json(data);
  } catch (err) {
    console.error("Error fetching vaults:", err);
    res.status(500).json({ error: "Failed to fetch vaults" });
  }
});

app.get("/api/vaults/:vaultId", async (req, res) => {
  try {
    const vaultId = decodeURIComponent(req.params.vaultId);
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
      source: entry.source || null,
    };
    for (const [key, metric_data] of Object.entries(metrics)) {
      if (
        metric_data &&
        typeof metric_data === "object" &&
        "value" in metric_data
      ) {
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

    res.json(row);
  } catch (err) {
    console.error("Error fetching vault:", err);
    res.status(500).json({ error: "Failed to fetch vault" });
  }
});

// ========== Wallet Catalog (lightweight) ==========

app.get("/api/wallet-catalog", async (req, res) => {
  try {
    const entries = await db.collection("vaults").find({}).toArray();
    const data = entries.map((entry) => {
      const m = entry.metrics || {};
      const val = (key) => {
        const d = m[key];
        if (d == null) return null;
        if (typeof d === "object" && "value" in d) return d.value;
        if (typeof d === "number") return d;
        return null;
      };
      const p01 = m.P01;
      let apy_7d = null, apy_30d = null;
      if (p01 && typeof p01 === "object") {
        if ("value" in p01 && typeof p01.value === "object") {
          apy_7d = p01.value["7d"] ?? null;
          apy_30d = p01.value["30d"] ?? null;
        } else {
          apy_7d = p01["7d"] ?? null;
          apy_30d = p01["30d"] ?? null;
        }
      }
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

    res.json(filtered);
  } catch (err) {
    console.error("Error fetching wallet catalog:", err);
    res.status(500).json({ error: "Failed to fetch catalog" });
  }
});

// ========== Wallet Provider Endpoints ==========

// Get wallet provider by address
app.get("/api/wallet-providers/:address", async (req, res) => {
  if (!walletsDb) return res.status(503).json({ error: "Wallets DB not configured" });
  try {
    const address = req.params.address.toLowerCase();
    const provider = await walletsDb.collection("wallet_providers").findOne({ wallet_address: address });
    if (!provider) return res.status(404).json({ error: "Not registered" });
    res.json(provider);
  } catch (err) {
    console.error("Error fetching wallet provider:", err);
    res.status(500).json({ error: "Failed to fetch provider" });
  }
});

// Register new wallet provider
app.post("/api/wallet-providers", async (req, res) => {
  if (!walletsDb) return res.status(503).json({ error: "Wallets DB not configured" });
  try {
    const { wallet_address, name, website, contact_email, description } = req.body;
    if (!wallet_address || !name) {
      return res.status(400).json({ error: "wallet_address and name are required" });
    }
    const address = wallet_address.toLowerCase();
    const existing = await walletsDb.collection("wallet_providers").findOne({ wallet_address: address });
    if (existing) return res.status(409).json({ error: "Already registered" });

    const doc = {
      wallet_address: address,
      name,
      website: website || "",
      contact_email: contact_email || "",
      description: description || "",
      enrolled_vaults: [],
      created_at: new Date(),
      updated_at: new Date(),
    };
    await walletsDb.collection("wallet_providers").insertOne(doc);
    res.status(201).json(doc);
  } catch (err) {
    console.error("Error registering wallet provider:", err);
    res.status(500).json({ error: "Failed to register" });
  }
});

// Update enrolled vaults
app.put("/api/wallet-providers/:address/vaults", async (req, res) => {
  if (!walletsDb) return res.status(503).json({ error: "Wallets DB not configured" });
  try {
    const address = req.params.address.toLowerCase();
    const { enrolled_vaults } = req.body;
    const result = await walletsDb.collection("wallet_providers").updateOne(
      { wallet_address: address },
      { $set: { enrolled_vaults: enrolled_vaults || [], updated_at: new Date() } }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: "Not registered" });
    res.json({ success: true });
  } catch (err) {
    console.error("Error updating vaults:", err);
    res.status(500).json({ error: "Failed to update" });
  }
});

// ========== Vault Provider Endpoints ==========

app.get("/api/vault-providers/:address", async (req, res) => {
  if (!walletsDb) return res.status(503).json({ error: "Wallets DB not configured" });
  try {
    const address = req.params.address.toLowerCase();
    const provider = await walletsDb.collection("vault_providers").findOne({ wallet_address: address });
    if (!provider) return res.status(404).json({ error: "Not registered" });
    res.json(provider);
  } catch (err) {
    console.error("Error fetching vault provider:", err);
    res.status(500).json({ error: "Failed to fetch provider" });
  }
});

app.post("/api/vault-providers", async (req, res) => {
  if (!walletsDb) return res.status(503).json({ error: "Wallets DB not configured" });
  try {
    const { wallet_address, name, website, contact_email, vault_address, description } = req.body;
    if (!wallet_address || !name) {
      return res.status(400).json({ error: "wallet_address and name are required" });
    }
    const address = wallet_address.toLowerCase();
    const existing = await walletsDb.collection("vault_providers").findOne({ wallet_address: address });
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
    await walletsDb.collection("vault_providers").insertOne(doc);
    res.status(201).json(doc);
  } catch (err) {
    console.error("Error registering vault provider:", err);
    res.status(500).json({ error: "Failed to register" });
  }
});

// ========== User Wallet Tracking ==========

app.post("/api/users", async (req, res) => {
  if (!walletsDb) return res.status(503).json({ error: "Wallets DB not configured" });
  try {
    const { wallet_address } = req.body;
    if (!wallet_address) return res.status(400).json({ error: "wallet_address required" });
    const address = wallet_address.toLowerCase();
    const now = new Date();
    const coll = walletsDb.collection("users");
    const existing = await coll.findOne({ wallet_address: address });
    if (existing) {
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
    const doc = {
      wallet_address: address,
      first_connected: now,
      last_connected: now,
      connection_count: 1,
      connection_history: [{ connected_at: now, ua: req.headers["user-agent"] || "" }],
    };
    await coll.insertOne(doc);
    res.status(201).json({ status: "new", wallet_address: address });
  } catch (err) {
    console.error("Error tracking user:", err);
    res.status(500).json({ error: "Failed to track user" });
  }
});

const PORT = process.env.PORT || 3001;
connectDB().then(() => {
  app.listen(PORT, () => console.log(`API server running on port ${PORT}`));
});
