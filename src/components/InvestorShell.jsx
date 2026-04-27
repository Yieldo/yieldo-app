import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAccount, useDisconnect } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import RoleSwitcher from "./RoleSwitcher.jsx";

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
            <a href="https://x.com/YieldoHQ" target="_blank" rel="noopener noreferrer"
               aria-label="Yieldo on X" title="Yieldo on X"
               style={{ display: "inline-flex", alignItems: "center", justifyContent: "center",
                        width: 32, height: 32, borderRadius: 6, background: "#000", color: "#fff",
                        textDecoration: "none", transition: "transform .15s, background .15s" }}
               onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.background = "#1a1a1a"; }}
               onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.background = "#000"; }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
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
