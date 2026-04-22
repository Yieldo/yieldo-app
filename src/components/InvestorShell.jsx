import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAccount, useDisconnect } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";

const API = import.meta.env.VITE_PARTNER_API || "https://api.yieldo.xyz";

const C = {
  bg: "#f8f7fc", white: "#ffffff",
  border: "rgba(0,0,0,0.06)", border2: "rgba(0,0,0,0.1)",
  text: "#121212", text2: "rgba(0,0,0,0.65)", text3: "rgba(0,0,0,0.4)", text4: "rgba(0,0,0,0.22)",
  purple: "#7A1CCB", purpleDim: "rgba(122,28,203,0.06)",
  purpleGrad: "linear-gradient(100deg,#4B0CA6 0%,#7A1CCB 58%,#9E3BFF 114%)",
  purpleShadow: "0 0 18px rgba(80,14,170,0.13)",
  teal: "#2E9AB8", green: "#1a9d3f", amber: "#b8960a",
  red: "#d93636",
};

const NAV = [
  { id: "explore",   label: "Explore",   path: "/vault",     auth: false },
  { id: "portfolio", label: "Portfolio", path: "/portfolio", auth: true },
  { id: "referrals", label: "Referrals", path: "/referrals", auth: true },
  { id: "history",   label: "History",   path: "/history",   auth: true },
];

function RoleSwitcher({ address }) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState(null); // "creator" | "wallet" | "user"
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

  const roleColor = C.purple;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, fontWeight: 600, padding: "6px 12px",
                 borderRadius: 7, border: `1px solid ${roleColor}30`, background: `${roleColor}10`,
                 color: roleColor, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
        Investor <span style={{ fontSize: 10 }}>▾</span>
      </button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", background: C.white,
                      borderRadius: 10, border: `1px solid ${C.border}`, boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
                      padding: 6, zIndex: 100, width: 220, fontFamily: "'Inter',sans-serif" }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: C.text4, textTransform: "uppercase",
                        letterSpacing: ".05em", padding: "4px 8px 6px" }}>Switch mode</div>
          {[
            { id: "investor", label: "Investor",      desc: "Explore & deposit",  icon: "💼", to: "/vault" },
            { id: "creator",  label: "Creator",       desc: "Referrals & campaigns", icon: "🎯", to: "/creator",  needsRole: "creator" },
            { id: "wallet",   label: "Wallet Partner", desc: "SDK & revenue",     icon: "🔌", to: "/wallets", needsRole: "wallet" },
            { id: "curator",  label: "Vault Curator",  desc: "Manage vaults",     icon: "🏦", to: "/curator", disabled: true },
          ].map(r => {
            const active = (r.id === "investor");
            const unavailable = r.disabled || (r.needsRole && r.needsRole !== role);
            return (
              <button key={r.id} onClick={() => {
                if (unavailable) {
                  if (r.id === "creator") navigate("/referrals");
                  else if (r.id === "wallet") navigate("/wallets");
                  else if (r.id === "curator") navigate("/curator");
                  setOpen(false);
                  return;
                }
                navigate(r.to);
                setOpen(false);
              }} style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: "none",
                          background: active ? C.purpleDim : "transparent", cursor: "pointer",
                          display: "flex", alignItems: "center", gap: 10, textAlign: "left",
                          fontFamily: "'Inter',sans-serif", opacity: unavailable ? 0.55 : 1 }}>
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
          <div style={{ borderTop: `1px solid ${C.border}`, margin: "6px 0 2px", padding: "4px 0 0" }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: C.text4, textTransform: "uppercase",
                          letterSpacing: ".05em", padding: "2px 8px 6px" }}>Register as partner</div>
            <button onClick={() => { navigate("/wallets"); setOpen(false); }} style={{ width: "100%",
                     padding: "7px 10px", borderRadius: 6, border: "none", background: "transparent",
                     cursor: "pointer", textAlign: "left", fontFamily: "'Inter',sans-serif",
                     fontSize: 12, color: C.purple, fontWeight: 500 }}>
              Register wallet →
            </button>
            <button onClick={() => { navigate("/curator"); setOpen(false); }} style={{ width: "100%",
                     padding: "7px 10px", borderRadius: 6, border: "none", background: "transparent",
                     cursor: "pointer", textAlign: "left", fontFamily: "'Inter',sans-serif",
                     fontSize: 12, color: C.purple, fontWeight: 500 }}>
              Register as curator →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function WalletPill({ address, walletName, onDisconnect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    window.addEventListener("click", h);
    return () => window.removeEventListener("click", h);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 12px",
                 borderRadius: 7, border: `1px solid ${C.border2}`, background: C.white,
                 fontSize: 12, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.green }} />
        <span style={{ fontFamily: "monospace", color: C.text2 }}>
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
        {walletName && <span style={{ color: C.text4 }}>{walletName}</span>}
      </button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", background: C.white,
                      borderRadius: 10, border: `1px solid ${C.border}`, boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
                      padding: 6, zIndex: 100, width: 180, fontFamily: "'Inter',sans-serif" }}>
          <button onClick={() => {
            navigator.clipboard.writeText(address);
            setOpen(false);
          }} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "none",
                      background: "transparent", cursor: "pointer", textAlign: "left", fontSize: 13, color: C.text }}>
            Copy address
          </button>
          <button onClick={() => { onDisconnect(); setOpen(false); }} style={{ width: "100%",
                   padding: "8px 10px", borderRadius: 6, border: "none", background: "transparent",
                   cursor: "pointer", textAlign: "left", fontSize: 13, color: C.red }}>
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}

export default function InvestorShell({ children, maxWidth = 1100 }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { address, isConnected, connector } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();

  const current = location.pathname.startsWith("/vault") ? "explore"
    : location.pathname.startsWith("/portfolio") ? "portfolio"
    : location.pathname.startsWith("/referrals") ? "referrals"
    : location.pathname.startsWith("/history") ? "history"
    : "explore";

  const handleNav = (item) => {
    if (item.auth && !isConnected) {
      openConnectModal();
      return;
    }
    navigate(item.path);
  };

  return (
    <div style={{ fontFamily: "'Inter',sans-serif", background: C.bg, color: C.text, minHeight: "100vh" }}>
      <header style={{ background: C.white, borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ padding: "0 24px", height: 56, display: "flex", alignItems: "center", gap: 28 }}>
          <Link to="/vault" style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, textDecoration: "none", color: C.text }}>
            <img src="/yieldo-new.png" alt="Yieldo" style={{ width: 28, height: 28, borderRadius: 7, objectFit: "contain" }} />
            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: ".04em" }}>YIELDO</span>
          </Link>
          <nav style={{ display: "flex", gap: 2, flex: 1 }}>
            {NAV.map(item => (
              <button key={item.id} onClick={() => handleNav(item)}
                style={{ fontFamily: "'Inter',sans-serif", fontSize: 13,
                         fontWeight: current === item.id ? 600 : 400,
                         padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer",
                         background: current === item.id ? C.purpleDim : "transparent",
                         color: current === item.id ? C.purple : C.text3,
                         transition: "all .15s" }}>
                {item.label}
              </button>
            ))}
          </nav>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {isConnected && address && <RoleSwitcher address={address} />}
            {isConnected && address ? (
              <WalletPill address={address} walletName={connector?.name || ""} onDisconnect={disconnect} />
            ) : (
              <button onClick={openConnectModal}
                style={{ padding: "8px 18px", borderRadius: 6, border: "none", cursor: "pointer",
                         backgroundImage: C.purpleGrad, color: "#fff", fontSize: 13, fontWeight: 600,
                         boxShadow: C.purpleShadow, fontFamily: "'Inter',sans-serif" }}>
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </header>
      <main style={{ maxWidth, margin: "0 auto", padding: "32px 24px" }}>
        {children}
      </main>
    </div>
  );
}
