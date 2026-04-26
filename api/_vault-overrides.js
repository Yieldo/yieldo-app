// Frontend-visible overrides for vaults the indexer doesn't (yet) describe.
// Curator labels for non-Morpho vaults + paused/unsupported state from our
// own backend (vaults.json on yieldo-api-v1). Applied in /api/vaults and
// /api/vaults/[vaultId] so the React app renders the right badge without an
// extra network round-trip.
//
// Keys are vault_id (chain_id:lowercase_address).

export const CURATOR_OVERRIDES = {
  "1:0x08c6f91e2b681faf5e17227f2a44c307b3c1364c": "Ether.fi", // Liquid USD
  "1:0xf0bb20865277abd641a307ece5ee04e79073416c": "Ether.fi", // Liquid ETH
  "1:0x5f46d540b6ed704c3c8789105f30e075aa900726": "Ether.fi", // Liquid BTC
};

// User-facing messages only — no internal jargon (architecture names, contract
// addresses, "router queue mapping" etc). Two flavours:
//   - paused upstream by the protocol → "Deposits temporarily paused by <protocol>"
//   - integration not yet enabled on our side → handled in UNSUPPORTED_OVERRIDES
//     with an "Under maintenance" message.
export const PAUSED_OVERRIDES = {
  "1:0xbbfc8683c8fe8cf73777fede7ab9574935fea0a4": {
    paused: true,
    reason: "Deposits temporarily paused by Lido. Resumes when they reopen the queue.",
  },
  "1:0x80e1048ede66ec4c364b4f22c8768fc657ff6a42": {
    paused: true,
    reason: "Deposits temporarily unavailable. Please check back later.",
  },
  "1:0xe9b725010a9e419412ed67d0fa5f3a5f40159d32": {
    paused: true,
    reason: "Deposits temporarily unavailable. Please check back later.",
  },
  "1:0xe1b4d34e8754600962cd944b535180bd758e6c2e": {
    paused: true,
    reason: "Deposits temporarily unavailable. Please check back later.",
  },
  "1:0xc824a08db624942c5e5f330d56530cd1598859fd": {
    paused: true,
    reason: "Deposits temporarily unavailable. Please check back later.",
  },
  "999:0x96c6cbb6251ee1c257b2162ca0f39aa5fa44b1fb": {
    paused: true,
    reason: "Deposits temporarily paused by Hyperbeat. Resumes when they reopen the vault.",
  },
};

// The indexer occasionally has the wrong asset symbol/decimals for a vault
// (it reads a parent strategy's asset rather than the vault's true asset()).
// We override here so the UI shows the actual deposit token instead of the
// misleading default. Confirmed on-chain via vault.asset().
export const ASSET_OVERRIDES = {
  // Upshift Kelp Gain — vault.asset() = rsETH, indexer says weth
  "1:0xe1b4d34e8754600962cd944b535180bd758e6c2e": { asset: "rseth", asset_decimals: 18 },
  // Upshift High Growth ETH — vault.asset() = rsETH, indexer says weth
  "1:0xc824a08db624942c5e5f330d56530cd1598859fd": { asset: "rseth", asset_decimals: 18 },
  // Upshift NUSD — vault.asset() = Neutrl USD (NUSD)
  "1:0xaeeb2fb279a5aa837367b9d2582f898a63b06ca1": { asset: "nusd", asset_decimals: 18 },
};

export const UNSUPPORTED_OVERRIDES = {
  "1:0x07ed467acd4ffd13023046968b0859781cb90d9b": {
    reason: "Under maintenance — integration in progress. Please check back soon.",
  },
};

export function applyVaultOverrides(row) {
  const fid = (row.vault_id || "").toLowerCase();
  const c = CURATOR_OVERRIDES[fid];
  if (c) row.curator = c;
  const p = PAUSED_OVERRIDES[fid];
  if (p) { row.paused = true; row.paused_reason = p.reason; }
  const u = UNSUPPORTED_OVERRIDES[fid];
  if (u) { row.unsupported = true; row.unsupported_reason = u.reason; }
  const a = ASSET_OVERRIDES[fid];
  if (a) {
    if (a.asset) row.asset = a.asset;
    if (a.asset_decimals) row.asset_decimals = a.asset_decimals;
  }
  return row;
}

// Back-compat shim — older callers still import applyCuratorOverride.
export function applyCuratorOverride(row) { return applyVaultOverrides(row); }
