import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import InvestorShell from "../components/InvestorShell.jsx";
import { CHAIN_NAMES, CHAIN_EXPLORERS } from "../chains.js";

const API = import.meta.env.VITE_PARTNER_API || "https://api.yieldo.xyz";

const C = {
  white: "#fff", bg: "#f8f7fc",
  border: "rgba(0,0,0,0.06)", border2: "rgba(0,0,0,0.1)",
  text: "#121212", text2: "rgba(0,0,0,0.65)", text3: "rgba(0,0,0,0.4)", text4: "rgba(0,0,0,0.22)",
  purple: "#7A1CCB", purpleDim: "rgba(122,28,203,0.06)",
  purpleGrad: "linear-gradient(100deg,#4B0CA6 0%,#7A1CCB 58%,#9E3BFF 114%)",
  purpleShadow: "0 0 18px rgba(80,14,170,0.13)",
  teal: "#2E9AB8", green: "#1a9d3f", greenDim: "rgba(26,157,63,0.07)",
  amber: "#d97706", amberDim: "rgba(217,119,6,0.07)",
  red: "#d93636", redDim: "rgba(217,54,54,0.06)",
};

const EXPLORER_NAME = {
  1: "Etherscan", 8453: "Basescan", 42161: "Arbiscan", 10: "Optimism Explorer",
  143: "Monadscan", 999: "HyperEVM Scan", 747474: "Katanascan",
};

const STATUS_STYLES = {
  completed: { color: C.green, bg: C.greenDim, label: "Deposit" },
  submitted: { color: C.amber, bg: C.amberDim, label: "Pending" },
  pending:   { color: C.amber, bg: C.amberDim, label: "Pending" },
  failed:    { color: C.red,   bg: C.redDim,   label: "Failed" },
  partial:   { color: C.amber, bg: C.amberDim, label: "Partial" },
};

function Card({ children, style = {} }) {
  return (
    <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.03)", ...style }}>{children}</div>
  );
}

function fmtDate(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toISOString().slice(0, 10); } catch { return "—"; }
}

export default function HistoryPage() {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    fetch(`${API}/v1/deposits?user_address=${address}&limit=100`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setDeposits(Array.isArray(data) ? data : []))
      .catch(() => setDeposits([]))
      .finally(() => setLoading(false));
  }, [address]);

  if (!isConnected) {
    return (
      <InvestorShell>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      minHeight: 360, gap: 16, textAlign: "center" }}>
          <div style={{ fontSize: 48 }}>🔒</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Connect your wallet to view your history</div>
          <button onClick={openConnectModal}
            style={{ padding: "10px 22px", borderRadius: 8, border: "none", cursor: "pointer",
                     backgroundImage: C.purpleGrad, color: "#fff", fontSize: 14, fontWeight: 600,
                     boxShadow: C.purpleShadow, fontFamily: "'Inter',sans-serif" }}>
            Connect Wallet
          </button>
        </div>
      </InvestorShell>
    );
  }

  return (
    <InvestorShell>
      <h1 style={{ margin: "0 0 20px", fontSize: 22, fontWeight: 700 }}>Transaction History</h1>

      {loading && (
        <Card style={{ padding: 40, textAlign: "center", color: C.text3 }}>Loading...</Card>
      )}

      {!loading && deposits.length === 0 && (
        <Card style={{ padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 14, color: C.text3 }}>No transactions yet.</div>
        </Card>
      )}

      {deposits.length > 0 && (
        <Card>
          <div style={{ padding: "10px 16px", borderBottom: `1px solid ${C.border}`,
                        display: "grid", gridTemplateColumns: ".8fr .7fr 2fr 1fr 1fr", gap: 8,
                        fontSize: 11, fontWeight: 600, color: C.text4, textTransform: "uppercase",
                        letterSpacing: ".04em", alignItems: "center" }}>
            <div>Date</div>
            <div>Type</div>
            <div>Vault</div>
            <div style={{ textAlign: "right" }}>Amount</div>
            <div style={{ textAlign: "right" }}></div>
          </div>
          {deposits.map((d, i) => {
            const st = STATUS_STYLES[d.status] || STATUS_STYLES.submitted;
            const explorerBase = CHAIN_EXPLORERS[d.from_chain_id] || "https://etherscan.io";
            const explorerName = EXPLORER_NAME[d.from_chain_id] || "Explorer";
            const txUrl = d.tx_hash ? `${explorerBase}/tx/${d.tx_hash}` : null;
            const chainName = CHAIN_NAMES[d.from_chain_id] || `Chain ${d.from_chain_id}`;
            const amount = d.from_amount ? `-${d.from_amount} ${d.from_token || ""}` : "—";
            return (
              <div key={d.tx_hash || i}
                   style={{ padding: "14px 16px", borderBottom: i < deposits.length - 1 ? `1px solid ${C.border}` : "none",
                            display: "grid", gridTemplateColumns: ".8fr .7fr 2fr 1fr 1fr", gap: 8, alignItems: "center" }}>
                <div style={{ color: C.text3, fontSize: 12 }}>{fmtDate(d.created_at)}</div>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 4,
                                  background: st.bg, color: st.color, whiteSpace: "nowrap" }}>
                    {st.label}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {d.vault_name || d.vault_id || "Unknown vault"}
                  </div>
                  <div style={{ fontSize: 10, color: C.text4 }}>{chainName}</div>
                </div>
                <div style={{ textAlign: "right", fontSize: 13, fontWeight: 600, color: C.text }}>
                  {amount}
                </div>
                <div style={{ textAlign: "right" }}>
                  {txUrl ? (
                    <a href={txUrl} target="_blank" rel="noopener noreferrer"
                       style={{ fontSize: 11, color: C.teal, textDecoration: "none", fontWeight: 500 }}>
                      {explorerName} ↗
                    </a>
                  ) : (
                    <span style={{ fontSize: 11, color: C.text4 }}>—</span>
                  )}
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </InvestorShell>
  );
}
