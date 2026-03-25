import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet, base, arbitrum, optimism } from "wagmi/chains";
import { http } from "wagmi";

export const config = getDefaultConfig({
  appName: "Yieldo",
  projectId: "0dd252f3816efa3917348bf2b60af0aa",
  chains: [mainnet, base, arbitrum, optimism],
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
  },
});

// Token addresses for balance reading (Ethereum mainnet)
export const TOKENS = {
  USDC: { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6, symbol: "USDC", icon: "💵" },
  USDT: { address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6, symbol: "USDT", icon: "💵" },
  DAI: { address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", decimals: 18, symbol: "DAI", icon: "💵" },
};
