// Vaults that can't be deposited through Yieldo's flow — e.g. the curator
// gates deposits behind an address whitelist — so we send users to the
// protocol's own deposit page instead of opening a deposit form that would
// just fail on-chain. Keyed by vault_id (chain:address, lowercased).
export const EXTERNAL_DEPOSIT = {
  "1:0x238a700ed6165261cf8b2e544ba797bc11e466ba": {
    url: "https://midas.app/mfone",
    label: "Deposit on Midas", // shown on the CTA
    reason: "Deposits require curator whitelisting — complete them on Midas.",
  },
};

export function externalDeposit(vaultId) {
  return EXTERNAL_DEPOSIT[(vaultId || "").toLowerCase()] || null;
}
