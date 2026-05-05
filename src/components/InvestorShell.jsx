import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAccount, useDisconnect } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import RoleSwitcher from "./RoleSwitcher.jsx";
import { useResponsive } from "../lib/responsive.js";

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
  { id: "explore",   label: "Explore",   path: "/vault",     auth: false, icon: "🔍" },
  { id: "portfolio", label: "Portfolio", path: "/portfolio", auth: true,  icon: "📊" },
  { id: "intel",     label: "Intel",     path: "/intel",     auth: false, icon: "📡" },
  { id: "referrals", label: "Referrals", path: "/referrals", auth: true,  icon: "🎯" },
  { id: "history",   label: "History",   path: "/history",   auth: true,  icon: "📋" },
];

function WalletPill({ address, walletName, onDisconnect, compact }) {
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
        style={{ display: "flex", alignItems: "center", gap: 7, padding: compact ? "6px 10px" : "5px 12px",
                 borderRadius: 8, border: `1px solid ${C.border2}`, background: C.white,
                 fontSize: compact ? 11.5 : 12, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.green }} />
        <span style={{ fontFamily: "monospace", color: C.text2 }}>
          {address.slice(0, compact ? 4 : 6)}...{address.slice(-4)}
        </span>
        {!compact && walletName && <span style={{ color: C.text4 }}>{walletName}</span>}
      </button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", background: C.white,
                      borderRadius: 10, border: `1px solid ${C.border}`, boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
                      padding: 6, zIndex: 100, width: 200, fontFamily: "'Inter',sans-serif" }}>
          <button onClick={() => {
            navigator.clipboard.writeText(address);
            setOpen(false);
          }} style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "none",
                      background: "transparent", cursor: "pointer", textAlign: "left", fontSize: 13, color: C.text }}>
            Copy address
          </button>
          <button onClick={() => { onDisconnect(); setOpen(false); }} style={{ width: "100%",
                   padding: "10px 12px", borderRadius: 6, border: "none", background: "transparent",
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
  const { isMobile, isPhone } = useResponsive();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const current = location.pathname.startsWith("/vault") ? "explore"
    : location.pathname.startsWith("/portfolio") ? "portfolio"
    : location.pathname.startsWith("/intel") ? "intel"
    : location.pathname.startsWith("/referrals") ? "referrals"
    : location.pathname.startsWith("/history") ? "history"
    : "explore";

  const handleNav = (item) => {
    setDrawerOpen(false);
    if (item.auth && !isConnected) {
      openConnectModal();
      return;
    }
    navigate(item.path);
  };

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  return (
    <div style={{ fontFamily: "'Inter',sans-serif", background: C.bg, color: C.text, minHeight: "100vh",
                  paddingBottom: isMobile ? 64 : 0 /* leave room for bottom-tab-bar */ }}>
      {/* Sticky top header */}
      <header style={{ background: C.white, borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ padding: isMobile ? "0 14px" : "0 24px", height: isMobile ? 52 : 56,
                      display: "flex", alignItems: "center", gap: isMobile ? 12 : 28 }}>
          <Link to="/vault" style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, textDecoration: "none", color: C.text }}>
            <img src="/yieldo-new.png" alt="Yieldo" style={{ width: isMobile ? 26 : 28, height: isMobile ? 26 : 28, borderRadius: 7, objectFit: "contain" }} />
            {!isPhone && <span style={{ fontSize: isMobile ? 14 : 15, fontWeight: 700, letterSpacing: ".04em" }}>YIELDO</span>}
          </Link>
          {/* Desktop nav (inline) */}
          {!isMobile && (
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
          )}
          {/* Mobile: spacer pushes wallet to right */}
          {isMobile && <div style={{ flex: 1 }} />}
          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 6 : 10 }}>
            {!isPhone && (
              <a href="https://x.com/YieldoHQ" target="_blank" rel="noopener noreferrer"
                 aria-label="Yieldo on X" title="Yieldo on X"
                 style={{ display: "inline-flex", alignItems: "center", justifyContent: "center",
                          width: 30, height: 30, borderRadius: 6, background: "#000", color: "#fff",
                          textDecoration: "none" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
            )}
            {!isMobile && isConnected && address && <RoleSwitcher address={address} />}
            {isConnected && address ? (
              <WalletPill address={address} walletName={connector?.name || ""} onDisconnect={disconnect} compact={isMobile} />
            ) : (
              <button onClick={openConnectModal}
                style={{ padding: isMobile ? "7px 12px" : "8px 18px", borderRadius: 7, border: "none", cursor: "pointer",
                         backgroundImage: C.purpleGrad, color: "#fff", fontSize: isMobile ? 12 : 13, fontWeight: 600,
                         boxShadow: C.purpleShadow, fontFamily: "'Inter',sans-serif", whiteSpace: "nowrap" }}>
                {isPhone ? "Connect" : "Connect Wallet"}
              </button>
            )}
            {/* Hamburger on mobile (after wallet) — opens role switcher + utility drawer */}
            {isMobile && (
              <button aria-label="Menu" onClick={() => setDrawerOpen(true)}
                style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${C.border2}`, background: C.white,
                         display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}>
                <span style={{ display: "block", width: 16, height: 10, position: "relative" }}>
                  <span style={{ position: "absolute", top: 0,    left: 0, right: 0, height: 1.6, background: C.text2, borderRadius: 1 }} />
                  <span style={{ position: "absolute", top: 4,    left: 0, right: 0, height: 1.6, background: C.text2, borderRadius: 1 }} />
                  <span style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1.6, background: C.text2, borderRadius: 1 }} />
                </span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main style={{ maxWidth, margin: "0 auto",
                     padding: isMobile ? "16px 14px 24px" : "32px 24px" }}>
        {children}
      </main>

      {/* Mobile bottom-tab-bar — primary navigation */}
      {isMobile && (
        <nav style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 60,
                      background: C.white, borderTop: `1px solid ${C.border}`,
                      display: "flex", justifyContent: "space-around", alignItems: "stretch",
                      paddingBottom: "env(safe-area-inset-bottom)", boxShadow: "0 -2px 14px rgba(0,0,0,.04)" }}>
          {NAV.map(item => {
            const active = current === item.id;
            return (
              <button key={item.id} onClick={() => handleNav(item)}
                style={{ flex: 1, minWidth: 0, background: "none", border: "none",
                         display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                         padding: "8px 4px 6px", cursor: "pointer", color: active ? C.purple : C.text3,
                         fontFamily: "'Inter',sans-serif", position: "relative" }}>
                {active && (
                  <span style={{ position: "absolute", top: 0, left: "30%", right: "30%", height: 2,
                                 background: C.purpleGrad, borderRadius: "0 0 3px 3px" }} />
                )}
                <span style={{ fontSize: 16, lineHeight: 1 }}>{item.icon}</span>
                <span style={{ fontSize: 10.5, fontWeight: active ? 700 : 500 }}>{item.label}</span>
              </button>
            );
          })}
        </nav>
      )}

      {/* Mobile utility drawer (role switcher + X link) */}
      {isMobile && drawerOpen && (
        <div onClick={() => setDrawerOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 70 }}>
          <div onClick={e => e.stopPropagation()}
               style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "min(86vw, 320px)",
                        background: C.white, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12,
                        boxShadow: "-8px 0 30px rgba(0,0,0,.18)", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.text2 }}>Menu</span>
              <button onClick={() => setDrawerOpen(false)}
                style={{ background: "none", border: "none", fontSize: 18, color: C.text3, cursor: "pointer" }}>✕</button>
            </div>
            {isConnected && address && <RoleSwitcher address={address} />}
            <a href="https://x.com/YieldoHQ" target="_blank" rel="noopener noreferrer"
               style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8,
                        background: "#000", color: "#fff", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              Follow @YieldoHQ
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
