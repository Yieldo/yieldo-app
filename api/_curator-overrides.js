// Manual curator overrides for vaults whose curator isn't reported by the
// indexer's Morpho-API source (e.g. Veda / BoringVaults curated by Ether.fi).
// Keys are vault_id (chain_id:lowercase_address).

export const CURATOR_OVERRIDES = {
  "1:0x08c6f91e2b681faf5e17227f2a44c307b3c1364c": "Ether.fi", // Liquid USD
  "1:0xf0bb20865277abd641a307ece5ee04e79073416c": "Ether.fi", // Liquid ETH
  "1:0x5f46d540b6ed704c3c8789105f30e075aa900726": "Ether.fi", // Liquid BTC
};

export function applyCuratorOverride(row) {
  const vid = (row.vault_id || "").toLowerCase();
  const override = CURATOR_OVERRIDES[vid];
  if (override) row.curator = override;
  return row;
}
