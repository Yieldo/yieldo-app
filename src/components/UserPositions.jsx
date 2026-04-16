import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { useAccount } from "wagmi";
import { formatUnits } from "viem";

const WithdrawModal = lazy(() => import("./WithdrawModal.jsx"));

const API = import.meta.env.VITE_PARTNER_API || "https://api.yieldo.xyz";
const CHAINS = { 1: "Ethereum", 8453: "Base", 42161: "Arbitrum", 10: "Optimism", 143: "Monad", 999: "HyperEVM", 747474: "Katana" };

const C = {
  white: "#fff", border: "rgba(0,0,0,.06)", border2: "rgba(0,0,0,.1)",
  text: "#121212", text2: "rgba(0,0,0,.65)", text3: "rgba(0,0,0,.4)", text4: "rgba(0,0,0,.25)",
  purple: "#7A1CCB", purpleDim: "rgba(122,28,203,.06)",
  purpleGrad: "linear-gradient(100deg,#4B0CA6 0%,#7A1CCB 58%,#9E3BFF 114%)",
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
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [withdrawFor, setWithdrawFor] = useState(null);

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
      <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: "20px 24px", marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>Your Positions</span>
          <span style={{ fontSize: 11, color: C.text4, marginLeft: "auto" }}>
            {loading ? "Loading..." : `${positions.length} vault${positions.length !== 1 ? "s" : ""}`}
          </span>
        </div>

        {!loading && positions.length === 0 && (
          <div style={{ textAlign: "center", padding: "24px 0", fontSize: 13, color: C.text3 }}>
            No positions yet. Deposit into a vault to get started.
          </div>
        )}

        {positions.map((p) => (
          <PositionRow key={p.vault_id} p={p} onWithdraw={() => setWithdrawFor(p)} />
        ))}
      </div>

      {withdrawFor && (
        <Suspense fallback={null}>
          <WithdrawModal position={withdrawFor} onClose={() => { setWithdrawFor(null); load(); }} />
        </Suspense>
      )}
    </>
  );
}

function PositionRow({ p, onWithdraw }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{p.vault_name}</div>
        <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>
          {CHAINS[p.chain_id]} · {p.asset_symbol} · {p.vault_type}
        </div>
      </div>
      <div style={{ textAlign: "right", minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
          {fmtShares(p.share_balance, p.share_decimals)} shares
        </div>
      </div>
      <button onClick={onWithdraw} style={{
        fontSize: 12, fontWeight: 600, padding: "7px 14px", borderRadius: 6,
        border: `1px solid ${C.border2}`, background: C.white, color: C.text2,
        cursor: "pointer", fontFamily: "'Inter',sans-serif",
      }}>Withdraw</button>
    </div>
  );
}
