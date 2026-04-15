import { useState, useEffect, useCallback } from "react";
import { useAccount, useSendTransaction, useWaitForTransactionReceipt, useSwitchChain, useChainId } from "wagmi";
import { formatUnits } from "viem";

const API = import.meta.env.VITE_PARTNER_API || "https://api.yieldo.xyz";
const CHAINS = { 1: "Ethereum", 8453: "Base", 42161: "Arbitrum", 10: "Optimism" };
const EXPLORERS = { 1: "https://etherscan.io", 8453: "https://basescan.org", 42161: "https://arbiscan.io", 10: "https://optimistic.etherscan.io" };

const C = {
  white: "#fff", border: "rgba(0,0,0,.06)", border2: "rgba(0,0,0,.1)",
  text: "#121212", text2: "rgba(0,0,0,.65)", text3: "rgba(0,0,0,.4)", text4: "rgba(0,0,0,.25)",
  purple: "#7A1CCB", purpleGrad: "linear-gradient(100deg,#4B0CA6 0%,#7A1CCB 58%,#9E3BFF 114%)",
  purpleShadow: "0 0 17px rgba(80,14,170,.12)",
  green: "#1a9d3f", greenDim: "rgba(26,157,63,.07)",
  amber: "#d97706", amberDim: "rgba(217,119,6,.06)",
  red: "#d93636", redBg: "#FFF0F0",
};

function fmt(raw, decimals = 18, maxDp = 4) {
  try {
    const s = formatUnits(BigInt(raw), decimals);
    const [w, d = ""] = s.split(".");
    const ds = d.slice(0, maxDp).replace(/0+$/, "");
    return ds ? `${w}.${ds}` : w;
  } catch { return "0"; }
}

function timeAgo(iso) {
  try {
    const diffH = (Date.now() - new Date(iso).getTime()) / 3_600_000;
    if (diffH < 1) return "just now";
    if (diffH < 24) return `${Math.floor(diffH)}h ago`;
    return `${Math.floor(diffH / 24)}d ago`;
  } catch { return ""; }
}

export default function PendingWithdrawals() {
  const { address, isConnected } = useAccount();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!isConnected || !address) { setRows([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/v1/withdraw/requests/${address}`);
      if (res.ok) setRows(await res.json());
    } catch {}
    setLoading(false);
  }, [address, isConnected]);

  useEffect(() => {
    load();
    const iv = setInterval(load, 60_000);  // poll every minute
    return () => clearInterval(iv);
  }, [load]);

  if (!isConnected || rows.length === 0) return null;

  return (
    <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: "20px 24px", marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>Pending Withdrawals</span>
        <span style={{ fontSize: 11, color: C.text4, marginLeft: "auto" }}>
          {loading ? "Refreshing..." : `${rows.filter(r => r.status !== "claimed").length} pending`}
        </span>
      </div>
      {rows.map((r) => <RequestRow key={r.id || r.req_hash} r={r} onDone={load} />)}
    </div>
  );
}

function RequestRow({ r, onDone }) {
  const currentChain = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { sendTransactionAsync } = useSendTransaction();
  const [txHash, setTxHash] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState("");
  const { address } = useAccount();
  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash || undefined });

  useEffect(() => { if (isSuccess) onDone(); }, [isSuccess, onDone]);

  const claimed = r.status === "claimed";
  const claimable = r.claimable && !claimed;

  const doClaim = async () => {
    setError(""); setClaiming(true);
    try {
      if (currentChain !== r.chain_id) await switchChainAsync({ chainId: r.chain_id });
      const res = await fetch(`${API}/v1/withdraw/claim-tx/${r.req_hash}?user_address=${address}`);
      const body = await res.json();
      if (!body.ready) throw new Error(body.reason || "Not ready");
      const t = body.transaction_request;
      const hash = await sendTransactionAsync({
        to: t.to, data: t.data, value: BigInt(t.value || "0"), gas: BigInt(t.gas_limit || "250000"),
      });
      setTxHash(hash);
    } catch (e) {
      setError(e.shortMessage || e.message || "Claim failed");
    }
    setClaiming(false);
  };

  const status = claimed ? { label: "Claimed", color: C.text3, bg: "rgba(0,0,0,.04)" }
    : claimable ? { label: "Ready to claim", color: C.green, bg: C.greenDim }
    : { label: "Processing", color: C.amber, bg: C.amberDim };

  return (
    <div style={{ padding: "12px 0", borderBottom: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{r.vault_name}</div>
          <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>
            {fmt(r.shares, 18)} shares · {CHAINS[r.chain_id]} · {timeAgo(r.created_at)}
          </div>
        </div>
        <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 4, background: status.bg, color: status.color, whiteSpace: "nowrap" }}>
          {status.label}
        </span>
        {claimable && (
          <button onClick={doClaim} disabled={claiming} style={{
            fontSize: 12, fontWeight: 600, padding: "7px 14px", borderRadius: 6, border: "none",
            backgroundImage: C.purpleGrad, color: "#fff", boxShadow: C.purpleShadow,
            cursor: claiming ? "not-allowed" : "pointer", opacity: claiming ? 0.5 : 1,
            fontFamily: "'Inter',sans-serif",
          }}>{claiming ? "Claiming..." : "Claim"}</button>
        )}
      </div>
      {r.tx_hash && (
        <a href={`${EXPLORERS[r.chain_id] || EXPLORERS[1]}/tx/${r.tx_hash}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: C.purple, textDecoration: "none" }}>
          Request tx: {r.tx_hash.slice(0, 10)}...{r.tx_hash.slice(-6)} ↗
        </a>
      )}
      {error && <div style={{ fontSize: 11, color: C.red, padding: "6px 10px", background: C.redBg, borderRadius: 6 }}>{error}</div>}
    </div>
  );
}
