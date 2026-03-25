import { useAccount, useBalance, useReadContracts } from "wagmi";
import { useMemo } from "react";
import { mainnet, base, arbitrum, optimism } from "wagmi/chains";

// USDC addresses per chain
const USDC = {
  [mainnet.id]: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  [base.id]: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  [arbitrum.id]: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  [optimism.id]: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
};

// USDT addresses per chain
const USDT = {
  [mainnet.id]: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  [arbitrum.id]: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
  [optimism.id]: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
};

// DAI addresses per chain
const DAI = {
  [mainnet.id]: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
  [base.id]: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
  [arbitrum.id]: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
  [optimism.id]: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
};

const CHAIN_NAMES = { [mainnet.id]: "Ethereum", [base.id]: "Base", [arbitrum.id]: "Arbitrum", [optimism.id]: "Optimism" };
const CHAINS = [mainnet, base, arbitrum, optimism];

const ERC20_ABI = [{ inputs: [{ name: "account", type: "address" }], name: "balanceOf", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }];

export function useWalletBalances() {
  const { address, isConnected } = useAccount();

  // ETH balance on each chain
  const ethMainnet = useBalance({ address, chainId: mainnet.id, query: { enabled: isConnected } });
  const ethBase = useBalance({ address, chainId: base.id, query: { enabled: isConnected } });
  const ethArb = useBalance({ address, chainId: arbitrum.id, query: { enabled: isConnected } });
  const ethOp = useBalance({ address, chainId: optimism.id, query: { enabled: isConnected } });

  // Build all ERC-20 balance calls across chains
  const contracts = useMemo(() => {
    if (!isConnected || !address) return [];
    const calls = [];
    // USDC on all chains
    for (const [chainId, addr] of Object.entries(USDC)) {
      calls.push({ address: addr, abi: ERC20_ABI, functionName: "balanceOf", args: [address], chainId: Number(chainId), _meta: { symbol: "USDC", decimals: 6, chainId: Number(chainId) } });
    }
    // USDT on supported chains
    for (const [chainId, addr] of Object.entries(USDT)) {
      calls.push({ address: addr, abi: ERC20_ABI, functionName: "balanceOf", args: [address], chainId: Number(chainId), _meta: { symbol: "USDT", decimals: 6, chainId: Number(chainId) } });
    }
    // DAI on all chains
    for (const [chainId, addr] of Object.entries(DAI)) {
      calls.push({ address: addr, abi: ERC20_ABI, functionName: "balanceOf", args: [address], chainId: Number(chainId), _meta: { symbol: "DAI", decimals: 18, chainId: Number(chainId) } });
    }
    return calls;
  }, [isConnected, address]);

  // Strip _meta before passing to wagmi (it doesn't accept extra fields)
  const wagmiContracts = useMemo(() => contracts.map(({ _meta, ...rest }) => rest), [contracts]);

  const { data: tokenResults } = useReadContracts({
    contracts: wagmiContracts,
    query: { enabled: isConnected && wagmiContracts.length > 0 },
  });

  const balances = useMemo(() => {
    if (!isConnected) return null;

    const result = {};

    // ETH balances per chain
    const ethBalances = [
      { chain: mainnet.id, data: ethMainnet.data },
      { chain: base.id, data: ethBase.data },
      { chain: arbitrum.id, data: ethArb.data },
      { chain: optimism.id, data: ethOp.data },
    ];

    let totalEth = 0;
    const ethChains = [];
    for (const { chain, data } of ethBalances) {
      if (data) {
        const val = parseFloat(data.formatted);
        if (val > 0.0001) {
          totalEth += val;
          ethChains.push({ chain: CHAIN_NAMES[chain], balance: val });
        }
      }
    }
    if (totalEth > 0) {
      result.ETH = { symbol: "ETH", icon: "⟠", balance: totalEth, usdValue: totalEth * 2400, chains: ethChains };
    }

    // Token balances per chain
    const tokenAgg = {};
    if (tokenResults) {
      tokenResults.forEach((res, i) => {
        if (i >= contracts.length) return;
        const meta = contracts[i]._meta;
        if (res.status === "success" && res.result) {
          const raw = BigInt(res.result);
          const balance = Number(raw) / 10 ** meta.decimals;
          if (balance > 0.01) {
            if (!tokenAgg[meta.symbol]) {
              tokenAgg[meta.symbol] = { symbol: meta.symbol, icon: "💵", balance: 0, usdValue: 0, chains: [] };
            }
            tokenAgg[meta.symbol].balance += balance;
            tokenAgg[meta.symbol].usdValue += balance; // Stablecoins ≈ $1
            tokenAgg[meta.symbol].chains.push({ chain: CHAIN_NAMES[meta.chainId], balance });
          }
        }
      });
    }

    Object.assign(result, tokenAgg);
    return result;
  }, [isConnected, ethMainnet.data, ethBase.data, ethArb.data, ethOp.data, tokenResults, contracts]);

  const totalIdle = useMemo(() => {
    if (!balances) return 0;
    return Object.values(balances)
      .filter(b => ["USDC", "USDT", "DAI"].includes(b.symbol))
      .reduce((sum, b) => sum + b.usdValue, 0);
  }, [balances]);

  return { balances, totalIdle, isConnected };
}
