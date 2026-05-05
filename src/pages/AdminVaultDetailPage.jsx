import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { mapVault } from "../hooks/useVaultData.js";
import { useResponsive } from "../lib/responsive.js";
import { CHAIN_NAMES } from "../chains.js";

// Reuse the public VaultDetailPage as the rendering surface — it already
// shows score, APY chart, flags, full metric grid. We just feed it the
// admin-supplied payload so it works on disabled/hidden vaults too.
import VaultDetailPage from "./VaultDetailPage.jsx";

const API = import.meta.env.VITE_PARTNER_API || "https://api.yieldo.xyz";
const STORAGE_KEY = "yieldo_admin_session";

const C = {
  bg: "#f8f7fc", white: "#ffffff",
  border: "rgba(0,0,0,0.06)", border2: "rgba(0,0,0,0.1)",
  text: "#121212", text2: "rgba(0,0,0,0.65)", text3: "rgba(0,0,0,0.4)", text4: "rgba(0,0,0,0.25)",
  purple: "#7A1CCB", purpleDim: "rgba(122,28,203,0.06)",
  purpleGrad: "linear-gradient(100deg,#4B0CA6 0%,#7A1CCB 58%,#9E3BFF 114%)",
  purpleShadow: "0 0 18px rgba(80,14,170,0.13)",
  green: "#1a9d3f", greenDim: "rgba(26,157,63,0.07)",
  red: "#d93636", redBg: "#FFF0F0",
  amber: "#d97706", amberDim: "rgba(217,119,6,0.07)",
};

function loadSession() {
  try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) || null; } catch { return null; }
}

function Toggle({ checked, onChange, disabled }) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.45 : 1 }}>
      <span style={{
        width: 36, height: 20, borderRadius: 12, position: "relative",
        background: checked ? "linear-gradient(100deg,#4B0CA6 0%,#7A1CCB 58%,#9E3BFF 114%)" : "rgba(0,0,0,0.18)",
        transition: "background .18s",
      }}>
        <span style={{ position: "absolute", top: 2, left: checked ? 18 : 2,
                       width: 16, height: 16, borderRadius: "50%", background: "#fff",
                       boxShadow: "0 1px 3px rgba(0,0,0,.2)", transition: "left .18s" }} />
        <input type="checkbox" checked={checked} disabled={disabled}
          onChange={e => onChange?.(e.target.checked)}
          style={{ opacity: 0, position: "absolute", inset: 0, cursor: disabled ? "not-allowed" : "pointer" }} />
      </span>
    </label>
  );
}

export default function AdminVaultDetailPage() {
  const { vaultId } = useParams();
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const session = loadSession();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [savedAt, setSavedAt] = useState(0);

  const fetchData = useCallback(async () => {
    if (!session) return;
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/v1/admin/vaults/${encodeURIComponent(vaultId)}`, {
        headers: {
          "Authorization": `Bearer ${session.token}`,
          "X-Admin-Address": session.address,
        },
      });
      if (res.status === 401 || res.status === 403) {
        sessionStorage.removeItem(STORAGE_KEY);
        navigate("/admin");
        return;
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.detail || `Error ${res.status}`);
      }
      setData(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [vaultId, session, navigate]);

  useEffect(() => {
    if (!session) { navigate("/admin"); return; }
    fetchData();
  }, [session, fetchData, navigate]);

  const toggle = useCallback(async (patch) => {
    if (!session || !data) return;
    setPending(true); setError("");
    try {
      // Optimistic update — flip locally, then re-fetch to pull authoritative
      // effective state (includes registry locks).
      setData(d => ({ ...d, ...patch }));
      const res = await fetch(`${API}/v1/admin/vaults/${encodeURIComponent(vaultId)}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${session.token}`,
          "X-Admin-Address": session.address,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.detail || `Error ${res.status}`);
      }
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(0), 1500);
      // Re-fetch to get the effective state recomputed server-side.
      fetchData();
    } catch (e) {
      setError(e.message);
      fetchData();
    } finally {
      setPending(false);
    }
  }, [session, data, vaultId, fetchData]);

  // Build the same payload shape /api/vaults/[vaultId].js returns so we can
  // hand it to the public VaultDetailPage component without modification.
  // VaultDetailPage uses `useVaultDetail()` internally though, which fetches
  // from /api/vaults/. We can't bypass that — so we render a local detail
  // view here using mapVault on the admin payload.
  const mapped = useMemo(() => {
    if (!data?.metrics?.vault_id) return null;
    try {
      const m = mapVault(data.metrics);
      // Mirror the snapshot enrichment that useVaultDetail does.
      if (data.snapshots && data.snapshots.length) {
        m.apyHistory = data.snapshots.map(s => (s.net_apy || 0) * 100);
        m.apyDates   = data.snapshots.map(s => s.date || "");
        m.tvlHistory = data.snapshots.map(s => s.total_assets_usd || 0);
        m.snapshots  = data.snapshots;
      }
      return m;
    } catch { return null; }
  }, [data]);

  const effListed      = data?.effective_listed ?? data?.admin_enabled;
  const effDeposits    = data?.effective_deposits ?? data?.admin_deposits_enabled;
  const effWithdrawals = data?.effective_withdrawals ?? data?.admin_withdrawals_enabled;

  return (
    <div style={{ fontFamily: "'Inter',sans-serif", background: C.bg, color: C.text, minHeight: "100vh" }}>
      {/* Admin header bar */}
      <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 30,
                    padding: isMobile ? "10px 14px" : "12px 24px",
                    display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button onClick={() => navigate("/admin")}
          style={{ padding: "6px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600,
                   border: `1px solid ${C.border2}`, background: C.white, color: C.text2,
                   cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
          ← Console
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 4,
                         background: C.purpleDim, color: C.purple, letterSpacing: ".05em", textTransform: "uppercase" }}>
            Admin
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.text2,
                         overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {data?.name || "Loading…"}
          </span>
          {data && (
            <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4,
                           background: C.purpleDim, color: C.purple }}>
              {CHAIN_NAMES[data.chain_id] || `Chain ${data.chain_id}`}
            </span>
          )}
          {data && (effListed ? (
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                           background: C.greenDim, color: C.green }}>● Live</span>
          ) : (
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                           background: "rgba(217,54,54,.10)", color: C.red }}>● Hidden</span>
          ))}
        </div>
        <div style={{ marginLeft: "auto", fontSize: 11, color: savedAt ? C.green : C.text4, fontWeight: 600 }}>
          {savedAt ? "✓ Saved" : pending ? "Saving…" : ""}
        </div>
      </div>

      {/* Toggle bar — controls live state from the same screen as the metrics */}
      {data && (
        <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`,
                      padding: isMobile ? "12px 14px" : "14px 24px",
                      display: "flex", flexWrap: "wrap", alignItems: "center", gap: isMobile ? 14 : 28 }}>
          <ToggleField
            label="Listed on /vault"
            hint="Hide from the public catalog"
            checked={!!effListed} disabled={pending}
            onChange={(b) => toggle({ enabled: b })} />
          <ToggleField
            label="Deposits"
            hint={data.deposits_locked ? "🔒 Locked by vault type" : "Allow new deposits"}
            checked={!!effDeposits} disabled={pending || data.deposits_locked}
            onChange={(b) => toggle({ deposits_enabled: b })} />
          <ToggleField
            label="Withdrawals"
            hint={data.withdrawals_locked ? "🔒 Locked by vault type" : "Allow redeems"}
            checked={!!effWithdrawals} disabled={pending || data.withdrawals_locked}
            onChange={(b) => toggle({ withdrawals_enabled: b })} />
          <div style={{ marginLeft: "auto", fontSize: 11, color: C.text3 }}>
            {data.updated_at && (
              <>Last admin change {new Date(data.updated_at).toLocaleString()}</>
            )}
          </div>
        </div>
      )}

      {/* Body */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "16px 14px 60px" : "24px 24px 60px" }}>
        {error && (
          <div style={{ background: C.redBg, border: "1px solid rgba(217,54,54,.18)", color: "#9c2727",
                        padding: "10px 14px", borderRadius: 8, marginBottom: 14, fontSize: 13 }}>
            {error}
          </div>
        )}

        {loading && !data && (
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 10,
                        padding: 40, textAlign: "center", color: C.text3, fontSize: 14 }}>
            Loading admin metrics…
          </div>
        )}

        {!loading && !mapped && data && (
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 10,
                        padding: 24, color: C.text3, fontSize: 13, lineHeight: 1.55 }}>
            <strong style={{ color: C.text2 }}>{data.name}</strong> is registered but the indexer hasn't produced
            metrics for it yet. Once the next indexer cycle runs, scores and APY will appear here automatically.
          </div>
        )}

        {/* Reuse the public VaultDetailPage by feeding it the prepared `vault`
            prop. It accepts `vault: listVault` and renders without re-fetching
            when it has enough data — but it ALSO calls useVaultDetail() which
            hits /api/vaults/{id}. That public endpoint will work for any vault
            (including admin-disabled ones, since /api filtering is opt-in),
            so we just pass `listVault` and let the public detail logic do its
            thing. The admin shell + toggle bar above are added by us. */}
        {mapped && (
          <VaultDetailPage vault={mapped} onBack={() => navigate("/admin")} skipFetch />
        )}
      </div>
    </div>
  );
}

function ToggleField({ label, hint, checked, onChange, disabled }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} />
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.text2 }}>{label}</div>
        <div style={{ fontSize: 10, color: C.text4 }}>{hint}</div>
      </div>
    </div>
  );
}
