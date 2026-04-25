// Single source of truth for Yieldo's chain / router configuration.
// All deposit-gating UI must import from here — adding/removing a chain
// happens in ONE place.

export const YIELDO_ROUTERS = {
  1: "0x85f76c1685046Ea226E1148EE1ab81a8a15C385d",       // Ethereum
  8453: "0xF6B7723661d52E8533c77479d3cad534B4D147Aa",    // Base
  143: "0xCD8dfD627A3712C9a2B079398e0d524970D5E73F",     // Monad
  10: "0x7554937Aa95195D744A6c45E0fd7D4F95A2F8F72",      // Optimism
  42161: "0xC5700f4D8054BA982C39838D7C33442f54688bd2",   // Arbitrum
  747474: "0xa682CD1c2Fd7c8545b401824096A600C2bD98F69", // Katana
  999: "0xa682CD1c2Fd7c8545b401824096A600C2bD98F69",    // HyperEVM (V3.2.0, big-blocks enabled)
};

// Chains where a user can open the Yieldo Deposit modal. Derived from
// YIELDO_ROUTERS so adding a chain is a one-line change above.
export const DEPOSITABLE_CHAINS = Object.keys(YIELDO_ROUTERS).map(Number);

export const CHAIN_NAMES = {
  1: "Ethereum",
  8453: "Base",
  42161: "Arbitrum",
  10: "Optimism",
  43114: "Avalanche",
  56: "BNB Chain",
  143: "Monad",
  999: "HyperEVM",
  747474: "Katana",
};

export const CHAIN_EXPLORERS = {
  1: "https://etherscan.io",
  8453: "https://basescan.org",
  42161: "https://arbiscan.io",
  10: "https://optimistic.etherscan.io",
  43114: "https://snowtrace.io",
  56: "https://bscscan.com",
  143: "https://monadscan.com",
  999: "https://hyperevmscan.io",
  747474: "https://katanascan.com",
};

// Display labels that match each explorer's brand.
export const EXPLORER_NAMES = {
  1: "Etherscan",
  8453: "Basescan",
  42161: "Arbiscan",
  10: "Optimism Explorer",
  43114: "Snowtrace",
  56: "BscScan",
  143: "Monadscan",
  999: "HyperEVM Scan",
  747474: "Katanascan",
};
