import { useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_PARTNER_API || "https://api.yieldo.xyz";
const APP_URL = import.meta.env.VITE_APP_URL || "https://app.yieldo.xyz";

const C = {
  bg: "#f8f7fc", white: "#ffffff", border: "rgba(0,0,0,0.06)", border2: "rgba(0,0,0,0.1)",
  surfaceAlt: "#faf9fe",
  text: "#121212", text2: "rgba(0,0,0,0.65)", text3: "rgba(0,0,0,0.4)", text4: "rgba(0,0,0,0.22)",
  purple: "#7A1CCB", purpleDim: "rgba(122,28,203,0.06)",
  purpleGrad: "linear-gradient(100deg,#4B0CA6 0%,#7A1CCB 58%,#9E3BFF 114%)",
  purpleShadow: "0 0 18px rgba(80,14,170,0.13)",
  green: "#1a9d3f", amber: "#b8960a", red: "#d93636",
};

const HANDLE_RE = /^[a-z0-9_-]{3,32}$/;

function StepDots({ current, total }) {
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 24 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ height: 4, borderRadius: 2, transition: "all .25s",
                              width: i === current - 1 ? 20 : 6,
                              background: i === current - 1 ? C.purple : C.border2 }} />
      ))}
    </div>
  );
}

function Btn({ children, primary, full, onClick, disabled, style = {} }) {
  const base = {
    fontFamily: "'Inter',sans-serif", fontSize: 14, fontWeight: 500, border: "none", borderRadius: 6,
    cursor: disabled ? "not-allowed" : "pointer", padding: "10px 18px", display: "inline-flex",
    alignItems: "center", gap: 6, width: full ? "100%" : undefined, justifyContent: full ? "center" : undefined,
    transition: "all .15s", opacity: disabled ? 0.6 : 1, ...style,
  };
  if (primary) return <button onClick={onClick} disabled={disabled}
    style={{ ...base, backgroundImage: C.purpleGrad, color: "#fff", boxShadow: C.purpleShadow }}>{children}</button>;
  return <button onClick={onClick} disabled={disabled}
    style={{ ...base, background: C.white, color: C.text2, border: `1px solid ${C.border2}`,
             boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>{children}</button>;
}

export default function BecomeCreatorModal({ onClose, unlockedByTier = false }) {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [showApply, setShowApply] = useState(false);

  // Step 1 (code gate)
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [validatedCode, setValidatedCode] = useState(""); // set after successful validation
  const [verifying, setVerifying] = useState(false);

  // Apply form
  const [twitter, setTwitter] = useState("");
  const [audience, setAudience] = useState("");
  const [desc, setDesc] = useState("");
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [applyError, setApplyError] = useState("");

  // Step 3 (handle + register)
  const [handle, setHandle] = useState("");
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const validateCode = async () => {
    const upper = code.trim().toUpperCase();
    if (!upper) { setCodeError("Enter a code"); return; }
    setVerifying(true); setCodeError("");
    try {
      const res = await fetch(`${API}/v1/creators/invite/verify`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: upper }),
      });
      if (res.ok) { setValidatedCode(upper); setStep(2); }
      else {
        const err = await res.json().catch(() => ({}));
        setCodeError(err.detail || "Invalid or already-used code");
      }
    } catch (e) { setCodeError("Network error. Try again."); }
    setVerifying(false);
  };

  const submitApplication = async () => {
    if (!twitter) { setApplyError("Twitter handle is required"); return; }
    setApplying(true); setApplyError("");
    try {
      const res = await fetch(`${API}/v1/creators/apply`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, twitter, audience, description: desc }),
      });
      if (res.ok) setApplied(true);
      else {
        const err = await res.json().catch(() => ({}));
        setApplyError(err.detail || "Failed to submit");
      }
    } catch { setApplyError("Network error"); }
    setApplying(false);
  };

  const register = async () => {
    const h = handle.toLowerCase().trim();
    if (!HANDLE_RE.test(h)) { setSubmitError("Handle: 3-32 chars, letters/numbers/_/-"); return; }
    if (!name.trim()) { setSubmitError("Display name required"); return; }

    setSubmitting(true); setSubmitError("");
    try {
      // Get nonce
      const nonceRes = await fetch(`${API}/v1/creators/nonce`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      if (!nonceRes.ok) {
        const err = await nonceRes.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to get nonce");
      }
      const { message } = await nonceRes.json();

      // Sign
      const signature = await signMessageAsync({ message });

      // Register
      const regRes = await fetch(`${API}/v1/creators/register`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address, signature, handle: h, name: name.trim(), bio: bio.trim(),
          twitter: twitter.replace("@", ""), invite_code: validatedCode,
        }),
      });
      if (!regRes.ok) {
        const err = await regRes.json().catch(() => ({}));
        throw new Error(err.detail || "Registration failed");
      }
      // Success — redirect to Creator dashboard
      onClose();
      navigate("/creator");
    } catch (e) {
      if (e.message?.includes("User rejected") || e.message?.includes("User denied")) {
        setSubmitError("Signature rejected");
      } else {
        setSubmitError(e.message || "Registration failed");
      }
    }
    setSubmitting(false);
  };

  // Skip code gate if tier 2 unlocked
  const skipCodeGate = unlockedByTier;
  const effectiveStep = skipCodeGate && step === 1 ? 2 : step;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex",
                  alignItems: "center", justifyContent: "center", zIndex: 10000,
                  fontFamily: "'Inter',sans-serif" }} onClick={onClose}>
      <div style={{ width: 480, maxWidth: "calc(100vw - 32px)", background: "#fff", borderRadius: 20,
                    boxShadow: "0 24px 80px rgba(0,0,0,0.18)", padding: 32,
                    maxHeight: "92vh", overflowY: "auto" }}
           onClick={e => e.stopPropagation()}>

        {/* STEP 1: code gate */}
        {effectiveStep === 1 && !showApply && (
          <>
            <StepDots current={1} total={3} />
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, backgroundImage: C.purpleGrad,
                            margin: "0 auto 14px", display: "flex", alignItems: "center",
                            justifyContent: "center", fontSize: 26 }}>🎯</div>
              <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 700 }}>Yieldo Creator Access</h2>
              <p style={{ margin: 0, fontSize: 13, color: C.text3, lineHeight: 1.5 }}>
                Creator accounts are invite-only to keep campaign quality high and give early members the best deal flow.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 22 }}>
              {[["$1.2M","Avg creator AUM"],["6.8%","Conversion rate"],["Weekly","USDC payouts"]].map(([val,label]) => (
                <div key={label} style={{ textAlign: "center", padding: "12px 8px", borderRadius: 10,
                                          background: C.surfaceAlt, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.purple }}>{val}</div>
                  <div style={{ fontSize: 10, color: C.text3, marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10,
                          background: "linear-gradient(100deg,rgba(184,150,10,0.06),rgba(184,150,10,0.02))",
                          border: "1px solid rgba(184,150,10,0.2)", marginBottom: 22 }}>
              <span style={{ fontSize: 18 }}>⭐</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.amber }}>Founding Creator badge</div>
                <div style={{ fontSize: 11, color: C.text3 }}>
                  Join now and get a permanent early-access badge on your public page.
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.text3, textTransform: "uppercase",
                              letterSpacing: ".04em", display: "block", marginBottom: 6 }}>Invite Code</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={code} onChange={e => { setCode(e.target.value); setCodeError(""); }}
                       onKeyDown={e => e.key === "Enter" && validateCode()}
                       placeholder="e.g. MORPHO"
                       style={{ flex: 1, padding: "11px 14px", borderRadius: 8,
                                border: `1px solid ${codeError ? C.red : C.border2}`,
                                fontSize: 14, fontFamily: "'Inter',sans-serif", outline: "none",
                                letterSpacing: ".06em", textTransform: "uppercase" }} />
                <Btn primary onClick={validateCode} disabled={verifying}>
                  {verifying ? "..." : "Unlock →"}
                </Btn>
              </div>
              {codeError && <div style={{ fontSize: 12, color: C.red, marginTop: 6 }}>{codeError}</div>}
            </div>

            <div style={{ borderTop: `1px solid ${C.border}`, margin: "20px 0 16px" }} />

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button onClick={() => setShowApply(true)}
                      style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, fontWeight: 500,
                               padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border2}`,
                               background: C.white, cursor: "pointer", color: C.text2, textAlign: "left",
                               display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>✏️ Apply for access</span>
                <span style={{ color: C.text4, fontSize: 12 }}>We review weekly</span>
              </button>
              <button onClick={() => window.open("https://x.com/YieldoHQ", "_blank")}
                      style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, fontWeight: 500,
                               padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border2}`,
                               background: C.white, cursor: "pointer", color: C.text2, textAlign: "left",
                               display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>𝕏 Follow @YieldoHQ for code drops</span>
                <span style={{ color: C.text4, fontSize: 12 }}>Every 2–3 weeks</span>
              </button>
            </div>
          </>
        )}

        {/* STEP 1b: apply form */}
        {effectiveStep === 1 && showApply && !applied && (
          <>
            <button onClick={() => setShowApply(false)} style={{ background: "none", border: "none",
                    cursor: "pointer", fontSize: 13, color: C.text3, marginBottom: 16,
                    fontFamily: "'Inter',sans-serif", padding: 0 }}>← Back</button>
            <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700 }}>Apply for Creator Access</h2>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: C.text3 }}>
              Tell us about yourself. We review applications every week.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.text3, textTransform: "uppercase",
                                letterSpacing: ".04em", display: "block", marginBottom: 5 }}>X / Twitter handle</label>
                <input value={twitter} onChange={e => setTwitter(e.target.value.replace("@", ""))}
                       placeholder="yourhandle"
                       style={{ width: "100%", padding: "10px 14px", borderRadius: 8,
                                border: `1px solid ${C.border2}`, fontSize: 13,
                                fontFamily: "'Inter',sans-serif", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.text3, textTransform: "uppercase",
                                letterSpacing: ".04em", display: "block", marginBottom: 5 }}>Audience size</label>
                <input value={audience} onChange={e => setAudience(e.target.value)}
                       placeholder="e.g. 5,000"
                       style={{ width: "100%", padding: "10px 14px", borderRadius: 8,
                                border: `1px solid ${C.border2}`, fontSize: 13,
                                fontFamily: "'Inter',sans-serif", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.text3, textTransform: "uppercase",
                                letterSpacing: ".04em", display: "block", marginBottom: 5 }}>What DeFi content do you create?</label>
                <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3}
                          placeholder="Threads, reviews, newsletters..."
                          style={{ width: "100%", padding: "10px 14px", borderRadius: 8,
                                   border: `1px solid ${C.border2}`, fontSize: 13,
                                   fontFamily: "'Inter',sans-serif", outline: "none", resize: "vertical",
                                   boxSizing: "border-box" }} />
              </div>
            </div>

            {applyError && <div style={{ fontSize: 12, color: C.red, marginBottom: 12 }}>{applyError}</div>}
            <Btn primary full onClick={submitApplication} disabled={applying}>
              {applying ? "Submitting..." : "Submit Application"}
            </Btn>
          </>
        )}

        {/* STEP 1c: applied confirmation */}
        {effectiveStep === 1 && showApply && applied && (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✉️</div>
            <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700 }}>Application received</h2>
            <p style={{ margin: "0 0 24px", fontSize: 13, color: C.text3, lineHeight: 1.5 }}>
              We'll review it this week and reach out on X. Follow <strong>@YieldoHQ</strong> so you don't miss the reply.
            </p>
            <Btn full onClick={onClose}>Close</Btn>
          </div>
        )}

        {/* STEP 2: benefits */}
        {effectiveStep === 2 && (
          <>
            <StepDots current={2} total={3} />
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(46,154,184,0.1)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 24, marginBottom: 14 }}>🎯</div>
            <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 700 }}>
              {unlockedByTier ? "You've earned Creator access" : "Welcome to the Creator Program"}
            </h2>
            <p style={{ margin: "0 0 18px", fontSize: 13, color: C.text3, lineHeight: 1.5 }}>
              {unlockedByTier
                ? "Your referral activity unlocked this. Here's what you're getting."
                : "Code verified. Here's what you're unlocking — available from day one."}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 22 }}>
              {[
                ["🔗","Personal Creator page","Your own page at yieldo.xyz/u/@handle with your curated picks"],
                ["💰","Revenue share","Earn on every dollar of AUM you route, paid weekly in USDC"],
                ["📊","Analytics dashboard","Track clicks, deposits, and earnings in real time"],
                ["🎯","Campaign access","Curator-funded campaigns for your audience"],
              ].map(([icon,title,dsc]) => (
                <div key={title} style={{ display: "flex", gap: 12, padding: "10px 12px",
                                          borderRadius: 8, background: C.surfaceAlt }}>
                  <span style={{ fontSize: 15, flexShrink: 0 }}>{icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{title}</div>
                    <div style={{ fontSize: 12, color: C.text3 }}>{dsc}</div>
                  </div>
                </div>
              ))}
              <div style={{ display: "flex", gap: 12, padding: "10px 12px", borderRadius: 8,
                            background: "linear-gradient(100deg,rgba(184,150,10,0.07),rgba(184,150,10,0.03))",
                            border: "1px solid rgba(184,150,10,0.2)" }}>
                <span style={{ fontSize: 15, flexShrink: 0 }}>⭐</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.amber }}>Founding Creator badge</div>
                  <div style={{ fontSize: 12, color: C.text3 }}>
                    Permanently displayed on your public page — marks you as an early member.
                  </div>
                </div>
              </div>
            </div>
            <Btn primary full onClick={() => setStep(3)}>Set Up My Page →</Btn>
          </>
        )}

        {/* STEP 3: handle setup */}
        {effectiveStep === 3 && (
          <>
            <StepDots current={3} total={3} />
            <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700 }}>Set up your page</h2>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: C.text3 }}>
              Choose a handle and display name for your public Creator page.
            </p>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.text3, textTransform: "uppercase",
                              letterSpacing: ".04em", display: "block", marginBottom: 6 }}>Handle</label>
              <div style={{ display: "flex", alignItems: "center", border: `1px solid ${C.border2}`,
                            borderRadius: 8, overflow: "hidden" }}>
                <span style={{ padding: "11px 14px", background: C.surfaceAlt, fontSize: 13, color: C.text3,
                               borderRight: `1px solid ${C.border2}`, whiteSpace: "nowrap" }}>
                  yieldo.xyz/u/
                </span>
                <input value={handle} onChange={e => setHandle(e.target.value.toLowerCase())}
                       placeholder="yourhandle"
                       style={{ flex: 1, padding: "11px 14px", border: "none", fontSize: 14,
                                fontFamily: "'Inter',sans-serif", outline: "none" }} />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.text3, textTransform: "uppercase",
                              letterSpacing: ".04em", display: "block", marginBottom: 6 }}>Display name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Your Name"
                     style={{ width: "100%", padding: "11px 14px", borderRadius: 8,
                              border: `1px solid ${C.border2}`, fontSize: 14,
                              fontFamily: "'Inter',sans-serif", outline: "none", boxSizing: "border-box" }} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.text3, textTransform: "uppercase",
                              letterSpacing: ".04em", display: "block", marginBottom: 6 }}>Bio (optional)</label>
              <textarea value={bio} onChange={e => setBio(e.target.value)} rows={2}
                        placeholder="DeFi yield expert..."
                        style={{ width: "100%", padding: "10px 14px", borderRadius: 8,
                                 border: `1px solid ${C.border2}`, fontSize: 13,
                                 fontFamily: "'Inter',sans-serif", outline: "none",
                                 boxSizing: "border-box", resize: "vertical" }} />
            </div>

            <div style={{ padding: "10px 14px", borderRadius: 8, background: C.purpleDim, marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: C.purple, fontWeight: 500 }}>
                Your page: <strong>{APP_URL}/u/{handle || "yourhandle"}</strong>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8,
                          background: "rgba(184,150,10,0.06)", border: "1px solid rgba(184,150,10,0.15)",
                          marginBottom: 16 }}>
              <span style={{ fontSize: 13 }}>⭐</span>
              <span style={{ fontSize: 12, color: C.amber, fontWeight: 500 }}>
                Founding Creator badge will appear on your page
              </span>
            </div>

            {submitError && <div style={{ fontSize: 12, color: C.red, marginBottom: 12 }}>{submitError}</div>}

            <div style={{ display: "flex", gap: 8 }}>
              {!unlockedByTier && <Btn onClick={() => setStep(2)} style={{ flex: 1 }}>← Back</Btn>}
              <Btn primary onClick={register} disabled={submitting}
                   style={{ flex: unlockedByTier ? 1 : 2 }}>
                {submitting ? "Signing..." : "Activate Creator →"}
              </Btn>
            </div>
          </>
        )}

        {/* Close X — top right */}
        <button onClick={onClose}
          style={{ position: "absolute", top: 18, right: 18, background: "none", border: "none",
                   cursor: "pointer", fontSize: 18, color: C.text3 }}>✕</button>
      </div>
    </div>
  );
}
