import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAccount, useDisconnect, useSignMessage } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { CHAIN_NAMES } from "../chains.js";
import { useResponsive } from "../lib/responsive.js";
import { mapVault } from "../hooks/useVaultData.js";

const API = import.meta.env.VITE_PARTNER_API || "https://api.yieldo.xyz";
const STORAGE_KEY = "yieldo_admin_session";

const C = {
  bg: "#f8f7fc", white: "#ffffff", surface: "#fff", surfaceAlt: "#faf9fe",
  border: "rgba(0,0,0,0.06)", border2: "rgba(0,0,0,0.1)",
  text: "#121212", text2: "rgba(0,0,0,0.65)", text3: "rgba(0,0,0,0.4)", text4: "rgba(0,0,0,0.22)",
  purple: "#7A1CCB", purpleDim: "rgba(122,28,203,0.06)",
  purpleGrad: "linear-gradient(100deg,#4B0CA6 0%,#7A1CCB 58%,#9E3BFF 114%)",
  purpleShadow: "0 0 18px rgba(80,14,170,0.13)",
  green: "#1a9d3f", greenDim: "rgba(26,157,63,0.07)",
  red: "#d93636", redBg: "#FFF0F0",
  amber: "#d97706", amberDim: "rgba(217,119,6,0.07)",
  teal: "#2E9AB8",
};

function loadSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function saveSession(s) { try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {} }
function clearSession() { try { sessionStorage.removeItem(STORAGE_KEY); } catch {} }

async function adminFetch(path, { method = "GET", body, session } = {}) {
  if (!session) throw new Error("No session");
  const headers = {
    "Authorization": `Bearer ${session.token}`,
    "X-Admin-Address": session.address,
  };
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch(`${API}/v1/admin${path}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401 || res.status === 403) {
    clearSession();
    throw new Error("Session expired");
  }
  if (!res.ok) {
    let detail = `Error ${res.status}`;
    try { const j = await res.json(); detail = j.detail || detail; } catch {}
    throw new Error(detail);
  }
  return res.json();
}

// Compact score ring — same color logic as the public /vault page.
function ScoreRing({ score, size = 36, sw = 3 }) {
  if (score == null || isNaN(score)) {
    return (
      <div style={{ width: size, height: size, borderRadius: "50%", border: `${sw}px solid ${C.border2}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: size * 0.3, color: C.text4, fontWeight: 600 }}>—</div>
    );
  }
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(100, score)) / 100);
  const color = score >= 85 ? C.green : score >= 70 ? C.amber : score >= 50 ? "#f59e0b" : C.red;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(0,0,0,.06)" strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={sw}
                strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: size * 0.34, fontWeight: 700, color }}>
        {Math.round(score)}
      </div>
    </div>
  );
}

function fmtTvl(n) {
  if (n == null || isNaN(n)) return "—";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtPct(n) {
  if (n == null || isNaN(n)) return "—";
  return `${n.toFixed(2)}%`;
}

function Toggle({ checked, onChange, label, disabled }) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.45 : 1 }}>
      <span style={{
        width: 36, height: 20, borderRadius: 12, position: "relative",
        background: checked ? C.purpleGrad : "rgba(0,0,0,0.18)",
        backgroundImage: checked ? C.purpleGrad : undefined,
        transition: "background .18s",
      }}>
        <span style={{
          position: "absolute", top: 2, left: checked ? 18 : 2,
          width: 16, height: 16, borderRadius: "50%", background: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,.2)",
          transition: "left .18s",
        }} />
        <input type="checkbox" checked={checked} disabled={disabled}
          onChange={e => onChange?.(e.target.checked)}
          style={{ opacity: 0, position: "absolute", inset: 0, cursor: disabled ? "not-allowed" : "pointer" }} />
      </span>
      {label && <span style={{ fontSize: 12, color: C.text2, fontWeight: 500 }}>{label}</span>}
    </label>
  );
}

export default function AdminPage() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();
  const { signMessageAsync } = useSignMessage();
  const { isMobile } = useResponsive();

  const [session, setSession] = useState(loadSession);
  const [vaults, setVaults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [chainFilter, setChainFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all"); // all | enabled | disabled
  const [error, setError] = useState("");
  const [pendingFlip, setPendingFlip] = useState(new Set()); // vault_ids being toggled
  const [savedAt, setSavedAt] = useState(0);

  // Drop session if the connected wallet no longer matches.
  useEffect(() => {
    if (session && address && session.address.toLowerCase() !== address.toLowerCase()) {
      clearSession();
      setSession(null);
    }
  }, [address, session]);

  const refresh = useCallback(async (s) => {
    const sess = s || session;
    if (!sess) return;
    setLoading(true);
    setError("");
    try {
      const data = await adminFetch("/vaults", { session: sess });
      setVaults(data.vaults || []);
    } catch (e) {
      setError(e.message);
      if (e.message === "Session expired") setSession(null);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => { if (session) refresh(); }, [session, refresh]);

  // Periodically re-fetch so newly-indexed vaults show up automatically.
  useEffect(() => {
    if (!session) return;
    const id = setInterval(() => refresh(), 30_000);
    return () => clearInterval(id);
  }, [session, refresh]);

  const toggle = useCallback(async (vaultId, patch) => {
    if (!session) return;
    setPendingFlip(prev => new Set(prev).add(vaultId));
    setError("");
    try {
      // Optimistic update — flip the UI immediately, roll back on failure.
      setVaults(vs => vs.map(v => v.vault_id === vaultId ? { ...v, ...patch } : v));
      await adminFetch(`/vaults/${encodeURIComponent(vaultId)}`, { method: "PATCH", body: patch, session });
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(0), 1500);
    } catch (e) {
      setError(e.message);
      // Rollback by re-fetching authoritative state.
      refresh();
    } finally {
      setPendingFlip(prev => { const n = new Set(prev); n.delete(vaultId); return n; });
    }
  }, [session, refresh]);

  // ────────────── LOGIN VIEW ──────────────

  if (!session) {
    return <LoginCard
      address={address}
      isConnected={isConnected}
      openConnectModal={openConnectModal}
      disconnect={disconnect}
      signMessageAsync={signMessageAsync}
      onAuthenticated={(s) => { saveSession(s); setSession(s); }}
      isMobile={isMobile}
    />;
  }

  // ────────────── ADMIN VIEW ──────────────

  const chains = Array.from(new Set(vaults.map(v => v.chain_id))).sort((a, b) => a - b);
  // Effective live state is what users actually see — that's what we count.
  // Falls back to admin override only when the new fields aren't present
  // (older API build), so the page still shows sane numbers during deploys.
  const isLive = (v) => v.effective_listed ?? v.enabled;
  const counts = {
    total: vaults.length,
    enabled: vaults.filter(isLive).length,
    disabled: vaults.filter(v => !isLive(v)).length,
  };
  const q = search.trim().toLowerCase();
  const filtered = vaults.filter(v => {
    if (chainFilter !== "all" && v.chain_id !== Number(chainFilter)) return false;
    if (stateFilter === "enabled" && !isLive(v)) return false;
    if (stateFilter === "disabled" && isLive(v)) return false;
    if (q) {
      return (
        (v.name || "").toLowerCase().includes(q) ||
        (v.vault_id || "").toLowerCase().includes(q) ||
        (v.address || "").toLowerCase().includes(q) ||
        (v.curator || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div style={{ fontFamily: "'Inter',sans-serif", background: C.bg, color: C.text, minHeight: "100vh" }}>
      {/* Header */}
      <header style={{ background: C.white, borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 30,
                       padding: isMobile ? "10px 14px" : "12px 24px",
                       display: "flex", alignItems: "center", gap: 12, justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <img src="/yieldo-new.png" alt="Yieldo" style={{ width: 26, height: 26, borderRadius: 7 }} />
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: ".04em" }}>YIELDO</span>
          <span style={{ color: C.text4 }}>/</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.purple, letterSpacing: ".05em", textTransform: "uppercase" }}>Admin</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, flexShrink: 0 }}>
          <span style={{ color: C.text4, fontFamily: "monospace", fontSize: 11 }}>
            {session.address.slice(0, 6)}...{session.address.slice(-4)}
          </span>
          <button onClick={async () => {
            try { await fetch(`${API}/v1/admin/logout`, { method: "POST", headers: { Authorization: `Bearer ${session.token}` } }); } catch {}
            clearSession(); setSession(null);
          }} style={{ fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: 7,
                      border: `1px solid ${C.border2}`, background: C.white, color: C.text2,
                      cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
            Sign out
          </button>
        </div>
      </header>

      {/* Body */}
      <main style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "16px 14px 60px" : "28px 24px 60px" }}>
        <div style={{ marginBottom: 18 }}>
          <h1 style={{ margin: "0 0 4px", fontSize: isMobile ? 20 : 24, fontWeight: 700 }}>Vault Toggle Console</h1>
          <p style={{ margin: 0, fontSize: 13, color: C.text3, lineHeight: 1.55 }}>
            Hide a vault from the public UI, or kill deposits/withdrawals independently. New vaults from the indexer
            appear here automatically (refreshed every 30s) — defaults are fully enabled until you flip something.
          </p>
        </div>

        {/* Stat strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}>
          <Stat label="Total" value={counts.total} color={C.purple} />
          <Stat label="Enabled" value={counts.enabled} color={C.green} />
          <Stat label="Disabled" value={counts.disabled} color={C.red} />
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: "1 1 220px", maxWidth: isMobile ? "100%" : 280 }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: C.text4 }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name / id / address / curator…"
              style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px 9px 32px",
                       borderRadius: 8, border: `1.5px solid ${search ? C.purple : C.border2}`,
                       fontSize: 13, fontFamily: "'Inter',sans-serif", outline: "none",
                       background: C.white, color: C.text }} />
          </div>
          <select value={chainFilter} onChange={e => setChainFilter(e.target.value)}
            style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border2}`,
                     background: C.white, fontSize: 13, fontFamily: "'Inter',sans-serif", cursor: "pointer" }}>
            <option value="all">All chains</option>
            {chains.map(cid => <option key={cid} value={cid}>{CHAIN_NAMES[cid] || `Chain ${cid}`}</option>)}
          </select>
          <div style={{ display: "flex", gap: 4, background: C.surfaceAlt, borderRadius: 8, padding: 3, border: `1px solid ${C.border}` }}>
            {[["all", "All"], ["enabled", "Enabled"], ["disabled", "Disabled"]].map(([id, label]) => (
              <button key={id} onClick={() => setStateFilter(id)}
                style={{ padding: "6px 12px", fontSize: 12, fontWeight: stateFilter === id ? 700 : 500,
                         border: "none", borderRadius: 6, cursor: "pointer", fontFamily: "'Inter',sans-serif",
                         background: stateFilter === id ? C.white : "transparent",
                         color: stateFilter === id ? C.purple : C.text3,
                         boxShadow: stateFilter === id ? "0 1px 3px rgba(0,0,0,.06)" : "none" }}>
                {label}
              </button>
            ))}
          </div>
          <div style={{ marginLeft: "auto", fontSize: 11, color: savedAt ? C.green : C.text4, fontWeight: 500 }}>
            {savedAt ? "✓ Saved" : loading ? "Refreshing…" : `${filtered.length} of ${vaults.length}`}
          </div>
        </div>

        {error && (
          <div style={{ background: C.redBg, border: "1px solid rgba(217,54,54,.18)", color: "#9c2727",
                        padding: "10px 14px", borderRadius: 8, marginBottom: 14, fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Vault grid / list */}
        {loading && vaults.length === 0 && (
          <Card padding={40} center muted>Loading vaults…</Card>
        )}
        {!loading && filtered.length === 0 && (
          <Card padding={40} center muted>No vaults match this filter.</Card>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
          {filtered.map(v => (
            <VaultRow key={v.vault_id} v={v}
              busy={pendingFlip.has(v.vault_id)}
              onToggle={(patch) => toggle(v.vault_id, patch)}
              onOpenDetail={(vid) => navigate(`/admin/vault/${encodeURIComponent(vid)}`)}
              isMobile={isMobile} />
          ))}
        </div>
      </main>
    </div>
  );
}

function Card({ children, padding = 16, center, muted, style: sx = {} }) {
  return (
    <div style={{
      background: C.white, border: `1px solid ${C.border}`, borderRadius: 10,
      padding, color: muted ? C.text3 : C.text,
      textAlign: center ? "center" : "left",
      fontSize: muted ? 13 : 14,
      ...sx,
    }}>{children}</div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px" }}>
      <div style={{ fontSize: 10.5, color: C.text4, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

// Pretty labels for the reason codes the API returns. The badges below each
// toggle make it obvious whether a vault is off because of an admin choice or
// because of registry config (paused / unsupported type).
const REASON_LABELS = {
  "admin":           { label: "Admin",          color: C.red,   bg: "rgba(217,54,54,.10)" },
  "type-locked":     { label: "Type locked",    color: C.text3, bg: "rgba(0,0,0,.05)" },
  "registry-paused": { label: "Registry paused", color: C.amber, bg: C.amberDim },
  "listing-off":     { label: "Listing off",    color: C.text3, bg: "rgba(0,0,0,.05)" },
};

function ReasonBadges({ reasons }) {
  if (!reasons || reasons.length === 0) return null;
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
      {reasons.map((r, i) => {
        const m = REASON_LABELS[r] || { label: r, color: C.text3, bg: "rgba(0,0,0,.05)" };
        return (
          <span key={i} style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 3,
                                 background: m.bg, color: m.color, letterSpacing: ".03em",
                                 textTransform: "uppercase", whiteSpace: "nowrap" }}>
            {m.label}
          </span>
        );
      })}
    </div>
  );
}

function VaultRow({ v, busy, onToggle, isMobile, onOpenDetail }) {
  // Prefer the new effective fields; fall back to admin-only when not present
  // (during a partial deploy). This keeps the toggle reflecting what users
  // actually see, not just the admin override.
  const effListed = v.effective_listed ?? v.enabled;
  const effDeposits = v.effective_deposits ?? (v.enabled && v.deposits_enabled);
  const effWithdrawals = v.effective_withdrawals ?? (v.enabled && v.withdrawals_enabled);

  const colorBar = effListed ? (effDeposits || effWithdrawals ? C.green : C.amber) : C.red;
  const depositsLocked = !!v.deposits_locked;
  const withdrawalsLocked = !!v.withdrawals_locked;

  // Run the indexer payload through mapVault so we get the same Yieldo Score,
  // APY, TVL, depositors, risk label etc. that /vault and /vault/:id show.
  // Falls back to undefined for vaults the indexer hasn't scored yet.
  const m = useMemo(() => {
    if (!v.metrics || !v.metrics.vault_id) return null;
    try { return mapVault(v.metrics); } catch { return null; }
  }, [v.metrics]);

  return (
    <div style={{
      background: C.white, border: `1px solid ${C.border}`,
      borderLeft: `3px solid ${colorBar}`,
      borderRadius: 10, padding: isMobile ? "12px 14px" : "14px 18px",
      opacity: effListed ? 1 : 0.78, transition: "opacity .15s, border-color .15s",
    }}>
      {/* Top section: identity + score ring + key metrics */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: isMobile ? 12 : 16, flexWrap: "wrap" }}>
        <div style={{ flexShrink: 0 }}>
          <ScoreRing score={m?.yieldoScore} size={isMobile ? 40 : 48} sw={3.5} />
        </div>
        <div style={{ flex: "2 1 220px", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
            <button onClick={() => onOpenDetail?.(v.vault_id)}
              style={{ fontSize: isMobile ? 13.5 : 14.5, fontWeight: 700, background: "none", border: "none",
                       padding: 0, cursor: "pointer", color: C.text, fontFamily: "'Inter',sans-serif",
                       overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%",
                       textAlign: "left" }}>
              {v.name}
            </button>
            <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4,
                           background: C.purpleDim, color: C.purple }}>
              {CHAIN_NAMES[v.chain_id] || `Chain ${v.chain_id}`}
            </span>
            {effListed ? (
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                             background: C.greenDim, color: C.green }}>● Live</span>
            ) : (
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                             background: "rgba(217,54,54,.10)", color: C.red }}>● Hidden</span>
            )}
            {v.paused && (
              <span title={v.paused_reason || ""}
                style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                         background: C.amberDim, color: C.amber }}>Registry paused</span>
            )}
          </div>
          <div style={{ fontSize: 11, color: C.text3, marginBottom: 2 }}>
            {v.asset_symbol} · {v.type || "morpho"}{v.curator ? ` · ${v.curator}` : ""}{m?.risk ? ` · Risk: ${m.risk}` : ""}
          </div>
          <div style={{ fontSize: 10, color: C.text4, fontFamily: "monospace",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {v.address}
          </div>
        </div>

        {/* Metric mini-grid — only shows when we have indexer data */}
        {m && (
          <div style={{ display: "flex", gap: isMobile ? 14 : 22, flexShrink: 0,
                        alignSelf: "stretch", alignItems: "center", flexWrap: "wrap" }}>
            <MiniStat label="APY"        value={fmtPct(m.apy)} color={(m.apy ?? 0) < 0 ? C.red : C.purple} />
            <MiniStat label="TVL"        value={fmtTvl(m.tvl)} color={C.text} />
            <MiniStat label="Depositors" value={m.depositors != null ? m.depositors.toLocaleString() : "—"} color={C.text} />
          </div>
        )}
      </div>

      {/* Toggle row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: isMobile ? 14 : 22, flexWrap: "wrap",
                    marginTop: 12, paddingTop: 12, borderTop: `1px dashed ${C.border}`,
                    justifyContent: isMobile ? "flex-start" : "space-between" }}>
        <div style={{ display: "flex", gap: isMobile ? 14 : 22, flexWrap: "wrap" }}>
          <ToggleCol
            label="Listed" hint="Shown on /vault"
            checked={effListed}
            reasons={v.listed_reasons}
            disabled={busy}
            onChange={(b) => onToggle({ enabled: b })} />
          <ToggleCol
            label="Deposits"
            hint={depositsLocked ? "Locked by vault type" : "Allow new deposits"}
            checked={effDeposits}
            reasons={v.deposits_reasons}
            disabled={busy || depositsLocked}
            locked={depositsLocked}
            onChange={(b) => onToggle({ deposits_enabled: b })} />
          <ToggleCol
            label="Withdrawals"
            hint={withdrawalsLocked ? "Locked by vault type" : "Allow redeems"}
            checked={effWithdrawals}
            reasons={v.withdrawals_reasons}
            disabled={busy || withdrawalsLocked}
            locked={withdrawalsLocked}
            onChange={(b) => onToggle({ withdrawals_enabled: b })} />
        </div>
        <div style={{ display: "flex", gap: 6, alignSelf: "center" }}>
          <button onClick={() => onOpenDetail?.(v.vault_id)}
            style={{ padding: "7px 14px", borderRadius: 7, fontSize: 12, fontWeight: 700,
                     border: "none", backgroundImage: C.purpleGrad, color: "#fff",
                     cursor: "pointer", fontFamily: "'Inter',sans-serif", whiteSpace: "nowrap",
                     boxShadow: C.purpleShadow }}>
            View metrics →
          </button>
          <button onClick={() => window.open(`/vault/${encodeURIComponent(v.vault_id)}`, "_blank", "noopener")}
            title="Open the public-facing detail page in a new tab"
            style={{ padding: "7px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600,
                     border: `1px solid ${C.border2}`, background: C.white, color: C.text2,
                     cursor: "pointer", fontFamily: "'Inter',sans-serif", whiteSpace: "nowrap" }}>
            Public ↗
          </button>
        </div>
      </div>
      {v.updated_at && (
        <div style={{ marginTop: 8, fontSize: 10.5, color: C.text4 }}>
          Last admin change {new Date(v.updated_at).toLocaleString()} by {v.updated_by ? `${v.updated_by.slice(0, 6)}…${v.updated_by.slice(-4)}` : "—"}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, color = C.text }) {
  return (
    <div style={{ minWidth: 70, textAlign: "right" }}>
      <div style={{ fontSize: 9, color: C.text4, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 1 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color }}>
        {value}
      </div>
    </div>
  );
}

function ToggleCol({ label, hint, checked, onChange, disabled, locked, reasons }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 110 }}>
      <div style={{ fontSize: 10, color: C.text4, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em",
                    display: "flex", alignItems: "center", gap: 4 }}>
        {label}
        {locked && <span title="Hard-locked by vault type — admin cannot override" style={{ fontSize: 10, color: C.text3 }}>🔒</span>}
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} />
      <div style={{ fontSize: 9.5, color: C.text4 }}>{hint}</div>
      <ReasonBadges reasons={reasons} />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Login flow
// ──────────────────────────────────────────────────────────────

function LoginCard({ address, isConnected, openConnectModal, disconnect, signMessageAsync, onAuthenticated, isMobile }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    if (!isConnected || !address) {
      setError("Connect your wallet first.");
      return;
    }
    if (!password) {
      setError("Enter the admin password.");
      return;
    }
    setBusy(true);
    try {
      // Step 1 — fetch nonce. Backend returns 403 immediately if the wallet
      // isn't on the allowlist, so a non-admin doesn't get prompted to sign.
      const nonceRes = await fetch(`${API}/v1/admin/nonce`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      if (!nonceRes.ok) {
        const j = await nonceRes.json().catch(() => ({}));
        throw new Error(j.detail || `Login init failed (${nonceRes.status})`);
      }
      const { nonce, message } = await nonceRes.json();
      // Step 2 — wallet signature.
      const signature = await signMessageAsync({ message });
      // Step 3 — exchange password + signature for a session token.
      const loginRes = await fetch(`${API}/v1/admin/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, nonce, signature, password }),
      });
      if (!loginRes.ok) {
        const j = await loginRes.json().catch(() => ({}));
        throw new Error(j.detail || `Login failed (${loginRes.status})`);
      }
      const data = await loginRes.json();
      onAuthenticated({ token: data.token, address: data.address });
    } catch (e) {
      setError(e.shortMessage || e.message || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ fontFamily: "'Inter',sans-serif", background: C.bg, color: C.text, minHeight: "100vh",
                  display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 440, background: C.white, borderRadius: 14,
                    border: `1px solid ${C.border}`, padding: isMobile ? "24px 22px" : "32px 30px",
                    boxShadow: "0 8px 30px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <img src="/yieldo-new.png" alt="Yieldo" style={{ width: 30, height: 30, borderRadius: 8 }} />
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".05em" }}>YIELDO</span>
          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 4,
                         background: C.purpleDim, color: C.purple, letterSpacing: ".05em", textTransform: "uppercase" }}>Admin</span>
        </div>
        <h1 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 700 }}>Sign in</h1>
        <p style={{ margin: "0 0 22px", fontSize: 13, color: C.text3, lineHeight: 1.55 }}>
          Two-factor: your password + a signature from an authorized admin wallet.
        </p>

        {/* Step 1 — wallet */}
        <Step n="1" title="Connect admin wallet" complete={isConnected}>
          {isConnected ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px",
                          borderRadius: 8, background: C.greenDim, fontSize: 13 }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: C.green }} />
              <span style={{ fontFamily: "monospace", color: C.text2 }}>
                {address.slice(0, 8)}...{address.slice(-6)}
              </span>
              <button onClick={() => disconnect()}
                style={{ marginLeft: "auto", fontSize: 11, color: C.red, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                Disconnect
              </button>
            </div>
          ) : (
            <button onClick={openConnectModal}
              style={{ width: "100%", padding: "11px 16px", borderRadius: 8, border: "none", cursor: "pointer",
                       backgroundImage: C.purpleGrad, color: "#fff", fontSize: 13, fontWeight: 600,
                       boxShadow: C.purpleShadow, fontFamily: "'Inter',sans-serif" }}>
              Connect Wallet
            </button>
          )}
        </Step>

        {/* Step 2 — password */}
        <Step n="2" title="Enter admin password">
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            onKeyDown={e => { if (e.key === "Enter") submit(); }}
            style={{ width: "100%", boxSizing: "border-box", padding: "11px 14px",
                     borderRadius: 8, border: `1.5px solid ${password ? C.purple : C.border2}`,
                     fontSize: 14, fontFamily: "'Inter',sans-serif", outline: "none",
                     background: C.white, color: C.text }} />
        </Step>

        {/* Step 3 — submit. Always uses the gradient background so the white
             label stays high-contrast; we just dim the whole thing when
             disabled. Avoids the unreadable grey-text-on-grey-button look. */}
        {(() => {
          const inactive = busy || !isConnected || !password;
          return (
            <button onClick={submit} disabled={inactive}
              style={{
                width: "100%", padding: "13px 16px", borderRadius: 9, border: "none",
                cursor: inactive ? "not-allowed" : "pointer",
                backgroundImage: C.purpleGrad,
                color: "#fff",
                fontSize: 14, fontWeight: 700,
                boxShadow: inactive ? "none" : C.purpleShadow,
                opacity: inactive ? 0.55 : 1,
                fontFamily: "'Inter',sans-serif", marginTop: 8,
                transition: "opacity .15s",
              }}>
              {busy ? "Signing in…" : "Sign & enter"}
            </button>
          );
        })()}

        {error && (
          <div style={{ marginTop: 14, padding: "10px 12px", background: C.redBg, color: "#9c2727",
                        fontSize: 12.5, borderRadius: 7, lineHeight: 1.45 }}>
            {error}
          </div>
        )}

        <div style={{ marginTop: 22, fontSize: 11, color: C.text4, lineHeight: 1.5 }}>
          Wallets without admin access are rejected before signing.
          Sessions expire after 8 hours and are stored only in this tab.
        </div>
      </div>
    </div>
  );
}

function Step({ n, title, complete, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ width: 22, height: 22, borderRadius: "50%",
                       background: complete ? C.greenDim : C.purpleDim,
                       color: complete ? C.green : C.purple,
                       display: "inline-flex", alignItems: "center", justifyContent: "center",
                       fontSize: 11, fontWeight: 700 }}>
          {complete ? "✓" : n}
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, color: C.text2 }}>{title}</span>
      </div>
      {children}
    </div>
  );
}
