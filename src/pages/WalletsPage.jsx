import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAccount, useDisconnect, useSignMessage } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useVaults } from "../hooks/useVaultData.js";
import { VaultExplorer } from "../components/VaultExplorer.jsx";

const PARTNER_API = import.meta.env.VITE_PARTNER_API || "https://api.yieldo.xyz";

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
};

const CHAINS = { 1: "Ethereum", 8453: "Base", 42161: "Arbitrum", 10: "Optimism", 999: "Hyperliquid", 747474: "Katana", 143: "Monad" };
const PROTOCOL_COLORS = {
  Morpho: { color: "#1E90FF", bg: "rgba(30,144,255,0.08)" },
  Hyperbeat: { color: "#00D4AA", bg: "rgba(0,212,170,0.08)" },
  Veda: { color: "#FF6B35", bg: "rgba(255,107,53,0.08)" },
};

const fmtTvl = n => {
  if (!n) return "$0";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};
const fmtApy = n => (!n && n !== 0) ? "—" : (n * 100).toFixed(2) + "%";

// ============ HELPERS ============
function partnerFetch(path, opts = {}) {
  const token = sessionStorage.getItem("yieldo_partner_token");
  const headers = { "Content-Type": "application/json", ...opts.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(`${PARTNER_API}${path}`, { ...opts, headers });
}

// ============ BASE COMPONENTS ============
function Btn({ children, primary, small, ghost, danger, full, active, onClick, disabled, style: sx = {} }) {
  const base = { fontFamily: "'Inter',sans-serif", fontSize: small ? 13 : 14, fontWeight: 500, border: "none", borderRadius: 6, cursor: disabled ? "not-allowed" : "pointer", padding: small ? "6px 12px" : "10px 18px", display: "inline-flex", alignItems: "center", gap: 6, width: full ? "100%" : undefined, justifyContent: full ? "center" : undefined, transition: "all .15s", opacity: disabled ? 0.5 : 1, ...sx };
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
function StatCard({ icon, label, value, sub }) {
  return (
    <Card style={{ padding: "18px 20px", flex: "1 1 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: C.purpleDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{icon}</div>
        <span style={{ fontSize: 12, color: C.text3, fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-.02em" }}>{value}</span>
        {sub && <span style={{ fontSize: 11, color: C.text4 }}>{sub}</span>}
      </div>
    </Card>
  );
}
function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: "flex", gap: 2, background: C.surfaceAlt, borderRadius: 8, padding: 3, border: `1px solid ${C.border}` }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, fontWeight: active === t.id ? 600 : 400, padding: "7px 14px", borderRadius: 6, border: "none", cursor: "pointer", background: active === t.id ? C.white : "transparent", color: active === t.id ? C.purple : C.text3, boxShadow: active === t.id ? "0 1px 3px rgba(0,0,0,0.06)" : "none", transition: "all .15s" }}>
          {t.label}
        </button>
      ))}
    </div>
  );
}
function Toggle({ on, onToggle }) {
  return (
    <div onClick={onToggle} style={{ width: 38, height: 22, borderRadius: 11, background: on ? C.purpleDim2 : C.border, position: "relative", cursor: "pointer", transition: "background .2s" }}>
      <div style={{ width: 16, height: 16, borderRadius: "50%", background: on ? C.purple : "rgba(0,0,0,0.15)", position: "absolute", top: 3, left: on ? 19 : 3, transition: "left .2s" }} />
    </div>
  );
}

// ============ SIGNATURE VERIFICATION ============
function SignatureVerify({ address, onVerified }) {
  const { signMessageAsync } = useSignMessage();
  const [status, setStatus] = useState("checking"); // checking | idle | signing | error
  const [isRegistered, setIsRegistered] = useState(null);
  const [error, setError] = useState("");

  // Check if already registered on mount
  useEffect(() => {
    fetch(`${PARTNER_API}/v1/partners/nonce`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address }),
    })
      .then(r => r.json())
      .then(data => {
        setIsRegistered(data.message.includes("login"));
        setStatus("idle");
      })
      .catch(() => setStatus("idle"));
  }, [address]);

  const verify = async () => {
    setStatus("signing");
    setError("");
    try {
      // Get a fresh nonce
      const nonceRes = await fetch(`${PARTNER_API}/v1/partners/nonce`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      if (!nonceRes.ok) throw new Error("Failed to get nonce");
      const { nonce, message } = await nonceRes.json();

      // Sign with wallet
      const signature = await signMessageAsync({ message });

      if (isRegistered) {
        // Login
        const res = await fetch(`${PARTNER_API}/v1/partners/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address, signature }),
        });
        if (res.ok) {
          const data = await res.json();
          sessionStorage.setItem("yieldo_partner_token", data.session_token);
          onVerified({ type: "login", partner: data.partner });
        } else {
          const err = await res.json();
          throw new Error(err.detail || "Login failed");
        }
      } else {
        // Not registered — pass nonce+signature to registration form (no double sign)
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
        <span style={{ color: "#fff", fontWeight: 700 }}>Y</span>
      </div>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>
        {isRegistered ? "Welcome Back" : "Verify Wallet Ownership"}
      </h2>
      <p style={{ margin: 0, fontSize: 14, color: C.text3, maxWidth: 420, textAlign: "center", lineHeight: 1.6 }}>
        {isRegistered
          ? "Sign a message to login to your partner dashboard."
          : "Sign a message with your wallet to prove ownership. This does not cost any gas."}
      </p>
      <div style={{ padding: "10px 16px", background: C.purpleDim, borderRadius: 8, fontSize: 12, color: C.text2 }}>
        <span style={{ fontFamily: "monospace", fontWeight: 600, color: C.purple }}>{address}</span>
      </div>
      {error && (
        <div style={{ maxWidth: 400, textAlign: "center" }}>
          <div style={{ fontSize: 13, color: C.red }}>{error}</div>
          {(error.includes("already registered") || error.includes("KOL")) && (
            <a href="mailto:help@yieldo.xyz?subject=Account%20Conflict&body=My%20wallet%20address%3A%20" style={{ display: "inline-block", marginTop: 10, padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: C.bg, color: C.purple, border: `1px solid ${C.purple}30`, textDecoration: "none", fontFamily: "'Inter',sans-serif" }}>
              Contact Us
            </a>
          )}
        </div>
      )}
      <Btn primary onClick={verify} disabled={status === "checking" || status === "signing"} style={{ padding: "14px 32px", fontSize: 15 }}>
        {status === "checking" ? "Checking..." : status === "signing" ? "Sign in wallet..." : isRegistered ? "Sign to Login" : "Sign to Verify"}
      </Btn>
    </div>
  );
}

// ============ REGISTRATION FORM ============
function RegistrationForm({ address, signature, onRegistered }) {
  const [form, setForm] = useState({ name: "", website: "", contact_email: "", description: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { signMessageAsync } = useSignMessage();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Wallet name is required"); return; }
    setLoading(true);
    setError("");
    try {
      // Use the signature from SignatureVerify if available, otherwise get fresh one
      let sig = signature;
      if (!sig) {
        const nonceRes = await fetch(`${PARTNER_API}/v1/partners/nonce`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address }),
        });
        const { message } = await nonceRes.json();
        sig = await signMessageAsync({ message });
      }

      const res = await fetch(`${PARTNER_API}/v1/partners/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, signature: sig, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Registration failed");

      // Now login to get session
      const nonceRes2 = await fetch(`${PARTNER_API}/v1/partners/nonce`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const { message: loginMsg } = await nonceRes2.json();
      const loginSig = await signMessageAsync({ message: loginMsg });

      const loginRes = await fetch(`${PARTNER_API}/v1/partners/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, signature: loginSig }),
      });
      if (loginRes.ok) {
        const loginData = await loginRes.json();
        sessionStorage.setItem("yieldo_partner_token", loginData.session_token);
      }

      onRegistered(data);
    } catch (err) {
      if (err.message?.includes("User rejected")) { setLoading(false); return; }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border2}`, fontSize: 14, fontFamily: "'Inter',sans-serif", outline: "none", background: C.white, color: C.text, boxSizing: "border-box" };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 80px)" }}>
      <Card style={{ padding: 32, maxWidth: 480, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, backgroundImage: C.purpleGrad, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", fontSize: 24 }}>
            <span style={{ color: "#fff" }}>Y</span>
          </div>
          <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 600 }}>Register as Wallet Partner</h2>
          <p style={{ margin: 0, fontSize: 13, color: C.text3 }}>Complete your profile to start earning revenue.</p>
        </div>
        <div style={{ padding: "10px 14px", background: C.purpleDim, borderRadius: 8, marginBottom: 20, fontSize: 12, color: C.text2 }}>
          Connected: <span style={{ fontFamily: "monospace", fontWeight: 600, color: C.purple }}>{address.slice(0, 6)}...{address.slice(-4)}</span>
        </div>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: C.text3, fontWeight: 600, display: "block", marginBottom: 4 }}>Wallet / Company Name *</label>
            <input style={inputStyle} placeholder="e.g. Phantom, MetaMask" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: C.text3, fontWeight: 600, display: "block", marginBottom: 4 }}>Website</label>
            <input style={inputStyle} placeholder="https://yourwallet.com" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: C.text3, fontWeight: 600, display: "block", marginBottom: 4 }}>Contact Email</label>
            <input style={inputStyle} type="email" placeholder="team@yourwallet.com" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: C.text3, fontWeight: 600, display: "block", marginBottom: 4 }}>Description</label>
            <textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} placeholder="Tell us about your wallet..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          {error && (
            <div>
              <div style={{ fontSize: 12, color: C.red }}>{error}</div>
              {(error.includes("already registered") || error.includes("KOL")) && (
                <a href="mailto:help@yieldo.xyz?subject=Account%20Conflict&body=My%20wallet%20address%3A%20" style={{ display: "inline-block", marginTop: 8, fontSize: 12, fontWeight: 600, color: C.purple, textDecoration: "none" }}>
                  Contact us for help
                </a>
              )}
            </div>
          )}
          <Btn primary full disabled={loading} onClick={handleSubmit}>{loading ? "Registering..." : "Complete Registration"}</Btn>
        </form>
      </Card>
    </div>
  );
}

// ============ API KEYS REVEAL MODAL ============
function APIKeysModal({ keys, onClose }) {
  const [copied, setCopied] = useState("");
  const copy = (val, label) => { navigator.clipboard.writeText(val); setCopied(label); setTimeout(() => setCopied(""), 2000); };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <Card style={{ padding: 32, maxWidth: 520, width: "100%" }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 600 }}>Your API Credentials</h3>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: C.red, fontWeight: 500 }}>
          Save these now! The secret will NOT be shown again.
        </p>
        {[{ label: "API Key", value: keys.api_key }, { label: "API Secret", value: keys.api_secret }].map(k => (
          <div key={k.label} style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: C.text3, fontWeight: 600, display: "block", marginBottom: 4 }}>{k.label}</label>
            <div style={{ display: "flex", gap: 8 }}>
              <code style={{ flex: 1, padding: "10px 12px", background: C.surfaceAlt, borderRadius: 6, fontSize: 12, fontFamily: "monospace", color: C.purple, border: `1px solid ${C.border}`, wordBreak: "break-all" }}>{k.value}</code>
              <Btn small onClick={() => copy(k.value, k.label)}>{copied === k.label ? "Copied!" : "Copy"}</Btn>
            </div>
          </div>
        ))}
        <Btn primary full onClick={onClose} style={{ marginTop: 8 }}>I've saved my credentials</Btn>
      </Card>
    </div>
  );
}

// ============ DASHBOARD PAGE ============
function DashboardPage({ partner }) {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    partnerFetch("/v1/partners/dashboard").then(r => r.ok ? r.json() : null).then(setStats);
  }, []);
  if (!stats) return <div style={{ padding: 60, textAlign: "center", color: C.text3 }}>Loading dashboard...</div>;
  return (
    <>
      <div style={{ display: "flex", gap: 14, marginBottom: 20 }}>
        <StatCard icon="💰" label="Total Fee Earned" value={stats.total_fee_earned !== "0" ? `$${(parseInt(stats.total_fee_earned) / 1e6).toFixed(2)}` : "$0"} />
        <StatCard icon="📈" label="Total Transactions" value={stats.total_transactions} />
        <StatCard icon="👤" label="Unique Users" value={stats.total_users} />
        <StatCard icon="🔥" label="Txns (7d)" value={stats.transactions_7d} sub={`${stats.users_7d} users`} />
      </div>
      <Card style={{ padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Getting Started</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13, color: C.text2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: C.purpleDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>1</div>
            <span>Go to <strong>SDK & API</strong> to get your API credentials</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: C.purpleDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>2</div>
            <span>Go to <strong>Settings</strong> to set your fee collector address and toggle fees</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: C.purpleDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>3</div>
            <span>Integrate the API into your wallet — send <code style={{ color: C.purple }}>X-API-Key</code> and <code style={{ color: C.purple }}>X-API-Secret</code> headers with every request</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: C.purpleDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>4</div>
            <span>Your users deposit through Yieldo, and you earn 5 bps on every transaction</span>
          </div>
        </div>
      </Card>
    </>
  );
}

// ============ SETTINGS PAGE ============
function SettingsPage({ partner, onUpdate }) {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    partnerFetch("/v1/partners/me").then(r => r.ok ? r.json() : null).then(data => {
      if (data) setSettings({
        name: data.name, website: data.website, contact_email: data.contact_email,
        fee_enabled: data.fee_enabled, fee_collector_address: data.fee_collector_address,
        webhook_url: data.webhook_url,
      });
    });
  }, []);

  const save = async () => {
    setSaving(true); setMsg("");
    try {
      const res = await partnerFetch("/v1/partners/settings", { method: "PUT", body: JSON.stringify(settings) });
      if (res.ok) { setMsg("Saved!"); onUpdate(); } else { const e = await res.json(); setMsg(e.detail || "Failed"); }
    } catch { setMsg("Failed to save"); }
    setSaving(false);
  };

  if (!settings) return <div style={{ padding: 60, textAlign: "center", color: C.text3 }}>Loading settings...</div>;
  const inputStyle = { width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border2}`, fontSize: 14, fontFamily: "'Inter',sans-serif", outline: "none", background: C.white, color: C.text, boxSizing: "border-box" };

  return (
    <div style={{ maxWidth: 640, display: "flex", flexDirection: "column", gap: 16 }}>
      <Card style={{ padding: 24 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600 }}>Partner Details</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: C.text3, fontWeight: 600, display: "block", marginBottom: 4 }}>Name</label>
            <input style={inputStyle} value={settings.name} onChange={e => setSettings({ ...settings, name: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: C.text3, fontWeight: 600, display: "block", marginBottom: 4 }}>Website</label>
            <input style={inputStyle} value={settings.website} onChange={e => setSettings({ ...settings, website: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: C.text3, fontWeight: 600, display: "block", marginBottom: 4 }}>Contact Email</label>
            <input style={inputStyle} value={settings.contact_email} onChange={e => setSettings({ ...settings, contact_email: e.target.value })} />
          </div>
        </div>
      </Card>

      <Card style={{ padding: 24 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600 }}>Webhook</h3>
        <div>
          <label style={{ fontSize: 12, color: C.text3, fontWeight: 600, display: "block", marginBottom: 4 }}>Webhook URL</label>
          <input style={inputStyle} placeholder="https://yourapp.com/webhooks/yieldo" value={settings.webhook_url} onChange={e => setSettings({ ...settings, webhook_url: e.target.value })} />
          <div style={{ fontSize: 11, color: C.text4, marginTop: 4 }}>We'll POST deposit events to this URL (coming soon)</div>
        </div>
      </Card>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <Btn primary onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Settings"}</Btn>
        {msg && <span style={{ fontSize: 13, color: msg === "Saved!" ? C.green : C.red, fontWeight: 500 }}>{msg}</span>}
      </div>
    </div>
  );
}

// ============ SDK & API PAGE ============
function SDKPage({ partner }) {
  const [showKeys, setShowKeys] = useState(null);
  const [rotating, setRotating] = useState(false);
  const [copied, setCopied] = useState("");

  const rotateKeys = async () => {
    if (!confirm("This will invalidate your current API keys. Continue?")) return;
    setRotating(true);
    try {
      const res = await partnerFetch("/v1/partners/api-keys/rotate", { method: "POST" });
      if (res.ok) { const data = await res.json(); setShowKeys(data); }
    } catch { /* silent */ }
    setRotating(false);
  };

  const copy = (val, label) => { navigator.clipboard.writeText(val); setCopied(label); setTimeout(() => setCopied(""), 2000); };

  return (
    <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 16 }}>
      {showKeys && <APIKeysModal keys={showKeys} onClose={() => setShowKeys(null)} />}

      <Card style={{ padding: 24 }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 600 }}>API Credentials</h3>
        <p style={{ fontSize: 13, color: C.text3, margin: "0 0 16px" }}>Use these keys to authenticate API calls. Include them as headers in every request.</p>
        {[
          { label: "API Key Prefix", value: partner.api_key_prefix || partner.api_key_prefix, secret: false },
        ].map((k, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 13, color: C.text3 }}>{k.label}</span>
            <code style={{ fontSize: 13, color: C.purple, background: C.purpleDim, padding: "3px 8px", borderRadius: 4 }}>{k.value}</code>
          </div>
        ))}
        <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
          <Btn small onClick={rotateKeys} disabled={rotating} danger>{rotating ? "Rotating..." : "Rotate API Keys"}</Btn>
        </div>
      </Card>

      <Card style={{ padding: 24 }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 600 }}>Quick Start</h3>
        <div style={{ background: "#faf9fe", borderRadius: 8, padding: "16px 18px", fontFamily: "monospace", fontSize: 12, color: C.text2, lineHeight: 1.8, border: `1px solid ${C.purple}08`, whiteSpace: "pre-wrap" }}>
{`# Get a quote (include your API key headers)
curl -X POST ${PARTNER_API}/v1/quote \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "X-API-Secret: YOUR_API_SECRET" \\
  -d '{
    "from_chain_id": 8453,
    "from_token": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    "from_amount": "1000000",
    "vault_id": "8453:0xbeefe94c8ad530842bfe7d8b397938ffc1cb83b2",
    "user_address": "0xUserWallet"
  }'`}
        </div>
        <Btn small style={{ marginTop: 10 }} onClick={() => copy(
          `curl -X POST ${PARTNER_API}/v1/quote -H "Content-Type: application/json" -H "X-API-Key: YOUR_API_KEY" -H "X-API-Secret: YOUR_API_SECRET"`,
          "curl"
        )}>{copied === "curl" ? "Copied!" : "Copy cURL"}</Btn>
      </Card>

      <Card style={{ padding: 24 }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 600 }}>Authentication</h3>
        <p style={{ fontSize: 13, color: C.text3, margin: "0 0 12px" }}>Add these headers to every API request:</p>
        <div style={{ background: C.surfaceAlt, borderRadius: 8, padding: "12px 16px", fontFamily: "monospace", fontSize: 12, color: C.text2, lineHeight: 2, border: `1px solid ${C.border}` }}>
          <div><span style={{ color: C.purple }}>X-API-Key:</span> yd_live_...</div>
          <div><span style={{ color: C.purple }}>X-API-Secret:</span> yd_secret_...</div>
        </div>
        <p style={{ fontSize: 12, color: C.text3, margin: "12px 0 0" }}>
          When authenticated, the API automatically sets your fee collector as the referrer and applies your fee settings.
        </p>
      </Card>

      <Card style={{ padding: 24 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600 }}>API Endpoints</h3>
        {[
          { method: "GET", path: "/v1/vaults", desc: "List available vaults" },
          { method: "GET", path: "/v1/vaults/:id", desc: "Get vault details + share price" },
          { method: "POST", path: "/v1/quote", desc: "Get deposit quote with route options" },
          { method: "POST", path: "/v1/quote/build", desc: "Build deposit transaction" },
          { method: "GET", path: "/v1/status", desc: "Track cross-chain transfer status" },
          { method: "GET", path: "/v1/chains", desc: "List supported chains" },
          { method: "GET", path: "/v1/tokens", desc: "List tokens for a chain" },
        ].map((ep, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 6px", borderRadius: 3, background: ep.method === "GET" ? C.tealDim : C.greenDim, color: ep.method === "GET" ? C.teal : C.green, fontFamily: "monospace" }}>{ep.method}</span>
            <code style={{ fontSize: 12, color: C.purple }}>{ep.path}</code>
            <span style={{ fontSize: 12, color: C.text3, marginLeft: "auto" }}>{ep.desc}</span>
          </div>
        ))}
        <a href="https://docs.yieldo.xyz" target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 12 }}>
          <Btn small>View Full API Docs</Btn>
        </a>
      </Card>
    </div>
  );
}

// ============ EMBED CONFIG PAGE ============
function EmbedPage({ partner }) {
  const [theme, setTheme] = useState("light");
  const [shape, setShape] = useState("rounded");

  const isDark = theme === "dark";
  const bg = isDark ? "#1a1a2e" : "#ffffff";
  const text = isDark ? "#fff" : "#121212";
  const text2 = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)";
  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const rad = shape === "rounded" ? 14 : shape === "pill" ? 24 : 6;

  const embedCode = `<script src="https://cdn.yieldo.xyz/widget.js"></script>
<div id="yieldo-widget"
  data-partner="${partner.address?.slice(0, 8)}"
  data-theme="${theme}"
  data-shape="${shape}">
</div>`;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <Card style={{ padding: 24 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600 }}>Widget Appearance</h3>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: C.text3, fontWeight: 600, display: "block", marginBottom: 6 }}>Theme</label>
            <div style={{ display: "flex", gap: 8 }}>
              {["light", "dark", "auto"].map(t => (
                <button key={t} onClick={() => setTheme(t)} style={{ padding: "8px 18px", borderRadius: 6, background: theme === t ? C.purpleDim : C.surfaceAlt, border: `1px solid ${theme === t ? C.purple + "30" : C.border}`, color: theme === t ? C.purple : C.text3, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'Inter',sans-serif", textTransform: "capitalize" }}>{t}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, color: C.text3, fontWeight: 600, display: "block", marginBottom: 6 }}>Border Radius</label>
            <div style={{ display: "flex", gap: 8 }}>
              {["square", "rounded", "pill"].map(s => (
                <button key={s} onClick={() => setShape(s)} style={{ padding: "8px 18px", borderRadius: 6, background: shape === s ? C.purpleDim : C.surfaceAlt, border: `1px solid ${shape === s ? C.purple + "30" : C.border}`, color: shape === s ? C.purple : C.text3, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'Inter',sans-serif", textTransform: "capitalize" }}>{s}</button>
              ))}
            </div>
          </div>
        </Card>
        <Card style={{ padding: 24 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600 }}>Embed Code</h3>
          <div style={{ background: "#faf9fe", borderRadius: 8, padding: "14px 16px", fontFamily: "monospace", fontSize: 12, color: C.purple, lineHeight: 1.7, border: `1px solid ${C.purple}12`, whiteSpace: "pre-wrap" }}>{embedCode}</div>
          <Btn small style={{ marginTop: 10 }} onClick={() => navigator.clipboard.writeText(embedCode)}>Copy Code</Btn>
        </Card>
      </div>
      <div style={{ position: "sticky", top: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.text3, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 12 }}>Live Preview</div>
        <div style={{ padding: 32, background: isDark ? "#0d0d18" : C.surfaceAlt, borderRadius: 16, border: `1px solid ${C.border}`, display: "flex", justifyContent: "center" }}>
          <div style={{ background: bg, borderRadius: rad, border: `1px solid ${border}`, padding: 20, maxWidth: 360, width: "100%", fontFamily: "'Inter',sans-serif", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: text }}>Yield Opportunities</span>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, backgroundImage: C.purpleGrad }} />
                <span style={{ fontSize: 9, color: text2 }}>Yieldo</span>
              </div>
            </div>
            {[{ name: "USDC Optimizer", apy: "12.4%", risk: "Low" }, { name: "ETH Staking", apy: "8.7%", risk: "Low" }].map((v, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${border}` }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: text }}>{v.name}</div>
                  <div style={{ fontSize: 11, color: text2 }}>{v.risk} risk</div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.purple }}>{v.apy}</div>
              </div>
            ))}
            <button style={{ width: "100%", padding: 10, borderRadius: rad > 14 ? 20 : 8, backgroundImage: C.purpleGrad, border: "none", color: "#fff", fontSize: 13, fontWeight: 600, marginTop: 14, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>Deposit</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ COMING SOON ============
function ComingSoon({ icon, title }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 16 }}>
      <div style={{ width: 80, height: 80, borderRadius: 20, background: C.purpleDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>{icon}</div>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>{title}</h2>
      <p style={{ margin: 0, fontSize: 14, color: C.text3, maxWidth: 400, textAlign: "center", lineHeight: 1.6 }}>
        This feature is coming soon. We're working hard to bring you the best experience.
      </p>
      <Badge color={C.teal} bg={C.tealDim}>Coming Soon</Badge>
    </div>
  );
}

// ============ MAIN APP ============
export default function WalletsPage() {
  const [page, setPage] = useState("catalog");
  // savedEnrolled = the set persisted server-side. enrolledVaults = current local pending state.
  const [savedEnrolled, setSavedEnrolled] = useState(new Set());
  const [enrolledVaults, setEnrolledVaults] = useState(new Set());
  const [savingEnroll, setSavingEnroll] = useState(false);
  const [enrollSavedAt, setEnrollSavedAt] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem("yieldo_partner_sidebar_collapsed") === "1"; } catch { return false; }
  });
  const [partner, setPartner] = useState(null);
  const [authState, setAuthState] = useState("checking"); // checking | not_connected | verify | register | authenticated
  const [registerData, setRegisterData] = useState(null);
  const [newKeys, setNewKeys] = useState(null);

  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();
  const navigate = useNavigate();
  const { vaults, loading: vaultsLoading } = useVaults();

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem("yieldo_partner_sidebar_collapsed", next ? "1" : "0"); } catch { /* ignore */ }
      return next;
    });
  };

  // Helper: set both enrollment states from server data
  const applyServerEnrollment = (list) => {
    const set = new Set(list || []);
    setSavedEnrolled(set);
    setEnrolledVaults(new Set(set));
  };

  // Check session on mount / address change
  useEffect(() => {
    if (!isConnected || !address) {
      setAuthState("not_connected");
      setPartner(null);
      sessionStorage.removeItem("yieldo_partner_token");
      return;
    }
    // Check if we have a valid session
    const token = sessionStorage.getItem("yieldo_partner_token");
    if (token) {
      partnerFetch("/v1/partners/me")
        .then(r => { if (r.ok) return r.json(); throw new Error(); })
        .then(data => { setPartner(data); setAuthState("authenticated"); applyServerEnrollment(data.enrolled_vaults); })
        .catch(() => { sessionStorage.removeItem("yieldo_partner_token"); setAuthState("verify"); });
    } else {
      setAuthState("verify");
    }
  }, [address, isConnected]);

  const handleVerified = useCallback((result) => {
    if (result.type === "login") {
      setPartner(result.partner);
      // Fetch full profile
      partnerFetch("/v1/partners/me").then(r => r.ok ? r.json() : null).then(data => {
        if (data) { setPartner(data); applyServerEnrollment(data.enrolled_vaults); }
      });
      setAuthState("authenticated");
    } else if (result.type === "register") {
      setRegisterData(result);
      setAuthState("register");
    }
  }, []);

  const handleRegistered = useCallback((data) => {
    setNewKeys({ api_key: data.api_key, api_secret: data.api_secret });
    partnerFetch("/v1/partners/me").then(r => r.ok ? r.json() : null).then(p => {
      if (p) { setPartner(p); applyServerEnrollment(p.enrolled_vaults); }
    });
    setAuthState("authenticated");
  }, []);

  // Local-only toggle — no API call. User clicks Save to persist all changes.
  const toggleVault = (vaultId) => {
    setEnrolledVaults(prev => {
      const next = new Set(prev);
      next.has(vaultId) ? next.delete(vaultId) : next.add(vaultId);
      return next;
    });
  };

  // Diff between current local state and last-saved state
  const enrollDiff = useMemo(() => {
    const toAdd = [];
    const toRemove = [];
    for (const id of enrolledVaults) if (!savedEnrolled.has(id)) toAdd.push(id);
    for (const id of savedEnrolled) if (!enrolledVaults.has(id)) toRemove.push(id);
    return { toAdd, toRemove, dirty: toAdd.length > 0 || toRemove.length > 0 };
  }, [enrolledVaults, savedEnrolled]);

  const saveEnrollment = async () => {
    setSavingEnroll(true);
    try {
      const res = await partnerFetch("/v1/partners/vaults", {
        method: "PUT",
        body: JSON.stringify({ enrolled_vaults: [...enrolledVaults] }),
      });
      if (res.ok) {
        setSavedEnrolled(new Set(enrolledVaults));
        setEnrollSavedAt(Date.now());
        setTimeout(() => setEnrollSavedAt(null), 2500);
      } else {
        alert("Failed to save enrollment changes. Please try again.");
      }
    } catch {
      alert("Failed to save enrollment changes. Please try again.");
    } finally {
      setSavingEnroll(false);
    }
  };

  const discardEnrollment = () => {
    setEnrolledVaults(new Set(savedEnrolled));
  };

  const refreshPartner = () => {
    partnerFetch("/v1/partners/me").then(r => r.ok ? r.json() : null).then(data => { if (data) setPartner(data); });
  };

  const navItems = [
    { id: "catalog", icon: "🏦", label: "Vault Catalog" },
    { id: "dashboard", icon: "📊", label: "Overview" },
    { id: "campaigns", icon: "🎯", label: "Campaigns", soon: true },
    { id: "revenue", icon: "💰", label: "Revenue", soon: true },
    { id: "embed", icon: "🧩", label: "Embed Config" },
    { id: "sdk", icon: "🔧", label: "SDK & API" },
    { id: "settings", icon: "⚙️", label: "Settings" },
  ];

  const sidebarWidth = sidebarCollapsed ? 64 : 230;

  return (
    <div style={{ fontFamily: "'Inter',sans-serif", background: C.bg, color: C.text, minHeight: "100vh", display: "flex" }}>
      {/* SIDEBAR */}
      <aside style={{ width: sidebarWidth, background: C.white, borderRight: `1px solid ${C.border}`, padding: "20px 0", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", boxShadow: "1px 0 8px rgba(0,0,0,0.02)", transition: "width .2s ease" }}>
        <div style={{ padding: sidebarCollapsed ? "0 12px 18px" : "0 20px 18px", display: "flex", alignItems: "center", gap: 8, borderBottom: `1px solid ${C.border}`, marginBottom: 8, justifyContent: sidebarCollapsed ? "center" : "flex-start" }}>
          <img src="/yieldo-new.png" alt="Yieldo" style={{ width: 32, height: 32, borderRadius: 8, objectFit: "contain", flexShrink: 0 }} />
          {!sidebarCollapsed && <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: ".05em" }}>YIELDO</span>}
          {!sidebarCollapsed && <Badge color={C.teal}>Wallet</Badge>}
        </div>
        {/* Collapse toggle */}
        <button
          onClick={toggleSidebar}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{
            position: "absolute", top: 22, right: -12, width: 24, height: 24, borderRadius: 12,
            background: C.white, border: `1px solid ${C.border2}`, color: C.text3,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontFamily: "'Inter',sans-serif", boxShadow: "0 1px 4px rgba(0,0,0,.06)",
            zIndex: 5,
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
                {partner && <div style={{ fontSize: 11, color: C.purple, fontWeight: 500, marginBottom: 8 }}>{partner.name}</div>}
                <button onClick={() => { disconnect(); sessionStorage.removeItem("yieldo_partner_token"); }} style={{ fontSize: 11, color: C.red, background: "none", border: "none", cursor: "pointer", fontFamily: "'Inter',sans-serif", padding: 0 }}>Disconnect</button>
              </div>
            )
          ) : (
            sidebarCollapsed ? (
              <button onClick={openConnectModal} title="Connect Wallet" style={{ width: "100%", padding: "10px 0", borderRadius: 8, backgroundImage: C.purpleGrad, border: "none", color: "#fff", fontSize: 16, cursor: "pointer", fontFamily: "'Inter',sans-serif", boxShadow: C.purpleShadow }}>↗</button>
            ) : (
              <button onClick={openConnectModal} style={{ width: "100%", padding: "10px", borderRadius: 8, backgroundImage: C.purpleGrad, border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif", boxShadow: C.purpleShadow }}>
                Connect Wallet
              </button>
            )
          )}
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, padding: "24px 32px", overflow: "auto", minWidth: 0 }}>
        {newKeys && <APIKeysModal keys={newKeys} onClose={() => setNewKeys(null)} />}

        {/* Not connected */}
        {authState === "not_connected" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 80px)", gap: 20 }}>
            <div style={{ width: 80, height: 80, borderRadius: 20, backgroundImage: C.purpleGrad, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>
              <span style={{ color: "#fff", fontWeight: 700 }}>Y</span>
            </div>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>Welcome to Yieldo Wallet Partners</h2>
            <p style={{ margin: 0, fontSize: 14, color: C.text3, maxWidth: 460, textAlign: "center", lineHeight: 1.6 }}>
              Integrate Yieldo's curated DeFi vaults into your wallet and earn 5 bps on every deposit your users make. Connect your wallet to get started.
            </p>
            <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
              <StatCard icon="🏦" label="Available Vaults" value={vaults.length || "—"} />
              <StatCard icon="📈" label="Avg APY" value={vaults.length ? `${(vaults.reduce((s, v) => s + (v.apy || 0), 0) / vaults.length).toFixed(2)}%` : "—"} />
              <StatCard icon="🔗" label="Chains" value={new Set(vaults.map(v => v.chain_id)).size || "—"} />
            </div>
            <Btn primary onClick={openConnectModal} style={{ marginTop: 12, padding: "14px 32px", fontSize: 16 }}>
              Connect Wallet to Get Started
            </Btn>
          </div>
        )}

        {/* Checking session */}
        {authState === "checking" && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400, fontSize: 14, color: C.text3 }}>Loading...</div>
        )}

        {/* Signature verification */}
        {authState === "verify" && address && (
          <SignatureVerify address={address} onVerified={handleVerified} />
        )}

        {/* Registration */}
        {authState === "register" && address && (
          <RegistrationForm address={address} signature={registerData?.signature} onRegistered={handleRegistered} />
        )}

        {/* Authenticated dashboard */}
        {authState === "authenticated" && partner && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: page === "catalog" ? 16 : 24 }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: "-.01em" }}>
                {navItems.find(n => n.id === page)?.icon} {navItems.find(n => n.id === page)?.label}
              </h1>
            </div>

            {page === "catalog" && (
              <>
                <div style={{ display: "flex", gap: 14, marginBottom: 16, flexWrap: "wrap" }}>
                  <StatCard icon="🏦" label="Total Vaults" value={vaults.length} />
                  <StatCard icon="✅" label="Enrolled" value={enrolledVaults.size} />
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

            {page === "dashboard" && <DashboardPage partner={partner} />}
            {page === "settings" && <SettingsPage partner={partner} onUpdate={refreshPartner} />}
            {page === "sdk" && <SDKPage partner={partner} />}
            {page === "embed" && <EmbedPage partner={partner} />}
            {(page === "campaigns" || page === "revenue") && (
              <ComingSoon icon={navItems.find(n => n.id === page)?.icon} title={navItems.find(n => n.id === page)?.label} />
            )}
          </>
        )}
      </main>

      {/* Floating enrollment save bar — fixed to viewport bottom, only on /catalog tab */}
      {authState === "authenticated" && page === "catalog" && enrollDiff.dirty && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: `calc(50% + ${sidebarWidth / 2}px)`,
            transform: "translateX(-50%)",
            zIndex: 100,
            pointerEvents: "auto",
            background: C.white,
            borderRadius: 14,
            border: `1.5px solid ${C.purple}40`,
            boxShadow: "0 12px 40px rgba(122,28,203,.22)",
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontFamily: "'Inter',sans-serif",
            animation: "yieldoSlideUp .25s ease-out",
            maxWidth: "calc(100vw - 40px)",
          }}
        >
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
          <Btn primary small onClick={saveEnrollment} disabled={savingEnroll}>{savingEnroll ? "Saving..." : "Save Changes"}</Btn>
        </div>
      )}

      {/* Floating saved confirmation toast */}
      {authState === "authenticated" && page === "catalog" && enrollSavedAt && !enrollDiff.dirty && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: `calc(50% + ${sidebarWidth / 2}px)`,
            transform: "translateX(-50%)",
            zIndex: 100,
            background: C.greenDim,
            color: C.green,
            padding: "12px 22px",
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 600,
            border: `1px solid rgba(26,157,63,.3)`,
            boxShadow: "0 8px 24px rgba(26,157,63,.18)",
            animation: "yieldoSlideUp .25s ease-out",
          }}
        >
          ✓ Enrollment saved
        </div>
      )}

      {/* Inline keyframes for the floating bar animations */}
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
