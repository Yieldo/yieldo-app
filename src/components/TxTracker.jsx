import { useState, useEffect, useRef, useCallback } from "react";
import { useAccount } from "wagmi";

const API = import.meta.env.VITE_PARTNER_API || "https://api.yieldo.xyz";
const STORAGE_KEY = "yieldo_deposits";

const CHAINS = { 1: "Ethereum", 8453: "Base", 42161: "Arbitrum", 10: "Optimism" };
const EXPLORERS = { 1: "https://etherscan.io", 8453: "https://basescan.org", 42161: "https://arbiscan.io", 10: "https://optimistic.etherscan.io" };

const C = {
  white: "#fff", bg: "#f8f7fc",
  border: "rgba(0,0,0,.06)", border2: "rgba(0,0,0,.1)",
  text: "#121212", text2: "rgba(0,0,0,.65)", text3: "rgba(0,0,0,.4)", text4: "rgba(0,0,0,.25)",
  purple: "#7A1CCB", purpleDim: "rgba(122,28,203,.06)",
  purpleGrad: "linear-gradient(100deg,#4B0CA6 0%,#7A1CCB 58%,#9E3BFF 114%)",
  green: "#1a9d3f", greenDim: "rgba(26,157,63,.07)",
  red: "#d93636", redBg: "#FFF0F0",
  amber: "#d97706", amberDim: "rgba(217,119,6,.07)",
};

const STATUS = {
  submitted: { label: "Pending", color: C.amber, bg: C.amberDim, icon: "\u23f3" },
  pending: { label: "Pending", color: C.amber, bg: C.amberDim, icon: "\u23f3" },
  completed: { label: "Completed", color: C.green, bg: C.greenDim, icon: "\u2705" },
  partial: { label: "Partial", color: C.amber, bg: C.amberDim, icon: "\u26a0\ufe0f" },
  failed: { label: "Failed", color: C.red, bg: C.redBg, icon: "\u274c" },
};

function getDeposits() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function saveDeposits(deps) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(deps)); } catch {}
}

export default function TxTracker() {
  const { address, isConnected } = useAccount();
  const [deposits, setDeposits] = useState([]);
  const [open, setOpen] = useState(false);
  const pollRef = useRef(null);

  // Load deposits on mount and on storage changes
  const loadDeposits = useCallback(() => {
    const all = getDeposits();
    // Filter to current wallet
    if (address) {
      // We don't store user address in local deposits currently, so show all
      setDeposits(all.slice(0, 20));
    } else {
      setDeposits(all.slice(0, 20));
    }
  }, [address]);

  useEffect(() => {
    loadDeposits();
    // Listen for storage events (cross-tab) and custom events (same-tab)
    const onStorage = () => loadDeposits();
    window.addEventListener("storage", onStorage);
    window.addEventListener("yieldo_deposit_update", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("yieldo_deposit_update", onStorage);
    };
  }, [loadDeposits]);

  // Re-check localStorage every 3s to pick up new deposits from DepositModal
  useEffect(() => {
    const interval = setInterval(loadDeposits, 3000);
    return () => clearInterval(interval);
  }, [loadDeposits]);

  // Poll pending tx statuses
  useEffect(() => {
    const pending = deposits.filter(d => d.status === "submitted" || d.status === "pending");
    if (pending.length === 0) { clearInterval(pollRef.current); return; }

    const poll = async () => {
      let changed = false;
      const updated = [...deposits];
      for (const dep of pending) {
        if (!dep.tx_hash || dep.from_chain_id === dep.to_chain_id) continue; // direct deposits tracked by on-chain receipt
        try {
          const params = new URLSearchParams({
            tx_hash: dep.tx_hash,
            from_chain_id: String(dep.from_chain_id),
            to_chain_id: String(dep.to_chain_id),
          });
          const res = await fetch(`${API}/v1/status?${params}`);
          if (res.ok) {
            const data = await res.json();
            const idx = updated.findIndex(d => d.tx_hash === dep.tx_hash);
            if (idx !== -1) {
              if (data.status === "DONE" && updated[idx].status !== "completed") {
                updated[idx] = { ...updated[idx], status: "completed" };
                changed = true;
              } else if (data.status === "FAILED" && updated[idx].status !== "failed") {
                updated[idx] = { ...updated[idx], status: "failed" };
                changed = true;
              }
            }
          }
        } catch {}
      }
      if (changed) {
        saveDeposits(updated);
        setDeposits(updated);
      }
    };

    pollRef.current = setInterval(poll, 10000);
    // Initial poll after short delay
    setTimeout(poll, 2000);
    return () => clearInterval(pollRef.current);
  }, [deposits.map(d => `${d.tx_hash}:${d.status}`).join(",")]);

  const pendingCount = deposits.filter(d => d.status === "submitted" || d.status === "pending").length;
  const recentCount = deposits.length;

  // Don't show if no deposits at all
  if (recentCount === 0) return null;

  return (
    <>
      {/* Floating pill */}
      <button onClick={() => setOpen(!open)} style={{
        position: "fixed", bottom: 20, right: 20, zIndex: 9998,
        display: "flex", alignItems: "center", gap: 8,
        padding: pendingCount > 0 ? "10px 16px" : "8px 14px",
        borderRadius: 14, border: "none", cursor: "pointer",
        background: pendingCount > 0 ? C.purpleGrad : C.white,
        color: pendingCount > 0 ? "#fff" : C.text2,
        boxShadow: "0 4px 20px rgba(0,0,0,.15)",
        fontFamily: "'Inter',sans-serif", fontSize: 13, fontWeight: 600,
        transition: "all .2s",
      }}>
        {pendingCount > 0 ? (
          <>
            <SpinnerSmall />
            {pendingCount} pending
          </>
        ) : (
          <>
            <span style={{ fontSize: 14 }}>📋</span>
            {recentCount} txn{recentCount !== 1 ? "s" : ""}
          </>
        )}
      </button>

      {/* Expanded panel */}
      {open && (
        <div style={{
          position: "fixed", bottom: 64, right: 20, zIndex: 9998,
          width: 360, maxHeight: 420, overflow: "auto",
          background: C.white, borderRadius: 16,
          boxShadow: "0 8px 40px rgba(0,0,0,.18)",
          border: `1px solid ${C.border}`,
          fontFamily: "'Inter',sans-serif",
        }}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>Recent Transactions</span>
            <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", color: C.text3, padding: 2 }}>✕</button>
          </div>

          {deposits.length === 0 && (
            <div style={{ padding: 30, textAlign: "center", fontSize: 13, color: C.text3 }}>No transactions yet</div>
          )}

          {deposits.map((d, i) => {
            const st = STATUS[d.status] || STATUS.submitted;
            const explorerBase = EXPLORERS[d.from_chain_id] || EXPLORERS[1];
            const isCross = d.from_chain_id !== d.to_chain_id;
            return (
              <div key={d.tx_hash || i} style={{ padding: "12px 18px", borderBottom: i < deposits.length - 1 ? `1px solid ${C.border}` : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 13 }}>{st.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                      {d.from_amount ? smartFmt(d.from_amount) : "?"} {d.from_token || ""}
                    </span>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: st.bg, color: st.color }}>{st.label}</span>
                </div>
                <div style={{ fontSize: 11, color: C.text3, marginBottom: 4 }}>
                  {d.vault_name || d.vault_id}
                  <span style={{ color: C.text4 }}> · {CHAINS[d.from_chain_id] || "?"}{isCross ? ` → ${CHAINS[d.to_chain_id] || "?"}` : ""}</span>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {d.tx_hash && (
                    <a href={`${explorerBase}/tx/${d.tx_hash}`} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 10, color: C.purple, textDecoration: "none" }}>
                      {d.tx_hash.slice(0, 8)}...{d.tx_hash.slice(-4)} ↗
                    </a>
                  )}
                  {isCross && d.tx_hash && (
                    <a href={`https://explorer.li.fi/tx/${d.tx_hash}`} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 10, color: C.purple, textDecoration: "none" }}>LiFi ↗</a>
                  )}
                  {d.created_at && <span style={{ fontSize: 10, color: C.text4, marginLeft: "auto" }}>{timeAgo(d.created_at)}</span>}
                </div>
              </div>
            );
          })}

          {deposits.length > 0 && (
            <button onClick={() => { saveDeposits([]); setDeposits([]); setOpen(false); }}
              style={{ width: "100%", padding: "10px 0", background: "none", border: "none", borderTop: `1px solid ${C.border}`, fontSize: 11, color: C.text4, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
              Clear history
            </button>
          )}
        </div>
      )}
    </>
  );
}

function SpinnerSmall() {
  return (
    <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "txspin .7s linear infinite" }}>
      <style>{`@keyframes txspin { to { transform: rotate(360deg); } }`}</style>
    </span>
  );
}

function smartFmt(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return val;
  if (n >= 1000) return n.toLocaleString("en", { maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(2);
  if (n >= 0.0001) return n.toFixed(4);
  return n.toExponential(2);
}

function timeAgo(iso) {
  try {
    const d = new Date(iso);
    const s = Math.floor((Date.now() - d) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  } catch { return ""; }
}
