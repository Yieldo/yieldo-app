import { useState, useEffect, useRef, useCallback } from "react";
import { useAccount } from "wagmi";
import { formatUnits } from "viem";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import InvestorShell from "../components/InvestorShell.jsx";
import { CHAIN_NAMES, CHAIN_EXPLORERS, EXPLORER_NAMES } from "../chains.js";

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
  text4dim: "rgba(0,0,0,0.04)",
};

const STATUS_STYLES = {
  completed: { color: C.green, bg: C.greenDim, label: "Completed" },
  submitted: { color: C.amber, bg: C.amberDim, label: "Pending" },
  pending:   { color: C.amber, bg: C.amberDim, label: "Pending" },
  failed:    { color: C.red,   bg: C.redDim,   label: "Failed" },
  partial:   { color: C.amber, bg: C.amberDim, label: "Partial — refunded" },
  abandoned: { color: C.text4, bg: C.text4dim, label: "Abandoned" },
};

const TOKEN_META = {
  // Mainnet
  "1:0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee": { symbol: "ETH", decimals: 18 },
  "1:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": { symbol: "USDC", decimals: 6 },
  "1:0xdac17f958d2ee523a2206206994597c13d831ec7": { symbol: "USDT", decimals: 6 },
  "1:0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": { symbol: "WETH", decimals: 18 },
  "1:0x2260fac5e5542a773aa44fbcfedf7c193bc2c599": { symbol: "WBTC", decimals: 8 },
  "1:0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf": { symbol: "cbBTC", decimals: 8 },
  "1:0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0": { symbol: "wstETH", decimals: 18 },
  "1:0x1abaea1f7c830bd89acc67ec4af516284b1bc33c": { symbol: "EURC", decimals: 6 },
  "1:0x5f7827fdeb7c20b443265fc2f40845b715385ff2": { symbol: "EURCV", decimals: 18 },
  // Base
  "8453:0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee": { symbol: "ETH", decimals: 18 },
  "8453:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913": { symbol: "USDC", decimals: 6 },
  "8453:0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca": { symbol: "USDbC", decimals: 6 },
  "8453:0x4200000000000000000000000000000000000006": { symbol: "WETH", decimals: 18 },
  "8453:0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf": { symbol: "cbBTC", decimals: 8 },
  "8453:0x60a3e35cc302bfa44cb288bc5a4f316fdb1adb42": { symbol: "EURC", decimals: 6 },
  // Arbitrum
  "42161:0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee": { symbol: "ETH", decimals: 18 },
  "42161:0xaf88d065e77c8cc2239327c5edb3a432268e5831": { symbol: "USDC", decimals: 6 },
  "42161:0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9": { symbol: "USDT", decimals: 6 },
  // Optimism
  "10:0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee": { symbol: "ETH", decimals: 18 },
  "10:0x0b2c639c533813f4aa9d7837caf62653d097ff85": { symbol: "USDC", decimals: 6 },
  // Avalanche
  "43114:0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e": { symbol: "USDC", decimals: 6 },
  // HyperEVM
  "999:0x5555555555555555555555555555555555555555": { symbol: "WHYPE", decimals: 18 },
  "999:0xb88339cb7199b77e23db6e890353e22632ba630f": { symbol: "USDC", decimals: 6 },
};

function resolveToken(chainId, address) {
  if (!address) return { symbol: "", decimals: 18 };
  const key = `${chainId}:${String(address).toLowerCase()}`;
  const meta = TOKEN_META[key];
  if (meta) return meta;
  return { symbol: `${address.slice(0, 6)}…${address.slice(-4)}`, decimals: 18 };
}

// Compact amount formatter — 2 dp for big numbers, 4 dp max for small.
// Strips trailing zeros so "0.5000" displays as "0.5".
function fmtAmount(raw, decimals) {
  if (raw == null) return "—";
  try {
    const s = formatUnits(BigInt(raw), decimals || 18);
    const n = parseFloat(s);
    if (n === 0) return "0";
    let out;
    if (n >= 1000)   out = n.toLocaleString("en", { maximumFractionDigits: 2 });
    else if (n >= 1) out = n.toFixed(4);
    else             out = n.toFixed(4);
    if (out.includes(".")) out = out.replace(/0+$/, "").replace(/\.$/, "");
    return out;
  } catch { return String(raw); }
}

function Card({ children, style = {} }) {
  return (
    <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.03)", ...style }}>{children}</div>
  );
}

function fmtDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en", {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch { return "—"; }
}

// Tiny inline spinner used next to "Pending" badges so the user sees the page
// is actively resolving status.
function Spinner({ size = 10, color = C.amber }) {
  return (
    <span style={{
      display: "inline-block", width: size, height: size, borderRadius: "50%",
      border: `1.5px solid ${color}33`, borderTopColor: color,
      animation: "yspin 0.9s linear infinite",
    }}>
      <style>{`@keyframes yspin{to{transform:rotate(360deg)}}`}</style>
    </span>
  );
}

// Filter taxonomy. Pending+submitted are bucketed together since users don't
// care about the difference. "All" disables the filter.
const FILTERS = [
  { id: "all",       label: "All",       match: () => true },
  { id: "completed", label: "Completed", match: (s) => s === "completed" },
  { id: "pending",   label: "Pending",   match: (s) => s === "pending" || s === "submitted" },
  { id: "partial",   label: "Partial",   match: (s) => s === "partial" },
  { id: "failed",    label: "Failed",    match: (s) => s === "failed" },
  { id: "abandoned", label: "Abandoned", match: (s) => s === "abandoned" },
];
const PAGE_SIZE = 10;

export default function HistoryPage() {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pollRef = useRef(null);

  const refresh = useCallback(async () => {
    if (!address) return;
    try {
      const r = await fetch(`${API}/v1/deposits?user_address=${address}&limit=100`);
      if (r.ok) {
        const d = await r.json();
        setDeposits(Array.isArray(d) ? d : []);
      }
    } catch {}
  }, [address]);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [address, refresh]);

  // Live status polling. We resolve every pending tx aggressively so the user
  // doesn't see "Pending" for hours when on-chain confirmation already happened:
  //   1. Fire ONCE immediately on page load / when deposits change (no 25s wait)
  //   2. Then poll every 6s while anything is still pending
  //   3. Stop automatically once nothing is pending
  useEffect(() => {
    if (!address) return;
    const pendings = deposits.filter(d => (d.status === "pending" || d.status === "submitted") && d.tx_hash);
    if (pendings.length === 0) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    const tick = async () => {
      await Promise.all(pendings.map(async (d) => {
        try {
          const params = new URLSearchParams({
            tx_hash: d.tx_hash,
            from_chain_id: String(d.from_chain_id),
            to_chain_id: String(d.to_chain_id || d.from_chain_id),
          });
          await fetch(`${API}/v1/status?${params}`).catch(() => {});
        } catch {}
      }));
      refresh();
    };
    tick(); // fire immediately, don't wait for first interval
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(tick, 6_000); // 6s — fast enough that "Pending" feels live
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [deposits, address, refresh]);

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
      <h1 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 700 }}>Transaction History</h1>
      <p style={{ margin: "0 0 20px", fontSize: 13, color: C.text3 }}>
        Every deposit and withdraw you've made through Yieldo, with on-chain + bridge receipts.
      </p>

      {loading && (
        <Card style={{ padding: 40, textAlign: "center", color: C.text3 }}>Loading...</Card>
      )}

      {!loading && deposits.length === 0 && (
        <Card style={{ padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 14, color: C.text3 }}>No transactions yet.</div>
        </Card>
      )}

      {deposits.length > 0 && (() => {
        // Counts per status for the filter chips. Pending+submitted bucket.
        const counts = deposits.reduce((acc, d) => {
          const s = d.status === "submitted" ? "pending" : d.status;
          acc[s] = (acc[s] || 0) + 1;
          return acc;
        }, {});
        const matcher = (FILTERS.find(f => f.id === filter) || FILTERS[0]).match;
        const filtered = deposits.filter(d => matcher(d.status));
        const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
        const safePage = Math.min(page, totalPages);
        const start = (safePage - 1) * PAGE_SIZE;
        const slice = filtered.slice(start, start + PAGE_SIZE);

        const switchFilter = (id) => { setFilter(id); setPage(1); };

        return (
          <>
            {/* Filter chips */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {FILTERS.map(f => {
                const n = f.id === "all" ? deposits.length : (counts[f.id] || 0);
                const active = filter === f.id;
                return (
                  <button key={f.id} onClick={() => switchFilter(f.id)}
                    style={{
                      padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: active ? 600 : 500,
                      border: `1px solid ${active ? C.purple + "55" : C.border2}`,
                      background: active ? C.purpleDim : C.white,
                      color: active ? C.purple : C.text2,
                      cursor: "pointer", fontFamily: "'Inter',sans-serif",
                      display: "inline-flex", alignItems: "center", gap: 6,
                    }}>
                    {f.label}
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 10,
                      background: active ? C.white : C.text4dim, color: active ? C.purple : C.text3,
                    }}>{n}</span>
                  </button>
                );
              })}
            </div>

            {filtered.length === 0 && (
              <Card style={{ padding: 40, textAlign: "center", color: C.text3, fontSize: 13 }}>
                No transactions match this filter.
              </Card>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {slice.map((d, i) => {
            const st = STATUS_STYLES[d.status] || STATUS_STYLES.submitted;
            const isPending = d.status === "pending" || d.status === "submitted";
            const isPartial = d.status === "partial";
            const isFailed  = d.status === "failed";

            const fromExplorer = CHAIN_EXPLORERS[d.from_chain_id] || null;
            const fromExplorerName = EXPLORER_NAMES[d.from_chain_id] || "Source explorer";
            const toExplorer = d.to_chain_id ? (CHAIN_EXPLORERS[d.to_chain_id] || null) : null;
            const toExplorerName = d.to_chain_id ? (EXPLORER_NAMES[d.to_chain_id] || "Dest explorer") : null;

            const srcUrl  = d.tx_hash && fromExplorer ? `${fromExplorer}/tx/${d.tx_hash}` : null;
            const destTxHash = d.dest_tx_hash;
            const destUrl = destTxHash && toExplorer ? `${toExplorer}/tx/${destTxHash}` : null;

            const fromChainName = d.from_chain_name || CHAIN_NAMES[d.from_chain_id] || `Chain ${d.from_chain_id}`;
            const toChainName = d.to_chain_name || (d.to_chain_id ? (CHAIN_NAMES[d.to_chain_id] || `Chain ${d.to_chain_id}`) : null);
            const crossChain = d.to_chain_id && d.from_chain_id && d.to_chain_id !== d.from_chain_id;

            const sentToken = resolveToken(d.from_chain_id, d.from_token);
            const sentAmount = fmtAmount(d.from_amount, sentToken.decimals);

            // For PARTIAL / refunded: backend resolver writes received_token + received_amount + dest_chain_id.
            const recvToken = (d.received_token && d.dest_chain_id)
              ? resolveToken(d.dest_chain_id, d.received_token) : null;
            const recvAmount = (recvToken && d.received_amount)
              ? fmtAmount(d.received_amount, recvToken.decimals) : null;

            return (
              <Card key={d.tx_hash || d._id || i} style={{ padding: "16px 18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 4,
                                     background: st.bg, color: st.color, whiteSpace: "nowrap", textTransform: "uppercase",
                                     display: "inline-flex", alignItems: "center", gap: 6 }}>
                        {d.kind === "withdraw" ? "Withdraw" : "Deposit"} · {st.label}
                        {isPending && <Spinner color={st.color} />}
                      </span>
                      {crossChain && (
                        <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4,
                                       background: C.purpleDim, color: C.purple, whiteSpace: "nowrap" }}>
                          Cross-chain · {d.bridge || "LiFi"}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>
                      {d.vault_name || d.vault_id || "Unknown vault"}
                    </div>
                    <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>
                      {fromChainName}{crossChain ? ` → ${toChainName}` : ""} · {fmtDate(d.created_at)}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>
                      {sentAmount} <span style={{ fontSize: 13, color: C.text3, fontWeight: 500 }}>{sentToken.symbol}</span>
                    </div>
                  </div>
                </div>

                {/* PARTIAL outcome — show what the user actually got back */}
                {isPartial && recvToken && (
                  <div style={{ padding: "8px 12px", borderRadius: 8, background: C.amberDim,
                                marginBottom: 10, fontSize: 12, color: C.text2, lineHeight: 1.5 }}>
                    Bridge delivered but the dest swap+deposit reverted. Refunded{" "}
                    <strong style={{ color: C.text }}>{recvAmount} {recvToken.symbol}</strong>{" "}
                    to your wallet on {toChainName}.
                  </div>
                )}
                {isFailed && (
                  <div style={{ padding: "8px 12px", borderRadius: 8, background: C.redDim,
                                marginBottom: 10, fontSize: 12, color: C.red, lineHeight: 1.5 }}>
                    Transaction reverted. Check the explorer link below for the revert reason.
                  </div>
                )}
                {d.status === "abandoned" && (
                  <div style={{ padding: "8px 12px", borderRadius: 8, background: C.text4dim,
                                marginBottom: 10, fontSize: 12, color: C.text3, lineHeight: 1.5 }}>
                    Quote built but never broadcast. No on-chain action took place.
                  </div>
                )}

                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
                  {srcUrl && (
                    <a href={srcUrl} target="_blank" rel="noopener noreferrer"
                       style={{ fontSize: 12, color: C.teal, textDecoration: "none", fontWeight: 500 }}>
                      {fromExplorerName} ↗
                    </a>
                  )}
                  {destUrl && (
                    <a href={destUrl} target="_blank" rel="noopener noreferrer"
                       style={{ fontSize: 12, color: C.teal, textDecoration: "none", fontWeight: 500 }}>
                      {toExplorerName} (dest) ↗
                    </a>
                  )}
                  {d.lifi_explorer && (
                    <a href={d.lifi_explorer} target="_blank" rel="noopener noreferrer"
                       style={{ fontSize: 12, color: C.purple, textDecoration: "none", fontWeight: 500 }}>
                      LiFi scan ↗
                    </a>
                  )}
                  {d.tx_hash && (
                    <span style={{ fontSize: 11, color: C.text4, fontFamily: "monospace" }}>
                      {d.tx_hash.slice(0, 10)}…{d.tx_hash.slice(-8)}
                    </span>
                  )}
                  {d.referrer_handle && (
                    <span style={{ fontSize: 11, color: C.green, marginLeft: "auto" }}>
                      ref: @{d.referrer_handle}
                    </span>
                  )}
                </div>
              </Card>
            );
          })}
            </div>

            {/* Pagination footer */}
            {filtered.length > PAGE_SIZE && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                            marginTop: 14, gap: 12, flexWrap: "wrap" }}>
                <div style={{ fontSize: 12, color: C.text3 }}>
                  Showing <strong style={{ color: C.text2 }}>{start + 1}</strong>–
                  <strong style={{ color: C.text2 }}>{Math.min(start + PAGE_SIZE, filtered.length)}</strong>{" "}
                  of <strong style={{ color: C.text2 }}>{filtered.length}</strong>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage <= 1}
                    style={{
                      padding: "6px 12px", borderRadius: 7, border: `1px solid ${C.border2}`,
                      background: safePage <= 1 ? C.text4dim : C.white,
                      color: safePage <= 1 ? C.text4 : C.text2,
                      cursor: safePage <= 1 ? "not-allowed" : "pointer",
                      fontSize: 12, fontFamily: "'Inter',sans-serif",
                    }}>← Prev</button>
                  <span style={{ fontSize: 12, color: C.text3, padding: "0 8px" }}>
                    Page <strong style={{ color: C.text2 }}>{safePage}</strong> / {totalPages}
                  </span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}
                    style={{
                      padding: "6px 12px", borderRadius: 7, border: `1px solid ${C.border2}`,
                      background: safePage >= totalPages ? C.text4dim : C.white,
                      color: safePage >= totalPages ? C.text4 : C.text2,
                      cursor: safePage >= totalPages ? "not-allowed" : "pointer",
                      fontSize: 12, fontFamily: "'Inter',sans-serif",
                    }}>Next →</button>
                </div>
              </div>
            )}
          </>
        );
      })()}
    </InvestorShell>
  );
}
