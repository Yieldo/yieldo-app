import { useState, useEffect } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import PartnerApplyForm from "../components/PartnerApplyForm.jsx";
import RoleSwitcher from "../components/RoleSwitcher.jsx";
import { useResponsive } from "../lib/responsive.js";

// Until we ship real on-chain curator onboarding, /curator is a simple
// "apply to list your vault" form — the same three-audience form the apply
// page uses, preset to the Vault Protocol audience. Existing curator
// dashboard mock lives on the shelf; the form is what users see for now.

const C = {
  bg: "#f8f7fc", white: "#ffffff",
  border: "rgba(0,0,0,0.06)", border2: "rgba(0,0,0,0.1)",
  text: "#121212", text2: "rgba(0,0,0,0.65)", text3: "rgba(0,0,0,0.4)", text4: "rgba(0,0,0,0.22)",
  purple: "#7A1CCB",
  purpleGrad: "linear-gradient(100deg,#4B0CA6 0%,#7A1CCB 58%,#9E3BFF 114%)",
  purpleShadow: "0 0 17px rgba(80,14,170,0.12)",
  green: "#1a9d3f", red: "#d93636",
};

export default function CuratorPage() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();
  const { isMobile, isPhone } = useResponsive();

  return (
    <div style={{ fontFamily: "'Inter',sans-serif", background: C.bg, color: C.text, minHeight: "100vh" }}>
      <header style={{ background: C.white, borderBottom: `1px solid ${C.border}`,
                       padding: isMobile ? "12px 14px" : "14px 32px",
                       display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          <img src="/yieldo-new.png" alt="Yieldo" style={{ width: 28, height: 28, borderRadius: 7 }} />
          {!isPhone && <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: ".05em" }}>YIELDO</span>}
          <span style={{ color: C.text4, margin: "0 4px" }}>/</span>
          <span style={{ fontSize: isMobile ? 13 : 15, fontWeight: 500, color: C.text2,
                         overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {isPhone ? "Curator" : "Vault Curator"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {!isMobile && isConnected && address && <RoleSwitcher address={address} currentRole="curator" />}
          {isConnected && address ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px",
                          borderRadius: 7, border: `1px solid ${C.border2}`, background: C.white,
                          fontSize: 11.5 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.green }} />
              <span style={{ fontFamily: "monospace", color: C.text2 }}>
                {address.slice(0, isMobile ? 4 : 6)}...{address.slice(-4)}
              </span>
              {!isMobile && (
                <button onClick={() => disconnect()}
                  style={{ fontSize: 11, color: C.red, background: "none", border: "none",
                           cursor: "pointer", fontFamily: "'Inter',sans-serif", padding: 0 }}>
                  Disconnect
                </button>
              )}
            </div>
          ) : (
            <button onClick={openConnectModal}
              style={{ padding: isMobile ? "7px 12px" : "8px 18px", borderRadius: 7, border: "none", cursor: "pointer",
                       backgroundImage: C.purpleGrad, color: "#fff", fontSize: isMobile ? 12 : 13, fontWeight: 600,
                       boxShadow: C.purpleShadow, fontFamily: "'Inter',sans-serif", whiteSpace: "nowrap" }}>
              {isPhone ? "Connect" : "Connect Wallet"}
            </button>
          )}
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto",
                     padding: isMobile ? "24px 16px 60px" : "40px 24px 100px" }}>
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ margin: "0 0 6px", fontSize: isMobile ? 22 : 28, fontWeight: 700, letterSpacing: "-.01em" }}>
            List your vault on Yieldo
          </h1>
          <p style={{ margin: 0, fontSize: isMobile ? 13 : 14, color: C.text3, lineHeight: 1.6, maxWidth: 540 }}>
            Reach wallets, creators, and aggregators that route deposits through Yieldo.
            Tell us about your protocol and we'll get back to you within 48 hours.
          </p>
        </div>
        <PartnerApplyForm audience="vault" showHeader={false} />
      </main>
    </div>
  );
}
