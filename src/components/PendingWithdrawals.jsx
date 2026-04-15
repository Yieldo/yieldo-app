import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { formatUnits } from "viem";

const API = import.meta.env.VITE_PARTNER_API || "https://api.yieldo.xyz";
const CHAINS = { 1: "Ethereum", 8453: "Base", 42161: "Arbitrum", 10: "Optimism", 143: "Monad" };
const EXPLORERS = { 1: "https://etherscan.io", 8453: "https://basescan.org", 42161: "https://arbiscan.io", 10: "https://optimistic.etherscan.io", 143: "https://monadscan.com" };

const C = {
  white: "#fff", border: "rgba(0,0,0,.06)",
  text: "#121212", text3: "rgba(0,0,0,.4)", text4: "rgba(0,0,0,.25)",
  purple: "#7A1CCB",
  green: "#1a9d3f", greenDim: "rgba(26,157,63,.07)",
  amber: "#d97706", amberDim: "rgba(217,119,6,.06)",
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
    const iv = setInterval(load, 60_000);
    return () => clearInterval(iv);
  }, [load]);

  const pending = rows.filter(r => r.mode === "async");
  if (!isConnected || pending.length === 0) return null;

  return (
    <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: "20px 24px", marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>Pending Withdrawals</span>
        <span style={{ fontSize: 11, color: C.text4, marginLeft: "auto" }}>
          {loading ? "Refreshing..." : `${pending.filter(r => r.status !== "delivered").length} pending`}
        </span>
      </div>
      {pending.map((r) => <RequestRow key={r.id || r.tx_hash} r={r} />)}
      <div style={{ marginTop: 10, padding: "8px 12px", background: C.amberDim, borderRadius: 6, fontSize: 11, color: C.text3, lineHeight: 1.5 }}>
        Async redemptions are fulfilled directly to your wallet by the protocol. No claim step needed on your side.
      </div>
    </div>
  );
}

function RequestRow({ r }) {
  const delivered = r.status === "delivered";
  const status = delivered
    ? { label: "Delivered", color: C.green, bg: C.greenDim }
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
      </div>
      {r.tx_hash && (
        <a href={`${EXPLORERS[r.chain_id] || EXPLORERS[1]}/tx/${r.tx_hash}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: C.purple, textDecoration: "none" }}>
          Request tx: {r.tx_hash.slice(0, 10)}...{r.tx_hash.slice(-6)} ↗
        </a>
      )}
    </div>
  );
}
