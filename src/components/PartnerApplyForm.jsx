import { useState, useEffect } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";

/**
 * "Apply to join Yieldo" — wallet-gated form for wallet partner / creator.
 *
 * The user must:
 *   1. Connect a wallet (we capture the address as the application identity)
 *   2. Fill the form
 *   3. Sign a SIWE-style message proving address ownership
 *   4. Submit -> writes a `pending` row to our DB (yieldo_wallets.applications)
 *      Admin reviews & approves manually via scripts/review_applications.py.
 *
 * Mutex: an address can only have one pending OR approved application across
 * audiences (wallet OR creator, not both).
 *
 * Props:
 *   audience      "wallet" | "kol"  — vault is no longer DB-backed here
 *   onSubmitted   () => void        — called after successful submission
 *   showHeader    bool (default true)
 */
const API_BASE = import.meta.env.VITE_PARTNER_API || "https://api.yieldo.xyz";

const C = {
  white: "#fff", border: "rgba(0,0,0,.06)", border2: "rgba(0,0,0,.1)",
  text: "#121212", text2: "rgba(0,0,0,.65)", text3: "rgba(0,0,0,.4)", text4: "rgba(0,0,0,.25)",
  purple: "#7A1CCB", purpleDim: "rgba(122,28,203,.06)",
  purpleGrad: "linear-gradient(100deg,#4B0CA6 0%,#7A1CCB 58%,#9E3BFF 114%)",
  purpleGradLight: "linear-gradient(100deg, rgba(75,12,166,0.1) 0%, rgba(122,28,203,0.1) 58%, rgba(158,59,255,0.1) 114%)",
  purpleShadow: "0 0 17px rgba(80,14,170,.12)",
  red: "#d93636",
  redBg: "rgba(217,54,54,.06)",
  amberBg: "rgba(217,140,54,.08)",
  amberInk: "#a45c0d",
};

// Audience -> backend identifier mapping.
// "kol" frontend identifier maps to "creator" backend audience.
const AUDIENCE_BACKEND = { wallet: "wallet", kol: "creator" };

function TextInput({ label, placeholder, value, onChange, type = "text", required, disabled, hint }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 13, fontWeight: 500, color: "rgba(0,0,0,0.55)" }}>
        {label}{required && <span style={{ color: C.red, marginLeft: 2 }}>*</span>}
      </label>
      <input type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
        style={{ padding: "11px 14px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.1)",
                 background: disabled ? "#f5f5f7" : "#fff", fontSize: 14, fontFamily: "'Inter',sans-serif",
                 outline: "none", color: "#121212", boxSizing: "border-box" }} />
      {hint && <span style={{ fontSize: 11, color: C.text3 }}>{hint}</span>}
    </div>
  );
}

function SelectInput({ label, options, value, onChange, required }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 13, fontWeight: 500, color: "rgba(0,0,0,0.55)" }}>
        {label}{required && <span style={{ color: C.red, marginLeft: 2 }}>*</span>}
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
        {label}{required && <span style={{ color: C.red, marginLeft: 2 }}>*</span>}
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
  kol:    { title: "Creator Application",         icon: "📣", desc: "Tell us about your audience. We'll get your yield page set up." },
};

export default function PartnerApplyForm({ audience = "wallet", onSubmitted, showHeader = true }) {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { openConnectModal } = useConnectModal();

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [existingStatus, setExistingStatus] = useState(null); // {audience, status} or null

  // Wallet fields
  const [wName, setWName] = useState("");
  const [wRole, setWRole] = useState("");
  const [wMau, setWMau] = useState("");
  const [wChains, setWChains] = useState([]);
  const [wEmail, setWEmail] = useState("");
  const [wTg, setWTg] = useState("");

  // KOL fields
  const [kHandle, setKHandle] = useState("");
  const [kPlatform, setKPlatform] = useState("");
  const [kSize, setKSize] = useState("");
  const [kContent, setKContent] = useState([]);
  const [kEmail, setKEmail] = useState("");
  const [kTg, setKTg] = useState("");

  // Pre-check: if this address has any application, surface its status so they
  // don't waste time signing a doomed submission.
  useEffect(() => {
    if (!address) { setExistingStatus(null); return; }
    let cancelled = false;
    fetch(`${API_BASE}/v1/applications/me/${address}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!cancelled && d?.applications?.length) setExistingStatus(d.applications); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [address]);

  const emailValid = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const canSubmit = () => {
    if (submitting || !isConnected || !address) return false;
    if (audience === "wallet") return wName && wMau && wChains.length > 0 && emailValid(wEmail);
    if (audience === "kol")    return kHandle && kPlatform && kSize && emailValid(kEmail);
    return false;
  };

  const handleSubmit = async () => {
    setError("");
    setSubmitting(true);
    try {
      const backendAudience = AUDIENCE_BACKEND[audience];

      // 1. Get nonce
      const nonceRes = await fetch(`${API_BASE}/v1/applications/nonce`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, audience: backendAudience }),
      });
      if (!nonceRes.ok) {
        const err = await nonceRes.json().catch(() => ({}));
        throw new Error(err.detail || `Nonce request failed (${nonceRes.status})`);
      }
      const { message } = await nonceRes.json();

      // 2. Sign
      const signature = await signMessageAsync({ message });

      // 3. Build form payload (snake_case to match backend pydantic models)
      const form = audience === "wallet" ? {
        company: wName, role: wRole, mau: wMau,
        chains: wChains, email: wEmail, telegram: wTg,
      } : {
        handle: kHandle, platform: kPlatform, audience_size: kSize,
        content_types: kContent, email: kEmail, telegram: kTg,
      };

      // 4. Submit
      const submitRes = await fetch(`${API_BASE}/v1/applications/${backendAudience}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, signature, form }),
      });
      if (!submitRes.ok) {
        const err = await submitRes.json().catch(() => ({}));
        throw new Error(err.detail || `Submission failed (${submitRes.status})`);
      }
      setSubmitted(true);
      onSubmitted?.();
    } catch (e) {
      // User-rejected signature → friendlier copy
      const msg = (e?.message || "").toLowerCase().includes("user reject") || (e?.message || "").toLowerCase().includes("user denied")
        ? "Signature cancelled. You need to sign the message to submit."
        : (e?.message || "Submission failed. Please try again.");
      setError(msg);
    } finally {
      setSubmitting(false);
    }
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
          Thanks for applying. We review every application manually and respond within 48 hours.
          We'll reach out at the email you provided.
        </div>
      </div>
    );
  }

  // Existing application banner — pending / approved / rejected
  const ourBackend = AUDIENCE_BACKEND[audience];
  const ourExisting = existingStatus?.find(a => a.audience === ourBackend);
  const otherExisting = existingStatus?.find(a => a.audience !== ourBackend && (a.status === "pending" || a.status === "approved"));

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

      {/* Existing-status banners */}
      {ourExisting?.status === "pending" && (
        <div style={{ background: C.amberBg, border: `1px solid ${C.amberBg}`, borderRadius: 10, padding: "12px 16px", marginBottom: 16, color: C.amberInk, fontSize: 13 }}>
          You have a <b>pending</b> application for this role. We'll respond within 48 hours.
        </div>
      )}
      {ourExisting?.status === "approved" && (
        <div style={{ background: "rgba(34,139,93,.08)", border: "1px solid rgba(34,139,93,.18)", borderRadius: 10, padding: "12px 16px", marginBottom: 16, color: "#1c6b46", fontSize: 13 }}>
          ✓ Your application is approved. {audience === "wallet" ? "Connect your wallet at /wallets" : "Connect your wallet at /creator"} to complete registration.
        </div>
      )}
      {ourExisting?.status === "rejected" && (
        <div style={{ background: C.redBg, border: `1px solid rgba(217,54,54,.18)`, borderRadius: 10, padding: "12px 16px", marginBottom: 16, color: "#9c2727", fontSize: 13 }}>
          Your previous application was rejected. You can re-apply with updated details below.
        </div>
      )}
      {otherExisting && (
        <div style={{ background: C.redBg, border: `1px solid rgba(217,54,54,.18)`, borderRadius: 10, padding: "12px 16px", marginBottom: 16, color: "#9c2727", fontSize: 13 }}>
          This address already has a <b>{otherExisting.status}</b> application as {otherExisting.audience === "wallet" ? "wallet partner" : "creator"}.
          You can only hold one role per address — withdraw or use a different wallet to apply for this role.
        </div>
      )}

      <div style={{ padding: 28, borderRadius: 14, background: C.white,
                    border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.02)" }}>

        {/* Wallet identity field — read-only, comes from connected wallet */}
        <div style={{ marginBottom: 18, padding: 14, background: isConnected ? C.purpleDim : "#fafafc", border: `1px solid ${isConnected ? "rgba(122,28,203,.18)" : "rgba(0,0,0,.06)"}`, borderRadius: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: isConnected ? C.purple : C.text3, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".05em" }}>
            Applying as
          </div>
          {isConnected ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between", flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, fontFamily: "monospace", color: C.text }}>{address}</span>
              <span style={{ fontSize: 11, color: C.text3 }}>You'll sign a message to confirm ownership when you submit.</span>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "space-between", flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: C.text2 }}>Connect a wallet to apply. We'll capture the address as your application identity.</span>
              <button onClick={openConnectModal} style={{ padding: "9px 18px", borderRadius: 8, border: "none", cursor: "pointer", backgroundImage: C.purpleGrad, color: "#fff", fontSize: 13, fontWeight: 600, boxShadow: C.purpleShadow }}>
                Connect Wallet
              </button>
            </div>
          )}
        </div>

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

        {error && (
          <div style={{ marginTop: 16, padding: "11px 14px", background: C.redBg, border: "1px solid rgba(217,54,54,.18)", borderRadius: 8, color: "#9c2727", fontSize: 13 }}>
            {error}
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
            {submitting ? "Submitting..." : !isConnected ? "Connect wallet to apply" :
              audience === "wallet" ? "Sign & Apply as Wallet Partner →" :
              "Sign & Apply as Creator →"}
          </button>
          <div style={{ textAlign: "center", fontSize: 12, color: C.text4, marginTop: 10 }}>
            Invite-only · We review every application and respond within 48 hours.
          </div>
        </div>
      </div>
    </div>
  );
}
