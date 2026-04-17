import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet, base, arbitrum, optimism } from "wagmi/chains";
import { http, fallback } from "wagmi";
import { defineChain } from "viem";

const monad = defineChain({
  id: 143,
  name: "Monad",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.monad.xyz"] } },
  blockExplorers: { default: { name: "MonadScan", url: "https://monadscan.com" } },
});

const hyperevm = defineChain({
  id: 999,
  name: "HyperEVM",
  nativeCurrency: { name: "HYPE", symbol: "HYPE", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.hyperliquid.xyz/evm"] } },
  blockExplorers: { default: { name: "HyperEVMScan", url: "https://hyperevmscan.io" } },
});

const katana = defineChain({
  id: 747474,
  name: "Katana",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.katanarpc.com"] } },
  blockExplorers: { default: { name: "KatanaScan", url: "https://katanascan.com" } },
});

export const config = getDefaultConfig({
  appName: "Yieldo",
  projectId: "0dd252f3816efa3917348bf2b60af0aa",
  chains: [mainnet, base, arbitrum, optimism, monad, hyperevm, katana],
  transports: {
    [mainnet.id]: fallback([
      http("https://ethereum-rpc.publicnode.com"),
      http("https://cloudflare-eth.com"),
      http("https://1rpc.io/eth"),
    ]),
    [base.id]: fallback([
      http("https://base-rpc.publicnode.com"),
      http("https://mainnet.base.org"),
      http("https://1rpc.io/base"),
    ]),
    [arbitrum.id]: fallback([
      http("https://arbitrum-one-rpc.publicnode.com"),
      http("https://arb1.arbitrum.io/rpc"),
      http("https://1rpc.io/arb"),
    ]),
    [optimism.id]: fallback([
      http("https://optimism-rpc.publicnode.com"),
      http("https://mainnet.optimism.io"),
      http("https://1rpc.io/op"),
    ]),
    [monad.id]: fallback([
      http("https://rpc.monad.xyz"),
      http("https://rpc1.monad.xyz"),
      http("https://rpc-mainnet.monadinfra.com"),
    ]),
    [hyperevm.id]: http("https://rpc.hyperliquid.xyz/evm"),
    [katana.id]: http("https://rpc.katanarpc.com"),
  },
});

// Token addresses for balance reading (Ethereum mainnet)
export const TOKENS = {
  USDC: { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6, symbol: "USDC", icon: "💵" },
  USDT: { address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6, symbol: "USDT", icon: "💵" },
  DAI: { address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", decimals: 18, symbol: "DAI", icon: "💵" },
};
