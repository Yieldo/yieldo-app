// Internal — NOT for commit. Migrates MongoDB vaults collection to use the correct
// Monad vault addresses for Hyperithm Delta Neutral and Yuzu Money.
//
// Old (loan/market) -> New (real ERC-4626 vault):
//   0xd0943c76ee287793559c1df82e5b2b858dd01ef3 -> 0x7cd231120a60f500887444a9baf5e1bd753a5e59  (Delta Neutral)
//   0xcb9c1fbf1b8fcd71a70a1a6551dcaaf9f7029c19 -> 0x3a2c4aaae6776dc1c31316de559598f2f952e2cb  (Yuzu)
//
// Usage:
//   DRY=1 node scripts-local/fix-monad-vault-addresses.js    # preview only
//   node scripts-local/fix-monad-vault-addresses.js          # apply

const fs = require("fs");
const path = require("path");
// Load .env manually (no dotenv dependency required)
const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const { MongoClient } = require("mongodb");

const MIGRATIONS = [
  { oldId: "143:0xd0943c76ee287793559c1df82e5b2b858dd01ef3", newId: "143:0x7cd231120a60f500887444a9baf5e1bd753a5e59", newAddress: "0x7Cd231120a60F500887444a9bAF5e1BD753A5e59", label: "Delta Neutral" },
  { oldId: "143:0xcb9c1fbf1b8fcd71a70a1a6551dcaaf9f7029c19", newId: "143:0x3a2c4aaae6776dc1c31316de559598f2f952e2cb", newAddress: "0x3a2c4aAae6776dC1c31316De559598f2f952E2cB", label: "Yuzu Money" },
];

async function main() {
  const dry = !!process.env.DRY;
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI missing in .env");
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  try {
    const db = client.db("yieldo_v1");
    const vaults = db.collection("vaults");
    const snapshots = db.collection("snapshots");

    for (const m of MIGRATIONS) {
      console.log(`\n=== ${m.label} ===`);
      const oldDoc = await vaults.findOne({ _id: m.oldId });
      const newDoc = await vaults.findOne({ _id: m.newId });
      console.log(`  old doc (${m.oldId}): ${oldDoc ? "EXISTS" : "absent"}`);
      console.log(`  new doc (${m.newId}): ${newDoc ? "EXISTS" : "absent"}`);
      if (!oldDoc && !newDoc) { console.log(`  nothing to migrate — skipping`); continue; }

      if (oldDoc && !newDoc) {
        // Clone doc with new _id + new address, drop old doc.
        const cloned = { ...oldDoc, _id: m.newId, address: m.newAddress };
        if (dry) {
          console.log(`  [DRY] would insert new doc _id=${m.newId} address=${m.newAddress}`);
          console.log(`  [DRY] would delete old doc _id=${m.oldId}`);
        } else {
          await vaults.insertOne(cloned);
          await vaults.deleteOne({ _id: m.oldId });
          console.log(`  ✓ migrated vault doc`);
        }
        // Relink snapshots by vault_id
        const snapCount = await snapshots.countDocuments({ vault_id: m.oldId });
        console.log(`  snapshots to relink: ${snapCount}`);
        if (snapCount > 0) {
          if (dry) console.log(`  [DRY] would update ${snapCount} snapshots vault_id ${m.oldId} -> ${m.newId}`);
          else {
            const r = await snapshots.updateMany({ vault_id: m.oldId }, { $set: { vault_id: m.newId } });
            console.log(`  ✓ relinked ${r.modifiedCount} snapshots`);
          }
        }
      } else if (!oldDoc && newDoc) {
        console.log(`  already migrated ✓`);
      } else {
        // Both exist — keep the new, drop the old
        console.log(`  both exist — dropping old`);
        if (dry) console.log(`  [DRY] would delete old doc ${m.oldId}`);
        else {
          await vaults.deleteOne({ _id: m.oldId });
          console.log(`  ✓ deleted old doc`);
        }
      }
    }
    console.log(`\n${dry ? "DRY RUN complete — nothing changed" : "MIGRATION complete"}`);
  } finally {
    await client.close();
  }
}

main().catch(e => { console.error("ERROR:", e); process.exit(1); });
