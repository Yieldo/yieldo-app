import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { useAccount } from "wagmi";
import { formatUnits } from "viem";
import { DEPOSITABLE_CHAINS, CHAIN_NAMES as CHAINS } from "../chains.js";
import { useResponsive } from "../lib/responsive.js";

const WithdrawModal = lazy(() => import("./WithdrawModal.jsx"));
const DepositModal = lazy(() => import("./DepositModal.jsx"));

const API = import.meta.env.VITE_PARTNER_API || "https://api.yieldo.xyz";

const C = {
  white: "#fff", border: "rgba(0,0,0,.06)", border2: "rgba(0,0,0,.1)",
  text: "#121212", text2: "rgba(0,0,0,.65)", text3: "rgba(0,0,0,.4)", text4: "rgba(0,0,0,.25)",
  purple: "#7A1CCB", purpleDim: "rgba(122,28,203,.06)",
  purpleGrad: "linear-gradient(100deg,#4B0CA6 0%,#7A1CCB 58%,#9E3BFF 114%)",
  purpleShadow: "0 0 17px rgba(80,14,170,.12)",
  green: "#1a9d3f", greenDim: "rgba(26,157,63,.07)",
};

function fmtShares(raw, decimals = 18, maxDp = 4) {
  try {
    const s = formatUnits(BigInt(raw), decimals);
    const [w, d = ""] = s.split(".");
    const ds = d.slice(0, maxDp).replace(/0+$/, "");
    return ds ? `${w}.${ds}` : w;
  } catch { return "0"; }
}

export default function UserPositions() {
  const { address, isConnected } = useAccount();
  const { isMobile } = useResponsive();
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

  if (!isConnected) return null;

  return (
    <>
      <div style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Your Positions</div>
            <div style={{ fontSize: 12, color: C.text3, marginTop: 2 }}>
              {loading ? "Loading..." : `${positions.length} vault${positions.length !== 1 ? "s" : ""}`}
            </div>
          </div>
        </div>

        {!loading && positions.length === 0 && (
          <div style={{ background: C.white, borderRadius: 11, border: `1px solid ${C.border}`, padding: "32px 18px", textAlign: "center" }}>
            <div style={{ fontSize: 13, color: C.text3 }}>No positions yet. Deposit into a vault to get started.</div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {positions.map((p) => {
            const canDeposit = DEPOSITABLE_CHAINS.includes(p.chain_id);
            const vaultForDeposit = {
              id: p.vault_id,
              chain_id: p.chain_id,
              name: p.vault_name,
              address: p.vault_address,
              asset: p.asset_symbol,
              assetLower: p.asset_symbol?.toLowerCase(),
              type: p.vault_type,
            };
            return (
              <div key={p.vault_id}
                style={{ background: C.white, borderRadius: 11, border: `1px solid ${C.border}`,
                         padding: isMobile ? "12px 14px" : "14px 18px", transition: "border-color .15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.purple; e.currentTarget.style.boxShadow = "0 2px 10px rgba(122,28,203,.08)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = "none"; }}>
                {/* Top row: icon + name + balance — always horizontal */}
                <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 14 }}>
                  <div style={{ width: isMobile ? 36 : 40, height: isMobile ? 36 : 40, borderRadius: 10, background: C.purpleDim,
                                display: "flex", alignItems: "center", justifyContent: "center", fontSize: isMobile ? 16 : 18, flexShrink: 0 }}>
                    {p.asset_symbol === "USDC" || p.asset_symbol === "USDT" ? "💵" : p.asset_symbol === "WETH" || p.asset_symbol === "wstETH" || p.asset_symbol === "stETH" ? "⟠" : p.asset_symbol === "WBTC" ? "₿" : "🏦"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                      <span style={{ fontSize: isMobile ? 13.5 : 14, fontWeight: 700,
                                     overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: isMobile ? 200 : 320 }}>{p.vault_name}</span>
                      <span style={{ fontSize: 11, color: C.text3 }}>{CHAINS[p.chain_id]}</span>
                    </div>
                    <div style={{ fontSize: 11, color: C.text3 }}>
                      {p.asset_symbol} · {p.vault_type}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", marginRight: isMobile ? 0 : 8, flexShrink: 0 }}>
                    <div style={{ fontSize: isMobile ? 14 : 16, fontWeight: 700, color: C.text }}>
                      {fmtShares(p.share_balance, p.share_decimals)}
                    </div>
                    <div style={{ fontSize: 10, color: C.text4 }}>shares</div>
                  </div>
                  {/* Inline buttons on desktop only */}
                  {!isMobile && (
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button onClick={() => { if (canDeposit) setDepositFor(vaultForDeposit); }} disabled={!canDeposit}
                        style={{ fontSize: 12, fontWeight: 600, padding: "7px 14px", borderRadius: 8, border: "none", backgroundImage: canDeposit ? C.purpleGrad : "none", background: canDeposit ? undefined : C.border, color: canDeposit ? "#fff" : C.text4, cursor: canDeposit ? "pointer" : "not-allowed", fontFamily: "'Inter',sans-serif", boxShadow: canDeposit ? C.purpleShadow : "none" }}>
                        Deposit
                      </button>
                      <button onClick={() => setWithdrawFor(p)}
                        style={{ fontSize: 12, fontWeight: 600, padding: "7px 14px", borderRadius: 8, border: `1px solid ${C.purple}40`, background: C.white, color: C.purple, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
                        Withdraw
                      </button>
                    </div>
                  )}
                </div>
                {/* Mobile: full-width button row underneath */}
                {isMobile && (
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button onClick={() => { if (canDeposit) setDepositFor(vaultForDeposit); }} disabled={!canDeposit}
                      style={{ flex: 1, fontSize: 13, fontWeight: 600, padding: "10px 0", borderRadius: 9,
                               border: "none", backgroundImage: canDeposit ? C.purpleGrad : "none",
                               background: canDeposit ? undefined : C.border, color: canDeposit ? "#fff" : C.text4,
                               cursor: canDeposit ? "pointer" : "not-allowed", fontFamily: "'Inter',sans-serif",
                               boxShadow: canDeposit ? C.purpleShadow : "none" }}>
                      Deposit
                    </button>
                    <button onClick={() => setWithdrawFor(p)}
                      style={{ flex: 1, fontSize: 13, fontWeight: 600, padding: "10px 0", borderRadius: 9,
                               border: `1px solid ${C.purple}40`, background: C.white, color: C.purple, cursor: "pointer",
                               fontFamily: "'Inter',sans-serif" }}>
                      Withdraw
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

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
    </>
  );
}
