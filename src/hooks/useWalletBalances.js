import { useAccount, useBalance, useReadContracts } from "wagmi";
import { useMemo } from "react";
import { mainnet } from "wagmi/chains";

// Only read mainnet balances for speed — covers 90%+ of stablecoin holdings
const TOKENS = [
  { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6, symbol: "USDC", icon: "💵" },
  { address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6, symbol: "USDT", icon: "💵" },
  { address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", decimals: 18, symbol: "DAI", icon: "💵" },
];

const ERC20_ABI = [{ inputs: [{ name: "account", type: "address" }], name: "balanceOf", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }];

export function useWalletBalances() {
  const { address, isConnected } = useAccount();

  // ETH balance (mainnet only)
  const { data: ethBalance } = useBalance({
    address,
    chainId: mainnet.id,
    query: { enabled: isConnected, staleTime: 30_000 },
  });

  // ERC-20 balances (mainnet only — fast, single multicall)
  const contracts = useMemo(() => {
    if (!isConnected || !address) return [];
    return TOKENS.map(t => ({
      address: t.address,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [address],
      chainId: mainnet.id,
    }));
  }, [isConnected, address]);

  const { data: tokenResults } = useReadContracts({
    contracts,
    query: { enabled: isConnected && contracts.length > 0, staleTime: 30_000 },
  });

  const balances = useMemo(() => {
    if (!isConnected) return null;
    const result = {};

    if (ethBalance) {
      const ethVal = parseFloat(ethBalance.formatted);
      if (ethVal > 0.0001) {
        result.ETH = { symbol: "ETH", icon: "⟠", balance: ethVal, usdValue: ethVal * 2400 };
      }
    }

    if (tokenResults) {
      tokenResults.forEach((res, i) => {
        if (res.status === "success" && res.result) {
          const token = TOKENS[i];
          const balance = Number(BigInt(res.result)) / 10 ** token.decimals;
          if (balance > 0.01) {
            result[token.symbol] = { symbol: token.symbol, icon: token.icon, balance, usdValue: balance };
          }
        }
      });
    }

    return result;
  }, [isConnected, ethBalance, tokenResults]);

  const totalIdle = useMemo(() => {
    if (!balances) return 0;
    return Object.values(balances)
      .filter(b => ["USDC", "USDT", "DAI"].includes(b.symbol))
      .reduce((sum, b) => sum + b.usdValue, 0);
  }, [balances]);

  return { balances, totalIdle, isConnected };
}
