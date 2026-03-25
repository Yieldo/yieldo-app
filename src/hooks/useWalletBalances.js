import { useAccount, useBalance, useReadContracts } from "wagmi";
import { TOKENS } from "../walletConfig.jsx";
import { useMemo } from "react";

const ERC20_ABI = [{ inputs: [{ name: "account", type: "address" }], name: "balanceOf", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }];

export function useWalletBalances() {
  const { address, isConnected } = useAccount();

  // ETH balance
  const { data: ethBalance } = useBalance({ address, query: { enabled: isConnected } });

  // ERC-20 balances
  const tokenContracts = useMemo(() => {
    if (!isConnected || !address) return [];
    return Object.entries(TOKENS).map(([, token]) => ({
      address: token.address,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [address],
    }));
  }, [isConnected, address]);

  const { data: tokenResults } = useReadContracts({
    contracts: tokenContracts,
    query: { enabled: isConnected && tokenContracts.length > 0 },
  });

  const balances = useMemo(() => {
    if (!isConnected) return null;

    const result = {
      ETH: { symbol: "ETH", icon: "⟠", balance: 0, usdValue: 0 },
    };

    if (ethBalance) {
      const ethVal = parseFloat(ethBalance.formatted);
      result.ETH.balance = ethVal;
      result.ETH.usdValue = ethVal * 2400; // Approximate ETH price
    }

    const tokenKeys = Object.keys(TOKENS);
    if (tokenResults) {
      tokenResults.forEach((res, i) => {
        const key = tokenKeys[i];
        const token = TOKENS[key];
        if (res.status === "success" && res.result) {
          const raw = BigInt(res.result);
          const balance = Number(raw) / 10 ** token.decimals;
          result[key] = {
            symbol: token.symbol,
            icon: token.icon,
            balance,
            usdValue: balance, // Stablecoins ≈ $1
          };
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
