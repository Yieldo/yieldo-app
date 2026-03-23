import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet, base, arbitrum, optimism } from "wagmi/chains";

export const config = getDefaultConfig({
  appName: "Yieldo Wallets",
  projectId: "b1e8d43be4da18ec27f9ee18c2b6e29a",
  chains: [mainnet, base, arbitrum, optimism],
});
