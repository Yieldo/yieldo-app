import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet, base, arbitrum, optimism } from "wagmi/chains";

export const config = getDefaultConfig({
  appName: "Yieldo Wallets",
  projectId: "0dd252f3816efa3917348bf2b60af0aa",
  chains: [mainnet, base, arbitrum, optimism],
});
