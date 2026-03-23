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

const fmtApy = n => {
  if (!n && n !== 0) return "—";
  return (n * 100).toFixed(2) + "%";
};

/* ============ BASE COMPONENTS ============ */
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

/* ============ COMING SOON ============ */
function ComingSoon({ icon, title }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 16 }}>
      <div style={{ width: 80, height: 80, borderRadius: 20, background: C.purpleDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>{icon}</div>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>{title}</h2>
      <p style={{ margin: 0, fontSize: 14, color: C.text3, maxWidth: 400, textAlign: "center", lineHeight: 1.6 }}>
        This feature is coming soon. We're working hard to bring you the best experience for wallet partners.
      </p>
      <Badge color={C.teal} bg={C.tealDim}>Coming Soon</Badge>
    </div>
  );
}

/* ============ VAULT CATALOG CARD ============ */
function VaultCatalogCard({ vault, enrolled, onToggle }) {
  const proto = PROTOCOL_COLORS[vault.source] || { color: C.purple, bg: C.purpleDim };
  const tvl = vault.C01_USD || (vault.tvl_spark?.length ? vault.tvl_spark[vault.tvl_spark.length - 1] : 0);
  const apy = vault.P01_APIN_7D || vault.P01_APIN_30D || 0;
  const chain = CHAINS[vault.chain_id] || `Chain ${vault.chain_id}`;

  return (
    <Card style={{ padding: 0, overflow: "hidden", border: enrolled ? `1.5px solid rgba(122,28,203,0.2)` : `1px solid ${C.border}`, transition: "all .2s" }}>
      <div style={{ padding: "16px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flex: 1, minWidth: 0 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: proto.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: proto.color, flexShrink: 0 }}>
              {vault.asset?.slice(0, 2).toUpperCase() || "??"}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{vault.vault_name}</div>
              <div style={{ fontSize: 11, color: C.text3 }}>{vault.source || "Unknown"}</div>
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.purple }}>{fmtApy(apy)}</div>
            <div style={{ fontSize: 10, color: C.text4 }}>APY</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <span style={{ padding: "3px 8px", borderRadius: 4, background: proto.bg, color: proto.color, fontSize: 11, fontWeight: 500 }}>{vault.source || "—"}</span>
          <span style={{ padding: "3px 8px", borderRadius: 4, background: C.surfaceAlt, color: C.text3, fontSize: 11 }}>{chain}</span>
          <span style={{ padding: "3px 8px", borderRadius: 4, background: C.surfaceAlt, color: C.text3, fontSize: 11 }}>TVL {fmtTvl(tvl)}</span>
          <span style={{ padding: "3px 8px", borderRadius: 4, background: C.surfaceAlt, color: C.text3, fontSize: 11 }}>{vault.asset?.toUpperCase()}</span>
        </div>
        <div style={{ fontSize: 12, color: C.text3, marginBottom: 14 }}>
          Base share: <strong style={{ color: C.purple }}>5 bps</strong>
        </div>
        <button
          onClick={onToggle}
          style={{
            width: "100%", padding: "9px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
            fontFamily: "'Inter',sans-serif",
            backgroundImage: enrolled ? "none" : C.purpleGrad,
            background: enrolled ? C.surfaceAlt : undefined,
            border: enrolled ? `1px solid ${C.border2}` : "none",
            color: enrolled ? C.text3 : "#fff",
            boxShadow: enrolled ? "none" : C.purpleShadow,
          }}
        >
          {enrolled ? "Enrolled" : "+ Add to My Vaults"}
        </button>
      </div>
    </Card>
  );
}

/* ============ REGISTRATION FORM ============ */
function RegistrationForm({ address, onRegistered }) {
  const [form, setForm] = useState({ name: "", website: "", contact_email: "", description: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Wallet name is required"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/wallet-providers", {
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
          <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 600 }}>Register as Wallet Partner</h2>
          <p style={{ margin: 0, fontSize: 13, color: C.text3 }}>
            Complete your profile to start earning commissions by integrating Yieldo vaults into your wallet.
          </p>
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
            <textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} placeholder="Tell us about your wallet and how you plan to integrate Yieldo vaults..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          {error && <div style={{ fontSize: 12, color: C.red }}>{error}</div>}
          <Btn primary full disabled={loading} onClick={handleSubmit}>{loading ? "Registering..." : "Complete Registration"}</Btn>
        </form>
      </Card>
    </div>
  );
}

/* ============ MAIN APP ============ */
export default function WalletsPage() {
  const [page, setPage] = useState("catalog");
  const [catalogFilter, setCatalogFilter] = useState("all");
  const [enrolledVaults, setEnrolledVaults] = useState(new Set());
  const [provider, setProvider] = useState(null);
  const [checkingProvider, setCheckingProvider] = useState(false);

  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();

  const { data: vaultsRaw, loading: vaultsLoading } = useVaults();
  const vaults = vaultsRaw || [];

  // Check if wallet is already registered
  useEffect(() => {
    if (!isConnected || !address) { setProvider(null); return; }
    setCheckingProvider(true);
    fetch(`/api/wallet-providers/${address}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        setProvider(data);
        if (data?.enrolled_vaults) setEnrolledVaults(new Set(data.enrolled_vaults));
      })
      .catch(() => setProvider(null))
      .finally(() => setCheckingProvider(false));
  }, [address, isConnected]);

  const toggleVault = async (vaultId) => {
    const next = new Set(enrolledVaults);
    next.has(vaultId) ? next.delete(vaultId) : next.add(vaultId);
    setEnrolledVaults(next);
    if (provider && address) {
      try {
        await fetch(`/api/wallet-providers/${address}/vaults`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enrolled_vaults: [...next] }),
        });
      } catch { /* silent */ }
    }
  };

  const filteredVaults = catalogFilter === "all" ? vaults
    : catalogFilter === "enrolled" ? vaults.filter(v => enrolledVaults.has(v.vault_id))
    : catalogFilter === "high_apy" ? [...vaults].sort((a, b) => (b.P01_APIN_7D || 0) - (a.P01_APIN_7D || 0))
    : catalogFilter === "high_tvl" ? [...vaults].sort((a, b) => (b.C01_USD || 0) - (a.C01_USD || 0))
    : vaults;

  const navItems = [
    { id: "catalog", icon: "🏦", label: "Vault Catalog" },
    { id: "dashboard", icon: "📊", label: "Overview" },
    { id: "campaigns", icon: "🎯", label: "Campaigns" },
    { id: "revenue", icon: "💰", label: "Revenue" },
    { id: "embed", icon: "🧩", label: "Embed Config" },
    { id: "sdk", icon: "🔧", label: "SDK & API" },
    { id: "settings", icon: "⚙️", label: "Settings" },
  ];

  const comingSoonPages = ["dashboard", "campaigns", "revenue", "embed", "sdk", "settings"];

  return (
    <div style={{ fontFamily: "'Inter',sans-serif", background: C.bg, color: C.text, minHeight: "100vh", display: "flex" }}>
      {/* SIDEBAR */}
      <aside style={{ width: 230, background: C.white, borderRight: `1px solid ${C.border}`, padding: "20px 0", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", boxShadow: "1px 0 8px rgba(0,0,0,0.02)" }}>
        <div style={{ padding: "0 20px 20px", display: "flex", alignItems: "center", gap: 8, borderBottom: `1px solid ${C.border}`, marginBottom: 8, paddingBottom: 18 }}>
          <img src="/yieldo-new.png" alt="Yieldo" style={{ width: 32, height: 32, borderRadius: 8, objectFit: "contain" }} />
          <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: ".05em" }}>YIELDO</span>
          <Badge color={C.teal}>Wallet</Badge>
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

        {/* Wallet connect section */}
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
            <button
              onClick={openConnectModal}
              style={{ width: "100%", padding: "10px", borderRadius: 8, backgroundImage: C.purpleGrad, border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif", boxShadow: C.purpleShadow }}
            >
              Connect Wallet
            </button>
          )}
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, padding: "24px 32px", overflow: "auto", maxWidth: 1200 }}>
        {/* Not connected state */}
        {!isConnected ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 80px)", gap: 20 }}>
            <div style={{ width: 80, height: 80, borderRadius: 20, backgroundImage: C.purpleGrad, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>
              <span style={{ color: "#fff", fontWeight: 700 }}>Y</span>
            </div>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>Welcome to Yieldo Wallet Partners</h2>
            <p style={{ margin: 0, fontSize: 14, color: C.text3, maxWidth: 460, textAlign: "center", lineHeight: 1.6 }}>
              Integrate Yieldo's curated DeFi vaults into your wallet and earn commissions on every deposit your users make. Connect your wallet to get started.
            </p>
            <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
              <StatCard icon="🏦" label="Available Vaults" value={vaults.length || "—"} />
              <StatCard icon="📈" label="Avg APY" value={vaults.length ? fmtApy(vaults.reduce((s, v) => s + (v.P01_APIN_7D || 0), 0) / vaults.length) : "—"} />
              <StatCard icon="🔗" label="Chains" value={new Set(vaults.map(v => v.chain_id)).size || "—"} />
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
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: "-.01em" }}>
                {navItems.find(n => n.id === page)?.icon} {navItems.find(n => n.id === page)?.label}
              </h1>
              {page === "catalog" && (
                <Tabs
                  tabs={[
                    { id: "all", label: "All Vaults" },
                    { id: "enrolled", label: "My Vaults" },
                    { id: "high_apy", label: "Top APY" },
                    { id: "high_tvl", label: "Top TVL" },
                  ]}
                  active={catalogFilter}
                  onChange={setCatalogFilter}
                />
              )}
            </div>

            {/* VAULT CATALOG */}
            {page === "catalog" && (
              <>
                <div style={{ display: "flex", gap: 14, marginBottom: 20 }}>
                  <StatCard icon="🏦" label="Total Vaults" value={vaults.length} />
                  <StatCard icon="✅" label="Enrolled" value={enrolledVaults.size} />
                  <StatCard icon="🔗" label="Chains" value={new Set(vaults.map(v => v.chain_id)).size} />
                  <StatCard icon="📈" label="Avg APY" value={vaults.length ? fmtApy(vaults.reduce((s, v) => s + (v.P01_APIN_7D || 0), 0) / vaults.length) : "—"} />
                </div>

                {vaultsLoading ? (
                  <div style={{ textAlign: "center", padding: 60, color: C.text3, fontSize: 14 }}>Loading vaults...</div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                    {filteredVaults.map(v => (
                      <VaultCatalogCard
                        key={v.vault_id}
                        vault={v}
                        enrolled={enrolledVaults.has(v.vault_id)}
                        onToggle={() => toggleVault(v.vault_id)}
                      />
                    ))}
                  </div>
                )}

                {!vaultsLoading && filteredVaults.length === 0 && (
                  <div style={{ textAlign: "center", padding: 60, color: C.text3 }}>
                    <div style={{ fontSize: 36, marginBottom: 10 }}>🏦</div>
                    <div style={{ fontSize: 14 }}>
                      {catalogFilter === "enrolled" ? "No vaults enrolled yet. Browse all vaults to get started." : "No vaults found."}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* COMING SOON pages */}
            {comingSoonPages.includes(page) && (
              <ComingSoon
                icon={navItems.find(n => n.id === page)?.icon}
                title={navItems.find(n => n.id === page)?.label}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
