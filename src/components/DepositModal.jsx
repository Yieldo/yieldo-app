import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAccount, useBalance, useWriteContract, useSendTransaction, useWaitForTransactionReceipt, useSwitchChain } from "wagmi";
import { parseUnits, formatUnits, erc20Abi } from "viem";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useDepositMeta } from "../hooks/useDepositMeta.js";
import { useUserAuth } from "../hooks/useUserAuth.js";
import { useVaultStats, formatRate } from "../hooks/useVaultStats.js";

const API = import.meta.env.VITE_PARTNER_API || "https://api.yieldo.xyz";

const CHAINS = { 1: "Ethereum", 8453: "Base", 42161: "Arbitrum", 10: "Optimism", 143: "Monad", 999: "HyperEVM", 747474: "Katana" };
const CHAIN_ICONS = { 1: "\u039E", 8453: "\ud83d\udd35", 42161: "\ud83d\udfe0", 10: "\ud83d\udd34" };
import { CHAIN_EXPLORERS as EXPLORERS } from "../chains.js";

// Popular tokens shown as chips, rest go in dropdown
const POPULAR_TOKENS = {
  1: ["ETH", "USDC", "USDT", "WETH", "WBTC", "wstETH"],
  8453: ["ETH", "USDC", "WETH", "cbBTC", "wstETH"],
  42161: ["ETH", "USDC", "USDT", "WETH", "WBTC"],
  10: ["ETH", "USDC", "USDT", "WETH"],
  999: ["HYPE", "USDC", "USDT0", "WHYPE", "UBTC"],
  143: ["MON", "USDC", "WETH", "AUSD"],
  747474: ["ETH", "USDC", "WETH", "WBTC", "AUSD"],
};

// Native ETH marker used by LiFi / our API for source-chain native deposits.
const NATIVE_ETH = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

const ALL_TOKENS = {
  1: [
    { symbol: "ETH", address: NATIVE_ETH, decimals: 18, native: true },
    { symbol: "USDC", address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6 },
    { symbol: "USDT", address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6 },
    { symbol: "WETH", address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", decimals: 18 },
    { symbol: "WBTC", address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", decimals: 8 },
    { symbol: "cbBTC", address: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf", decimals: 8 },
    { symbol: "LBTC", address: "0x8236a87084f8B84306f72007F36F2618A5634494", decimals: 8 },
    { symbol: "tBTC", address: "0x18084fbA666a33d37592fA2633fD49a74DD93a88", decimals: 18 },
    { symbol: "DAI", address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", decimals: 18 },
    { symbol: "PYUSD", address: "0x6c3ea9036406852006290770BEdFcAbA0e23A0e8", decimals: 6 },
    { symbol: "USDe", address: "0x4c9EDD5852cd905f086C759E8383e09bff1E68B3", decimals: 18 },
    { symbol: "sUSDe", address: "0x9D39A5DE30e57443BfF2A8307A4256c8797A3497", decimals: 18 },
    { symbol: "USDS", address: "0xdC035D45d973E3EC169d2276DDab16f1e407384F", decimals: 18 },
    { symbol: "USDtb", address: "0xC139190F447e929f090edF9bB84c22a9D232dDA2", decimals: 18 },
    { symbol: "wstETH", address: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0", decimals: 18 },
    { symbol: "stETH", address: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84", decimals: 18 },
    { symbol: "weETH", address: "0xCd5fE23C85820F7B72D0926FC9b05b43E359b7ee", decimals: 18 },
    { symbol: "cbETH", address: "0xBe9895146f7AF43049ca1c1AE358B0541Ea49704", decimals: 18 },
    { symbol: "rETH", address: "0xae78736Cd615f374D3085123A210448E74Fc6393", decimals: 18 },
    { symbol: "LINK", address: "0x514910771AF9Ca656af840dff83E8264EcF986CA", decimals: 18 },
  ],
  8453: [
    { symbol: "ETH", address: NATIVE_ETH, decimals: 18, native: true },
    { symbol: "USDC", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", decimals: 6 },
    { symbol: "WETH", address: "0x4200000000000000000000000000000000000006", decimals: 18 },
    { symbol: "cbBTC", address: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf", decimals: 8 },
    { symbol: "cbETH", address: "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22", decimals: 18 },
    { symbol: "wstETH", address: "0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452", decimals: 18 },
    { symbol: "weETH", address: "0x04C0599Ae5A44757c0af6F9eC3b93da8976c150A", decimals: 18 },
    { symbol: "rETH", address: "0xB6fe221Fe9EeF5aBa221c348bA20A1Bf5e73624c", decimals: 18 },
    { symbol: "DAI", address: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb", decimals: 18 },
    { symbol: "USDbC", address: "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA", decimals: 6 },
    { symbol: "USDe", address: "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34", decimals: 18 },
    { symbol: "sUSDe", address: "0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2", decimals: 18 },
    { symbol: "USDS", address: "0x820C137fa70C8691f0e44Dc420a5e53c168921Dc", decimals: 18 },
    { symbol: "AERO", address: "0x940181a94A35A4569E4529A3CDfB74e38FD98631", decimals: 18 },
  ],
  42161: [
    { symbol: "ETH", address: NATIVE_ETH, decimals: 18, native: true },
    { symbol: "USDC", address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", decimals: 6 },
    { symbol: "USDT", address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", decimals: 6 },
    { symbol: "WETH", address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", decimals: 18 },
    { symbol: "WBTC", address: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", decimals: 8 },
    { symbol: "DAI", address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", decimals: 18 },
    { symbol: "wstETH", address: "0x5979D7b546E38E414F7E9822514be443A4800529", decimals: 18 },
    { symbol: "weETH", address: "0x35751007a407ca6FEFfE80b3cB397736D2cf4dbe", decimals: 18 },
    { symbol: "rETH", address: "0xEC70Dcb4A1EFa46b8F2D97C310C9c4790ba5ffA8", decimals: 18 },
    { symbol: "USDe", address: "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34", decimals: 18 },
    { symbol: "ARB", address: "0x912CE59144191C1204E64559FE8253a0e49E6548", decimals: 18 },
    { symbol: "LINK", address: "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", decimals: 18 },
    { symbol: "GMX", address: "0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a", decimals: 18 },
  ],
  10: [
    { symbol: "ETH", address: NATIVE_ETH, decimals: 18, native: true },
    { symbol: "USDC", address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", decimals: 6 },
    { symbol: "USDT", address: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", decimals: 6 },
    { symbol: "WETH", address: "0x4200000000000000000000000000000000000006", decimals: 18 },
    { symbol: "WBTC", address: "0x68f180fcCe6836688e9084f035309E29Bf0A2095", decimals: 8 },
    { symbol: "DAI", address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", decimals: 18 },
    { symbol: "OP", address: "0x4200000000000000000000000000000000000042", decimals: 18 },
    { symbol: "wstETH", address: "0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb", decimals: 18 },
    { symbol: "weETH", address: "0x5A7fACB970D094B6C7FF1df0eA68D99E6e73CBFF", decimals: 18 },
    { symbol: "rETH", address: "0x9Bcef72be871e61ED4fBbc7630889beE758eb81D", decimals: 18 },
    { symbol: "LINK", address: "0x350a791Bfc2C21F9Ed5d10980Dad2e2638ffa7f6", decimals: 18 },
  ],
  999: [
    { symbol: "HYPE", address: NATIVE_ETH, decimals: 18, native: true },
    { symbol: "USDC", address: "0xb88339CB7199b77E23DB6E890353E22632Ba630f", decimals: 6 },
    { symbol: "USDT0", address: "0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb", decimals: 6 },
    { symbol: "WHYPE", address: "0x5555555555555555555555555555555555555555", decimals: 18 },
    { symbol: "UBTC", address: "0x9FDBdA0A5e284c32744D2f17Ee5c74B284993463", decimals: 8 },
    { symbol: "USDe", address: "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34", decimals: 18 },
    { symbol: "USDT", address: "0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb", decimals: 6 },
    { symbol: "USR", address: "0x66E7c10e6f5C90B70C49F71B3Cf7E7a0eD5dD4fA", decimals: 18 },
    { symbol: "LHYPE", address: "0x5748ae796AE46A4F1348a1693de4b50560485562", decimals: 18 },
    { symbol: "stHYPE", address: "0xfFaA4a3D97fE9107Cef8a3F48c069F577Ff76cC1", decimals: 18 },
  ],
  143: [
    { symbol: "MON", address: NATIVE_ETH, decimals: 18, native: true },
    { symbol: "USDC", address: "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea", decimals: 6 },
    { symbol: "WETH", address: "0xB5a30b0FDc5EA94A52fDc42e3E9760Cb8449Fb37", decimals: 18 },
    { symbol: "WMON", address: "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701", decimals: 18 },
    { symbol: "AUSD", address: "0x5af9eD8A57Fa07A1fCeB5bB1eD50B11E4b5bF53D", decimals: 6 },
    { symbol: "USDT", address: "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D", decimals: 6 },
    { symbol: "WBTC", address: "0xcf5a6076cfa32686c0Df13aBaDa2b40dec133F1d", decimals: 8 },
  ],
  747474: [
    { symbol: "ETH", address: NATIVE_ETH, decimals: 18, native: true },
    { symbol: "USDC", address: "0x8Ff7Af1de8dC20cA3Eae3cf0bF4A93894706B7F4", decimals: 6 },
    { symbol: "WETH", address: "0xee7D8BCFb72bC1880D0Cf19822eB0A2e6577aB62", decimals: 18 },
    { symbol: "USDT", address: "0x2DCa96907fde857dd3D816880A0df407eeB2D2F2", decimals: 6 },
    { symbol: "WBTC", address: "0x0913dA6Da4b42f538B445599b46Bb4622342Cf52", decimals: 8 },
    { symbol: "AUSD", address: "0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a", decimals: 6 },
    { symbol: "KAT", address: "0x7F1f4b4b29f5058fA32CC7a97141b8D7e5abdC2d", decimals: 18 },
    { symbol: "vbUSDC", address: "0x203A662b0BD271A6ed5a60EdFbd04bFce608FD36", decimals: 6 },
    { symbol: "vbUSDT", address: "0x2DCa96907fde857dd3D816880A0df407eeB2D2F2", decimals: 6 },
    { symbol: "vbWBTC", address: "0x0913dA6Da4b42f538B445599b46Bb4622342Cf52", decimals: 8 },
    { symbol: "vbETH", address: "0xee7D8BCFb72bC1880D0Cf19822eB0A2e6577aB62", decimals: 18 },
  ],
};

import { DEPOSITABLE_CHAINS, YIELDO_ROUTERS } from "../chains.js";

// Public RPC endpoints for on-chain balance checks (lightweight parallel polling).
const PUBLIC_RPC = {
  1: "https://ethereum-rpc.publicnode.com",
  8453: "https://base.publicnode.com",
  42161: "https://arbitrum-one.publicnode.com",
  10: "https://optimism.publicnode.com",
  143: "https://rpc.monad.xyz",
  999: "https://rpc.hyperliquid.xyz/evm",
  747474: "https://rpc.katanarpc.com",
};

async function fetchERC20Balance(chainId, token, owner) {
  const rpc = PUBLIC_RPC[chainId];
  if (!rpc) return null;
  // balanceOf(address) selector = 0x70a08231
  const data = "0x70a08231" + "000000000000000000000000" + owner.slice(2).toLowerCase();
  try {
    const res = await fetch(rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "eth_call", params: [{ to: token, data }, "latest"], id: 1 }),
    });
    if (!res.ok) return null;
    const j = await res.json();
    if (!j.result || j.result === "0x") return 0n;
    return BigInt(j.result);
  } catch { return null; }
}

function isUserRejection(err) {
  const msg = (err?.shortMessage || err?.message || "").toLowerCase();
  return msg.includes("user rejected") || msg.includes("user denied")
    || msg.includes("rejected by user") || err?.code === 4001 || err?.code === "ACTION_REJECTED";
}

const C = {
  bg: "#f8f7fc", white: "#fff", black: "#121212",
  border: "rgba(0,0,0,.06)", border2: "rgba(0,0,0,.1)",
  text: "#121212", text2: "rgba(0,0,0,.65)", text3: "rgba(0,0,0,.4)", text4: "rgba(0,0,0,.25)",
  purple: "#7A1CCB", purpleLight: "#9E3BFF", purpleDim: "rgba(122,28,203,.06)",
  purpleGrad: "linear-gradient(100deg,#4B0CA6 0%,#7A1CCB 58%,#9E3BFF 114%)",
  purpleShadow: "0 0 17px rgba(80,14,170,.12)",
  green: "#1a9d3f", greenDim: "rgba(26,157,63,.07)",
  red: "#d93636", redBg: "#FFF0F0",
  amber: "#d97706",
};

const getExplorerTx = (chainId, hash) => `${EXPLORERS[chainId] || EXPLORERS[1]}/tx/${hash}`;

// Defense-in-depth: step-2 on-chain target MUST match a known Yieldo router.
// Imported from chains.js so adding a chain is a one-line change there.
const KNOWN_ROUTERS = YIELDO_ROUTERS;

function smartFmtAmount(raw, decimals = 6) {
  const n = Number(raw) / (10 ** decimals);
  if (n >= 1000) return n.toLocaleString("en", { maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(2);
  if (n >= 0.0001) return n.toFixed(4);
  return n.toExponential(2);
}
const getLifiExplorer = (hash) => `https://explorer.li.fi/tx/${hash}`;

function saveDepositLocal(deposit) {
  try {
    const key = "yieldo_deposits";
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    existing.unshift(deposit);
    if (existing.length > 100) existing.length = 100;
    localStorage.setItem(key, JSON.stringify(existing));
    // Notify TxTracker
    window.dispatchEvent(new Event("yieldo_deposit_update"));
  } catch {}
}

function DepositModal({ vault, onClose }) {
  const { address, isConnected, chainId: walletChainId } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { switchChain } = useSwitchChain();
  const { isAuthenticated, token: authToken, login: siweLogin, loading: authLoading } = useUserAuth();

  // Registration gate: the API now rejects /v1/quote/build without a valid
  // SIWE session, so we prompt-sign before the first build call if needed.
  const ensureAuth = useCallback(async () => {
    if (isAuthenticated && authToken) return authToken;
    const ok = await siweLogin();
    if (!ok) throw new Error("Please sign the wallet message to continue");
    const raw = localStorage.getItem("yieldo_user_session");
    try { return raw ? JSON.parse(raw).token : null; } catch { return null; }
  }, [isAuthenticated, authToken, siweLogin]);

  const vaultChainId = vault.chain_id;
  const vaultId = vault.id;
  const vaultAsset = (vault.assetLower || vault.asset || "").toLowerCase();
  const isDepositable = DEPOSITABLE_CHAINS.includes(vaultChainId);

  const [step, setStep] = useState("input");
  const [fromChainId, setFromChainId] = useState(vaultChainId);
  const [fromToken, setFromToken] = useState(null);
  const [amount, setAmount] = useState("");
  const [referral, setReferral] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("yieldo_referral") || "null");
      return stored?.handle || "";
    } catch { return ""; }
  });
  const [referralResolved, setReferralResolved] = useState(null);
  const [referralError, setReferralError] = useState("");
  const [referralLoading, setReferralLoading] = useState(false);
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState("");
  const [selectedRoute, setSelectedRoute] = useState(null);
  // Shared single-fetch hook — reuses the same /v1/vaults response as the rest
  // of the app (5-min cache + dedupe). No per-modal network call.
  const _depositMetaRaw = useDepositMeta(vaultId);
  const vaultMeta = _depositMetaRaw ? {
    min_deposit: _depositMetaRaw.min_deposit || null,
    no_minimum: !!_depositMetaRaw.no_minimum,
    asset_decimals: _depositMetaRaw.asset?.decimals ?? 6,
    asset_symbol: _depositMetaRaw.asset?.symbol || vaultAsset,
  } : null;
  const [txHash, setTxHash] = useState(null);
  const [approvalTxHash, setApprovalTxHash] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [buildData, setBuildData] = useState(null);
  const [lifiStatus, setLifiStatus] = useState(null);
  const referralTimer = useRef(null);
  const statusPollRef = useRef(null);
  // Pre-bridge balance of the destination token for this user, captured when
  // tracking begins. Used at step-2 to compute the ACTUAL delivered amount and
  // re-quote the intent against real delivery (not the pre-bridged prediction).
  const preBridgeBalanceRef = useRef(null);

  const allTokens = useMemo(() => ALL_TOKENS[fromChainId] || [], [fromChainId]);
  const popularSymbols = POPULAR_TOKENS[fromChainId] || [];
  const popularTokens = useMemo(() => allTokens.filter(t => popularSymbols.includes(t.symbol)), [allTokens, popularSymbols]);
  const dropdownTokens = useMemo(() => allTokens.filter(t => !popularSymbols.includes(t.symbol)), [allTokens, popularSymbols]);

  useEffect(() => {
    const tokens = ALL_TOKENS[fromChainId] || [];
    const match = tokens.find(t => t.symbol.toLowerCase() === vaultAsset);
    setFromToken(match || tokens[0] || null);
  }, [fromChainId]);

  // Single balance hook that handles BOTH native (ETH/HYPE/MON) and ERC-20.
  // wagmi's useBalance treats `token: undefined` as native — pass the token
  // address only when it's an actual contract. Without this branch, native
  // selections call balanceOf(0xeee...eee) which always returns "no balance".
  const { data: balanceData } = useBalance({
    address: isConnected && address ? address : undefined,
    chainId: fromChainId,
    token: fromToken && !fromToken.native ? fromToken.address : undefined,
    query: {
      enabled: !!isConnected && !!address && !!fromToken,
      staleTime: 30_000,
    },
  });

  const tokenBalance = useMemo(() => {
    if (!balanceData || !fromToken) return null;
    return { raw: balanceData.value, formatted: formatUnits(balanceData.value, fromToken.decimals) };
  }, [balanceData, fromToken]);

  // Referral resolution (debounced)
  useEffect(() => {
    if (referralTimer.current) clearTimeout(referralTimer.current);
    setReferralResolved(null);
    setReferralError("");
    const val = referral.trim();
    if (!val) return;
    if (/^0x[0-9a-fA-F]{40}$/.test(val)) {
      setReferralResolved({ handle: null, name: "Custom Address", address: val });
      return;
    }
    setReferralLoading(true);
    referralTimer.current = setTimeout(async () => {
      try {
        const kolRes = await fetch(`${API}/v1/kols/resolve/${encodeURIComponent(val)}`);
        if (kolRes.ok) {
          setReferralResolved(await kolRes.json());
          setReferralLoading(false);
          return;
        }
        // Fallback: per-user random referral code.
        const userRes = await fetch(`${API}/v1/users/resolve-ref/${encodeURIComponent(val.toUpperCase())}`);
        if (userRes.ok) {
          const u = await userRes.json();
          setReferralResolved({ handle: null, name: "Referral", address: u.address });
          setReferralLoading(false);
          return;
        }
        setReferralError("Referral code not found");
      } catch { setReferralError("Failed to resolve"); }
      setReferralLoading(false);
    }, 500);
    return () => clearTimeout(referralTimer.current);
  }, [referral]);

  const { writeContractAsync: writeApproval } = useWriteContract();
  const { sendTransactionAsync: sendDeposit } = useSendTransaction();

  const { isSuccess: approvalConfirmed } = useWaitForTransactionReceipt({
    hash: approvalTxHash, query: { enabled: !!approvalTxHash },
  });
  const { isSuccess: depositConfirmed } = useWaitForTransactionReceipt({
    hash: txHash, query: { enabled: !!txHash },
  });

  const [step2Status, setStep2Status] = useState(""); // "" | "switching" | "approving2" | "depositing2"

  useEffect(() => {
    if (approvalConfirmed && buildData && step === "approving") executeDepositWithBuild(buildData);
  }, [approvalConfirmed]);

  useEffect(() => {
    if (depositConfirmed && step === "tracking") {
      const isCrossChain = buildData?.tracking?.from_chain_id !== buildData?.tracking?.to_chain_id;
      if (!isCrossChain) finishDeposit("completed");
    }
  }, [depositConfirmed]);

  // Two-step: after step 2 deposit tx confirms
  const [step2TxHash, setStep2TxHash] = useState(null);
  const { isSuccess: step2Confirmed } = useWaitForTransactionReceipt({
    hash: step2TxHash, query: { enabled: !!step2TxHash },
  });
  useEffect(() => {
    if (step2Confirmed && step === "depositing_step2") finishDeposit("completed");
  }, [step2Confirmed]);

  const [step2ApprovalHash, setStep2ApprovalHash] = useState(null);
  const { isSuccess: step2ApprovalConfirmed } = useWaitForTransactionReceipt({
    hash: step2ApprovalHash, query: { enabled: !!step2ApprovalHash },
  });

  const [step2Retryable, setStep2Retryable] = useState(null); // "approve" | "deposit" | null
  // Fresh step-2 tx built against the actual bridge delivery (not the pre-bridge
  // prediction). Replaces buildData.deposit_tx, which is based on a pessimistic
  // to_amount_min that can be far below actual arrival for bridges like Mayan.
  const [freshStep2, setFreshStep2] = useState(null);

  // Build a fresh step-2 intent targeting the ACTUAL received amount. Called once,
  // the first time executeStep2 runs. Subsequent retries reuse it.
  const buildFreshStep2 = async () => {
    const destChainId = buildData.tracking.to_chain_id;
    const destToken = buildData.deposit_tx.approval.token_address;
    const preBal = preBridgeBalanceRef.current ?? 0n;
    const curBal = (await fetchERC20Balance(destChainId, destToken, address)) ?? 0n;
    const delta = curBal > preBal ? (curBal - preBal) : 0n;
    // Safety: if somehow delta is 0, fall back to the original buildData
    if (delta === 0n) {
      console.warn("[step2] no balance delta detected, using original intent");
      return { ...buildData.deposit_tx };
    }
    console.log("[step2] actual delivery:", delta.toString(), "on chain", destChainId);

    // Re-quote as a same-chain deposit using actual delivered amount
    const qRes = await fetch(`${API}/v1/quote`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from_chain_id: destChainId, from_token: destToken,
        from_amount: delta.toString(), vault_id: vaultId,
        user_address: address, slippage: 0.03,
        referrer: referralResolved?.address || undefined,
      }),
    });
    if (!qRes.ok) throw new Error("Fresh step-2 quote failed: " + qRes.status);
    const q = await qRes.json();

    const sessionToken = await ensureAuth();
    const bRes = await fetch(`${API}/v1/quote/build`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
      },
      body: JSON.stringify({
        from_chain_id: destChainId, from_token: destToken,
        from_amount: delta.toString(), vault_id: vaultId,
        user_address: address, slippage: 0.03,
        referrer: referralResolved?.address || undefined,
        referrer_handle: referralResolved?.handle || undefined,
        partner_id: referralResolved?.handle || "",
        partner_type: referralResolved?.handle ? 1 : 0,
        // Link this step-2 record back to its parent bridge so HistoryPage
        // can show one card with both legs instead of two separate entries.
        parent_tracking_id: buildData?.tracking_id,
      }),
    });
    if (!bRes.ok) throw new Error("Fresh step-2 build failed: " + bRes.status);
    const b = await bRes.json();
    return {
      transaction_request: b.transaction_request,
      approval: b.approval,
      tracking_id: b.tracking_id, // capture so sendStep2Deposit can PATCH the tx_hash
    };
  };

  // Two-step: execute deposit on dest chain after bridge completes
  const executeStep2 = async () => {
    if (!buildData?.deposit_tx) return;
    const destChainId = buildData.tracking.to_chain_id;
    setStep("depositing_step2");
    setStep2Retryable(null);
    try {
      if (walletChainId !== destChainId) {
        setStep2Status("switching");
        await switchChain({ chainId: destChainId });
        await new Promise(r => setTimeout(r, 1500));
      }
      // Build (or reuse) a fresh step-2 intent against the actual bridged amount
      let step2 = freshStep2;
      if (!step2) {
        setStep2Status("requoting");
        step2 = await buildFreshStep2();
        setFreshStep2(step2);
      }
      if (step2.approval && BigInt(step2.approval.amount) > 0n) {
        setStep2Status("approving2");
        const appHash = await writeApproval({
          address: step2.approval.token_address, abi: erc20Abi, functionName: "approve",
          args: [step2.approval.spender_address, BigInt(step2.approval.amount)], chainId: destChainId,
        });
        setStep2ApprovalHash(appHash);
        return; // Wait for approval confirmation via useEffect below
      }
      await sendStep2Deposit(step2);
    } catch (e) {
      if (isUserRejection(e)) {
        setStep2Status("rejected-approve");
        setStep2Retryable("approve");
        return;
      }
      setErrorMsg(e.shortMessage || e.message || "Step 2 failed");
      setStep("error");
    }
  };

  const sendStep2Deposit = async (step2Arg) => {
    try {
      setStep2Status("depositing2");
      setStep2Retryable(null);
      const step2 = step2Arg || freshStep2 || buildData?.deposit_tx;
      const txReq = step2.transaction_request;
      const expectedRouter = KNOWN_ROUTERS[txReq.chain_id];
      if (!expectedRouter || txReq.to.toLowerCase() !== expectedRouter.toLowerCase()) {
        throw new Error(`Step-2 target ${txReq.to} does not match known Yieldo router on chain ${txReq.chain_id}. Aborting for safety.`);
      }
      const hash = await sendDeposit({ to: txReq.to, data: txReq.data, value: BigInt(txReq.value || "0"), chainId: txReq.chain_id });
      setStep2TxHash(hash);
      // Close the loop with our backend so the step-2 tracking record (created by
      // freshStep2 build) gets its tx_hash and HistoryPage's poll can resolve it.
      // Without this, step 2 stays "pending" forever even after on-chain success.
      if (step2.tracking_id) {
        fetch(`${API}/v1/deposits/${step2.tracking_id}/tx`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tx_hash: hash }),
        }).catch(() => {});
      }
    } catch (e) {
      if (isUserRejection(e)) {
        setStep2Status("rejected-deposit");
        setStep2Retryable("deposit");
        return;
      }
      setErrorMsg(e.shortMessage || e.message || "Deposit failed");
      setStep("error");
    }
  };

  const retryStep2 = () => {
    setStep2Retryable(null);
    if (step2Retryable === "approve") executeStep2();
    else if (step2Retryable === "deposit") sendStep2Deposit();
  };

  useEffect(() => {
    if (step2ApprovalConfirmed && step === "depositing_step2") sendStep2Deposit();
  }, [step2ApprovalConfirmed]);

  // Dual-track cross-chain arrival: poll LiFi status AND check destination-chain
  // balance delta. Whichever trips first wins. On-chain detection covers the case
  // where bridge delivers funds before LiFi's indexer catches up (seen in practice).
  useEffect(() => {
    if (step !== "tracking" || !txHash || !buildData) return;
    const isCrossChain = buildData.tracking?.from_chain_id !== buildData.tracking?.to_chain_id;
    if (!isCrossChain) return;
    const isTwoStep = buildData.two_step;
    const destChainId = buildData.tracking.to_chain_id;
    const destToken = buildData.deposit_tx?.approval?.token_address;
    const expectedMin = BigInt(buildData.deposit_tx?.approval?.amount || "0");

    let settled = false;

    const proceedAfterArrival = (reason) => {
      if (settled) return;
      settled = true;
      clearTimeout(statusPollRef.current);
      console.log("[bridge arrival detected via:", reason + "]");
      if (isTwoStep) { executeStep2(); return; }
      finishDeposit("completed");
    };

    const checkOnchain = async () => {
      if (!destToken || !address || isTwoStep === false) return false;
      const bal = await fetchERC20Balance(destChainId, destToken, address);
      if (bal === null) return false;
      if (preBridgeBalanceRef.current === null) { preBridgeBalanceRef.current = bal; return false; }
      if (bal > preBridgeBalanceRef.current && (bal - preBridgeBalanceRef.current) >= expectedMin) {
        proceedAfterArrival("on-chain balance delta");
        return true;
      }
      return false;
    };

    const checkLifi = async () => {
      try {
        const params = new URLSearchParams({
          tx_hash: txHash,
          from_chain_id: String(buildData.tracking.from_chain_id),
          to_chain_id: String(destChainId),
        });
        const res = await fetch(`${API}/v1/status?${params}`);
        if (!res.ok) return false;
        const data = await res.json();
        setLifiStatus(data);
        if (data.status === "DONE" && data.substatus === "PARTIAL") {
          if (!settled) { settled = true; finishDeposit("partial"); }
          return true;
        }
        if (data.status === "DONE") { proceedAfterArrival("LiFi status"); return true; }
        if (data.status === "FAILED") {
          if (!settled) { settled = true; finishDeposit("failed"); }
          return true;
        }
      } catch {}
      return false;
    };

    const poll = async () => {
      if (settled) return;
      const done = (await checkLifi()) || (await checkOnchain());
      if (!done) statusPollRef.current = setTimeout(poll, 6000);
    };

    // Seed balBefore immediately to avoid counting pre-existing tokens
    checkOnchain();
    statusPollRef.current = setTimeout(poll, 4000);
    return () => { settled = true; clearTimeout(statusPollRef.current); };
  }, [step, txHash, buildData]);

  const finishDeposit = (status) => {
    clearTimeout(statusPollRef.current);
    saveDepositLocal({
      tx_hash: txHash, vault_id: vaultId, vault_name: vault.name,
      from_chain_id: fromChainId, to_chain_id: vaultChainId,
      from_token: fromToken?.symbol, from_amount: amount,
      referrer: referralResolved?.address || "",
      referrer_handle: referralResolved?.handle || "",
      quote_type: quote?.quote_type || "direct", status,
      created_at: new Date().toISOString(),
    });
    if (status === "partial") { setStep("partial"); return; }
    setStep(status === "completed" ? "done" : "error");
    if (status === "failed") setErrorMsg("Cross-chain transfer failed. Check LiFi explorer for details.");
  };

  const fetchQuote = useCallback(async () => {
    if (!fromToken || !amount || !address) return;
    setStep("quoting"); setQuoteError("");
    try {
      const res = await fetch(`${API}/v1/quote`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from_chain_id: fromChainId, from_token: fromToken.address,
          from_amount: parseUnits(amount, fromToken.decimals).toString(),
          vault_id: vaultId, user_address: address, slippage: 0.03,
          referrer: referralResolved?.address || "0x0000000000000000000000000000000000000000",
        }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || `Quote failed (${res.status})`); }
      const q = await res.json();
      setQuote(q);
      // Auto-select best route (first RECOMMENDED, then CHEAPEST, then first)
      if (q.route_options?.length) {
        const best = q.route_options.find(r => r.tags?.includes("RECOMMENDED"))
          || q.route_options.find(r => r.tags?.includes("CHEAPEST"))
          || q.route_options[0];
        setSelectedRoute(best.bridge);
      } else {
        setSelectedRoute(null);
      }
      setStep("review");
    } catch (e) { setQuoteError(e.message); setStep("input"); }
  }, [fromToken, amount, address, fromChainId, vaultId, referralResolved]);

  const executeBuild = useCallback(async () => {
    if (!quote || !fromToken || !address) return;
    setStep("approving"); setErrorMsg("");
    try {
      let sessionToken;
      try { sessionToken = await ensureAuth(); }
      catch (e) { setErrorMsg(e.message || "Sign-in required"); setStep("input"); return; }
      const res = await fetch(`${API}/v1/quote/build`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
        },
        body: JSON.stringify({
          from_chain_id: fromChainId, from_token: fromToken.address,
          from_amount: parseUnits(amount, fromToken.decimals).toString(),
          vault_id: vaultId, user_address: address, slippage: 0.03,
          referrer: referralResolved?.address || "0x0000000000000000000000000000000000000000",
          referrer_handle: referralResolved?.handle || "",
          preferred_bridge: selectedRoute || undefined,
          partner_id: referralResolved?.handle || "",
          partner_type: referralResolved?.handle ? 1 : 0,
        }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || `Build failed (${res.status})`); }
      const build = await res.json();
      setBuildData(build);
      if (build.approval) {
        const hash = await writeApproval({
          address: build.approval.token_address, abi: erc20Abi, functionName: "approve",
          args: [build.approval.spender_address, BigInt(build.approval.amount)], chainId: fromChainId,
        });
        setApprovalTxHash(hash);
      } else {
        await executeDepositWithBuild(build);
      }
    } catch (e) { setErrorMsg(e.message || "Transaction failed"); setStep("error"); }
  }, [quote, fromToken, address, fromChainId, amount, vaultId, referralResolved, selectedRoute]);

  const executeDepositWithBuild = async (build) => {
    try {
      setStep("sending");
      const txReq = build.transaction_request;
      const hash = await sendDeposit({ to: txReq.to, data: txReq.data, value: BigInt(txReq.value || "0"), chainId: txReq.chain_id });
      setTxHash(hash);
      // Close the loop with our backend so HistoryPage sees the tx_hash and
      // /v1/status's poll can transition it pending -> completed/failed.
      if (build.tracking_id) {
        fetch(`${API}/v1/deposits/${build.tracking_id}/tx`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tx_hash: hash }),
        }).catch(() => {});
      }
      setStep("tracking");
    } catch (e) { setErrorMsg(e.message || "Transaction failed"); setStep("error"); }
  };

  const needsChainSwitch = isConnected && walletChainId !== fromChainId;
  const amountBigInt = useMemo(() => {
    if (!amount || !fromToken) return 0n;
    try { return parseUnits(amount, fromToken.decimals); } catch { return 0n; }
  }, [amount, fromToken]);
  const insufficientBalance = tokenBalance && amountBigInt > tokenBalance.raw;
  const canQuote = isConnected && fromToken && amount && parseFloat(amount) > 0 && !insufficientBalance && !needsChainSwitch;

  const txChainId = buildData?.transaction_request?.chain_id || fromChainId;
  const isCrossChain = buildData && buildData.tracking?.from_chain_id !== buildData.tracking?.to_chain_id;

  if (!isDepositable) {
    return (
      <Overlay onClose={onClose}>
        <div style={{ textAlign: "center", padding: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🚧</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Deposits Not Available</div>
          <div style={{ fontSize: 14, color: C.text3, marginBottom: 20 }}>
            This vault is on {CHAINS[vaultChainId] || `Chain ${vaultChainId}`} which doesn't have our deposit router deployed yet.
          </div>
          <ActionBtn onClick={onClose}>Close</ActionBtn>
        </div>
      </Overlay>
    );
  }

  return (
    <Overlay onClose={onClose}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: `1px solid ${C.border}` }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Deposit</div>
          <div style={{ fontSize: 12, color: C.text3 }}>{vault.name} · {CHAINS[vaultChainId]}</div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: C.text3, padding: 4 }}>✕</button>
      </div>

      <div style={{ padding: 20 }}>
        {step === "input" && (
          <InputStep
            fromChainId={fromChainId} setFromChainId={setFromChainId}
            fromToken={fromToken} setFromToken={setFromToken}
            popularTokens={popularTokens} dropdownTokens={dropdownTokens}
            amount={amount} setAmount={setAmount} tokenBalance={tokenBalance}
            referral={referral} setReferral={setReferral}
            referralResolved={referralResolved} referralError={referralError} referralLoading={referralLoading}
            vaultChainId={vaultChainId} vaultAsset={vaultAsset} vaultMeta={vaultMeta}
            isConnected={isConnected} openConnectModal={openConnectModal}
            needsChainSwitch={needsChainSwitch} switchChain={switchChain} fromChainName={CHAINS[fromChainId]}
            insufficientBalance={insufficientBalance} canQuote={canQuote}
            onQuote={fetchQuote} quoteError={quoteError}
          />
        )}

        {step === "quoting" && <StatusPane icon={<Spinner />} title="Fetching quote..." />}

        {step === "review" && quote && (
          <ReviewStep quote={quote} fromToken={fromToken} amount={amount} vault={vault}
            referralResolved={referralResolved} onConfirm={executeBuild} onBack={() => setStep("input")}
            selectedRoute={selectedRoute} onSelectRoute={setSelectedRoute}
            vaultId={vaultId} fromChainId={fromChainId} fromTokenAddress={fromToken?.address} />
        )}

        {step === "approving" && (
          <>
            {buildData?.two_step && <TwoStepProgress step={step} step2Status={step2Status} lifiStatus={lifiStatus} />}
            <StatusPane icon={<Spinner />} title="Approving token..." sub="Confirm the approval in your wallet">
              {approvalTxHash && <ExplorerLinks chainId={fromChainId} hash={approvalTxHash} />}
            </StatusPane>
          </>
        )}

        {step === "sending" && (
          <>
            {buildData?.two_step && <TwoStepProgress step={step} step2Status={step2Status} lifiStatus={lifiStatus} />}
            <StatusPane icon={<Spinner />} title={buildData?.two_step ? "Sending bridge..." : "Sending deposit..."} sub="Confirm the transaction in your wallet" />
          </>
        )}

        {step === "depositing_step2" && step2Retryable && (
          <>
            <TwoStepProgress step={step} step2Status={step2Status} lifiStatus={lifiStatus} />
            <StatusPane icon={<div style={{ fontSize: 40 }}>⏸️</div>} title={step2Retryable === "approve" ? "Approval cancelled" : "Deposit cancelled"} sub={
              step2Retryable === "approve"
                ? "You closed the wallet before approving. Your bridged tokens are safely in your wallet — retry whenever you're ready."
                : "You closed the wallet before confirming the deposit. Your bridged tokens are safely in your wallet — retry whenever you're ready."
            }>
              <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}><ActionBtn secondary onClick={onClose}>Close</ActionBtn></div>
                <div style={{ flex: 2 }}><ActionBtn onClick={retryStep2}>
                  {step2Retryable === "approve" ? "Retry approval" : "Retry deposit"}
                </ActionBtn></div>
              </div>
            </StatusPane>
          </>
        )}

        {step === "depositing_step2" && !step2Retryable && (
          <>
            <TwoStepProgress step={step} step2Status={step2Status} lifiStatus={lifiStatus} />
            <StatusPane icon={<Spinner />} title="Depositing into vault..." sub={
              step2Status === "switching" ? "Switching to destination chain..." :
              step2Status === "requoting" ? "Computing exact deposit amount from your bridged balance..." :
              step2Status === "approving2" ? "Approving token — confirm in wallet" :
              "Sending deposit transaction — confirm in wallet"
            }>
              {txHash && <ExplorerLinks chainId={txChainId} hash={txHash} isCrossChain={true} />}
              <div style={{ marginTop: 8, padding: "8px 12px", borderRadius: 8, background: C.bg, fontSize: 11, color: C.green }}>
                Bridge complete — now depositing via Yieldo router on {CHAINS[buildData?.tracking?.to_chain_id] || "destination chain"}
              </div>
            </StatusPane>
          </>
        )}

        {step === "tracking" && buildData?.two_step && <TwoStepProgress step={step} step2Status={step2Status} lifiStatus={lifiStatus} />}
        {step === "tracking" && (
          <StatusPane icon={<Spinner />} title={buildData?.two_step ? "Bridging tokens..." : "Transaction submitted"} sub={
            buildData?.two_step ? `Bridging to ${CHAINS[buildData?.tracking?.to_chain_id] || "destination"} — vault deposit will follow automatically`
            : isCrossChain ? "Bridging in progress — this may take a few minutes"
            : "Waiting for on-chain confirmation..."
          }>
            {txHash && <ExplorerLinks chainId={txChainId} hash={txHash} isCrossChain={isCrossChain} />}
            {isCrossChain && lifiStatus && (
              <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, background: C.bg, fontSize: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: C.text3 }}>Bridge status</span>
                  <StatusBadge status={lifiStatus.status} />
                </div>
                {lifiStatus.bridge && <div style={{ color: C.text4, fontSize: 11 }}>via {lifiStatus.bridge}</div>}
                {lifiStatus.sending?.tx_hash && (
                  <div style={{ marginTop: 4, fontSize: 11 }}>
                    <span style={{ color: C.text3 }}>Sending: </span>
                    <a href={getExplorerTx(lifiStatus.sending.chain_id || fromChainId, lifiStatus.sending.tx_hash)} target="_blank" rel="noopener noreferrer" style={{ color: C.purple, textDecoration: "none" }}>
                      {lifiStatus.sending.tx_hash.slice(0, 10)}... ↗
                    </a>
                  </div>
                )}
                {lifiStatus.receiving?.tx_hash && (
                  <div style={{ marginTop: 2, fontSize: 11 }}>
                    <span style={{ color: C.text3 }}>Receiving: </span>
                    <a href={getExplorerTx(lifiStatus.receiving.chain_id || vaultChainId, lifiStatus.receiving.tx_hash)} target="_blank" rel="noopener noreferrer" style={{ color: C.purple, textDecoration: "none" }}>
                      {lifiStatus.receiving.tx_hash.slice(0, 10)}... ↗
                    </a>
                  </div>
                )}
              </div>
            )}
          </StatusPane>
        )}

        {step === "done" && (
          <StatusPane icon={<div style={{ fontSize: 48 }}>✅</div>} title="Deposit Successful!" sub={`${amount} ${fromToken?.symbol} deposited into ${vault.name}`}>
            {txHash && <ExplorerLinks chainId={txChainId} hash={txHash} isCrossChain={isCrossChain} />}
            {lifiStatus?.receiving?.tx_hash && (
              <div style={{ marginTop: 4, fontSize: 12 }}>
                <a href={getExplorerTx(vaultChainId, lifiStatus.receiving.tx_hash)} target="_blank" rel="noopener noreferrer" style={{ color: C.green, textDecoration: "none" }}>
                  View destination tx ↗
                </a>
              </div>
            )}
            <div style={{ marginTop: 20 }}><ActionBtn onClick={onClose}>Done</ActionBtn></div>
          </StatusPane>
        )}

        {step === "partial" && (
          <StatusPane icon={<div style={{ fontSize: 48 }}>⚠️</div>} title="Bridge Succeeded, Vault Deposit Failed">
            <div style={{ fontSize: 13, color: C.amber, marginBottom: 12, textAlign: "left", lineHeight: 1.5 }}>
              Your tokens were bridged to {CHAINS[vaultChainId] || "the destination chain"} but the vault deposit didn't go through.
              <strong> Your funds are safe in your wallet</strong> on {CHAINS[vaultChainId]}.
            </div>
            {lifiStatus?.receiving?.amount && (
              <div style={{ padding: "10px 14px", borderRadius: 8, background: C.bg, fontSize: 13, marginBottom: 12 }}>
                <span style={{ color: C.text3 }}>Received: </span>
                <span style={{ fontWeight: 700 }}>{smartFmtAmount(lifiStatus.receiving.amount, 6)} {fromToken?.symbol || "tokens"}</span>
                <span style={{ color: C.text3 }}> on {CHAINS[lifiStatus.receiving.chain_id] || "dest chain"}</span>
              </div>
            )}
            {txHash && <ExplorerLinks chainId={txChainId} hash={txHash} isCrossChain={true} />}
            {lifiStatus?.receiving?.tx_hash && (
              <div style={{ marginTop: 4, fontSize: 12 }}>
                <a href={getExplorerTx(vaultChainId, lifiStatus.receiving.tx_hash)} target="_blank" rel="noopener noreferrer" style={{ color: C.purple, textDecoration: "none" }}>
                  View receiving tx on {CHAINS[vaultChainId]} ↗
                </a>
              </div>
            )}
            <div style={{ marginTop: 16, fontSize: 11, color: C.text3, textAlign: "left" }}>
              You can deposit directly from {CHAINS[vaultChainId]} by selecting it as source chain and using the same token.
            </div>
            <div style={{ marginTop: 12 }}><ActionBtn onClick={onClose}>Close</ActionBtn></div>
          </StatusPane>
        )}

        {step === "error" && (
          <StatusPane icon={<div style={{ fontSize: 48 }}>❌</div>} title="Transaction Failed">
            <div style={{ fontSize: 13, color: C.red, marginBottom: 16, wordBreak: "break-word", maxHeight: 80, overflow: "auto", textAlign: "left" }}>{errorMsg}</div>
            {txHash && <ExplorerLinks chainId={txChainId} hash={txHash} isCrossChain={isCrossChain} />}
            <div style={{ marginTop: 16 }}>
              <ActionBtn onClick={() => { setStep("input"); setErrorMsg(""); setQuote(null); setBuildData(null); setApprovalTxHash(null); setTxHash(null); setLifiStatus(null); }}>Try Again</ActionBtn>
            </div>
          </StatusPane>
        )}
      </div>
    </Overlay>
  );
}

/* =========== Sub-components =========== */

function Overlay({ children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
      <div style={{ background: C.white, borderRadius: 16, width: "100%", maxWidth: 440, maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.2)", fontFamily: "'Inter',sans-serif" }}>
        {children}
      </div>
    </div>
  );
}

function Spinner() {
  return <div style={{ width: 32, height: 32, border: `3px solid ${C.border}`, borderTopColor: C.purple, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto" }}>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>;
}

function StatusPane({ icon, title, sub, children }) {
  return (
    <div style={{ textAlign: "center", padding: "30px 0" }}>
      {icon}
      <div style={{ fontSize: 15, fontWeight: 700, marginTop: 12 }}>{title}</div>
      {sub && <div style={{ fontSize: 12, color: C.text3, marginTop: 4 }}>{sub}</div>}
      {children}
    </div>
  );
}

// Stepper shown during two-step cross-chain deposits so users always know
// which on-chain action they're in and what's still to come.
function TwoStepProgress({ step, step2Status, lifiStatus }) {
  const bridgeStatus = lifiStatus?.status;
  // Active step index: 0=approve, 1=bridge-sign, 2=bridge-wait, 3=approve-dest, 4=deposit
  let active = 0;
  if (step === "approving") active = 0;
  else if (step === "sending") active = 1;
  else if (step === "tracking") active = 2;
  else if (step === "depositing_step2") {
    if (step2Status === "switching" || step2Status === "approving2") active = 3;
    else active = 4;
  } else if (step === "done" || step === "partial") active = 5;

  const items = [
    { label: "Approve source token" },
    { label: "Bridge tokens" },
    { label: bridgeStatus === "DONE" ? "Bridge arrived" : "Wait for bridge arrival" },
    { label: "Approve on destination" },
    { label: "Deposit into vault via Yieldo" },
  ];

  return (
    <div style={{ padding: "14px 16px", borderRadius: 10, background: C.bg, border: `1px solid ${C.border}`, marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: C.text3, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>
        Two-step bridge deposit
      </div>
      {items.map((it, i) => {
        const done = i < active;
        const current = i === active;
        const dotColor = done ? C.green : current ? C.purple : C.text4;
        const labelColor = done ? C.text2 : current ? C.text : C.text4;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
            <div style={{
              width: 18, height: 18, borderRadius: 9, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: done ? C.green : "transparent",
              border: `2px solid ${dotColor}`,
              color: "#fff", fontSize: 11, fontWeight: 700,
            }}>
              {done ? "✓" : current ? <span style={{ width: 6, height: 6, borderRadius: 3, background: C.purple, display: "block" }} /> : ""}
            </div>
            <span style={{ fontSize: 12, fontWeight: current ? 600 : 400, color: labelColor }}>{it.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function ExplorerLinks({ chainId, hash, isCrossChain }) {
  return (
    <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 10, flexWrap: "wrap" }}>
      <a href={getExplorerTx(chainId, hash)} target="_blank" rel="noopener noreferrer"
        style={{ fontSize: 12, color: C.purple, textDecoration: "none" }}>
        {CHAINS[chainId] || "Chain"} Explorer ↗
      </a>
      {isCrossChain && (
        <a href={getLifiExplorer(hash)} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 12, color: C.purple, textDecoration: "none" }}>
          LiFi Explorer ↗
        </a>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = { DONE: { c: C.green, t: "Completed" }, FAILED: { c: C.red, t: "Failed" }, PENDING: { c: C.amber, t: "Pending" }, NOT_FOUND: { c: C.text4, t: "Waiting..." } };
  const s = map[status] || map.NOT_FOUND;
  return <span style={{ fontSize: 11, fontWeight: 600, color: s.c }}>{s.t}</span>;
}

function ActionBtn({ onClick, disabled, children, secondary }) {
  const base = { width: "100%", padding: "12px 20px", borderRadius: 10, border: "none", cursor: disabled ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 600, fontFamily: "'Inter',sans-serif", transition: "all .15s" };
  if (secondary) return <button onClick={onClick} disabled={disabled} style={{ ...base, background: C.bg, color: C.text2, border: `1px solid ${C.border2}` }}>{children}</button>;
  if (disabled) return <button onClick={onClick} disabled style={{ ...base, background: "rgba(0,0,0,.08)", color: "rgba(0,0,0,.25)" }}>{children}</button>;
  return <button onClick={onClick} style={{ ...base, background: C.purpleGrad, color: "#fff", boxShadow: C.purpleShadow }}>{children}</button>;
}

function InputStep({
  fromChainId, setFromChainId, fromToken, setFromToken,
  popularTokens, dropdownTokens,
  amount, setAmount, tokenBalance,
  referral, setReferral, referralResolved, referralError, referralLoading,
  vaultChainId, vaultAsset, vaultMeta,
  isConnected, openConnectModal, needsChainSwitch, switchChain, fromChainName,
  insufficientBalance, canQuote, onQuote, quoteError,
}) {
  const [showMore, setShowMore] = useState(false);
  const isDirect = fromChainId === vaultChainId && fromToken?.symbol?.toLowerCase() === vaultAsset;

  // Min deposit is expressed in the vault's asset units. Only enforce client-side
  // when the user is depositing the SAME asset — otherwise the post-bridge amount
  // is unknown and the API re-validates with the real LiFi quote.
  const minDepositRaw = vaultMeta?.min_deposit ? BigInt(vaultMeta.min_deposit) : null;
  const minDepositHuman = minDepositRaw && vaultMeta
    ? Number(minDepositRaw) / Math.pow(10, vaultMeta.asset_decimals || 6)
    : null;
  const sameAssetAsVault = fromToken?.symbol?.toLowerCase() === vaultAsset;
  const amountNum = parseFloat(amount || "0");
  const belowMin = minDepositHuman && sameAssetAsVault && amountNum > 0 && amountNum < minDepositHuman;
  return (
    <div>
      <Label>From Chain</Label>
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {Object.entries(CHAINS).map(([id, name]) => (
          <ChipBtn key={id} active={fromChainId === Number(id)} onClick={() => setFromChainId(Number(id))}>
            <span style={{ fontSize: 11 }}>{CHAIN_ICONS[id] || ""}</span> {name}
          </ChipBtn>
        ))}
      </div>

      <Label>Token {vaultAsset && <span style={{ fontSize: 11, color: C.text3, fontWeight: 400, marginLeft: 6 }}>— vault accepts <strong style={{ color: C.green, textTransform: "uppercase" }}>{vaultAsset}</strong></span>}</Label>
      <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
        {popularTokens.map(t => {
          const matchesAsset = t.symbol.toLowerCase() === vaultAsset;
          const isDirect = matchesAsset && fromChainId === vaultChainId;
          return (
            <ChipBtn key={t.symbol} active={fromToken?.symbol === t.symbol} onClick={() => { setFromToken(t); setShowMore(false); }}>
              {t.symbol}
              {isDirect && <span style={{ fontSize: 9, marginLeft: 4, padding: "1px 5px", borderRadius: 3, background: C.greenDim, color: C.green, fontWeight: 700 }}>DIRECT</span>}
              {matchesAsset && !isDirect && <span style={{ fontSize: 9, marginLeft: 4, padding: "1px 5px", borderRadius: 3, background: C.purpleDim, color: C.purple, fontWeight: 700 }}>SAME</span>}
            </ChipBtn>
          );
        })}
        {dropdownTokens.length > 0 && (
          <div style={{ position: "relative" }}>
            <ChipBtn active={showMore || dropdownTokens.some(t => t.symbol === fromToken?.symbol)} onClick={() => setShowMore(!showMore)}>
              {dropdownTokens.some(t => t.symbol === fromToken?.symbol) ? fromToken.symbol : "More"} ▾
            </ChipBtn>
            {showMore && (
              <div style={{
                position: "absolute", top: "100%", left: 0, marginTop: 4, zIndex: 10,
                background: C.white, borderRadius: 10, border: `1px solid ${C.border2}`,
                boxShadow: "0 8px 24px rgba(0,0,0,.12)", minWidth: 160, overflow: "hidden",
              }}>
                {dropdownTokens.map(t => {
                  const matchesAsset = t.symbol.toLowerCase() === vaultAsset;
                  const isDirect = matchesAsset && fromChainId === vaultChainId;
                  return (
                    <button key={t.symbol} onClick={() => { setFromToken(t); setShowMore(false); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 8, width: "100%",
                        padding: "10px 14px", border: "none", background: fromToken?.symbol === t.symbol ? C.purpleDim : "transparent",
                        cursor: "pointer", fontSize: 13, fontFamily: "'Inter',sans-serif",
                        color: fromToken?.symbol === t.symbol ? C.purple : C.text,
                        fontWeight: fromToken?.symbol === t.symbol ? 600 : 400,
                        borderBottom: `1px solid ${C.border}`,
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = C.bg}
                      onMouseLeave={e => e.currentTarget.style.background = fromToken?.symbol === t.symbol ? C.purpleDim : "transparent"}>
                      <span style={{ width: 20, height: 20, borderRadius: "50%", background: C.purpleDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: C.purple }}>{t.symbol[0]}</span>
                      {t.symbol}
                      {isDirect && <span style={{ fontSize: 9, marginLeft: "auto", padding: "1px 5px", borderRadius: 3, background: C.greenDim, color: C.green, fontWeight: 700 }}>DIRECT</span>}
                      {matchesAsset && !isDirect && <span style={{ fontSize: 9, marginLeft: "auto", padding: "1px 5px", borderRadius: 3, background: C.purpleDim, color: C.purple, fontWeight: 700 }}>SAME</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <Label>
        Amount
        {tokenBalance && (
          <span style={{ fontSize: 11, color: C.text3, fontWeight: 400, marginLeft: 8 }}>
            Bal: {parseFloat(tokenBalance.formatted).toFixed(4)}
            <button onClick={() => setAmount(tokenBalance.formatted)} style={{ marginLeft: 4, fontSize: 10, color: C.purple, background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontFamily: "'Inter',sans-serif" }}>MAX</button>
          </span>
        )}
        {minDepositHuman ? (
          <span style={{ fontSize: 11, color: C.text3, fontWeight: 400, marginLeft: 8 }}>
            Min: <strong style={{ color: C.text }}>{minDepositHuman.toLocaleString()} {vaultAsset.toUpperCase()}</strong>
          </span>
        ) : vaultMeta?.no_minimum ? (
          <span style={{ fontSize: 11, color: C.green, fontWeight: 500, marginLeft: 8 }}>
            No minimum
          </span>
        ) : vaultMeta ? (
          <span style={{ fontSize: 11, color: C.text4, fontWeight: 400, marginLeft: 8 }}>
            Min: <em>unknown</em>
          </span>
        ) : null}
      </Label>
      <input type="text" inputMode="decimal" value={amount}
        onChange={e => { if (/^\d*\.?\d*$/.test(e.target.value)) setAmount(e.target.value); }}
        placeholder="0.00"
        style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${insufficientBalance || belowMin ? C.red : C.border2}`, fontSize: 16, fontFamily: "'Inter',sans-serif", outline: "none", boxSizing: "border-box", background: C.bg }} />
      {insufficientBalance && <div style={{ fontSize: 11, color: C.red, marginTop: 4 }}>Insufficient balance</div>}
      {belowMin && <div style={{ fontSize: 11, color: C.red, marginTop: 4 }}>Below minimum deposit ({minDepositHuman.toLocaleString()} {vaultAsset.toUpperCase()})</div>}
      {minDepositHuman && !sameAssetAsVault && (
        <div style={{ fontSize: 11, color: C.text3, marginTop: 4 }}>
          Vault requires ~{minDepositHuman.toLocaleString()} {vaultAsset.toUpperCase()} after bridging/swap.
        </div>
      )}

      {fromToken && (
        <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, background: isDirect ? C.greenDim : C.bg, fontSize: 12, color: isDirect ? C.green : C.text3, display: "flex", alignItems: "center", gap: 6 }}>
          {isDirect && <span style={{ fontWeight: 700 }}>Direct deposit</span>}
          {isDirect ? " — no swap or bridge needed"
            : fromChainId === vaultChainId ? `Same-chain swap via LiFi \u2192 ${vaultAsset.toUpperCase()}`
            : `Cross-chain bridge via LiFi \u2192 ${CHAINS[vaultChainId]} ${vaultAsset.toUpperCase()}`}
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <Label>Referral (optional)</Label>
        <input type="text" value={referral} onChange={e => setReferral(e.target.value)} placeholder="KOL username or 0x address"
          style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border2}`, fontSize: 13, fontFamily: "'Inter',sans-serif", outline: "none", boxSizing: "border-box", background: C.bg }} />
        {referralLoading && <div style={{ fontSize: 11, color: C.text4, marginTop: 4 }}>Resolving...</div>}
        {referralResolved && !referralError && (
          <div style={{ fontSize: 11, color: C.green, marginTop: 4 }}>
            {referralResolved.handle ? `@${referralResolved.handle} (${referralResolved.name})` : `Address: ${referralResolved.address.slice(0, 8)}...`}
          </div>
        )}
        {referralError && <div style={{ fontSize: 11, color: C.red, marginTop: 4 }}>{referralError}</div>}
      </div>

      {quoteError && <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, background: C.redBg, fontSize: 12, color: C.red }}>{quoteError}</div>}

      <div style={{ marginTop: 20 }}>
        {!isConnected ? <ActionBtn onClick={openConnectModal}>Connect Wallet</ActionBtn>
          : needsChainSwitch ? (
            <ActionBtn onClick={() => switchChain({ chainId: fromChainId })}>
              Switch to {fromChainName}
            </ActionBtn>
          )
          : <ActionBtn disabled={!canQuote || belowMin} onClick={onQuote}>
              {!amount || parseFloat(amount) === 0 ? "Enter Amount" : insufficientBalance ? "Insufficient Balance" : belowMin ? `Min ${minDepositHuman.toLocaleString()} ${vaultAsset.toUpperCase()}` : "Get Quote"}
            </ActionBtn>}
      </div>
    </div>
  );
}

function fmtToken(raw, decimals) {
  const n = parseFloat(formatUnits(BigInt(raw), decimals));
  if (n === 0) return "0";
  if (n >= 1000) return n.toLocaleString("en", { maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(4);
  if (n >= 0.0001) return n.toFixed(6);
  return n.toExponential(2);
}

function fmtShares(raw) {
  // Shares are raw 18-decimal integers — convert to human-readable
  const n = parseFloat(raw);
  if (isNaN(n) || n === 0) return null;
  // If it looks like a raw wei value (> 1e12), divide by 1e18
  if (n > 1e12) {
    const human = n / 1e18;
    if (human >= 1000) return human.toLocaleString("en", { maximumFractionDigits: 2 });
    if (human >= 0.01) return human.toFixed(4);
    return human.toExponential(2);
  }
  if (n >= 1000) return n.toLocaleString("en", { maximumFractionDigits: 2 });
  return n.toFixed(4);
}

function ReviewStep({ quote, fromToken, amount, vault, referralResolved, onConfirm, onBack, selectedRoute, onSelectRoute, vaultId, fromChainId, fromTokenAddress }) {
  // Real success-rate stats for this vault, scoped to the selected source chain+token.
  // Used to (a) tag each route option with its observed reliability and (b) show
  // an overall reliability badge above the route list.
  const { stats } = useVaultStats(vaultId, { fromChainId, fromToken: fromTokenAddress, days: 30 });
  const bridgeRate = (bridge) => {
    if (!stats?.by_bridge) return null;
    const b = stats.by_bridge.find(x => (x.bridge || "").toLowerCase() === (bridge || "").toLowerCase());
    if (!b) return null;
    return formatRate(b.rate, b.total);
  };
  const est = quote.estimate;
  const vaultDecimals = quote.vault?.asset?.decimals || fromToken?.decimals || 6;
  const outDecimals = quote.quote_type === "direct" ? fromToken.decimals : vaultDecimals;
  const isSwap = quote.quote_type !== "direct";
  const isCrossChain = quote.quote_type === "cross_chain";
  const outSymbol = isSwap ? (vault.asset || vault.assetLower || "").toUpperCase() : fromToken?.symbol;
  const [ackHighImpact, setAckHighImpact] = useState(false);

  const routes = quote.route_options;
  const hasRoutes = routes && routes.length > 1;
  const activeRoute = hasRoutes ? routes.find(r => r.bridge === selectedRoute) || routes[0] : null;

  // Use active route's amounts when a route is selected, otherwise default estimate
  const displayToAmount = activeRoute ? activeRoute.to_amount : est.to_amount;
  const displayDepositAmount = activeRoute ? activeRoute.deposit_amount : est.deposit_amount;
  const displayTime = activeRoute ? activeRoute.estimated_time : est.estimated_time;
  const displayGas = activeRoute ? activeRoute.gas_cost_usd : est.gas_cost_usd;

  // Route description (for single route / same-chain swap fallback)
  let routeDesc = quote.quote_type === "direct" ? "Direct" : quote.quote_type === "same_chain_swap" ? "Swap" : "Cross-chain";
  const steps = est.steps;
  if (steps && steps.length > 0) {
    const tools = steps.map(s => s.tool).filter(Boolean);
    if (tools.length > 0) routeDesc += ` via ${tools.join(" \u2192 ")}`;
  }
  if (activeRoute && !hasRoutes) routeDesc = `Cross-chain via ${activeRoute.bridge_name}`;

  // Cross-chain / swap cost breakdown (bridge or swap loss, not our fee)
  const fromUsd = parseFloat(est.from_amount_usd || "0");
  const toUsd = parseFloat(est.to_amount_usd || "0");
  const pathLossUsd = fromUsd > 0 && toUsd > 0 ? Math.max(0, fromUsd - toUsd) : 0;
  const pathLossPct = fromUsd > 0 ? (pathLossUsd / fromUsd) * 100 : 0;
  const severity = pathLossPct >= 10 ? "red" : pathLossPct >= 3 ? "amber" : null;

  const nonComposerTypes = ["midas", "veda", "custom", "ipor", "lido"];
  const isNonComposer = nonComposerTypes.includes(quote.vault?.type);

  const rows = [
    { label: "You deposit", value: `${fmtToken(parseUnits(amount, fromToken.decimals).toString(), fromToken.decimals)} ${fromToken?.symbol}` },
    isSwap && { label: "Est. received on dest", value: `${fmtToken(displayToAmount, vaultDecimals)} ${outSymbol}` },
    { label: "Into vault", value: `${fmtToken(displayDepositAmount, outDecimals)} ${outSymbol}`, bold: true, color: C.purple },
    est.estimated_shares && fmtShares(est.estimated_shares) && { label: "Est. shares", value: fmtShares(est.estimated_shares), light: true },
    displayTime && { label: "Est. time", value: displayTime < 60 ? `~${displayTime}s` : `~${Math.round(displayTime / 60)} min`, light: true },
    displayGas && { label: "Est. gas cost", value: `$${displayGas}`, light: true },
    referralResolved && { label: "Referrer", value: referralResolved.handle ? `@${referralResolved.handle}` : `${referralResolved.address.slice(0, 10)}...`, color: C.green },
    !hasRoutes && { label: "Route", value: routeDesc, light: true },
  ].filter(Boolean);

  const confirmDisabled = severity === "red" && !ackHighImpact;

  return (
    <div>
      {/* Path-loss banner (bridge / swap overhead) */}
      {isSwap && pathLossUsd > 0 && (
        <div style={{
          padding: "12px 14px", borderRadius: 10, marginBottom: 14,
          background: severity === "red" ? "rgba(217,54,54,.08)" : severity === "amber" ? "rgba(217,119,6,.08)" : "rgba(0,0,0,.03)",
          border: `1px solid ${severity === "red" ? C.red + "33" : severity === "amber" ? C.amber + "33" : C.border2}`,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: severity === "red" ? C.red : severity === "amber" ? C.amber : C.text3, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>
            {isCrossChain ? "Bridge cost" : "Swap cost"}
            {severity === "red" ? " \u2014 \u26A0 HIGH" : severity === "amber" ? " \u2014 heads up" : ""}
          </div>
          <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>
            You send <strong>${fromUsd.toFixed(2)}</strong> {"\u2192"} <strong>${toUsd.toFixed(2)}</strong> arrives on destination.
            <br />
            <span style={{ color: C.text2 }}>
              {isCrossChain ? "Bridge" : "Swap"} takes <strong style={{ color: severity === "red" ? C.red : severity === "amber" ? C.amber : C.text }}>${pathLossUsd.toFixed(2)} ({pathLossPct.toFixed(1)}%)</strong>. This is LiFi{"'"}s routing cost {"\u2014"} not a Yieldo fee.
            </span>
          </div>
          {severity === "red" && (
            <div style={{ marginTop: 10, padding: "8px 10px", background: C.redBg, borderRadius: 6 }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", fontSize: 12, color: C.red }}>
                <input type="checkbox" checked={ackHighImpact} onChange={(e) => setAckHighImpact(e.target.checked)} style={{ marginTop: 2 }} />
                <span>I understand I{"'"}ll lose {pathLossPct.toFixed(1)}% to bridge/swap costs. For better rates, deposit a larger amount or use same-chain.</span>
              </label>
            </div>
          )}
          {severity === "amber" && fromUsd < 20 && (
            <div style={{ marginTop: 6, fontSize: 11, color: C.text3 }}>
              Cross-chain has ~$0.30 fixed cost regardless of amount. Deposits under ~$20 lose {">"}1.5% to overhead. Consider batching into a larger deposit.
            </div>
          )}
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : "none" }}>
            <span style={{ fontSize: 13, color: C.text3 }}>{r.label}</span>
            <span style={{ fontSize: r.bold ? 14 : 13, fontWeight: r.bold ? 700 : r.light ? 400 : 600, color: r.color || C.text }}>{r.value}</span>
          </div>
        ))}
      </div>

      {/* Route selector — cross-chain with multiple bridge options */}
      {hasRoutes && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.text2 }}>Select route</div>
            {stats?.total > 0 && (
              <div style={{ fontSize: 10, color: C.text3 }}>
                Reliability from <strong style={{ color: C.text2 }}>{stats.total}</strong> past deposits (30d)
              </div>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {routes.map((r) => {
              const isSelected = r.bridge === selectedRoute;
              const isBest = r.tags?.includes("RECOMMENDED") || r.tags?.includes("CHEAPEST");
              const isFastest = r.tags?.includes("FASTEST");
              const successPct = bridgeRate(r.bridge);
              const ratePctNum = successPct ? parseInt(successPct) : null;
              const successColor = ratePctNum == null ? null
                : ratePctNum >= 95 ? C.green
                : ratePctNum >= 80 ? C.amber
                : C.red;
              return (
                <div
                  key={r.bridge}
                  onClick={() => onSelectRoute(r.bridge)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                    border: `1.5px solid ${isSelected ? C.purple : C.border}`,
                    background: isSelected ? C.purpleDim : C.white,
                    transition: "border-color .15s, background .15s",
                  }}
                >
                  {r.bridge_logo && (
                    <img src={r.bridge_logo} alt="" style={{ width: 22, height: 22, borderRadius: 6 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      {r.bridge_name}
                      {isBest && <span style={{ fontSize: 10, fontWeight: 700, color: C.green, background: C.greenDim, padding: "1px 6px", borderRadius: 4 }}>Best</span>}
                      {isFastest && <span style={{ fontSize: 10, fontWeight: 700, color: "#2563eb", background: "rgba(37,99,235,.07)", padding: "1px 6px", borderRadius: 4 }}>Fastest</span>}
                      {successPct && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: successColor,
                                       background: `${successColor}1f`, padding: "1px 6px", borderRadius: 4 }}>
                          {successPct} success
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>
                      {r.estimated_time != null && (r.estimated_time < 60 ? `~${r.estimated_time}s` : `~${Math.round(r.estimated_time / 60)} min`)}
                      {r.estimated_time != null && r.gas_cost_usd && " \u00B7 "}
                      {r.gas_cost_usd && `$${r.gas_cost_usd} gas`}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                      {fmtToken(r.deposit_amount, outDecimals)} {outSymbol}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isCrossChain && (
        <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(217,119,6,.06)", fontSize: 11, color: C.amber, marginBottom: 16 }}>
          Cross-chain deposits take a few minutes. You can track progress via LiFi explorer once submitted.
        </div>
      )}
      {isCrossChain && isNonComposer && (
        <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(107,70,193,.06)", fontSize: 11, color: C.text2, marginBottom: 16, lineHeight: 1.5 }}>
          <strong style={{ color: C.text }}>3% slippage buffer applied.</strong> This vault requires an exact amount for deposit. Up to ~3% of the bridged amount may be held back as a safety margin to prevent the transaction from reverting if the bridge delivers slightly less than expected. Any unused buffer stays in your wallet as recoverable dust.
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}><ActionBtn secondary onClick={onBack}>Back</ActionBtn></div>
        <div style={{ flex: 2 }}><ActionBtn onClick={onConfirm} disabled={confirmDisabled}>
          {confirmDisabled ? "Acknowledge to continue" : "Confirm Deposit"}
        </ActionBtn></div>
      </div>
    </div>
  );
}

function Label({ children }) {
  return <div style={{ fontSize: 12, fontWeight: 600, color: C.text2, marginBottom: 6, display: "flex", alignItems: "center" }}>{children}</div>;
}

function ChipBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: active ? 600 : 400,
      border: `1px solid ${active ? C.purple + "40" : C.border2}`,
      background: active ? C.purpleDim : C.white, color: active ? C.purple : C.text2,
      cursor: "pointer", fontFamily: "'Inter',sans-serif", display: "flex", alignItems: "center", gap: 4,
    }}>{children}</button>
  );
}

export default DepositModal;
