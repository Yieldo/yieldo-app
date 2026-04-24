import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_PARTNER_API || "https://api.yieldo.xyz";

const C = {
  white: "#ffffff", border: "rgba(0,0,0,0.06)", border2: "rgba(0,0,0,0.1)",
  text: "#121212", text3: "rgba(0,0,0,0.4)", text4: "rgba(0,0,0,0.22)",
  purple: "#7A1CCB", purpleDim: "rgba(122,28,203,0.06)",
};

/**
 * Shared Switch-Role dropdown used by InvestorShell (header, top-right) and by
 * KolPage / WalletsPage / CuratorPage (floating, bottom-right above the wallet
 * pill). Always routes to the role's canonical page — each destination page
 * handles its own registration gate.
 *
 * Props:
 *   address      (string)  — wallet address, for the /v1/users/role check.
 *   currentRole  (string)  — which option to show as active: one of
 *                            "investor" | "creator" | "wallet" | "curator".
 *   anchor       (string)  — "top" (default) opens dropdown below, "bottom"
 *                            opens it above (used when this sits near the page
 *                            bottom and we want the panel to flow upward).
 */
export default function RoleSwitcher({ address, currentRole = "investor", anchor = "top" }) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState(null);
  const navigate = useNavigate();
  const ref = useRef(null);

  useEffect(() => {
    if (!address) { setRole(null); return; }
    fetch(`${API}/v1/users/role/${address}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setRole(d?.role || "user"))
      .catch(() => setRole("user"));
  }, [address]);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    window.addEventListener("click", h);
    return () => window.removeEventListener("click", h);
  }, []);

  const ROLES = [
    { id: "investor", label: "Investor",       desc: "Explore & deposit",     icon: "💼", to: "/vault" },
    { id: "creator",  label: "Creator",        desc: "Referrals & campaigns", icon: "🎯", to: "/creator" },
    { id: "wallet",   label: "Wallet Partner", desc: "SDK & revenue",         icon: "🔌", to: "/wallets" },
    { id: "curator",  label: "Vault Curator",  desc: "Manage vaults",         icon: "🏦", to: "/curator" },
  ];
  const currentLabel = ROLES.find(r => r.id === currentRole)?.label || "Investor";

  const panelPos = anchor === "bottom"
    ? { right: 0, bottom: "calc(100% + 6px)" }
    : { right: 0, top: "calc(100% + 6px)" };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, fontWeight: 600, padding: "6px 12px",
                 borderRadius: 7, border: `1px solid ${C.purple}30`, background: `${C.purple}10`,
                 color: C.purple, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
        {currentLabel} <span style={{ fontSize: 10 }}>▾</span>
      </button>
      {open && (
        <div style={{ position: "absolute", ...panelPos, background: C.white, borderRadius: 10,
                      border: `1px solid ${C.border}`, boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
                      padding: 6, zIndex: 100, width: 220, fontFamily: "'Inter',sans-serif" }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: C.text4, textTransform: "uppercase",
                        letterSpacing: ".05em", padding: "4px 8px 6px" }}>Switch mode</div>
          {ROLES.map(r => {
            const active = r.id === currentRole;
            const unregistered = (r.id === "creator" && role !== "creator" && role !== "kol")
              || (r.id === "wallet"  && role !== "wallet")
              || (r.id === "curator" && role !== "curator");
            return (
              <button key={r.id} onClick={() => { navigate(r.to); setOpen(false); }}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: "none",
                         background: active ? C.purpleDim : "transparent", cursor: "pointer",
                         display: "flex", alignItems: "center", gap: 10, textAlign: "left",
                         fontFamily: "'Inter',sans-serif", opacity: unregistered ? 0.75 : 1 }}>
                <span style={{ fontSize: 16 }}>{r.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? C.purple : C.text }}>
                    {r.label}
                  </div>
                  <div style={{ fontSize: 11, color: C.text3 }}>{r.desc}</div>
                </div>
                {active && <span style={{ color: C.purple, fontSize: 14 }}>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
