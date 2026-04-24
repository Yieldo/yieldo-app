import { useState, useEffect } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import PartnerApplyForm from "../components/PartnerApplyForm.jsx";
import RoleSwitcher from "../components/RoleSwitcher.jsx";

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

  return (
    <div style={{ fontFamily: "'Inter',sans-serif", background: C.bg, color: C.text, minHeight: "100vh" }}>
      <header style={{ background: C.white, borderBottom: `1px solid ${C.border}`,
                       padding: "14px 32px", display: "flex", alignItems: "center",
                       justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <img src="/yieldo-new.png" alt="Yieldo" style={{ width: 30, height: 30, borderRadius: 7 }} />
          <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: ".05em" }}>YIELDO</span>
          <span style={{ color: C.text4, margin: "0 4px" }}>/</span>
          <span style={{ fontSize: 15, fontWeight: 500, color: C.text2 }}>Vault Curator</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {isConnected && address && <RoleSwitcher address={address} currentRole="curator" />}
          {isConnected && address ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 12px",
                          borderRadius: 7, border: `1px solid ${C.border2}`, background: C.white,
                          fontSize: 12 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.green }} />
              <span style={{ fontFamily: "monospace", color: C.text2 }}>
                {address.slice(0, 6)}...{address.slice(-4)}
              </span>
              <button onClick={() => disconnect()}
                style={{ fontSize: 11, color: C.red, background: "none", border: "none",
                         cursor: "pointer", fontFamily: "'Inter',sans-serif", padding: 0 }}>
                Disconnect
              </button>
            </div>
          ) : (
            <button onClick={openConnectModal}
              style={{ padding: "8px 18px", borderRadius: 6, border: "none", cursor: "pointer",
                       backgroundImage: C.purpleGrad, color: "#fff", fontSize: 13, fontWeight: 600,
                       boxShadow: C.purpleShadow, fontFamily: "'Inter',sans-serif" }}>
              Connect Wallet
            </button>
          )}
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px 100px" }}>
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ margin: "0 0 6px", fontSize: 28, fontWeight: 700, letterSpacing: "-.01em" }}>
            List your vault on Yieldo
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: C.text3, lineHeight: 1.6, maxWidth: 540 }}>
            Reach wallets, creators, and aggregators that route deposits through Yieldo.
            Tell us about your protocol and we'll get back to you within 48 hours.
          </p>
        </div>
        <PartnerApplyForm audience="vault" showHeader={false} />
      </main>
    </div>
  );
}
