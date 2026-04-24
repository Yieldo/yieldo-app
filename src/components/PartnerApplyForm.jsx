import { useState } from "react";

/**
 * Shared "Apply to join Yieldo" form used on /wallets, /curator, and /apply.
 *
 * Props:
 *   audience        "wallet" | "vault" | "kol"       — which schema to render
 *   onSubmitted     () => void                       — called after success
 *   showHeader      boolean (default true)           — if false, skip the audience title block
 *
 * Submission posts to the same Sheet.best backend that ApplyPage uses, keeping
 * the single source of truth for our application pipeline.
 */
const SHEET_BEST_URL = "https://api.sheetbest.com/sheets/5b812dce-8ca7-4efa-97cc-8d8d0b55d403";

const C = {
  white: "#fff", border: "rgba(0,0,0,.06)", border2: "rgba(0,0,0,.1)",
  text: "#121212", text2: "rgba(0,0,0,.65)", text3: "rgba(0,0,0,.4)", text4: "rgba(0,0,0,.25)",
  purple: "#7A1CCB", purpleDim: "rgba(122,28,203,.06)",
  purpleGrad: "linear-gradient(100deg,#4B0CA6 0%,#7A1CCB 58%,#9E3BFF 114%)",
  purpleGradLight: "linear-gradient(100deg, rgba(75,12,166,0.1) 0%, rgba(122,28,203,0.1) 58%, rgba(158,59,255,0.1) 114%)",
  purpleShadow: "0 0 17px rgba(80,14,170,.12)",
};

function TextInput({ label, placeholder, value, onChange, type = "text", required }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 13, fontWeight: 500, color: "rgba(0,0,0,0.55)" }}>
        {label}{required && <span style={{ color: "#d93636", marginLeft: 2 }}>*</span>}
      </label>
      <input type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}
        style={{ padding: "11px 14px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.1)",
                 background: "#fff", fontSize: 14, fontFamily: "'Inter',sans-serif",
                 outline: "none", color: "#121212", boxSizing: "border-box" }} />
    </div>
  );
}

function SelectInput({ label, options, value, onChange, required }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 13, fontWeight: 500, color: "rgba(0,0,0,0.55)" }}>
        {label}{required && <span style={{ color: "#d93636", marginLeft: 2 }}>*</span>}
      </label>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ padding: "11px 14px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.1)",
                 background: "#fff", fontSize: 14, fontFamily: "'Inter',sans-serif", outline: "none",
                 color: value ? "#121212" : "rgba(0,0,0,0.35)", boxSizing: "border-box" }}>
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
      <label style={{ fontSize: 13, fontWeight: 500, color: "rgba(0,0,0,0.55)" }}>
        {label}{required && <span style={{ color: "#d93636", marginLeft: 2 }}>*</span>}
      </label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {options.map(o => (
          <button key={o} onClick={() => toggle(o)} style={{
            padding: "7px 14px", borderRadius: 20, fontSize: 13, fontFamily: "'Inter',sans-serif",
            cursor: "pointer", transition: "all .15s",
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

const TITLES = {
  wallet: { title: "Wallet Partner Application",  icon: "👛", desc: "Tell us about your wallet or app. We'll set up your partner account." },
  vault:  { title: "Vault Protocol Application", icon: "🏦", desc: "Tell us about your protocol. We'll help you reach new depositors." },
  kol:    { title: "Creator Application",         icon: "📣", desc: "Tell us about your audience. We'll get your yield page set up." },
};

export default function PartnerApplyForm({ audience = "wallet", onSubmitted, showHeader = true }) {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Wallet fields
  const [wName, setWName] = useState("");
  const [wRole, setWRole] = useState("");
  const [wMau, setWMau] = useState("");
  const [wChains, setWChains] = useState([]);
  const [wEmail, setWEmail] = useState("");
  const [wTg, setWTg] = useState("");

  // Vault fields
  const [vName, setVName] = useState("");
  const [vRole, setVRole] = useState("");
  const [vTvl, setVTvl] = useState("");
  const [vGoals, setVGoals] = useState([]);
  const [vEmail, setVEmail] = useState("");
  const [vTg, setVTg] = useState("");

  // KOL fields
  const [kHandle, setKHandle] = useState("");
  const [kPlatform, setKPlatform] = useState("");
  const [kSize, setKSize] = useState("");
  const [kContent, setKContent] = useState([]);
  const [kEmail, setKEmail] = useState("");
  const [kTg, setKTg] = useState("");

  const emailValid = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const canSubmit = () => {
    if (submitting) return false;
    if (audience === "wallet") return wName && wMau && wChains.length > 0 && emailValid(wEmail);
    if (audience === "vault")  return vName && vTvl && vGoals.length > 0 && emailValid(vEmail);
    if (audience === "kol")    return kHandle && kPlatform && kSize && emailValid(kEmail);
    return false;
  };

  const handleSubmit = async () => {
    let row = { audience, timestamp: new Date().toISOString() };
    if (audience === "wallet") Object.assign(row, { company: wName, role: wRole, mau: wMau, chains: wChains.join(", "), email: wEmail, telegram: wTg });
    if (audience === "vault")  Object.assign(row, { protocol: vName, role: vRole, tvl: vTvl, goals: vGoals.join(", "), email: vEmail, telegram: vTg });
    if (audience === "kol")    Object.assign(row, { handle: kHandle, platform: kPlatform, audienceSize: kSize, contentTypes: kContent.join(", "), email: kEmail, telegram: kTg });
    setSubmitting(true);
    try {
      await fetch(SHEET_BEST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(row),
      });
      setSubmitted(true);
      onSubmitted?.();
    } catch { setSubmitted(true); }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px", background: C.white,
                    borderRadius: 14, border: `1px solid ${C.border}` }}>
        <div style={{ width: 60, height: 60, borderRadius: 30, backgroundImage: C.purpleGrad,
                      margin: "0 auto 18px", display: "flex", alignItems: "center",
                      justifyContent: "center", color: "#fff", fontSize: 28 }}>✓</div>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Application received</div>
        <div style={{ fontSize: 14, color: C.text2, maxWidth: 420, margin: "0 auto", lineHeight: 1.5 }}>
          Thanks for applying. We review every application and will respond within 48 hours.
        </div>
      </div>
    );
  }

  const meta = TITLES[audience] || TITLES.wallet;

  return (
    <div>
      {showHeader && (
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, backgroundImage: C.purpleGrad,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 22 }}>{meta.icon}</div>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>{meta.title}</h2>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: C.text3 }}>{meta.desc}</p>
          </div>
        </div>
      )}

      <div style={{ padding: 28, borderRadius: 14, background: C.white,
                    border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.02)" }}>
        {audience === "wallet" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <TextInput label="Company / Wallet Name" placeholder="e.g. Phantom" value={wName} onChange={setWName} required />
              <TextInput label="Your Role" placeholder="e.g. Head of Product" value={wRole} onChange={setWRole} />
            </div>
            <SelectInput label="Monthly Active Users" options={["< 10K", "10K – 100K", "100K – 1M", "1M+"]} value={wMau} onChange={setWMau} required />
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
            <SelectInput label="Current TVL" options={["< $10M", "$10M – $100M", "$100M – $1B", "$1B+"]} value={vTvl} onChange={setVTvl} required />
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
            <SelectInput label="Audience Size" options={["< 5K", "5K – 25K", "25K – 100K", "100K+"]} value={kSize} onChange={setKSize} required />
            <MultiChip label="Content Focus" options={["DeFi analysis", "Yield strategies", "General crypto", "Educational", "Trading", "Other"]} selected={kContent} onChange={setKContent} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <TextInput label="Email" placeholder="you@email.com" type="email" value={kEmail} onChange={setKEmail} required />
              <TextInput label="Telegram (optional)" placeholder="@username" value={kTg} onChange={setKTg} />
            </div>
          </div>
        )}

        <div style={{ marginTop: 22 }}>
          <button onClick={handleSubmit} disabled={!canSubmit()} style={{
            width: "100%", padding: "13px", borderRadius: 10, border: "none", fontSize: 15,
            fontWeight: 600, cursor: canSubmit() ? "pointer" : "not-allowed",
            fontFamily: "'Inter',sans-serif", color: canSubmit() ? "#fff" : "rgba(0,0,0,0.35)",
            background: canSubmit() ? C.purpleGrad : "rgba(0,0,0,0.08)",
            boxShadow: canSubmit() ? C.purpleShadow : "none",
            opacity: canSubmit() ? 1 : 0.6,
          }}>
            {submitting ? "Submitting..." :
              audience === "wallet" ? "Apply as Wallet Partner →" :
              audience === "vault"  ? "Apply as Vault Protocol →" :
                                      "Apply as Creator →"}
          </button>
          <div style={{ textAlign: "center", fontSize: 12, color: C.text4, marginTop: 10 }}>
            We review every application and respond within 48 hours.
          </div>
        </div>
      </div>
    </div>
  );
}
