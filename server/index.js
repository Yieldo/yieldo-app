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
const DB_NAME = "yieldo_v1";

const app = express();
app.use(cors());

let db;

async function connectDB() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db(DB_NAME);
  console.log("Connected to MongoDB");
}

app.get("/api/vaults", async (_req, res) => {
  try {
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

const PORT = process.env.PORT || 3001;
connectDB().then(() => {
  app.listen(PORT, () => console.log(`API server running on port ${PORT}`));
});
