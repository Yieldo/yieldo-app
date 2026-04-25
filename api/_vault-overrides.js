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
  "1:0x6a37725ca7f4ce81c004c955f7280d5c704a249e": {
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
};

// The indexer occasionally has the WRONG contract address for a vault (e.g.
// it picked up a v2/test deployment instead of the live one). When we know
// the canonical address, remap the indexer's vault_id to the real one so
// /v1/quote/build can resolve it. Keys are the WRONG vault_id from the
// indexer; values are { vault_id, address } of the real vault.
export const VAULT_ALIASES = {
  // Lido Earn USD — indexer has 0x014e6dA8 (zero TVL, unused). Real vault
  // 0x4Ce1ac8F (symbol "earnUSD", $7M TVL, USDT-asset queue at 0x534d0beb).
  "1:0x014e6da8f283c4af65b2aa0f201438680a004452": {
    vault_id: "1:0x4ce1ac8f43e0e5bd7a346a98af777bf8fbea1981",
    address:  "0x4Ce1ac8F43E0E5BD7A346A98aF777bF8fbeA1981",
  },
};

export function applyVaultOverrides(row) {
  const vid = (row.vault_id || "").toLowerCase();
  // 1) Address aliases — remap before any other lookup so all overrides apply
  // to the canonical vault id.
  const alias = VAULT_ALIASES[vid];
  if (alias) {
    row.vault_id = alias.vault_id;
    row.vault_address = alias.address;
  }
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
