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

export const PAUSED_OVERRIDES = {
  "1:0xbbfc8683c8fe8cf73777fede7ab9574935fea0a4": {
    paused: true,
    reason: "Lido SyncDepositQueue paused upstream by Lido. Resumes when Lido unpauses (typically minutes to hours).",
  },
  // Upshift vaults that revert our router's deposit with `DepositsPaused()` /
  // "Deposits paused" / empty revert. Their UI is open, so the error is really
  // an access-control reject — Upshift hasn't whitelisted our DepositRouter
  // yet. Marked paused on our side until they whitelist 0x85f76c…, then we
  // remove these entries.
  "1:0x80e1048ede66ec4c364b4f22c8768fc657ff6a42": {
    paused: true,
    reason: "Upshift USDC: direct router deposits aren't whitelisted yet. Deposit via Upshift's app meanwhile.",
  },
  "1:0xe9b725010a9e419412ed67d0fa5f3a5f40159d32": {
    paused: true,
    reason: "Upshift Core USDC: direct router deposits aren't whitelisted yet. Deposit via Upshift's app meanwhile.",
  },
  "1:0xe1b4d34e8754600962cd944b535180bd758e6c2e": {
    paused: true,
    reason: "Upshift Kelp Gain: direct router deposits aren't whitelisted yet. Deposit via Upshift's app meanwhile.",
  },
  "1:0xc824a08db624942c5e5f330d56530cd1598859fd": {
    paused: true,
    reason: "Upshift High Growth ETH: direct router deposits aren't whitelisted yet (vault rejects external callers). Deposit via Upshift's app meanwhile.",
  },
  // Hyperbeat Ultra HYPE: vault contract returns DepositsPaused() to ANY caller
  // (incl. an EOA going direct). Confirmed via on-chain probe. Will resume
  // when Hyperbeat unsets their pause flag.
  "999:0x96c6cbb6251ee1c257b2162ca0f39aa5fa44b1fb": {
    paused: true,
    reason: "Hyperbeat Ultra HYPE: deposits paused upstream by Hyperbeat. Resumes when they unpause the vault contract.",
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
  "999:0x81e064d0eb539de7c3170edf38c1a42cbd752a76": {
    reason: "Hyperbeat lstHYPE — Midas-style token; needs Issuance Vault mapping.",
  },
  "999:0x441794d6a8f9a3739f5d4e98a728937b33489d29": {
    reason: "liquidHYPE — needs Issuance Vault mapping.",
  },
  "999:0x5e105266db42f78fa814322bce7f388b4c2e61eb": {
    reason: "Hyperbeat USDT — needs Issuance Vault mapping.",
  },
  "1:0x07ed467acd4ffd13023046968b0859781cb90d9b": {
    reason: "9Summits Flagship ETH — Mellow architecture; needs share_token + router queue mapping (same as Lido Earn).",
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
