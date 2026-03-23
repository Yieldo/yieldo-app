import { useState, useEffect } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useVaults } from "../hooks/useVaultData.js";

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
const fmtTvl = n => { if (!n) return "$0"; if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`; if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`; if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`; return `$${n.toFixed(0)}`; };
const fmtApy = n => { if (!n && n !== 0) return "—"; return (n * 100).toFixed(2) + "%"; };

/* ============ BASE COMPONENTS ============ */
function Btn({ children, primary, small, ghost, danger, full, onClick, disabled, style: sx = {} }) {
  const base = { fontFamily: "'Inter',sans-serif", fontSize: small ? 13 : 14, fontWeight: 500, border: "none", borderRadius: 6, cursor: disabled ? "not-allowed" : "pointer", padding: small ? "6px 12px" : "10px 18px", display: "inline-flex", alignItems: "center", gap: 6, width: full ? "100%" : undefined, justifyContent: full ? "center" : undefined, transition: "all .15s", opacity: disabled ? 0.5 : 1, ...sx };
  if (primary) return <button onClick={onClick} disabled={disabled} style={{ ...base, backgroundImage: C.purpleGrad, color: "#fff", boxShadow: C.purpleShadow }}>{children}</button>;
  if (danger) return <button onClick={onClick} disabled={disabled} style={{ ...base, background: C.redDim, color: C.red }}>{children}</button>;
  if (ghost) return <button onClick={onClick} disabled={disabled} style={{ ...base, background: "transparent", color: C.text3 }}>{children}</button>;
  return <button onClick={onClick} disabled={disabled} style={{ ...base, background: C.white, color: C.text2, border: `1px solid ${C.border2}`, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>{children}</button>;
}

function Badge({ children, color = C.purple, bg }) {
  return <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 4, background: bg || `${color}12`, color, whiteSpace: "nowrap" }}>{children}</span>;
}

function Card({ children, style: sx = {} }) {
  return <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.03)", ...sx }}>{children}</div>;
}

function StatCard({ icon, label, value, sub, trend, accent }) {
  return (
    <Card style={{ padding: "20px 22px", flex: "1 1 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: accent === "teal" ? C.tealDim : accent === "green" ? C.greenDim : C.purpleDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>{icon}</div>
          <span style={{ fontSize: 12, color: C.text3, fontWeight: 500 }}>{label}</span>
        </div>
        {sub && <span style={{ fontSize: 11, color: C.text4, padding: "2px 6px", border: `1px solid ${C.border}`, borderRadius: 4 }}>{sub}</span>}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-.02em" }}>{value}</span>
        {trend !== undefined && <span style={{ fontSize: 12, fontWeight: 600, color: trend >= 0 ? C.green : C.red }}>{trend >= 0 ? "↑" : "↓"}{Math.abs(trend)}%</span>}
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

function ComingSoon({ icon, title }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 16 }}>
      <div style={{ width: 80, height: 80, borderRadius: 20, background: C.purpleDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>{icon}</div>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>{title}</h2>
      <p style={{ margin: 0, fontSize: 14, color: C.text3, maxWidth: 400, textAlign: "center", lineHeight: 1.6 }}>
        This feature is coming soon. We're building the best tools for vault curators and protocol teams.
      </p>
      <Badge color={C.teal} bg={C.tealDim}>Coming Soon</Badge>
    </div>
  );
}

/* ============ VAULT LISTING CARD ============ */
function VaultListingCard({ vault }) {
  const tvl = vault.C01_USD || (vault.tvl_spark?.length ? vault.tvl_spark[vault.tvl_spark.length - 1] : 0);
  const apy = vault.P01_APIN_7D || vault.P01_APIN_30D || 0;
  const chain = CHAINS[vault.chain_id] || `Chain ${vault.chain_id}`;
  const score = vault.yieldoScore || 0;

  return (
    <Card style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: C.purpleDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
            {vault.asset?.slice(0, 2).toUpperCase() || "??"}
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{vault.vault_name}</div>
            <div style={{ fontSize: 12, color: C.text3 }}>{chain} · {vault.source || "Unknown"}</div>
          </div>
        </div>
        <Badge color={C.green}>live</Badge>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
        {[
          { l: "TVL", v: fmtTvl(tvl) },
          { l: "APY", v: fmtApy(apy) },
          { l: "Score", v: score, c: score >= 70 ? C.green : score >= 50 ? C.gold : C.red },
          { l: "Asset", v: vault.asset?.toUpperCase() || "—" },
        ].map((m, i) => (
          <div key={i}>
            <div style={{ fontSize: 10, color: C.text4, marginBottom: 2 }}>{m.l}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: m.c || C.text }}>{m.v}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ============ REGISTRATION FORM ============ */
function RegistrationForm({ address, onRegistered }) {
  const [form, setForm] = useState({ name: "", website: "", contact_email: "", vault_address: "", description: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Protocol / curator name is required"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/vault-providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet_address: address, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      onRegistered(data);
    } catch (err) {
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
          <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 600 }}>Register as Vault Provider</h2>
          <p style={{ margin: 0, fontSize: 13, color: C.text3 }}>
            List your vaults on Yieldo, create campaigns, and attract AUM from wallet partners.
          </p>
        </div>

        <div style={{ padding: "10px 14px", background: C.purpleDim, borderRadius: 8, marginBottom: 20, fontSize: 12, color: C.text2 }}>
          Connected: <span style={{ fontFamily: "monospace", fontWeight: 600, color: C.purple }}>{address.slice(0, 6)}...{address.slice(-4)}</span>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: C.text3, fontWeight: 600, display: "block", marginBottom: 4 }}>Protocol / Curator Name *</label>
            <input style={inputStyle} placeholder="e.g. Gauntlet, Steakhouse, MEV Capital" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: C.text3, fontWeight: 600, display: "block", marginBottom: 4 }}>Primary Vault Address</label>
            <input style={{ ...inputStyle, fontFamily: "monospace" }} placeholder="0x..." value={form.vault_address} onChange={e => setForm({ ...form, vault_address: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: C.text3, fontWeight: 600, display: "block", marginBottom: 4 }}>Website</label>
            <input style={inputStyle} placeholder="https://yourprotocol.com" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: C.text3, fontWeight: 600, display: "block", marginBottom: 4 }}>Contact Email</label>
            <input style={inputStyle} type="email" placeholder="team@yourprotocol.com" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: C.text3, fontWeight: 600, display: "block", marginBottom: 4 }}>Description</label>
            <textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} placeholder="Describe your vault strategy, team, and what you're looking for from Yieldo partners..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          {error && <div style={{ fontSize: 12, color: C.red }}>{error}</div>}
          <Btn primary full disabled={loading} onClick={handleSubmit}>{loading ? "Registering..." : "Complete Registration"}</Btn>
        </form>
      </Card>
    </div>
  );
}

/* ============ MAIN PAGE ============ */
export default function VaultProviderPage() {
  const [page, setPage] = useState("dashboard");
  const [provider, setProvider] = useState(null);
  const [checkingProvider, setCheckingProvider] = useState(false);

  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();

  const { data: vaultsRaw, loading: vaultsLoading } = useVaults();
  const vaults = vaultsRaw || [];

  useEffect(() => {
    if (!isConnected || !address) { setProvider(null); return; }
    setCheckingProvider(true);
    fetch(`/api/vault-providers/${address}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setProvider(data); })
      .catch(() => setProvider(null))
      .finally(() => setCheckingProvider(false));
  }, [address, isConnected]);

  const navItems = [
    { id: "dashboard", icon: "📊", label: "Overview" },
    { id: "campaigns", icon: "🎯", label: "Campaigns" },
    { id: "partners", icon: "🤝", label: "Partners" },
    { id: "vaults", icon: "🏦", label: "My Vaults" },
    { id: "revenue", icon: "💰", label: "Revenue" },
    { id: "settings", icon: "⚙️", label: "Settings" },
  ];

  const comingSoonPages = ["campaigns", "partners", "revenue", "settings"];

  // Stats from real vault data
  const totalTvl = vaults.reduce((s, v) => s + (v.C01_USD || 0), 0);
  const avgApy = vaults.length ? vaults.reduce((s, v) => s + (v.P01_APIN_7D || 0), 0) / vaults.length : 0;

  return (
    <div style={{ fontFamily: "'Inter',sans-serif", background: C.bg, color: C.text, minHeight: "100vh", display: "flex" }}>
      {/* SIDEBAR */}
      <aside style={{ width: 230, background: C.white, borderRight: `1px solid ${C.border}`, padding: "20px 0", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", boxShadow: "1px 0 8px rgba(0,0,0,0.02)" }}>
        <div style={{ padding: "0 20px 20px", display: "flex", alignItems: "center", gap: 8, borderBottom: `1px solid ${C.border}`, marginBottom: 8, paddingBottom: 18 }}>
          <img src="/yieldo-new.png" alt="Yieldo" style={{ width: 32, height: 32, borderRadius: 8, objectFit: "contain" }} />
          <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: ".05em" }}>YIELDO</span>
          <Badge color={C.purple}>Vault</Badge>
        </div>
        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 1, padding: "0 8px" }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setPage(item.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", background: page === item.id ? C.purpleDim : "transparent", border: "none", borderRadius: 8, color: page === item.id ? C.purple : C.text3, fontSize: 14, fontWeight: page === item.id ? 600 : 400, cursor: "pointer", fontFamily: "'Inter',sans-serif", textAlign: "left", transition: "all .15s" }}>
              <span style={{ fontSize: 15 }}>{item.icon}</span>
              {item.label}
              {comingSoonPages.includes(item.id) && <span style={{ fontSize: 9, color: C.text4, marginLeft: "auto" }}>soon</span>}
            </button>
          ))}
        </nav>

        <div style={{ padding: "14px 16px", borderTop: `1px solid ${C.border}`, margin: "0 8px" }}>
          {isConnected && address ? (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: 4, background: C.green }} />
                <span style={{ fontSize: 12, fontWeight: 600 }}>Connected</span>
              </div>
              <div style={{ fontSize: 11, color: C.text3, fontFamily: "monospace", marginBottom: 8 }}>{address.slice(0, 6)}...{address.slice(-4)}</div>
              {provider && <div style={{ fontSize: 11, color: C.purple, fontWeight: 500, marginBottom: 8 }}>{provider.name}</div>}
              <button onClick={() => disconnect()} style={{ fontSize: 11, color: C.red, background: "none", border: "none", cursor: "pointer", fontFamily: "'Inter',sans-serif", padding: 0 }}>Disconnect</button>
            </div>
          ) : (
            <button onClick={openConnectModal} style={{ width: "100%", padding: "10px", borderRadius: 8, backgroundImage: C.purpleGrad, border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif", boxShadow: C.purpleShadow }}>
              Connect Wallet
            </button>
          )}
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, padding: "24px 32px", overflow: "auto", maxWidth: 1200 }}>
        {!isConnected ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 80px)", gap: 20 }}>
            <div style={{ width: 80, height: 80, borderRadius: 20, backgroundImage: C.purpleGrad, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>
              <span style={{ color: "#fff", fontWeight: 700 }}>Y</span>
            </div>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>Welcome to Yieldo for Vaults</h2>
            <p style={{ margin: 0, fontSize: 14, color: C.text3, maxWidth: 460, textAlign: "center", lineHeight: 1.6 }}>
              List your vaults on the Yieldo network, create campaigns, and attract AUM from wallet partners and KOLs. Connect your wallet to get started.
            </p>
            <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
              <StatCard icon="🏦" label="Vaults on Yieldo" value={vaults.length || "—"} />
              <StatCard icon="💰" label="Total TVL" value={fmtTvl(totalTvl)} />
              <StatCard icon="📈" label="Avg APY" value={fmtApy(avgApy)} />
            </div>
            <Btn primary onClick={openConnectModal} style={{ marginTop: 12, padding: "14px 32px", fontSize: 16 }}>
              Connect Wallet to Get Started
            </Btn>
          </div>
        ) : checkingProvider ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400, fontSize: 14, color: C.text3 }}>
            Checking registration...
          </div>
        ) : !provider ? (
          <RegistrationForm address={address} onRegistered={(data) => setProvider(data)} />
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: "-.01em" }}>
                {navItems.find(n => n.id === page)?.icon} {navItems.find(n => n.id === page)?.label}
              </h1>
            </div>

            {/* DASHBOARD */}
            {page === "dashboard" && (
              <>
                <div style={{ display: "flex", gap: 14, marginBottom: 20 }}>
                  <StatCard icon="🏦" label="Vaults Listed" value={vaults.length} accent="purple" />
                  <StatCard icon="💰" label="Total TVL" value={fmtTvl(totalTvl)} accent="teal" />
                  <StatCard icon="📈" label="Avg APY" value={fmtApy(avgApy)} accent="green" />
                  <StatCard icon="🔗" label="Chains" value={new Set(vaults.map(v => v.chain_id)).size} accent="purple" />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
                  <Card style={{ padding: 22, cursor: "pointer", borderColor: `${C.purple}15` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <span style={{ fontSize: 28 }}>🔗</span>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 600 }}>Type A: On-Chain Revenue Share</div>
                        <div style={{ fontSize: 12, color: C.text3 }}>Trustless fee splits from your vault's smart contract</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 16, fontSize: 12, color: C.text3, marginBottom: 14 }}>
                      <span>No budget needed</span><span>Automatic payouts</span><span>Scales with AUM</span>
                    </div>
                    <Badge color={C.teal} bg={C.tealDim}>Coming Soon</Badge>
                  </Card>
                  <Card style={{ padding: 22, cursor: "pointer", borderColor: `${C.tealBright}15` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <span style={{ fontSize: 28 }}>💳</span>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 600 }}>Type B: Marketing Campaign</div>
                        <div style={{ fontSize: 12, color: C.text3 }}>Budget-funded campaigns with custom KPIs</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 16, fontSize: 12, color: C.text3, marginBottom: 14 }}>
                      <span>Full budget control</span><span>Custom criteria</span><span>Pause anytime</span>
                    </div>
                    <Badge color={C.teal} bg={C.tealDim}>Coming Soon</Badge>
                  </Card>
                </div>

                <Card>
                  <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ fontSize: 15, fontWeight: 600 }}>All Vaults on Yieldo</span>
                  </div>
                  {vaultsLoading ? (
                    <div style={{ textAlign: "center", padding: 40, color: C.text3, fontSize: 14 }}>Loading vaults...</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                      {vaults.map(v => (
                        <div key={v.vault_id} style={{ padding: "12px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", transition: "background .1s" }} onMouseEnter={e => e.currentTarget.style.background = C.surfaceAlt} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: C.purpleDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: C.purple }}>
                              {v.asset?.slice(0, 2).toUpperCase() || "??"}
                            </div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600 }}>{v.vault_name}</div>
                              <div style={{ fontSize: 11, color: C.text3 }}>{v.source} · {CHAINS[v.chain_id] || v.chain_id}</div>
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: 12, fontWeight: 600 }}>{fmtTvl(v.C01_USD || 0)}</div>
                              <div style={{ fontSize: 10, color: C.text4 }}>TVL</div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: C.purple }}>{fmtApy(v.P01_APIN_7D || 0)}</div>
                              <div style={{ fontSize: 10, color: C.text4 }}>APY</div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: (v.yieldoScore || 0) >= 70 ? C.green : (v.yieldoScore || 0) >= 50 ? C.gold : C.red }}>{v.yieldoScore || "—"}</div>
                              <div style={{ fontSize: 10, color: C.text4 }}>Score</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </>
            )}

            {/* MY VAULTS */}
            {page === "vaults" && (
              <>
                <p style={{ margin: "0 0 20px", fontSize: 14, color: C.text3 }}>Browse all vaults currently indexed on Yieldo.</p>
                {vaultsLoading ? (
                  <div style={{ textAlign: "center", padding: 60, color: C.text3, fontSize: 14 }}>Loading vaults...</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {vaults.map(v => <VaultListingCard key={v.vault_id} vault={v} />)}
                  </div>
                )}
              </>
            )}

            {/* COMING SOON pages */}
            {comingSoonPages.includes(page) && (
              <ComingSoon icon={navItems.find(n => n.id === page)?.icon} title={navItems.find(n => n.id === page)?.label} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
