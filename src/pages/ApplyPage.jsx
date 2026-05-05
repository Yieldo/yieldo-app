import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PartnerApplyForm from "../components/PartnerApplyForm.jsx";
import { useResponsive } from "../lib/responsive.js";

const C = {
  bg: "#f8f7fc", white: "#fff", black: "#121212",
  border: "rgba(0,0,0,.06)", border2: "rgba(0,0,0,.1)",
  text: "#121212", text2: "rgba(0,0,0,.65)", text3: "rgba(0,0,0,.4)", text4: "rgba(0,0,0,.25)",
  purple: "#7A1CCB", purpleDim: "rgba(122,28,203,.06)",
  purpleGrad: "linear-gradient(100deg,#4B0CA6 0%,#7A1CCB 58%,#9E3BFF 114%)",
  purpleShadow: "0 0 17px rgba(80,14,170,.12)",
  purpleGradBg: "linear-gradient(100deg, rgba(75,12,166,0.05) 0%, rgba(122,28,203,0.05) 58%, rgba(158,59,255,0.05) 114%)",
  purpleGradLight: "linear-gradient(100deg, rgba(75,12,166,0.1) 0%, rgba(122,28,203,0.1) 58%, rgba(158,59,255,0.1) 114%)",
};

function GradientText({ children, style = {} }) {
  return <span style={{ backgroundImage: C.purpleGrad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", ...style }}>{children}</span>;
}

function Tag({ children }) {
  return <div style={{ position: "relative", display: "inline-flex", alignItems: "center", padding: "4px 14px", borderRadius: 100 }}><span style={{ position: "absolute", filter: "blur(6px)", fontWeight: 700, fontSize: 18, color: "rgba(69,150,242,0.8)" }}>{children}</span><span style={{ position: "relative", fontSize: 14, color: "rgba(100,100,120,0.9)", fontWeight: 500 }}>{children}</span></div>;
}

// Vault Protocol path is intentionally NOT exposed here — it's a separate
// BD/sales conversation, not a self-serve invite-gated application.
const AUDIENCES = [
  { id: "wallet", icon: "\u{1F45B}", title: "Wallet / App",   desc: "Integrate a yield tab into your wallet or portfolio app via SDK", tag: "SDK Integration" },
  { id: "kol",    icon: "\u{1F4E3}", title: "Creator / KOL",  desc: "Earn revenue by sharing curated yield picks with your audience",  tag: "Referral Revenue" },
];

const Btn = ({ children, primary, small, onClick, style = {} }) => (
  <button onClick={onClick} style={{ padding: small ? "6px 14px" : "10px 20px", borderRadius: 6, border: primary ? "none" : `1px solid ${C.border2}`, background: primary ? C.purpleGrad : C.white, color: primary ? "#fff" : C.text2, fontSize: small ? 12 : 14, fontWeight: 500, cursor: "pointer", fontFamily: "'Inter',sans-serif", ...style }}>{children}</button>
);

export default function ApplyPage() {
  const navigate = useNavigate();
  const [audience, setAudience] = useState(null);
  const { isMobile, isPhone } = useResponsive();

  return (
    <div style={{ fontFamily: "'Inter',sans-serif", background: C.bg, color: C.black, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`,
                    padding: isMobile ? "12px 16px" : "14px 32px",
                    display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          <img src="/yieldo-new.png" alt="Yieldo" style={{ width: 28, height: 28, borderRadius: 7 }} />
          {!isPhone && <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: ".05em" }}>YIELDO</span>}
          <span style={{ color: C.text4, margin: "0 4px" }}>/</span>
          <span style={{ fontSize: isMobile ? 13 : 15, fontWeight: 500, color: C.text2 }}>Apply</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Btn small onClick={() => navigate("/vault")}>Explore</Btn>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto",
                    padding: isMobile ? "24px 16px 60px" : "40px 24px 100px",
                    flex: 1, width: "100%" }}>
        {!audience && (
          <div>
            <div style={{ textAlign: "center", marginBottom: isMobile ? 28 : 48 }}>
              <Tag>Get Started</Tag>
              <h1 style={{ fontSize: isPhone ? 28 : isMobile ? 36 : 48, fontWeight: 400, textTransform: "uppercase",
                           margin: "16px 0 0", letterSpacing: "-.02em", lineHeight: 1.15 }}>
                Join the <GradientText style={{ fontSize: "inherit" }}>Yieldo Ecosystem</GradientText>
              </h1>
              <p style={{ fontSize: isMobile ? 14 : 18, color: "rgba(0,0,0,0.5)",
                          maxWidth: 520, margin: "12px auto 0", lineHeight: 1.6 }}>
                Invite-only programs for wallets and creators. Connect your wallet, fill the form, and we'll review within 48 hours.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {AUDIENCES.map(a => (
                <button key={a.id} onClick={() => setAudience(a.id)} style={{
                  display: "flex", alignItems: "center",
                  gap: isMobile ? 14 : 18,
                  padding: isMobile ? "18px 18px" : "24px 28px",
                  borderRadius: 14, cursor: "pointer", fontFamily: "'Inter',sans-serif",
                  border: `1px solid ${C.border}`, background: C.white, boxShadow: "0 1px 4px rgba(0,0,0,0.02)",
                  textAlign: "left", transition: "all .2s", width: "100%",
                }} onMouseEnter={e => { e.currentTarget.style.border = "1.5px solid rgba(122,28,203,0.2)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(122,28,203,0.06)"; }} onMouseLeave={e => { e.currentTarget.style.border = `1px solid ${C.border}`; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.02)"; }}>
                  <div style={{ width: isMobile ? 46 : 56, height: isMobile ? 46 : 56, borderRadius: 14,
                                backgroundImage: C.purpleGradBg, display: "flex", alignItems: "center",
                                justifyContent: "center", fontSize: isMobile ? 22 : 26, flexShrink: 0 }}>{a.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2, flexWrap: "wrap" }}>
                      <span style={{ fontSize: isMobile ? 16 : 18, fontWeight: 600 }}>{a.title}</span>
                      <span style={{ fontSize: 10.5, fontWeight: 500, padding: "2px 8px", borderRadius: 4,
                                     backgroundImage: C.purpleGradLight, color: "#7A1CCB" }}>{a.tag}</span>
                    </div>
                    <div style={{ fontSize: isMobile ? 12.5 : 14, color: "rgba(0,0,0,0.45)", lineHeight: 1.5 }}>{a.desc}</div>
                  </div>
                  <span style={{ fontSize: 18, color: "rgba(0,0,0,0.15)", flexShrink: 0 }}>&rarr;</span>
                </button>
              ))}
            </div>
            <div style={{ marginTop: 32, padding: 18, background: C.white, border: `1px dashed ${C.border2}`, borderRadius: 10, fontSize: 13, color: C.text3, textAlign: "center" }}>
              Building a vault protocol? We work with curators directly.
              <a href="mailto:hello@yieldo.xyz" style={{ marginLeft: 6, color: C.purple, fontWeight: 500, textDecoration: "none" }}>hello@yieldo.xyz</a>
            </div>
          </div>
        )}

        {audience && (
          <div>
            <button onClick={() => setAudience(null)} style={{ background: "none", border: "none", fontSize: 14, color: "rgba(0,0,0,0.4)", cursor: "pointer", fontFamily: "'Inter',sans-serif", padding: 0, marginBottom: 24, display: "flex", alignItems: "center", gap: 4 }}>&larr; Choose a different path</button>

            <PartnerApplyForm audience={audience} />

            <div style={{ marginTop: 24, display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap" }}>
              {[
                { icon: "\u{1F512}", text: "Your data stays private" },
                { icon: "⚡", text: "48h response time" },
                { icon: "\u{1F193}", text: "Free to join" },
              ].map((t, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "rgba(0,0,0,0.35)" }}>
                  <span>{t.icon}</span>{t.text}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
