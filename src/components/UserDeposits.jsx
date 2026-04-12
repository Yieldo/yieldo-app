import { useState, useEffect, useMemo } from "react";
import { useAccount } from "wagmi";

const API = import.meta.env.VITE_PARTNER_API || "https://api.yieldo.xyz";

const CHAINS = { 1: "Ethereum", 8453: "Base", 42161: "Arbitrum", 10: "Optimism" };
const EXPLORERS = { 1: "https://etherscan.io", 8453: "https://basescan.org", 42161: "https://arbiscan.io", 10: "https://optimistic.etherscan.io" };

const C = {
  white: "#fff", bg: "#f8f7fc", surfaceAlt: "#faf9fe",
  border: "rgba(0,0,0,.06)", border2: "rgba(0,0,0,.1)",
  text: "#121212", text2: "rgba(0,0,0,.65)", text3: "rgba(0,0,0,.4)", text4: "rgba(0,0,0,.25)",
  purple: "#7A1CCB", purpleDim: "rgba(122,28,203,.06)",
  green: "#1a9d3f", greenDim: "rgba(26,157,63,.07)",
  red: "#d93636", redBg: "#FFF0F0",
  amber: "#d97706", amberBg: "#FFFBEB",
};

const STATUS_MAP = {
  completed: { label: "Completed", color: C.green, bg: C.greenDim },
  failed: { label: "Failed", color: C.red, bg: C.redBg },
  submitted: { label: "Pending", color: C.amber, bg: C.amberBg },
  pending: { label: "Pending", color: C.amber, bg: C.amberBg },
};

function UserDeposits({ vaultId }) {
  const { address, isConnected } = useAccount();
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!isConnected || !address) { setDeposits([]); return; }

    let cancelled = false;
    setLoading(true);

    (async () => {
      // Fetch from API
      let apiDeposits = [];
      try {
        const res = await fetch(`${API}/v1/deposits?user_address=${address}&limit=100`);
        if (res.ok) apiDeposits = await res.json();
      } catch {}

      // Merge with localStorage for deposits not yet in DB
      let localDeposits = [];
      try {
        localDeposits = JSON.parse(localStorage.getItem("yieldo_deposits") || "[]");
      } catch {}

      // Deduplicate: API deposits take priority (by tx_hash)
      const apiHashes = new Set(apiDeposits.map(d => d.tx_hash?.toLowerCase()).filter(Boolean));
      const localOnly = localDeposits.filter(d => d.tx_hash && !apiHashes.has(d.tx_hash.toLowerCase()));

      // Normalize local deposits to match API shape
      const normalized = localOnly.map(d => ({
        tx_hash: d.tx_hash,
        vault_id: d.vault_id,
        vault_name: d.vault_name,
        from_chain_id: d.from_chain_id,
        to_chain_id: d.to_chain_id,
        from_token: d.from_token,
        from_amount: d.from_amount,
        referrer: d.referrer,
        referrer_handle: d.referrer_handle,
        quote_type: d.quote_type,
        status: d.status || "submitted",
        created_at: d.created_at,
        _local: true,
      }));

      const all = [...apiDeposits, ...normalized]
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

      if (!cancelled) {
        setDeposits(all);
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [address, isConnected]);

  // Filter to current vault if vaultId provided
  const filtered = useMemo(() => {
    if (!vaultId) return deposits;
    return deposits.filter(d => d.vault_id === vaultId);
  }, [deposits, vaultId]);

  if (!isConnected) return null;
  if (!loading && filtered.length === 0) return null;

  const shown = expanded ? filtered : filtered.slice(0, 5);

  return (
    <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, boxShadow: "0 1px 3px rgba(0,0,0,.03)", padding: "20px 24px", marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 16 }}>📋</span>
        <span style={{ fontSize: 15, fontWeight: 700 }}>My Deposits</span>
        <span style={{ fontSize: 11, color: C.text4, marginLeft: "auto" }}>
          {loading ? "Loading..." : `${filtered.length} deposit${filtered.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {loading && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "20px 0", fontSize: 13, color: C.text3 }}>Loading deposits...</div>
      )}

      {shown.map((d, i) => (
        <DepositRow key={d.tx_hash || i} deposit={d} isLast={i === shown.length - 1} />
      ))}

      {filtered.length > 5 && (
        <button onClick={() => setExpanded(!expanded)} style={{
          display: "block", width: "100%", marginTop: 8, padding: "8px 0",
          background: "none", border: "none", fontSize: 12, fontWeight: 600,
          color: C.purple, cursor: "pointer", fontFamily: "'Inter',sans-serif",
        }}>
          {expanded ? "Show less" : `Show all ${filtered.length} deposits`}
        </button>
      )}
    </div>
  );
}

function DepositRow({ deposit: d, isLast }) {
  const st = STATUS_MAP[d.status] || STATUS_MAP.submitted;
  const fromChain = CHAINS[d.from_chain_id] || `Chain ${d.from_chain_id}`;
  const toChain = CHAINS[d.to_chain_id] || `Chain ${d.to_chain_id}`;
  const isCross = d.from_chain_id !== d.to_chain_id;
  const explorerBase = EXPLORERS[d.from_chain_id] || EXPLORERS[1];
  const timeStr = d.created_at ? formatTime(d.created_at) : "";

  return (
    <div style={{
      padding: "12px 0",
      borderBottom: isLast ? "none" : `1px solid ${C.border}`,
      display: "flex", flexDirection: "column", gap: 6,
    }}>
      {/* Row 1: Amount + Status */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>
            {d.from_amount ? formatAmount(d.from_amount) : "—"} {d.from_token || ""}
          </span>
          <span style={{ fontSize: 11, color: C.text4 }}>
            {fromChain}{isCross ? ` → ${toChain}` : ""}
          </span>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 4,
          background: st.bg, color: st.color,
        }}>
          {st.label}
        </span>
      </div>

      {/* Row 2: Details */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 11, color: C.text3 }}>
          {d.quote_type === "direct" ? "Direct" : d.quote_type === "same_chain_swap" ? "Swap" : "Cross-chain"}
        </span>

        {d.referrer_handle && (
          <span style={{ fontSize: 11, color: C.green }}>ref: @{d.referrer_handle}</span>
        )}
        {!d.referrer_handle && d.referrer && d.referrer !== "0x0000000000000000000000000000000000000000" && (
          <span style={{ fontSize: 11, color: C.green }}>ref: {d.referrer.slice(0, 8)}...</span>
        )}

        {d.bridge && (
          <span style={{ fontSize: 11, color: C.text4 }}>via {d.bridge}</span>
        )}

        {timeStr && <span style={{ fontSize: 11, color: C.text4 }}>{timeStr}</span>}
      </div>

      {/* Row 3: Links */}
      {d.tx_hash && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a href={`${explorerBase}/tx/${d.tx_hash}`} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 11, color: C.purple, textDecoration: "none" }}>
            {d.tx_hash.slice(0, 10)}...{d.tx_hash.slice(-6)} ↗
          </a>
          {isCross && (
            <a href={`https://explorer.li.fi/tx/${d.tx_hash}`} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 11, color: C.purple, textDecoration: "none" }}>
              LiFi Explorer ↗
            </a>
          )}
          {d.lifi_explorer && !isCross && (
            <a href={d.lifi_explorer} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 11, color: C.purple, textDecoration: "none" }}>
              LiFi Explorer ↗
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function formatAmount(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return val;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  if (n < 0.001 && n > 0) return n.toExponential(2);
  return n.toFixed(n < 1 ? 4 : 2);
}

function formatTime(iso) {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `${diffD}d ago`;
    return d.toLocaleDateString();
  } catch { return ""; }
}

export default UserDeposits;
