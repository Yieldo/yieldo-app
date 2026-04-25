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
  return row;
}

// Back-compat shim — older callers still import applyCuratorOverride.
export function applyCuratorOverride(row) { return applyVaultOverrides(row); }
