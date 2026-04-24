import { useState } from "react";
import { useNavigate } from "react-router-dom";

const C = {
  bg: "#f8f7fc", white: "#fff", black: "#121212",
  border: "rgba(0,0,0,.06)", border2: "rgba(0,0,0,.1)",
  text: "#121212", text2: "rgba(0,0,0,.65)", text3: "rgba(0,0,0,.4)", text4: "rgba(0,0,0,.25)",
  purple: "#7A1CCB", purpleDim: "rgba(122,28,203,.06)",
  purpleGrad: "linear-gradient(100deg,#4B0CA6 0%,#7A1CCB 58%,#9E3BFF 114%)",
  purpleShadow: "0 0 17px rgba(80,14,170,.12)",
  purpleGradBg: "linear-gradient(100deg, rgba(75,12,166,0.05) 0%, rgba(122,28,203,0.05) 58%, rgba(158,59,255,0.05) 114%)",
  purpleGradLight: "linear-gradient(100deg, rgba(75,12,166,0.1) 0%, rgba(122,28,203,0.1) 58%, rgba(158,59,255,0.1) 114%)",
  purpleShadowLight: "0px 0px 17px rgba(80,14,170,0.1)",
};

const SHEET_BEST_URL = "https://api.sheetbest.com/sheets/5b812dce-8ca7-4efa-97cc-8d8d0b55d403";

function GradientText({ children, style = {} }) {
  return <span style={{ backgroundImage: C.purpleGrad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", ...style }}>{children}</span>;
}

function Tag({ children }) {
  return <div style={{ position: "relative", display: "inline-flex", alignItems: "center", padding: "4px 14px", borderRadius: 100 }}><span style={{ position: "absolute", filter: "blur(6px)", fontWeight: 700, fontSize: 18, color: "rgba(69,150,242,0.8)" }}>{children}</span><span style={{ position: "relative", fontSize: 14, color: "rgba(100,100,120,0.9)", fontWeight: 500 }}>{children}</span></div>;
}

function TextInput({ label, placeholder, value, onChange, type = "text", required }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 13, fontWeight: 500, color: "rgba(0,0,0,0.55)" }}>{label}{required && <span style={{ color: "#d93636", marginLeft: 2 }}>*</span>}</label>
      <input type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} style={{ padding: "11px 14px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.1)", background: "#fff", fontSize: 14, fontFamily: "'Inter',sans-serif", outline: "none", color: "#121212", transition: "border .15s", boxSizing: "border-box" }} onFocus={e => e.target.style.borderColor = "rgba(122,28,203,0.3)"} onBlur={e => e.target.style.borderColor = "rgba(0,0,0,0.1)"} />
    </div>
  );
}

function SelectInput({ label, options, value, onChange, required }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 13, fontWeight: 500, color: "rgba(0,0,0,0.55)" }}>{label}{required && <span style={{ color: "#d93636", marginLeft: 2 }}>*</span>}</label>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ padding: "11px 14px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.1)", background: "#fff", fontSize: 14, fontFamily: "'Inter',sans-serif", outline: "none", color: value ? "#121212" : "rgba(0,0,0,0.35)", appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", cursor: "pointer", boxSizing: "border-box" }} onFocus={e => e.target.style.borderColor = "rgba(122,28,203,0.3)"} onBlur={e => e.target.style.borderColor = "rgba(0,0,0,0.1)"}>
        <option value="" disabled>Select...</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function MultiChip({ label, options, selected, onChange, required }) {
  const toggle = (opt) => {
    if (selected.includes(opt)) onChange(selected.filter(s => s !== opt));
    else onChange([...selected, opt]);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 500, color: "rgba(0,0,0,0.55)" }}>{label}{required && <span style={{ color: "#d93636", marginLeft: 2 }}>*</span>}</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {options.map(o => (
          <button key={o} onClick={() => toggle(o)} style={{
            padding: "7px 14px", borderRadius: 20, fontSize: 13, fontFamily: "'Inter',sans-serif", cursor: "pointer", transition: "all .15s",
            border: selected.includes(o) ? "1.5px solid rgba(122,28,203,0.3)" : "1px solid rgba(0,0,0,0.1)",
            background: selected.includes(o) ? "rgba(122,28,203,0.06)" : "#fff",
            color: selected.includes(o) ? "#7A1CCB" : "rgba(0,0,0,0.5)",
            fontWeight: selected.includes(o) ? 600 : 400,
          }}>{o}</button>
        ))}
      </div>
    </div>
  );
}

const AUDIENCES = [
  { id: "wallet", icon: "\u{1F45B}", title: "Wallet / App", desc: "Integrate a yield tab into your wallet or portfolio app via SDK", tag: "SDK Integration" },
  { id: "vault", icon: "\u{1F3E6}", title: "Vault Protocol", desc: "Get your vaults distributed to wallets and KOL audiences", tag: "Distribution" },
  { id: "kol", icon: "\u{1F4E3}", title: "Creator / KOL", desc: "Earn revenue by sharing curated yield picks with your audience", tag: "Referral Revenue" },
];

const Btn = ({ children, primary, small, onClick, style = {} }) => (
  <button onClick={onClick} style={{ padding: small ? "6px 14px" : "10px 20px", borderRadius: 6, border: primary ? "none" : `1px solid ${C.border2}`, background: primary ? C.purpleGrad : C.white, color: primary ? "#fff" : C.text2, fontSize: small ? 12 : 14, fontWeight: 500, cursor: "pointer", fontFamily: "'Inter',sans-serif", ...style }}>{children}</button>
);

export default function ApplyPage() {
  const navigate = useNavigate();
  const [audience, setAudience] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [wName, setWName] = useState("");
  const [wRole, setWRole] = useState("");
  const [wMau, setWMau] = useState("");
  const [wChains, setWChains] = useState([]);
  const [wEmail, setWEmail] = useState("");
  const [wTg, setWTg] = useState("");

  const [vName, setVName] = useState("");
  const [vRole, setVRole] = useState("");
  const [vTvl, setVTvl] = useState("");
  const [vGoals, setVGoals] = useState([]);
  const [vEmail, setVEmail] = useState("");
  const [vTg, setVTg] = useState("");

  const [kHandle, setKHandle] = useState("");
  const [kPlatform, setKPlatform] = useState("");
  const [kSize, setKSize] = useState("");
  const [kContent, setKContent] = useState([]);
  const [kEmail, setKEmail] = useState("");
  const [kTg, setKTg] = useState("");

  const handleSubmit = async () => {
    let row = {};
    if (audience === "wallet") {
      row = { audience: "wallet", company: wName, role: wRole, mau: wMau, chains: wChains.join(", "), email: wEmail, telegram: wTg, timestamp: new Date().toISOString() };
    }
    if (audience === "vault") {
      row = { audience: "vault", protocol: vName, role: vRole, tvl: vTvl, goals: vGoals.join(", "), email: vEmail, telegram: vTg, timestamp: new Date().toISOString() };
    }
    if (audience === "kol") {
      row = { audience: "kol", handle: kHandle, platform: kPlatform, audienceSize: kSize, contentTypes: kContent.join(", "), email: kEmail, telegram: kTg, timestamp: new Date().toISOString() };
    }

    setSubmitting(true);
    try {
      await fetch(SHEET_BEST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(row),
      });
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const emailValid = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const canSubmit = () => {
    if (submitting) return false;
    if (audience === "wallet") return wName && wMau && wChains.length > 0 && emailValid(wEmail);
    if (audience === "vault") return vName && vTvl && vGoals.length > 0 && emailValid(vEmail);
    if (audience === "kol") return kHandle && kPlatform && kSize && emailValid(kEmail);
    return false;
  };

  return (
    <div style={{ fontFamily: "'Inter',sans-serif", background: C.bg, color: C.black, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: "14px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <img src="/yieldo-new.png" alt="Yieldo" style={{ width: 30, height: 30, borderRadius: 7 }} />
          <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: ".05em" }}>YIELDO</span><span style={{ color: C.text4, margin: "0 4px" }}>/</span>
          <span style={{ fontSize: 15, fontWeight: 500, color: C.text2 }}>Integrate Now</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Btn small onClick={() => navigate("/vault")}>Explore Vaults</Btn>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px 100px", flex: 1 }}>
        {submitted && (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ width: 72, height: 72, borderRadius: 36, backgroundImage: C.purpleGrad, margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#fff", fontSize: 32 }}>&#10003;</span>
            </div>
            <h1 style={{ fontSize: 36, fontWeight: 400, textTransform: "uppercase", margin: "0 0 12px", letterSpacing: "-.02em" }}>
              <GradientText>Application received!</GradientText>
            </h1>
            <p style={{ fontSize: 18, color: "rgba(0,0,0,0.5)", maxWidth: 480, margin: "0 auto 32px", lineHeight: 1.6 }}>
              Thanks for your interest in Yieldo. We'll review your application and get back to you within 48 hours.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <Btn onClick={() => navigate("/vault")}>&#8592; Back to Vaults</Btn>
            </div>
          </div>
        )}

        {!submitted && !audience && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <Tag>Get Started</Tag>
              <h1 style={{ fontSize: 48, fontWeight: 400, textTransform: "uppercase", margin: "16px 0 0", letterSpacing: "-.02em", lineHeight: 1.15 }}>
                Join the <GradientText style={{ fontSize: 48 }}>Yieldo Ecosystem</GradientText>
              </h1>
              <p style={{ fontSize: 18, color: "rgba(0,0,0,0.5)", maxWidth: 520, margin: "16px auto 0", lineHeight: 1.6 }}>
                Whether you're a wallet, vault protocol, or content creator — we'd love to work with you. Choose your path below.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {AUDIENCES.map(a => (
                <button key={a.id} onClick={() => setAudience(a.id)} style={{
                  display: "flex", alignItems: "center", gap: 18, padding: "24px 28px", borderRadius: 14, cursor: "pointer", fontFamily: "'Inter',sans-serif",
                  border: `1px solid ${C.border}`, background: C.white, boxShadow: "0 1px 4px rgba(0,0,0,0.02)",
                  textAlign: "left", transition: "all .2s", width: "100%",
                }} onMouseEnter={e => { e.currentTarget.style.border = "1.5px solid rgba(122,28,203,0.2)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(122,28,203,0.06)"; }} onMouseLeave={e => { e.currentTarget.style.border = `1px solid ${C.border}`; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.02)"; }}>
                  <div style={{ width: 56, height: 56, borderRadius: 14, backgroundImage: C.purpleGradBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>{a.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 18, fontWeight: 600 }}>{a.title}</span>
                      <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 4, backgroundImage: C.purpleGradLight, color: "#7A1CCB" }}>{a.tag}</span>
                    </div>
                    <div style={{ fontSize: 14, color: "rgba(0,0,0,0.45)" }}>{a.desc}</div>
                  </div>
                  <span style={{ fontSize: 18, color: "rgba(0,0,0,0.15)" }}>&rarr;</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {!submitted && audience && (
          <div>
            <button onClick={() => setAudience(null)} style={{ background: "none", border: "none", fontSize: 14, color: "rgba(0,0,0,0.4)", cursor: "pointer", fontFamily: "'Inter',sans-serif", padding: 0, marginBottom: 24, display: "flex", alignItems: "center", gap: 4 }}>&larr; Choose a different path</button>

            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, backgroundImage: C.purpleGrad, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                {AUDIENCES.find(a => a.id === audience).icon}
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>{audience === "wallet" ? "Wallet Partner Application" : audience === "vault" ? "Vault Protocol Application" : "Creator Application"}</h2>
                <p style={{ margin: "2px 0 0", fontSize: 14, color: "rgba(0,0,0,0.45)" }}>
                  {audience === "wallet" ? "Tell us about your wallet or app. We'll set up your partner account." : audience === "vault" ? "Tell us about your protocol. We'll help you reach new depositors." : "Tell us about your audience. We'll get your yield page set up."}
                </p>
              </div>
            </div>

            <div style={{ padding: 28, borderRadius: 14, background: C.white, border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.02)" }}>
              {audience === "wallet" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <TextInput label="Company / Wallet Name" placeholder="e.g. Phantom" value={wName} onChange={setWName} required />
                    <TextInput label="Your Role" placeholder="e.g. Head of Product" value={wRole} onChange={setWRole} />
                  </div>
                  <SelectInput label="Monthly Active Users" options={["< 10K", "10K \u2013 100K", "100K \u2013 1M", "1M+"]} value={wMau} onChange={setWMau} required />
                  <MultiChip label="Chains Supported" options={["Ethereum", "Base", "Arbitrum", "Polygon", "Solana", "Optimism", "Other"]} selected={wChains} onChange={setWChains} required />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <TextInput label="Work Email" placeholder="you@company.com" type="email" value={wEmail} onChange={setWEmail} required />
                    <TextInput label="Telegram (optional)" placeholder="@username" value={wTg} onChange={setWTg} />
                  </div>
                </div>
              )}

              {audience === "vault" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <TextInput label="Protocol Name" placeholder="e.g. Morpho" value={vName} onChange={setVName} required />
                    <TextInput label="Your Role" placeholder="e.g. BD Lead" value={vRole} onChange={setVRole} />
                  </div>
                  <SelectInput label="Current TVL" options={["< $10M", "$10M \u2013 $100M", "$100M \u2013 $1B", "$1B+"]} value={vTvl} onChange={setVTvl} required />
                  <MultiChip label="What are you looking for?" options={["More depositors", "Wallet distribution", "KOL promotion", "Analytics & insights", "All of the above"]} selected={vGoals} onChange={setVGoals} required />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <TextInput label="Work Email" placeholder="you@protocol.com" type="email" value={vEmail} onChange={setVEmail} required />
                    <TextInput label="Telegram (optional)" placeholder="@username" value={vTg} onChange={setVTg} />
                  </div>
                </div>
              )}

              {audience === "kol" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <TextInput label="Your Handle" placeholder="@yourname" value={kHandle} onChange={setKHandle} required />
                    <SelectInput label="Primary Platform" options={["Twitter / X", "YouTube", "Newsletter", "Discord", "Telegram", "Other"]} value={kPlatform} onChange={setKPlatform} required />
                  </div>
                  <SelectInput label="Audience Size" options={["< 5K", "5K \u2013 25K", "25K \u2013 100K", "100K+"]} value={kSize} onChange={setKSize} required />
                  <MultiChip label="Content Focus" options={["DeFi analysis", "Yield strategies", "General crypto", "Educational", "Trading", "Other"]} selected={kContent} onChange={setKContent} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <TextInput label="Email" placeholder="you@email.com" type="email" value={kEmail} onChange={setKEmail} required />
                    <TextInput label="Telegram (optional)" placeholder="@username" value={kTg} onChange={setKTg} />
                  </div>
                </div>
              )}

              <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
                <button onClick={handleSubmit} disabled={!canSubmit()} style={{
                  width: "100%", padding: "14px", borderRadius: 10, border: "none", fontSize: 16, fontWeight: 600, cursor: canSubmit() ? "pointer" : "not-allowed",
                  fontFamily: "'Inter',sans-serif", color: canSubmit() ? "#fff" : "rgba(0,0,0,0.35)", transition: "all .2s",
                  background: canSubmit() ? C.purpleGrad : "rgba(0,0,0,0.08)",
                  boxShadow: canSubmit() ? C.purpleShadow : "none",
                  opacity: canSubmit() ? 1 : 0.6,
                }}>
                  {submitting ? "Submitting..." : (audience === "wallet" ? "Apply as Wallet Partner" : audience === "vault" ? "Apply as Vault Protocol" : "Apply as Creator")} &rarr;
                </button>
                <div style={{ textAlign: "center", fontSize: 12, color: "rgba(0,0,0,0.3)" }}>
                  We'll review your application and get back within 48 hours.
                </div>
              </div>
            </div>

            <div style={{ marginTop: 24, display: "flex", gap: 20, justifyContent: "center" }}>
              {[
                { icon: "\u{1F512}", text: "Your data stays private" },
                { icon: "\u26A1", text: "48h response time" },
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
