import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAccount, useDisconnect, useSignMessage } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useVaults } from "../hooks/useVaultData.js";
import { VaultExplorer } from "../components/VaultExplorer.jsx";

const KOL_API = import.meta.env.VITE_PARTNER_API || "https://api.yieldo.xyz";
const APP_URL = import.meta.env.VITE_APP_URL || "https://app.yieldo.xyz";

const C = {
  bg: "#f8f7fc", white: "#ffffff", black: "#121212", surface: "#ffffff",
  surfaceAlt: "#faf9fe", border: "rgba(0,0,0,0.06)", border2: "rgba(0,0,0,0.1)",
  text: "#121212", text2: "rgba(0,0,0,0.65)", text3: "rgba(0,0,0,0.4)", text4: "rgba(0,0,0,0.25)",
  purple: "#7A1CCB", purpleLight: "#9E3BFF", purpleDim: "rgba(122,28,203,0.06)",
  purpleDim2: "rgba(122,28,203,0.1)",
  purpleGrad: "linear-gradient(100deg, #4B0CA6 0%, #7A1CCB 58%, #9E3BFF 114%)",
  purpleShadow: "0 0 17px rgba(80,14,170,0.12)",
  teal: "#2E9AB8", tealBright: "#45C7F2", tealDim: "rgba(69,199,242,0.08)",
  green: "#1a9d3f", greenDim: "rgba(26,157,63,0.07)",
  red: "#d93636", redDim: "rgba(217,54,54,0.06)",
  gold: "#b8960a", goldDim: "rgba(184,150,10,0.07)",
  orange: "#d97706", orangeDim: "rgba(217,119,6,0.07)",
};

// ============ HELPERS ============
function kolFetch(path, opts = {}) {
  const token = sessionStorage.getItem("yieldo_kol_token");
  const headers = { "Content-Type": "application/json", ...opts.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(`${KOL_API}${path}`, { ...opts, headers });
}

function fmtVolume(n) {
  if (!n || n === "0") return "$0";
  const num = parseInt(n) / 1e6;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
  if (num >= 1) return `$${num.toFixed(2)}`;
  return `$${num.toFixed(4)}`;
}

// ============ BASE COMPONENTS ============
function Btn({ children, primary, small, ghost, danger, full, active, onClick, disabled, style: sx = {} }) {
  const base = {
    fontFamily: "'Inter',sans-serif", fontSize: small ? 13 : 14, fontWeight: 500,
    border: "none", borderRadius: 6, cursor: disabled ? "not-allowed" : "pointer",
    padding: small ? "6px 12px" : "10px 18px", display: "inline-flex", alignItems: "center",
    gap: 6, width: full ? "100%" : undefined, justifyContent: full ? "center" : undefined,
    transition: "all .15s", opacity: disabled ? 0.5 : 1, ...sx,
  };
  if (primary) return <button onClick={onClick} disabled={disabled} style={{ ...base, backgroundImage: C.purpleGrad, color: "#fff", boxShadow: C.purpleShadow }}>{children}</button>;
  if (danger) return <button onClick={onClick} disabled={disabled} style={{ ...base, background: C.redDim, color: C.red }}>{children}</button>;
  if (ghost) return <button onClick={onClick} disabled={disabled} style={{ ...base, background: active ? C.purpleDim : "transparent", color: active ? C.purple : C.text3 }}>{children}</button>;
  return <button onClick={onClick} disabled={disabled} style={{ ...base, background: C.white, color: C.text2, border: `1px solid ${C.border2}`, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>{children}</button>;
}

function Badge({ children, color = C.purple, bg }) {
  return <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 4, background: bg || `${color}12`, color, whiteSpace: "nowrap" }}>{children}</span>;
}

function Card({ children, style: sx = {} }) {
  return <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.03)", ...sx }}>{children}</div>;
}

function StatCard({ icon, label, value, sub, accent }) {
  const accentColor = accent || C.purple;
  return (
    <Card style={{ padding: "18px 20px", flex: "1 1 0", minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: `${accentColor}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{icon}</div>
        <span style={{ fontSize: 12, color: C.text3, fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-.02em" }}>{value}</span>
        {sub && <span style={{ fontSize: 11, color: C.text4 }}>{sub}</span>}
      </div>
    </Card>
  );
}

// ============ SIGNATURE VERIFY ============
function SignatureVerify({ address, onVerified }) {
  const { signMessageAsync } = useSignMessage();
  const [status, setStatus] = useState("checking");
  const [isRegistered, setIsRegistered] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${KOL_API}/v1/kols/nonce`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address }),
    })
      .then(async r => {
        const data = await r.json();
        if (!r.ok) {
          setError(data.detail || "Cannot register with this address");
          setStatus("blocked");
          return;
        }
        setIsRegistered(data.message.includes("login"));
        setStatus("idle");
      })
      .catch(() => setStatus("idle"));
  }, [address]);

  const verify = async () => {
    setStatus("signing");
    setError("");
    try {
      const nonceRes = await fetch(`${KOL_API}/v1/kols/nonce`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      if (!nonceRes.ok) throw new Error("Failed to get nonce");
      const { nonce, message } = await nonceRes.json();
      const signature = await signMessageAsync({ message });

      if (isRegistered) {
        const res = await fetch(`${KOL_API}/v1/kols/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address, signature }),
        });
        if (res.ok) {
          const data = await res.json();
          sessionStorage.setItem("yieldo_kol_token", data.session_token);
          onVerified({ type: "login", kol: data.kol });
        } else {
          const err = await res.json();
          throw new Error(err.detail || "Login failed");
        }
      } else {
        onVerified({ type: "register", nonce, signature });
      }
    } catch (e) {
      if (e.message?.includes("User rejected") || e.message?.includes("User denied")) {
        setStatus("idle");
        return;
      }
      setError(e.message || "Verification failed");
      setStatus("idle");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 80px)", gap: 20 }}>
      <div style={{ width: 80, height: 80, borderRadius: 20, backgroundImage: C.purpleGrad, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>
        <span style={{ color: "#fff", fontWeight: 700 }}>K</span>
      </div>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>
        {isRegistered ? "Welcome Back" : "Verify Wallet Ownership"}
      </h2>
      <p style={{ margin: 0, fontSize: 14, color: C.text3, maxWidth: 420, textAlign: "center", lineHeight: 1.6 }}>
        {isRegistered
          ? "Sign a message to login to your KOL dashboard."
          : "Sign a message to prove wallet ownership. No gas required."}
      </p>
      <div style={{ padding: "10px 16px", background: C.purpleDim, borderRadius: 8, fontSize: 12, color: C.text2 }}>
        <span style={{ fontFamily: "monospace", fontWeight: 600, color: C.purple }}>{address}</span>
      </div>
      {error && (
        <div style={{ maxWidth: 400, textAlign: "center" }}>
          <div style={{ fontSize: 13, color: C.red, background: C.redDim, padding: "10px 16px", borderRadius: 8 }}>{error}</div>
          {(error.includes("wallet partner") || error.includes("already registered")) && (
            <a href="mailto:help@yieldo.xyz?subject=Account%20Conflict&body=My%20wallet%20address%3A%20" style={{ display: "inline-block", marginTop: 10, padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: C.bg, color: C.purple, border: `1px solid ${C.purple}30`, textDecoration: "none", fontFamily: "'Inter',sans-serif" }}>
              Contact Us
            </a>
          )}
        </div>
      )}
      {status !== "blocked" && (
        <Btn primary onClick={verify} disabled={status === "checking" || status === "signing"} style={{ padding: "14px 32px", fontSize: 15 }}>
          {status === "checking" ? "Checking..." : status === "signing" ? "Sign in wallet..." : isRegistered ? "Sign to Login" : "Sign to Verify"}
        </Btn>
      )}
    </div>
  );
}

// ============ REGISTRATION FORM ============
function RegistrationForm({ address, signature, onRegistered }) {
  const [form, setForm] = useState({ handle: "", name: "", bio: "", twitter: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [handleAvail, setHandleAvail] = useState(null); // null | "checking" | "available" | "taken" | "invalid"
  const { signMessageAsync } = useSignMessage();

  useEffect(() => {
    const h = form.handle.toLowerCase().trim();
    if (!h || h.length < 3) { setHandleAvail(null); return; }
    if (!/^[a-z0-9_-]{3,32}$/.test(h)) { setHandleAvail("invalid"); return; }
    setHandleAvail("checking");
    const t = setTimeout(() => {
      fetch(`${KOL_API}/v1/kols/public/${h}`)
        .then(r => setHandleAvail(r.status === 404 ? "available" : "taken"))
        .catch(() => setHandleAvail(null));
    }, 500);
    return () => clearTimeout(t);
  }, [form.handle]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!form.handle.trim()) { setError("Handle is required"); return; }
    if (!form.name.trim()) { setError("Display name is required"); return; }
    if (handleAvail === "taken") { setError("This handle is already taken"); return; }
    if (handleAvail === "invalid") { setError("Handle: 3-32 chars, letters/numbers/_/- only"); return; }
    setLoading(true);
    setError("");
    try {
      let sig = signature;
      if (!sig) {
        const nonceRes = await fetch(`${KOL_API}/v1/kols/nonce`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address }),
        });
        const { message } = await nonceRes.json();
        sig = await signMessageAsync({ message });
      }

      const res = await fetch(`${KOL_API}/v1/kols/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, signature: sig, ...form, handle: form.handle.toLowerCase().trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Registration failed");

      // Auto-login after registration
      const nonceRes2 = await fetch(`${KOL_API}/v1/kols/nonce`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const { message: loginMsg } = await nonceRes2.json();
      const loginSig = await signMessageAsync({ message: loginMsg });

      const loginRes = await fetch(`${KOL_API}/v1/kols/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, signature: loginSig }),
      });
      if (loginRes.ok) {
        const loginData = await loginRes.json();
        sessionStorage.setItem("yieldo_kol_token", loginData.session_token);
      }
      onRegistered(data);
    } catch (err) {
      if (err.message?.includes("User rejected")) { setLoading(false); return; }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border2}`,
    fontSize: 14, fontFamily: "'Inter',sans-serif", outline: "none",
    background: C.white, color: C.text, boxSizing: "border-box",
  };

  const handleStatusColor = { available: C.green, taken: C.red, invalid: C.gold, checking: C.text3 }[handleAvail];
  const handleStatusText = {
    available: "✓ Available",
    taken: "✗ Already taken",
    invalid: "3-32 chars, letters/numbers/_/- only",
    checking: "Checking...",
  }[handleAvail];

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 80px)" }}>
      <Card style={{ padding: 32, maxWidth: 480, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, backgroundImage: C.purpleGrad, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", fontSize: 24 }}>
            <span style={{ color: "#fff" }}>K</span>
          </div>
          <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 600 }}>Register as a KOL</h2>
          <p style={{ margin: 0, fontSize: 13, color: C.text3 }}>Share vault picks and earn from every deposit through your link.</p>
        </div>
        <div style={{ padding: "10px 14px", background: C.purpleDim, borderRadius: 8, marginBottom: 20, fontSize: 12, color: C.text2 }}>
          Connected: <span style={{ fontFamily: "monospace", fontWeight: 600, color: C.purple }}>{address.slice(0, 6)}...{address.slice(-4)}</span>
        </div>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: C.text3, fontWeight: 600, display: "block", marginBottom: 4 }}>Handle <span style={{ color: C.red }}>*</span></label>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.text3, fontSize: 14 }}>@</div>
              <input
                style={{ ...inputStyle, paddingLeft: 28 }}
                placeholder="yourhandle"
                value={form.handle}
                onChange={e => setForm({ ...form, handle: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") })}
              />
            </div>
            {handleAvail && (
              <div style={{ fontSize: 11, marginTop: 4, color: handleStatusColor, fontWeight: 500 }}>{handleStatusText}</div>
            )}
            <div style={{ fontSize: 11, color: C.text4, marginTop: 4 }}>
              Referral link: {APP_URL}?ref=<em>yourhandle</em>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, color: C.text3, fontWeight: 600, display: "block", marginBottom: 4 }}>Display Name <span style={{ color: C.red }}>*</span></label>
            <input style={inputStyle} placeholder="e.g. DeFi Alpha" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: C.text3, fontWeight: 600, display: "block", marginBottom: 4 }}>Bio</label>
            <textarea style={{ ...inputStyle, minHeight: 72, resize: "vertical" }} placeholder="Tell your audience what you cover..." value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: C.text3, fontWeight: 600, display: "block", marginBottom: 4 }}>Twitter / X</label>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.text3, fontSize: 14 }}>@</div>
              <input style={{ ...inputStyle, paddingLeft: 28 }} placeholder="yourtwitterhandle" value={form.twitter} onChange={e => setForm({ ...form, twitter: e.target.value.replace("@", "") })} />
            </div>
          </div>
          {error && (
            <div>
              <div style={{ fontSize: 12, color: C.red }}>{error}</div>
              {(error.includes("wallet partner") || error.includes("already registered")) && (
                <a href="mailto:help@yieldo.xyz?subject=Account%20Conflict&body=My%20wallet%20address%3A%20" style={{ display: "inline-block", marginTop: 8, fontSize: 12, fontWeight: 600, color: C.purple, textDecoration: "none" }}>
                  Contact us for help
                </a>
              )}
            </div>
          )}
          <Btn primary full disabled={loading || handleAvail === "taken" || handleAvail === "invalid"} onClick={handleSubmit}>
            {loading ? "Registering..." : "Complete Registration"}
          </Btn>
        </form>
      </Card>
    </div>
  );
}

// ============ OVERVIEW PAGE ============
function OverviewPage({ kol }) {
  const [stats, setStats] = useState(null);
  const referralLink = `${APP_URL}?ref=${kol?.handle || ""}`;
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    kolFetch("/v1/kols/dashboard").then(r => r.ok ? r.json() : null).then(setStats);
  }, []);

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Card style={{ padding: "16px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: C.text3, fontWeight: 600, marginBottom: 4 }}>Your Referral Link</div>
          <code style={{ fontSize: 13, color: C.purple, background: C.purpleDim, padding: "4px 10px", borderRadius: 6, wordBreak: "break-all" }}>{referralLink}</code>
        </div>
        <Btn small onClick={copyLink} style={{ flexShrink: 0 }}>{copied ? "Copied!" : "Copy Link"}</Btn>
      </Card>

      {stats ? (
        <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
          <StatCard icon="🔗" label="Total Referrals" value={stats.total_referrals} />
          <StatCard icon="💰" label="Earnings" value={fmtVolume(stats.total_earnings)} accent={C.green} />
          <StatCard icon="📊" label="Volume Referred" value={fmtVolume(stats.total_volume)} accent={C.teal} />
          <StatCard icon="👤" label="Unique Users" value={stats.total_users} sub={`${stats.users_7d} this week`} />
        </div>
      ) : (
        <div style={{ padding: 40, textAlign: "center", color: C.text3, fontSize: 14 }}>Loading stats...</div>
      )}

      <Card style={{ padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>How KOL Referrals Work</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13, color: C.text2 }}>
          {[
            ["1", "Share your referral link with your audience"],
            ["2", "When someone deposits through your link, your wallet address is used as the on-chain referrer"],
            ["3", "Every deposit through your link is attributed on-chain — your earnings come from vault revenue share"],
            ["4", "Go to <strong>Vault Picks</strong> to choose which vaults to promote on your public page"],
          ].map(([n, text]) => (
            <div key={n} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: C.purpleDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>{n}</div>
              <span style={{ paddingTop: 4 }} dangerouslySetInnerHTML={{ __html: text }} />
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

// ============ LINKS PAGE ============
function LinksPage({ kol }) {
  const profileLink = `${APP_URL}/u/${kol?.handle || ""}`;
  const referralLink = `${APP_URL}/vault?ref=${kol?.handle || ""}`;
  const [copied, setCopied] = useState("");

  const copy = (val, key) => {
    navigator.clipboard.writeText(val);
    setCopied(key);
    setTimeout(() => setCopied(""), 2000);
  };

  const tweetText = encodeURIComponent(`Check out my DeFi vault picks on Yieldo \u2014 earn real yield on your crypto \ud83d\udd25\n\n${profileLink}`);
  const tweetUrl = `https://twitter.com/intent/tweet?text=${tweetText}`;

  const copyVaultLink = (vaultId) => {
    const url = `${APP_URL}/vault/${encodeURIComponent(vaultId)}?ref=${kol?.handle || ""}`;
    copy(url, `vault-${vaultId}`);
  };

  return (
    <div style={{ maxWidth: 640, display: "flex", flexDirection: "column", gap: 16 }}>
      <Card style={{ padding: 24 }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 600 }}>Your Profile Page</h3>
        <p style={{ fontSize: 13, color: C.text3, margin: "0 0 14px" }}>
          Share this page — it shows your bio, vault picks, and deposit buttons. Visitors get your referral code automatically.
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <code style={{ flex: 1, padding: "10px 14px", background: C.surfaceAlt, borderRadius: 8, fontSize: 13, fontFamily: "monospace", color: C.purple, border: `1px solid ${C.border}`, wordBreak: "break-all" }}>
            {profileLink}
          </code>
          <Btn small onClick={() => copy(profileLink, "profile")}>{copied === "profile" ? "Copied!" : "Copy"}</Btn>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a href={tweetUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
            <Btn small>Share on X</Btn>
          </a>
        </div>
      </Card>

      <Card style={{ padding: 24 }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 600 }}>Referral Link</h3>
        <p style={{ fontSize: 13, color: C.text3, margin: "0 0 12px" }}>
          Direct link to all vaults with your referral code. Every deposit is attributed on-chain to you.
        </p>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <code style={{ flex: 1, padding: "10px 14px", background: C.surfaceAlt, borderRadius: 8, fontSize: 13, fontFamily: "monospace", color: C.text2, border: `1px solid ${C.border}`, wordBreak: "break-all" }}>
            {referralLink}
          </code>
          <Btn small onClick={() => copy(referralLink, "link")}>{copied === "link" ? "Copied!" : "Copy"}</Btn>
        </div>
      </Card>

      {kol?.enrolled_vaults?.length > 0 && (
        <Card style={{ padding: 24 }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 600 }}>Vault Links</h3>
          <p style={{ fontSize: 13, color: C.text3, margin: "0 0 14px" }}>
            Share individual vault links — your referral code is attached automatically.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {kol.enrolled_vaults.map(vid => (
              <div key={vid} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, background: C.surfaceAlt }}>
                <code style={{ flex: 1, fontSize: 11, fontFamily: "monospace", color: C.text3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {vid}
                </code>
                <button onClick={() => copyVaultLink(vid)} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: C.purpleDim, border: `1px solid ${C.purple}30`, color: C.purple, cursor: "pointer", fontFamily: "'Inter',sans-serif", flexShrink: 0 }}>
                  {copied === `vault-${vid}` ? "Copied!" : "Copy Link"}
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card style={{ padding: 24 }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 600 }}>Your Handle</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ background: C.purpleDim, borderRadius: 8, padding: "10px 16px", fontSize: 15, fontWeight: 600, color: C.purple }}>
            @{kol?.handle}
          </div>
          <Btn small onClick={() => copy(`@${kol?.handle}`, "handle")}>{copied === "handle" ? "Copied!" : "Copy"}</Btn>
        </div>
      </Card>

      <Card style={{ padding: 24 }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 600 }}>Fee Collector Address</h3>
        <p style={{ fontSize: 13, color: C.text3, margin: "0 0 10px" }}>
          This address receives your on-chain earnings. Change it in Settings.
        </p>
        <code style={{ display: "block", padding: "10px 14px", background: C.surfaceAlt, borderRadius: 8, fontSize: 12, fontFamily: "monospace", color: C.text2, border: `1px solid ${C.border}` }}>
          {kol?.fee_collector_address || kol?.address}
        </code>
      </Card>
    </div>
  );
}

// ============ PAYOUTS PAGE ============
function PayoutsPage() {
  const [refs, setRefs] = useState(null);

  useEffect(() => {
    kolFetch("/v1/kols/referrals?limit=50").then(r => r.ok ? r.json() : []).then(setRefs);
  }, []);

  if (!refs) return <div style={{ padding: 60, textAlign: "center", color: C.text3 }}>Loading...</div>;

  if (refs.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 16 }}>
        <div style={{ width: 72, height: 72, borderRadius: 18, background: C.purpleDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>💸</div>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>No referrals yet</h3>
        <p style={{ margin: 0, fontSize: 14, color: C.text3, maxWidth: 380, textAlign: "center", lineHeight: 1.6 }}>
          Share your referral link to start earning. Fees are paid on-chain at the time of deposit.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Card>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: C.surfaceAlt }}>
              {["User", "Vault", "Chain", "Amount", "Earnings", "Date"].map(h => (
                <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 600, fontSize: 11, color: C.text3, textTransform: "uppercase", letterSpacing: ".05em", borderBottom: `1px solid ${C.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {refs.map((r, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: "10px 16px" }}>
                  <code style={{ fontSize: 12, color: C.text2 }}>{r.user_address?.slice(0, 6)}...{r.user_address?.slice(-4)}</code>
                </td>
                <td style={{ padding: "10px 16px", color: C.text2, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.vault_id || "—"}</td>
                <td style={{ padding: "10px 16px", color: C.text3 }}>{r.from_chain_id || "—"}</td>
                <td style={{ padding: "10px 16px" }}>{fmtVolume(r.from_amount)}</td>
                <td style={{ padding: "10px 16px", color: C.green, fontWeight: 600 }}>{fmtVolume(r.fee_amount)}</td>
                <td style={{ padding: "10px 16px", color: C.text3, fontSize: 12 }}>
                  {r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ============ SETTINGS PAGE ============
function SettingsPage({ kol, onUpdate }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    kolFetch("/v1/kols/me").then(r => r.ok ? r.json() : null).then(data => {
      if (data) setForm({
        name: data.name || "",
        bio: data.bio || "",
        twitter: data.twitter || "",
        fee_collector_address: data.fee_collector_address || data.address || "",
      });
    });
  }, []);

  const save = async () => {
    setSaving(true); setMsg("");
    try {
      const res = await kolFetch("/v1/kols/settings", { method: "PUT", body: JSON.stringify(form) });
      if (res.ok) { setMsg("Saved!"); onUpdate(); }
      else { const e = await res.json(); setMsg(e.detail || "Failed"); }
    } catch { setMsg("Failed to save"); }
    setSaving(false);
  };

  if (!form) return <div style={{ padding: 60, textAlign: "center", color: C.text3 }}>Loading settings...</div>;

  const inputStyle = {
    width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border2}`,
    fontSize: 14, fontFamily: "'Inter',sans-serif", outline: "none",
    background: C.white, color: C.text, boxSizing: "border-box",
  };

  return (
    <div style={{ maxWidth: 640, display: "flex", flexDirection: "column", gap: 16 }}>
      <Card style={{ padding: 24 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600 }}>Profile</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: C.text3, fontWeight: 600, display: "block", marginBottom: 4 }}>Handle</label>
            <div style={{ padding: "10px 14px", background: C.surfaceAlt, borderRadius: 8, fontSize: 14, color: C.text3, border: `1px solid ${C.border}` }}>
              @{kol?.handle} <span style={{ fontSize: 11, color: C.text4, marginLeft: 6 }}>(cannot be changed)</span>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, color: C.text3, fontWeight: 600, display: "block", marginBottom: 4 }}>Display Name</label>
            <input style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: C.text3, fontWeight: 600, display: "block", marginBottom: 4 }}>Bio</label>
            <textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} placeholder="A short bio shown on your public page..." />
          </div>
          <div>
            <label style={{ fontSize: 12, color: C.text3, fontWeight: 600, display: "block", marginBottom: 4 }}>Twitter / X</label>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.text3, fontSize: 14 }}>@</div>
              <input style={{ ...inputStyle, paddingLeft: 28 }} value={form.twitter} onChange={e => setForm({ ...form, twitter: e.target.value.replace("@", "") })} placeholder="yourtwitterhandle" />
            </div>
          </div>
        </div>
      </Card>

      <Card style={{ padding: 24 }}>
        <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 600 }}>Fee Collector Address</h3>
        <p style={{ fontSize: 13, color: C.text3, margin: "0 0 14px" }}>
          The address that receives your on-chain earnings. Defaults to your connected wallet.
        </p>
        <div>
          <label style={{ fontSize: 12, color: C.text3, fontWeight: 600, display: "block", marginBottom: 4 }}>Address</label>
          <input
            style={{ ...inputStyle, fontFamily: "monospace", fontSize: 13 }}
            placeholder="0x..."
            value={form.fee_collector_address}
            onChange={e => setForm({ ...form, fee_collector_address: e.target.value })}
          />
          <div style={{ fontSize: 11, color: C.text4, marginTop: 4 }}>
            This address is passed as the on-chain referrer when users deposit through your link.
          </div>
        </div>
      </Card>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <Btn primary onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Settings"}</Btn>
        {msg && <span style={{ fontSize: 13, color: msg === "Saved!" ? C.green : C.red, fontWeight: 500 }}>{msg}</span>}
      </div>
    </div>
  );
}

// ============ MAIN PAGE ============
export default function KolPage() {
  const [page, setPage] = useState("overview");
  const [savedEnrolled, setSavedEnrolled] = useState(new Set());
  const [enrolledVaults, setEnrolledVaults] = useState(new Set());
  const [savingEnroll, setSavingEnroll] = useState(false);
  const [enrollSavedAt, setEnrollSavedAt] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem("yieldo_kol_sidebar_collapsed") === "1"; } catch { return false; }
  });
  const [kol, setKol] = useState(null);
  const [authState, setAuthState] = useState("checking");
  const [registerData, setRegisterData] = useState(null);

  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();
  const { vaults, loading: vaultsLoading } = useVaults();

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem("yieldo_kol_sidebar_collapsed", next ? "1" : "0"); } catch {}
      return next;
    });
  };

  const applyServerEnrollment = (list) => {
    const set = new Set(list || []);
    setSavedEnrolled(set);
    setEnrolledVaults(new Set(set));
  };

  useEffect(() => {
    if (!isConnected || !address) {
      setAuthState("not_connected");
      setKol(null);
      sessionStorage.removeItem("yieldo_kol_token");
      return;
    }
    const token = sessionStorage.getItem("yieldo_kol_token");
    if (token) {
      kolFetch("/v1/kols/me")
        .then(r => { if (r.ok) return r.json(); throw new Error(); })
        .then(data => { setKol(data); setAuthState("authenticated"); applyServerEnrollment(data.enrolled_vaults); })
        .catch(() => { sessionStorage.removeItem("yieldo_kol_token"); setAuthState("verify"); });
    } else {
      setAuthState("verify");
    }
  }, [address, isConnected]);

  const handleVerified = useCallback((result) => {
    if (result.type === "login") {
      kolFetch("/v1/kols/me").then(r => r.ok ? r.json() : null).then(data => {
        if (data) { setKol(data); applyServerEnrollment(data.enrolled_vaults); }
      });
      setAuthState("authenticated");
    } else if (result.type === "register") {
      setRegisterData(result);
      setAuthState("register");
    }
  }, []);

  const handleRegistered = useCallback(() => {
    kolFetch("/v1/kols/me").then(r => r.ok ? r.json() : null).then(k => {
      if (k) { setKol(k); applyServerEnrollment(k.enrolled_vaults); }
    });
    setAuthState("authenticated");
  }, []);

  const toggleVault = (vaultId) => {
    setEnrolledVaults(prev => {
      const next = new Set(prev);
      next.has(vaultId) ? next.delete(vaultId) : next.add(vaultId);
      return next;
    });
  };

  const enrollDiff = useMemo(() => {
    const toAdd = [], toRemove = [];
    for (const id of enrolledVaults) if (!savedEnrolled.has(id)) toAdd.push(id);
    for (const id of savedEnrolled) if (!enrolledVaults.has(id)) toRemove.push(id);
    return { toAdd, toRemove, dirty: toAdd.length > 0 || toRemove.length > 0 };
  }, [enrolledVaults, savedEnrolled]);

  const saveEnrollment = async () => {
    setSavingEnroll(true);
    try {
      const res = await kolFetch("/v1/kols/vaults", {
        method: "PUT",
        body: JSON.stringify({ enrolled_vaults: [...enrolledVaults] }),
      });
      if (res.ok) {
        setSavedEnrolled(new Set(enrolledVaults));
        setEnrollSavedAt(Date.now());
        setTimeout(() => setEnrollSavedAt(null), 2500);
      } else {
        alert("Failed to save vault picks. Please try again.");
      }
    } catch {
      alert("Failed to save vault picks. Please try again.");
    } finally {
      setSavingEnroll(false);
    }
  };

  const discardEnrollment = () => setEnrolledVaults(new Set(savedEnrolled));

  const refreshKol = () => {
    kolFetch("/v1/kols/me").then(r => r.ok ? r.json() : null).then(data => { if (data) setKol(data); });
  };

  const navItems = [
    { id: "overview", icon: "📊", label: "Overview" },
    { id: "picks", icon: "🏦", label: "Vault Picks" },
    { id: "links", icon: "🔗", label: "Links" },
    { id: "analytics", icon: "📈", label: "Analytics", soon: true },
    { id: "payouts", icon: "💸", label: "Payouts" },
    { id: "settings", icon: "⚙️", label: "Settings" },
  ];

  const sidebarWidth = sidebarCollapsed ? 64 : 230;

  return (
    <div style={{ fontFamily: "'Inter',sans-serif", background: C.bg, color: C.text, minHeight: "100vh", display: "flex" }}>
      {/* SIDEBAR */}
      <aside style={{
        width: sidebarWidth, background: C.white, borderRight: `1px solid ${C.border}`,
        padding: "20px 0", display: "flex", flexDirection: "column",
        position: "sticky", top: 0, height: "100vh",
        boxShadow: "1px 0 8px rgba(0,0,0,0.02)", transition: "width .2s ease",
      }}>
        <div style={{
          padding: sidebarCollapsed ? "0 12px 18px" : "0 20px 18px",
          display: "flex", alignItems: "center", gap: 8,
          borderBottom: `1px solid ${C.border}`, marginBottom: 8,
          justifyContent: sidebarCollapsed ? "center" : "flex-start",
        }}>
          <img src="/yieldo-new.png" alt="Yieldo" style={{ width: 32, height: 32, borderRadius: 8, objectFit: "contain", flexShrink: 0 }} />
          {!sidebarCollapsed && <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: ".05em" }}>YIELDO</span>}
          {!sidebarCollapsed && <Badge color={C.orange} bg={C.orangeDim}>KOL</Badge>}
        </div>

        <button
          onClick={toggleSidebar}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{
            position: "absolute", top: 22, right: -12, width: 24, height: 24, borderRadius: 12,
            background: C.white, border: `1px solid ${C.border2}`, color: C.text3,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontFamily: "'Inter',sans-serif", boxShadow: "0 1px 4px rgba(0,0,0,.06)", zIndex: 5,
          }}
        >
          {sidebarCollapsed ? "›" : "‹"}
        </button>

        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 1, padding: "0 8px" }}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              title={sidebarCollapsed ? item.label : undefined}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: sidebarCollapsed ? "10px 0" : "9px 14px",
                justifyContent: sidebarCollapsed ? "center" : "flex-start",
                background: page === item.id ? C.purpleDim : "transparent",
                border: "none", borderRadius: 8,
                color: page === item.id ? C.purple : C.text3,
                fontSize: 14, fontWeight: page === item.id ? 600 : 400,
                cursor: "pointer", fontFamily: "'Inter',sans-serif", textAlign: "left", transition: "all .15s",
              }}
            >
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {!sidebarCollapsed && item.label}
              {!sidebarCollapsed && item.soon && <span style={{ fontSize: 9, color: C.text4, marginLeft: "auto" }}>soon</span>}
            </button>
          ))}
        </nav>

        <div style={{ padding: sidebarCollapsed ? "14px 8px" : "14px 16px", borderTop: `1px solid ${C.border}`, margin: "0 8px" }}>
          {isConnected && address ? (
            sidebarCollapsed ? (
              <div title={`${address.slice(0, 6)}...${address.slice(-4)}`} style={{ display: "flex", justifyContent: "center" }}>
                <div style={{ width: 10, height: 10, borderRadius: 5, background: authState === "authenticated" ? C.green : C.gold }} />
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 4, background: authState === "authenticated" ? C.green : C.gold }} />
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{authState === "authenticated" ? "Connected" : "Unverified"}</span>
                </div>
                <div style={{ fontSize: 11, color: C.text3, fontFamily: "monospace", marginBottom: 8 }}>{address.slice(0, 6)}...{address.slice(-4)}</div>
                {kol && <div style={{ fontSize: 11, color: C.purple, fontWeight: 500, marginBottom: 4 }}>@{kol.handle}</div>}
                {kol && <div style={{ fontSize: 11, color: C.text3, marginBottom: 8 }}>{kol.name}</div>}
                <button
                  onClick={() => { disconnect(); sessionStorage.removeItem("yieldo_kol_token"); }}
                  style={{ fontSize: 11, color: C.red, background: "none", border: "none", cursor: "pointer", fontFamily: "'Inter',sans-serif", padding: 0 }}
                >
                  Disconnect
                </button>
              </div>
            )
          ) : (
            sidebarCollapsed ? (
              <button onClick={openConnectModal} title="Connect Wallet" style={{ width: "100%", padding: "10px 0", borderRadius: 8, backgroundImage: C.purpleGrad, border: "none", color: "#fff", fontSize: 16, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>↗</button>
            ) : (
              <button onClick={openConnectModal} style={{ width: "100%", padding: "10px", borderRadius: 8, backgroundImage: C.purpleGrad, border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif", boxShadow: C.purpleShadow }}>
                Connect Wallet
              </button>
            )
          )}
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main style={{ flex: 1, padding: "24px 32px", overflow: "auto", minWidth: 0 }}>
        {authState === "not_connected" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 80px)", gap: 20 }}>
            <div style={{ width: 80, height: 80, borderRadius: 20, backgroundImage: C.purpleGrad, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>
              <span style={{ color: "#fff", fontWeight: 700 }}>K</span>
            </div>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>Yieldo KOL Program</h2>
            <p style={{ margin: 0, fontSize: 14, color: C.text3, maxWidth: 480, textAlign: "center", lineHeight: 1.6 }}>
              Share curated DeFi vault picks with your audience. Every deposit made through your referral link is attributed on-chain — earnings come from vault revenue share.
            </p>
            <div style={{ display: "flex", gap: 14, marginTop: 8, flexWrap: "wrap", justifyContent: "center" }}>
              <StatCard icon="💰" label="Attribution" value="On-chain" sub="provable deposits" />
              <StatCard icon="🏦" label="Available Vaults" value={vaults.length || "—"} />
              <StatCard icon="🔗" label="Chains" value={new Set(vaults.map(v => v.chain_id)).size || "—"} />
            </div>
            <Btn primary onClick={openConnectModal} style={{ marginTop: 12, padding: "14px 32px", fontSize: 16 }}>
              Connect Wallet to Get Started
            </Btn>
          </div>
        )}

        {authState === "checking" && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400, fontSize: 14, color: C.text3 }}>Loading...</div>
        )}

        {authState === "verify" && address && (
          <SignatureVerify address={address} onVerified={handleVerified} />
        )}

        {authState === "register" && address && (
          <RegistrationForm address={address} signature={registerData?.signature} onRegistered={handleRegistered} />
        )}

        {authState === "authenticated" && kol && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: page === "picks" ? 16 : 24 }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: "-.01em" }}>
                {navItems.find(n => n.id === page)?.icon}{" "}{navItems.find(n => n.id === page)?.label}
              </h1>
              {page === "overview" && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Badge color={C.orange} bg={C.orangeDim}>KOL</Badge>
                  <span style={{ fontSize: 13, color: C.text3 }}>@{kol.handle}</span>
                </div>
              )}
            </div>

            {page === "overview" && <OverviewPage kol={kol} />}

            {page === "picks" && (
              <>
                <div style={{ display: "flex", gap: 14, marginBottom: 16, flexWrap: "wrap" }}>
                  <StatCard icon="🏦" label="Total Vaults" value={vaults.length} />
                  <StatCard icon="✅" label="Selected Picks" value={enrolledVaults.size} />
                  <StatCard icon="🔗" label="Chains" value={new Set(vaults.map(v => v.chain_id)).size} />
                  <StatCard icon="📈" label="Avg APY" value={vaults.length ? `${(vaults.reduce((s, v) => s + (v.apy || 0), 0) / vaults.length).toFixed(2)}%` : "—"} />
                </div>
                {vaultsLoading ? (
                  <div style={{ textAlign: "center", padding: 60, color: C.text3, fontSize: 14 }}>Loading vaults...</div>
                ) : (
                  <VaultExplorer
                    vaults={vaults}
                    variant="enroll"
                    enrolled={enrolledVaults}
                    onToggleEnroll={toggleVault}
                  />
                )}
              </>
            )}

            {page === "links" && <LinksPage kol={kol} />}
            {page === "payouts" && <PayoutsPage />}
            {page === "settings" && <SettingsPage kol={kol} onUpdate={refreshKol} />}
            {page === "analytics" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 16 }}>
                <div style={{ width: 72, height: 72, borderRadius: 18, background: C.purpleDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>📈</div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Analytics</h3>
                <p style={{ margin: 0, fontSize: 14, color: C.text3, maxWidth: 380, textAlign: "center", lineHeight: 1.6 }}>
                  Detailed referral charts and time-series analytics are coming soon.
                </p>
                <Badge color={C.teal} bg={C.tealDim}>Coming Soon</Badge>
              </div>
            )}
          </>
        )}
      </main>

      {/* Floating vault picks save bar */}
      {authState === "authenticated" && page === "picks" && enrollDiff.dirty && (
        <div style={{
          position: "fixed", bottom: 24,
          left: `calc(50% + ${sidebarWidth / 2}px)`,
          transform: "translateX(-50%)", zIndex: 100,
          background: C.white, borderRadius: 14,
          border: `1.5px solid ${C.purple}40`,
          boxShadow: "0 12px 40px rgba(122,28,203,.22)",
          padding: "14px 20px", display: "flex", alignItems: "center", gap: 16,
          fontFamily: "'Inter',sans-serif",
          animation: "yieldoSlideUp .25s ease-out",
          maxWidth: "calc(100vw - 40px)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: 5, background: C.purple, flexShrink: 0, animation: "yieldoPulse 1.6s ease-in-out infinite" }} />
            <span style={{ fontSize: 13, color: C.text2, fontWeight: 500 }}>
              Unsaved changes:
              {enrollDiff.toAdd.length > 0 && <strong style={{ color: C.green, marginLeft: 6 }}>+{enrollDiff.toAdd.length} added</strong>}
              {enrollDiff.toAdd.length > 0 && enrollDiff.toRemove.length > 0 && <span style={{ color: C.text4, margin: "0 4px" }}>·</span>}
              {enrollDiff.toRemove.length > 0 && <strong style={{ color: C.red, marginLeft: enrollDiff.toAdd.length > 0 ? 0 : 6 }}>−{enrollDiff.toRemove.length} removed</strong>}
            </span>
          </div>
          <div style={{ width: 1, height: 22, background: C.border }} />
          <button onClick={discardEnrollment} disabled={savingEnroll} style={{ fontSize: 12, fontWeight: 500, color: C.text3, background: "none", border: `1px solid ${C.border2}`, borderRadius: 6, padding: "7px 14px", cursor: savingEnroll ? "not-allowed" : "pointer", fontFamily: "'Inter',sans-serif", opacity: savingEnroll ? 0.5 : 1 }}>Discard</button>
          <Btn primary small onClick={saveEnrollment} disabled={savingEnroll}>{savingEnroll ? "Saving..." : "Save Picks"}</Btn>
        </div>
      )}

      {authState === "authenticated" && page === "picks" && enrollSavedAt && !enrollDiff.dirty && (
        <div style={{
          position: "fixed", bottom: 24,
          left: `calc(50% + ${sidebarWidth / 2}px)`,
          transform: "translateX(-50%)", zIndex: 100,
          background: C.greenDim, color: C.green,
          padding: "12px 22px", borderRadius: 12, fontSize: 13, fontWeight: 600,
          border: `1px solid rgba(26,157,63,.3)`, boxShadow: "0 8px 24px rgba(26,157,63,.18)",
          animation: "yieldoSlideUp .25s ease-out",
        }}>
          ✓ Vault picks saved
        </div>
      )}

      <style>{`
        @keyframes yieldoSlideUp {
          from { opacity: 0; transform: translate(-50%, 12px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes yieldoPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .35; }
        }
      `}</style>
    </div>
  );
}
