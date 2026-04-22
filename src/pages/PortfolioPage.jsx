import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { useAccount } from "wagmi";
import { formatUnits } from "viem";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import InvestorShell from "../components/InvestorShell.jsx";
import { useVaults } from "../hooks/useVaultData.js";
import { AssetIcon } from "../components/VaultExplorer.jsx";
import { DEPOSITABLE_CHAINS } from "../chains.js";

const WithdrawModal = lazy(() => import("../components/WithdrawModal.jsx"));
const DepositModal = lazy(() => import("../components/DepositModal.jsx"));

const API = import.meta.env.VITE_PARTNER_API || "https://api.yieldo.xyz";

const CHAINS = { 1: "Ethereum", 8453: "Base", 42161: "Arbitrum", 10: "Optimism", 143: "Monad", 999: "HyperEVM", 747474: "Katana" };

const C = {
  white: "#fff", bg: "#f8f7fc", border: "rgba(0,0,0,.06)", border2: "rgba(0,0,0,.1)",
  text: "#121212", text2: "rgba(0,0,0,.65)", text3: "rgba(0,0,0,.4)", text4: "rgba(0,0,0,.25)",
  purple: "#7A1CCB", purpleDim: "rgba(122,28,203,.06)",
  purpleGrad: "linear-gradient(100deg,#4B0CA6 0%,#7A1CCB 58%,#9E3BFF 114%)",
  purpleShadow: "0 0 17px rgba(80,14,170,.12)",
  teal: "#2E9AB8", green: "#1a9d3f", greenDim: "rgba(26,157,63,.07)",
  red: "#d93636", redDim: "rgba(217,54,54,.06)",
  amber: "#d97706",
};

function Card({ children, style = {} }) {
  return (
    <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.03)", ...style }}>{children}</div>
  );
}

function ScoreRing({ score, size = 32 }) {
  if (!score && score !== 0) return null;
  const r = (size - 4) / 2, circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const color = score >= 85 ? C.green : score >= 70 ? C.amber : C.red;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(0,0,0,.05)" strokeWidth="2"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="2"
                strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}/>
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: 10, fontWeight: 700, color }}>
        {score}
      </div>
    </div>
  );
}

function fmtShares(raw, decimals = 18, maxDp = 4) {
  try {
    const s = formatUnits(BigInt(raw), decimals);
    const [w, d = ""] = s.split(".");
    const ds = d.slice(0, maxDp).replace(/0+$/, "");
    return ds ? `${w}.${ds}` : w;
  } catch { return "0"; }
}

export default function PortfolioPage() {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { vaults } = useVaults();
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [withdrawFor, setWithdrawFor] = useState(null);
  const [depositFor, setDepositFor] = useState(null);

  const load = useCallback(async () => {
    if (!isConnected || !address) { setPositions([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/v1/positions/${address}`);
      if (res.ok) {
        const data = await res.json();
        setPositions(data.positions || []);
      }
    } catch {}
    setLoading(false);
  }, [address, isConnected]);

  useEffect(() => { load(); }, [load]);

  // Merge position data with vault metadata (APY, score) from the useVaults hook
  const enrichedPositions = positions.map(p => {
    const v = vaults.find(x => x.id === p.vault_id) || {};
    return { ...p, apy: v.apy, score: v.yieldoScore };
  });

  const total = enrichedPositions.reduce((s, p) => s + (parseFloat(p.share_balance) / (10 ** (p.share_decimals || 18))), 0);
  const count = enrichedPositions.length;

  if (!isConnected) {
    return (
      <InvestorShell>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      minHeight: 360, gap: 16, textAlign: "center" }}>
          <div style={{ fontSize: 48 }}>🔒</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Connect your wallet to view your portfolio</div>
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
      <h1 style={{ margin: "0 0 20px", fontSize: 22, fontWeight: 700 }}>My Portfolio</h1>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
        <Card style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 14 }}>💼</span>
            <span style={{ fontSize: 12, color: C.text3, fontWeight: 500 }}>Total Value</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: C.purple }}>
            {loading ? "—" : `${total.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
          </div>
          <div style={{ fontSize: 11, color: C.text4, marginTop: 2 }}>across all vaults</div>
        </Card>
        <Card style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 14 }}>📈</span>
            <span style={{ fontSize: 12, color: C.text3, fontWeight: 500 }}>Total Yield</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: C.green }}>—</div>
          <div style={{ fontSize: 11, color: C.text4, marginTop: 2 }}>tracking coming soon</div>
        </Card>
        <Card style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 14 }}>🏦</span>
            <span style={{ fontSize: 12, color: C.text3, fontWeight: 500 }}>Active Positions</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: C.teal }}>{count}</div>
        </Card>
      </div>

      {/* Positions table */}
      {loading && positions.length === 0 && (
        <Card style={{ padding: 40, textAlign: "center", color: C.text3 }}>Loading positions...</Card>
      )}

      {!loading && positions.length === 0 && (
        <Card style={{ padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🏦</div>
          <div style={{ fontSize: 14, color: C.text3, marginBottom: 16 }}>
            No positions yet. Deposit into a vault to get started.
          </div>
          <a href="/vault" style={{ display: "inline-block", padding: "10px 22px", borderRadius: 8,
                                    backgroundImage: C.purpleGrad, color: "#fff", fontSize: 13, fontWeight: 600,
                                    textDecoration: "none", boxShadow: C.purpleShadow }}>
            Explore Vaults
          </a>
        </Card>
      )}

      {positions.length > 0 && (
        <Card>
          <div style={{ padding: "10px 16px", borderBottom: `1px solid ${C.border}`,
                        display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 44px 180px", gap: 8,
                        fontSize: 11, fontWeight: 600, color: C.text4, textTransform: "uppercase",
                        letterSpacing: ".04em", alignItems: "center" }}>
            <div>Vault</div>
            <div style={{ textAlign: "right" }}>Value</div>
            <div style={{ textAlign: "right" }}>Yield</div>
            <div style={{ textAlign: "right" }}>APY</div>
            <div style={{ textAlign: "center" }}>Score</div>
            <div></div>
          </div>
          {enrichedPositions.map(p => {
            const canDeposit = DEPOSITABLE_CHAINS.includes(p.chain_id);
            const vaultForDeposit = {
              id: p.vault_id, chain_id: p.chain_id, name: p.vault_name, address: p.vault_address,
              asset: p.asset_symbol, assetLower: p.asset_symbol?.toLowerCase(), type: p.vault_type,
            };
            const balance = fmtShares(p.share_balance, p.share_decimals);
            return (
              <div key={p.vault_id} style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border}`,
                       display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 44px 180px", gap: 8,
                       alignItems: "center" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: C.purpleDim,
                                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <AssetIcon asset={p.asset_symbol} size={18} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.vault_name}
                    </div>
                    <div style={{ fontSize: 11, color: C.text3 }}>{p.asset_symbol} · {CHAINS[p.chain_id] || `Chain ${p.chain_id}`}</div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{balance}</div>
                  <div style={{ fontSize: 11, color: C.text3 }}>{p.asset_symbol}</div>
                </div>
                <div style={{ textAlign: "right", fontSize: 13, fontWeight: 600, color: C.text4 }}>—</div>
                <div style={{ textAlign: "right", fontSize: 13, fontWeight: 600, color: p.apy ? C.green : C.text4 }}>
                  {p.apy ? `${p.apy.toFixed(2)}%` : "—"}
                </div>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  {p.score ? <ScoreRing score={p.score} size={32} /> : <span style={{ fontSize: 12, color: C.text4 }}>—</span>}
                </div>
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                  <button onClick={() => { if (canDeposit) setDepositFor(vaultForDeposit); }}
                          disabled={!canDeposit}
                          style={{ padding: "6px 12px", borderRadius: 7, border: "none",
                                   cursor: canDeposit ? "pointer" : "not-allowed",
                                   background: canDeposit ? C.purpleGrad : C.border,
                                   backgroundImage: canDeposit ? C.purpleGrad : "none",
                                   color: canDeposit ? "#fff" : C.text4, fontSize: 12, fontWeight: 600,
                                   fontFamily: "'Inter',sans-serif" }}>
                    + Add
                  </button>
                  <button onClick={() => setWithdrawFor(p)}
                          style={{ padding: "6px 12px", borderRadius: 7, border: "none", cursor: "pointer",
                                   background: C.redDim, color: C.red, fontSize: 12, fontWeight: 600,
                                   fontFamily: "'Inter',sans-serif" }}>
                    Withdraw
                  </button>
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {withdrawFor && (
        <Suspense fallback={null}>
          <WithdrawModal position={withdrawFor} onClose={() => { setWithdrawFor(null); load(); }} />
        </Suspense>
      )}
      {depositFor && (
        <Suspense fallback={null}>
          <DepositModal vault={depositFor} onClose={() => { setDepositFor(null); load(); }} />
        </Suspense>
      )}
    </InvestorShell>
  );
}
