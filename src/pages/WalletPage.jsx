import { useState } from "react";

const C = {
  bg: "#f8f7fc",
  white: "#ffffff",
  black: "#121212",
  surface: "#ffffff",
  surfaceAlt: "#faf9fe",
  border: "rgba(0,0,0,0.06)",
  border2: "rgba(0,0,0,0.1)",
  text: "#121212",
  text2: "rgba(0,0,0,0.65)",
  text3: "rgba(0,0,0,0.4)",
  text4: "rgba(0,0,0,0.25)",
  purple: "#7A1CCB",
  purpleLight: "#9E3BFF",
  purpleDim: "rgba(122,28,203,0.06)",
  purpleDim2: "rgba(122,28,203,0.1)",
  purpleGrad: "linear-gradient(100deg, #4B0CA6 0%, #7A1CCB 58%, #9E3BFF 114%)",
  purpleShadow: "0 0 17px rgba(80,14,170,0.12)",
  teal: "#2E9AB8",
  tealBright: "#45C7F2",
  tealDim: "rgba(69,199,242,0.08)",
  green: "#1a9d3f",
  greenBright: "#45f265",
  greenDim: "rgba(26,157,63,0.07)",
  red: "#d93636",
  redDim: "rgba(217,54,54,0.06)",
  gold: "#b8960a",
  goldDim: "rgba(184,150,10,0.07)",
};

const fmt = (n) => n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(0)}K` : `$${n}`;

function GradientText({ children, style = {} }) {
  return <span style={{ backgroundImage: C.purpleGrad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", ...style }}>{children}</span>;
}

function Btn({ children, primary, small, ghost, danger, full, active, onClick, style: sx = {} }) {
  const base = { fontFamily: "'Inter',sans-serif", fontSize: small ? 13 : 14, fontWeight: 500, border: "none", borderRadius: 6, cursor: "pointer", padding: small ? "6px 12px" : "10px 18px", display: "inline-flex", alignItems: "center", gap: 6, width: full ? "100%" : undefined, justifyContent: full ? "center" : undefined, transition: "all .15s", ...sx };
  if (primary) return <button onClick={onClick} style={{ ...base, backgroundImage: C.purpleGrad, color: "#fff", boxShadow: C.purpleShadow }}>{children}</button>;
  if (danger) return <button onClick={onClick} style={{ ...base, background: C.redDim, color: C.red }}>{children}</button>;
  if (ghost) return <button onClick={onClick} style={{ ...base, background: active ? C.purpleDim : "transparent", color: active ? C.purple : C.text3 }}>{children}</button>;
  return <button onClick={onClick} style={{ ...base, background: C.white, color: C.text2, border: `1px solid ${C.border2}`, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>{children}</button>;
}

function Badge({ children, color = C.purple, bg }) {
  return <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 4, background: bg || `${color}12`, color, whiteSpace: "nowrap" }}>{children}</span>;
}

function Card({ children, style: sx = {} }) {
  return <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.03)", ...sx }}>{children}</div>;
}

function StatCard({ icon, label, value, sub, trend, accent }) {
  return (
    <Card style={{ padding: "18px 20px", flex: "1 1 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: accent === "teal" ? C.tealDim : accent === "green" ? C.greenDim : C.purpleDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{icon}</div>
          <span style={{ fontSize: 12, color: C.text3, fontWeight: 500 }}>{label}</span>
        </div>
        {sub && <span style={{ fontSize: 11, color: C.text4, padding: "2px 6px", border: `1px solid ${C.border}`, borderRadius: 4 }}>{sub}</span>}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-.02em" }}>{value}</span>
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

function AreaChart({ data, color = C.tealBright, height = 140, label }) {
  const max = Math.max(...data) * 1.1; const min = Math.min(...data) * 0.9; const range = max - min || 1;
  const w = 600; const pad = 2;
  const pts = data.map((v, i) => ({ x: pad + (i / (data.length - 1)) * (w - pad * 2), y: pad + (1 - (v - min) / range) * (height - pad * 2) }));
  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaD = `${pathD} L${pts.at(-1).x},${height} L${pts[0].x},${height} Z`;
  const gid = `ch-${Math.random().toString(36).slice(2, 6)}`;
  return (
    <div>
      {label && <div style={{ fontSize: 12, fontWeight: 600, color: C.text3, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>{label}</div>}
      <svg width="100%" viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" style={{ display: "block" }}>
        <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".18" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
        {[.25, .5, .75].map(p => <line key={p} x1={0} x2={w} y1={height * p} y2={height * p} stroke="rgba(0,0,0,0.03)" />)}
        <path d={areaD} fill={`url(#${gid})`} /><path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={pts.at(-1).x} cy={pts.at(-1).y} r="4" fill={color} /><circle cx={pts.at(-1).x} cy={pts.at(-1).y} r="7" fill={color} fillOpacity=".2" />
      </svg>
    </div>
  );
}

function Table({ columns, rows }) {
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: columns.map(c => c.w || "1fr").join(" "), padding: "10px 16px", fontSize: 11, fontWeight: 600, color: C.text4, textTransform: "uppercase", letterSpacing: ".06em", borderBottom: `1px solid ${C.border}` }}>
        {columns.map((c, i) => <div key={i} style={{ textAlign: c.align }}>{c.label}</div>)}
      </div>
      {rows.map((row, ri) => (
        <div key={ri} style={{ display: "grid", gridTemplateColumns: columns.map(c => c.w || "1fr").join(" "), padding: "11px 16px", fontSize: 13, color: C.text2, borderBottom: `1px solid ${C.border}`, transition: "background .1s" }} onMouseEnter={e => e.currentTarget.style.background = C.surfaceAlt} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
          {columns.map((c, ci) => <div key={ci} style={{ textAlign: c.align, display: "flex", alignItems: c.align === "right" ? "center" : "center", justifyContent: c.align || "flex-start", gap: 6 }}>{c.render ? c.render(row, ri) : row[c.key]}</div>)}
        </div>
      ))}
    </div>
  );
}

function VaultCard({ vault, enrolled, onToggle }) {
  return (
    <Card style={{ padding: 0, overflow: "hidden", border: enrolled ? `1.5px solid rgba(122,28,203,0.2)` : `1px solid ${C.border}`, transition: "all .2s" }}>
      {vault.campaign && (
        <div style={{ padding: "6px 16px", background: C.greenDim, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11 }}>
          <span style={{ color: C.green, fontWeight: 600 }}>🎯 Campaign: {vault.campaign.name}</span>
          <span style={{ color: C.green, fontWeight: 700 }}>{vault.campaign.bonus} bonus rev share</span>
        </div>
      )}
      <div style={{ padding: "16px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: C.purpleDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{vault.icon}</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{vault.name}</div>
              <div style={{ fontSize: 11, color: C.text3 }}>{vault.protocols}</div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.purple }}>{vault.apy}</div>
            <div style={{ fontSize: 10, color: C.text4 }}>APY</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <span style={{ padding: "3px 8px", borderRadius: 4, background: vault.riskColor + "12", color: vault.riskColor, fontSize: 11, fontWeight: 500 }}>{vault.risk}</span>
          <span style={{ padding: "3px 8px", borderRadius: 4, background: C.surfaceAlt, color: C.text3, fontSize: 11 }}>{vault.chain}</span>
          <span style={{ padding: "3px 8px", borderRadius: 4, background: C.surfaceAlt, color: C.text3, fontSize: 11 }}>TVL {vault.tvl}</span>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14, fontSize: 12, color: C.text3 }}>
          <span>Base share: <strong style={{ color: C.purple }}>{vault.baseShare}</strong></span>
          {vault.campaign && <span>+ Boost: <strong style={{ color: C.green }}>{vault.campaign.bonus}</strong></span>}
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
          {enrolled ? "✓ Enrolled — Remove" : "+ Add to My Vaults"}
        </button>
      </div>
    </Card>
  );
}

function EmbedPreview({ theme, shape }) {
  const isDark = theme === "dark";
  const bg = isDark ? "#1a1a2e" : "#ffffff";
  const text = isDark ? "#fff" : "#121212";
  const text2 = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)";
  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const rad = shape === "rounded" ? 14 : shape === "pill" ? 24 : 6;
  return (
    <div style={{ background: bg, borderRadius: rad, border: `1px solid ${border}`, padding: 20, maxWidth: 360, fontFamily: "'Inter',sans-serif", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: text }}>Yield Opportunities</span>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, backgroundImage: C.purpleGrad }} />
          <span style={{ fontSize: 9, color: text2 }}>Yieldo</span>
        </div>
      </div>
      {[
        { name: "USDC Optimizer", apy: "12.4%", risk: "Low" },
        { name: "ETH Staking", apy: "8.7%", risk: "Low" },
      ].map((v, i) => (
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
  );
}

export default function WalletApp() {
  const [page, setPage] = useState("dashboard");
  const [catalogFilter, setCatalogFilter] = useState("all");
  const [enrolledVaults, setEnrolledVaults] = useState(new Set([0, 1]));
  const [embedTheme, setEmbedTheme] = useState("light");
  const [embedShape, setEmbedShape] = useState("rounded");
  const [revenueTab, setRevenueTab] = useState("all");
  const revData = [1.2, 2.1, 1.8, 3.4, 2.9, 4.1, 3.6, 5.2, 4.8, 6.1, 5.5, 7.2];
  const volumeData = [24, 42, 36, 68, 58, 82, 72, 104, 96, 122, 110, 144];
  const usersData = [120, 180, 160, 240, 220, 310, 280, 380, 340, 420, 390, 480];
  const vaults = [
    { id: 0, name: "USDC Lending Optimizer", protocols: "Morpho + Aave", icon: "💵", apy: "12.4%", risk: "Low", riskColor: C.green, chain: "Ethereum", tvl: "$4.2M", baseShare: "5 bps", campaign: { name: "Q2 Loyalty", bonus: "+15%", type: "A" } },
    { id: 1, name: "ETH Staking Yield", protocols: "Lido + Pendle", icon: "⟠", apy: "8.7%", risk: "Low", riskColor: C.green, chain: "Ethereum", tvl: "$1.8M", baseShare: "5 bps", campaign: null },
    { id: 2, name: "Stablecoin Compounder", protocols: "Yearn + Morpho", icon: "🔄", apy: "18.2%", risk: "Medium", riskColor: C.gold, chain: "Base", tvl: "$920K", baseShare: "5 bps", campaign: { name: "Growth Sprint", bonus: "+20%", type: "B" } },
    { id: 3, name: "BTC Yield Strategy", protocols: "Compound + Pendle", icon: "₿", apy: "6.3%", risk: "Low", riskColor: C.green, chain: "Ethereum", tvl: "$2.4M", baseShare: "5 bps", campaign: null },
    { id: 4, name: "Multi-chain Arb Vault", protocols: "Custom + Aave", icon: "🌐", apy: "24.1%", risk: "High", riskColor: C.red, chain: "Arbitrum", tvl: "$340K", baseShare: "5 bps", campaign: { name: "Launch Promo", bonus: "+25%", type: "B" } },
    { id: 5, name: "DAI Savings Plus", protocols: "Spark + Morpho", icon: "◆", apy: "9.8%", risk: "Low", riskColor: C.green, chain: "Ethereum", tvl: "$1.1M", baseShare: "5 bps", campaign: { name: "Stablecoin Push", bonus: "+12%", type: "A" } },
  ];
  const campaigns = [
    { vault: "USDC Lending Optimizer", type: "A", bonus: "+15%", criteria: "AUM stays ≥ 60d", yourAum: "$312K", earned: "$468", status: "active" },
    { vault: "Stablecoin Compounder", type: "B", bonus: "+20%", criteria: "Any deposit ≥ $1K", yourAum: "$89K", earned: "$178", status: "active" },
    { vault: "Multi-chain Arb Vault", type: "B", bonus: "+25%", criteria: "First 30d only", yourAum: "$45K", earned: "$112", status: "active" },
    { vault: "DAI Savings Plus", type: "A", bonus: "+12%", criteria: "AUM stays ≥ 90d", yourAum: "$201K", earned: "$241", status: "active" },
    { vault: "ETH Mega Yield", type: "B", bonus: "+10%", criteria: "Ended Feb 1", yourAum: "$120K", earned: "$120", status: "ended" },
  ];
  const payouts = [
    { date: "Feb 8", source: "Base Revenue Share", vault: "USDC Lending Optimizer", amount: "$234", type: "base", tx: "0xa3f...2b1" },
    { date: "Feb 8", source: "Q2 Loyalty Campaign", vault: "USDC Lending Optimizer", amount: "$468", type: "campaign", tx: "0xb7e...9c4" },
    { date: "Feb 7", source: "Base Revenue Share", vault: "ETH Staking Yield", amount: "$156", type: "base", tx: "0xc1d...5e8" },
    { date: "Feb 7", source: "Growth Sprint", vault: "Stablecoin Compounder", amount: "$178", type: "campaign", tx: "0xd4a...7f2" },
    { date: "Feb 6", source: "Base Revenue Share", vault: "USDC Lending Optimizer", amount: "$198", type: "base", tx: "0xe8b...1a6" },
    { date: "Feb 5", source: "Launch Promo", vault: "Multi-chain Arb Vault", amount: "$112", type: "campaign", tx: "0xf2c...8d3" },
  ];
  const filteredVaults = catalogFilter === "all" ? vaults
    : catalogFilter === "campaigns" ? vaults.filter(v => v.campaign)
    : catalogFilter === "enrolled" ? vaults.filter(v => enrolledVaults.has(v.id))
    : catalogFilter === "low" ? vaults.filter(v => v.risk === "Low")
    : vaults;
  const toggleVault = (id) => {
    const next = new Set(enrolledVaults);
    next.has(id) ? next.delete(id) : next.add(id);
    setEnrolledVaults(next);
  };
  const navItems = [
    { id: "dashboard", icon: "📊", label: "Overview" },
    { id: "catalog", icon: "🏦", label: "Vault Catalog" },
    { id: "campaigns", icon: "🎯", label: "Campaigns" },
    { id: "revenue", icon: "💰", label: "Revenue" },
    { id: "embed", icon: "🧩", label: "Embed Config" },
    { id: "sdk", icon: "🔧", label: "SDK & API" },
    { id: "settings", icon: "⚙️", label: "Settings" },
  ];
  return (
    <div style={{ fontFamily: "'Inter',sans-serif", background: C.bg, color: C.text, minHeight: "100vh", display: "flex" }}>
      <aside style={{ width: 230, background: C.white, borderRight: `1px solid ${C.border}`, padding: "20px 0", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", boxShadow: "1px 0 8px rgba(0,0,0,0.02)" }}>
        <div style={{ padding: "0 20px 20px", display: "flex", alignItems: "center", gap: 8, borderBottom: `1px solid ${C.border}`, marginBottom: 8, paddingBottom: 18 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, backgroundImage: C.purpleGrad, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>Y</span></div>
          <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: ".05em" }}>YIELDO</span>
          <Badge color={C.teal}>Wallet</Badge>
        </div>
        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 1, padding: "0 8px" }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setPage(item.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", background: page === item.id ? C.purpleDim : "transparent", border: "none", borderRadius: 8, color: page === item.id ? C.purple : C.text3, fontSize: 14, fontWeight: page === item.id ? 600 : 400, cursor: "pointer", fontFamily: "'Inter',sans-serif", textAlign: "left", transition: "all .15s" }}>
              <span style={{ fontSize: 15 }}>{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: "14px 20px", borderTop: `1px solid ${C.border}`, margin: "0 8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <div style={{ width: 20, height: 20, borderRadius: 5, background: "linear-gradient(135deg, #AB9FF2, #7B61FF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9 }}>👻</div>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Phantom Wallet</span>
          </div>
          <div style={{ fontSize: 11, color: C.text4 }}>Partner since Jan 2025</div>
        </div>
      </aside>
      <main style={{ flex: 1, padding: "24px 32px", overflow: "auto", maxWidth: 1200 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: "-.01em" }}>
            {navItems.find(n => n.id === page)?.icon} {navItems.find(n => n.id === page)?.label}
          </h1>
          {page === "catalog" && <Tabs tabs={[{ id: "all", label: "All Vaults" }, { id: "campaigns", label: "With Campaigns" }, { id: "enrolled", label: "My Vaults" }, { id: "low", label: "Low Risk" }]} active={catalogFilter} onChange={setCatalogFilter} />}
        </div>
        {page === "dashboard" && (<>
          <div style={{ display: "flex", gap: 14, marginBottom: 20 }}>
            <StatCard icon="💰" label="Total Earned" value="$7,241" trend={28.3} accent="green" />
            <StatCard icon="📈" label="AUM Routed" value="$1.48M" trend={16.2} accent="purple" />
            <StatCard icon="👤" label="Active Depositors" value="482" sub="7d" trend={12} accent="teal" />
            <StatCard icon="🎯" label="Campaign Bonuses" value="$1,999" sub="MTD" trend={45} accent="green" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 14, marginBottom: 20 }}>
            <Card style={{ padding: 20 }}><AreaChart data={revData} color={C.green} label="Revenue Earned" height={170} /></Card>
            <Card style={{ padding: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.text3, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 14 }}>Revenue Breakdown</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 10, height: 10, borderRadius: 3, background: C.purple }} /><span style={{ fontSize: 13, color: C.text2 }}>Base Revenue Share (5 bps)</span></div>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>$5,242</span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: C.surfaceAlt, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: "72%", backgroundImage: C.purpleGrad, borderRadius: 4 }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 10, height: 10, borderRadius: 3, background: C.green }} /><span style={{ fontSize: 13, color: C.text2 }}>Campaign Bonuses</span></div>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>$1,999</span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: C.surfaceAlt, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: "28%", background: C.green, borderRadius: 4 }} />
                </div>
              </div>
              <div style={{ marginTop: 20, padding: 14, background: C.greenDim, borderRadius: 8, border: `1px solid ${C.green}20` }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.green, marginBottom: 2 }}>💡 Tip: Enroll in more campaigns</div>
                <div style={{ fontSize: 12, color: C.text3 }}>4 vaults with active campaigns aren't in your catalog. Adding them could increase revenue by ~$800/mo.</div>
                <Btn small style={{ marginTop: 8, background: C.greenDim, color: C.green, border: `1px solid ${C.green}30` }} onClick={() => { setPage("catalog"); setCatalogFilter("campaigns"); }}>View campaigns →</Btn>
              </div>
            </Card>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <Card style={{ padding: 20 }}><AreaChart data={volumeData} color={C.tealBright} label="Volume Routed (K)" height={100} /></Card>
            <Card style={{ padding: 20 }}><AreaChart data={usersData} color={C.purple} label="Unique Depositors" height={100} /></Card>
            <Card style={{ padding: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.text3, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 14 }}>Top Vaults by Revenue</div>
              {vaults.filter(v => enrolledVaults.has(v.id)).slice(0, 3).map((v, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 14 }}>{v.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{v.name.split(" ").slice(0, 2).join(" ")}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.green }}>{["$3.2K", "$2.1K", "$1.9K"][i]}</span>
                </div>
              ))}
            </Card>
          </div>
        </>)}
        {page === "catalog" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            {filteredVaults.map(v => (
              <VaultCard key={v.id} vault={v} enrolled={enrolledVaults.has(v.id)} onToggle={() => toggleVault(v.id)} />
            ))}
          </div>
        )}
        {page === "campaigns" && (<>
          <div style={{ display: "flex", gap: 14, marginBottom: 20 }}>
            <StatCard icon="🎯" label="Active Campaigns" value="4" accent="green" />
            <StatCard icon="💰" label="Campaign Earnings" value="$1,999" trend={45} accent="green" />
            <StatCard icon="📊" label="Campaign AUM" value="$647K" accent="teal" />
            <StatCard icon="⏱" label="Avg. Loyalty Rate" value="74%" accent="purple" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
            <Card style={{ padding: 20, borderColor: `${C.purple}15` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Badge color={C.purple}>🔗 TYPE A</Badge>
                <span style={{ fontSize: 15, fontWeight: 600 }}>On-Chain Revenue Share</span>
              </div>
              <p style={{ fontSize: 13, color: C.text3, margin: "0 0 10px", lineHeight: 1.5 }}>Vault curators share a % of their smart contract fees with you. Trustless, automatic, and scales with AUM. No budget cap.</p>
              <div style={{ fontSize: 12, color: C.text3 }}>You're enrolled in <strong style={{ color: C.purple }}>2</strong> Type A campaigns</div>
            </Card>
            <Card style={{ padding: 20, borderColor: `${C.tealBright}15` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Badge color={C.teal}>💳 TYPE B</Badge>
                <span style={{ fontSize: 15, fontWeight: 600 }}>Marketing Campaigns</span>
              </div>
              <p style={{ fontSize: 13, color: C.text3, margin: "0 0 10px", lineHeight: 1.5 }}>Vault curators fund a budget to reward you for bringing AUM. Time-limited, criteria-based. Budget visible upfront.</p>
              <div style={{ fontSize: 12, color: C.text3 }}>You're enrolled in <strong style={{ color: C.teal }}>2</strong> Type B campaigns</div>
            </Card>
          </div>
          <Card>
            <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>Your Campaigns</span>
            </div>
            <Table
              columns={[
                { label: "Vault", w: "1.4fr", render: r => <span style={{ fontWeight: 500, color: C.text }}>{r.vault}</span> },
                { label: "Type", w: ".5fr", render: r => <Badge color={r.type === "A" ? C.purple : C.teal}>{r.type === "A" ? "🔗 A" : "💳 B"}</Badge> },
                { label: "Bonus", w: ".6fr", render: r => <span style={{ fontWeight: 600, color: C.green }}>{r.bonus}</span> },
                { label: "Criteria", w: "1fr", render: r => <span style={{ fontSize: 12, color: C.text3 }}>{r.criteria}</span> },
                { label: "Your AUM", w: ".7fr", render: r => <span style={{ fontWeight: 500, color: C.teal }}>{r.yourAum}</span> },
                { label: "Earned", w: ".6fr", render: r => <span style={{ fontWeight: 600, color: C.green }}>{r.earned}</span> },
                { label: "Status", w: ".5fr", render: r => <Badge color={r.status === "active" ? C.green : C.text4}>{r.status}</Badge> },
              ]}
              rows={campaigns}
            />
          </Card>
          <div style={{ marginTop: 16, padding: 16, background: C.purpleDim, borderRadius: 10, border: `1px solid ${C.purple}12`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Browse more campaigns</div>
              <div style={{ fontSize: 13, color: C.text3, marginTop: 2 }}>2 new vault campaigns launched this week with bonus rates up to 25%.</div>
            </div>
            <Btn primary small onClick={() => { setPage("catalog"); setCatalogFilter("campaigns"); }}>View Vault Catalog →</Btn>
          </div>
        </>)}
        {page === "revenue" && (<>
          <div style={{ display: "flex", gap: 14, marginBottom: 20 }}>
            <StatCard icon="💵" label="Total Earned (All Time)" value="$7,241" accent="green" />
            <StatCard icon="📊" label="Base Share" value="$5,242" accent="purple" />
            <StatCard icon="🎯" label="Campaign Bonuses" value="$1,999" accent="teal" />
            <StatCard icon="📈" label="This Month" value="$2,340" sub="MTD" trend={28} accent="green" />
          </div>
          <Card style={{ marginBottom: 20, padding: 20 }}><AreaChart data={revData.map((v, i) => v + [0.4, 0.8, 0.6, 1.2, 1.0, 1.5, 1.3, 1.8, 1.6, 2.1, 1.9, 2.4][i])} color={C.green} label="Cumulative Revenue" height={180} /></Card>
          <Card>
            <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>Payout History</span>
              <Tabs tabs={[{ id: "all", label: "All" }, { id: "base", label: "Base" }, { id: "campaign", label: "Campaign" }]} active={revenueTab} onChange={setRevenueTab} />
            </div>
            <Table
              columns={[
                { label: "Date", w: ".6fr", key: "date" },
                { label: "Source", w: "1.2fr", render: r => <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Badge color={r.type === "base" ? C.purple : C.green}>{r.type === "base" ? "Base" : "Campaign"}</Badge><span style={{ fontSize: 12 }}>{r.source}</span></div> },
                { label: "Vault", w: "1fr", render: r => <span style={{ fontSize: 12 }}>{r.vault}</span> },
                { label: "Amount", w: ".6fr", render: r => <span style={{ fontWeight: 600, color: C.green }}>{r.amount}</span> },
                { label: "Tx", w: ".6fr", render: r => <span style={{ fontSize: 11, color: C.purple, fontFamily: "monospace" }}>{r.tx}</span> },
              ]}
              rows={revenueTab === "all" ? payouts : payouts.filter(p => p.type === revenueTab)}
            />
          </Card>
        </>)}
        {page === "embed" && (<>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <Card style={{ padding: 24 }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600 }}>Widget Appearance</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <label style={{ fontSize: 12, color: C.text3, fontWeight: 600, display: "block", marginBottom: 6 }}>Theme</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      {["light", "dark", "auto"].map(t => (
                        <button key={t} onClick={() => setEmbedTheme(t)} style={{ padding: "8px 18px", borderRadius: 6, background: embedTheme === t ? C.purpleDim : C.surfaceAlt, border: `1px solid ${embedTheme === t ? C.purple + "30" : C.border}`, color: embedTheme === t ? C.purple : C.text3, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'Inter',sans-serif", textTransform: "capitalize" }}>{t}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: C.text3, fontWeight: 600, display: "block", marginBottom: 6 }}>Border Radius</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      {["square", "rounded", "pill"].map(s => (
                        <button key={s} onClick={() => setEmbedShape(s)} style={{ padding: "8px 18px", borderRadius: 6, background: embedShape === s ? C.purpleDim : C.surfaceAlt, border: `1px solid ${embedShape === s ? C.purple + "30" : C.border}`, color: embedShape === s ? C.purple : C.text3, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'Inter',sans-serif", textTransform: "capitalize" }}>{s}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
              <Card style={{ padding: 24 }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600 }}>Default Filters</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, color: C.text3, fontWeight: 600, display: "block", marginBottom: 6 }}>Default Chain</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      {["All", "Ethereum", "Base", "Arbitrum", "Polygon"].map((ch, i) => (
                        <button key={ch} style={{ padding: "7px 14px", borderRadius: 6, background: i === 0 ? C.purpleDim : C.surfaceAlt, border: `1px solid ${i === 0 ? C.purple + "30" : C.border}`, color: i === 0 ? C.purple : C.text3, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>{ch}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: C.text3, fontWeight: 600, display: "block", marginBottom: 6 }}>Max Risk Level</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      {["Low", "Medium", "High"].map((r, i) => (
                        <button key={r} style={{ padding: "7px 14px", borderRadius: 6, background: i === 1 ? C.purpleDim : C.surfaceAlt, border: `1px solid ${i === 1 ? C.purple + "30" : C.border}`, color: i === 1 ? C.purple : C.text3, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>{r}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: C.text3, fontWeight: 600, display: "block", marginBottom: 6 }}>Sort By</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      {["APY", "Risk Score", "TVL", "Revenue Share"].map((s, i) => (
                        <button key={s} style={{ padding: "7px 14px", borderRadius: 6, background: i === 0 ? C.purpleDim : C.surfaceAlt, border: `1px solid ${i === 0 ? C.purple + "30" : C.border}`, color: i === 0 ? C.purple : C.text3, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>{s}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
              <Card style={{ padding: 24 }}>
                <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600 }}>Embed Code</h3>
                <div style={{ background: "#faf9fe", borderRadius: 8, padding: "14px 16px", fontFamily: "monospace", fontSize: 12, color: C.purple, lineHeight: 1.7, border: `1px solid ${C.purple}12`, whiteSpace: "pre-wrap" }}>
                  {'<script src="https://cdn.yieldo.io/widget.js"></script>\n'}
                  {'<div id="yieldo-widget"\n'}
                  {'  data-partner="phantom"\n'}
                  {"  data-theme=\"" + embedTheme + '"\n'}
                  {"  data-shape=\"" + embedShape + '"\n'}
                  {'  data-chain="all"\n'}
                  {'  data-risk-max="medium"\n'}
                  {'  data-sort="apy">\n'}
                  {"</div>"}
                </div>
                <Btn small style={{ marginTop: 10 }}>📋 Copy Code</Btn>
              </Card>
            </div>
            <div style={{ position: "sticky", top: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.text3, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 12 }}>Live Preview</div>
              <div style={{ padding: 32, background: embedTheme === "dark" ? "#0d0d18" : C.surfaceAlt, borderRadius: 16, border: `1px solid ${C.border}`, display: "flex", justifyContent: "center" }}>
                <EmbedPreview theme={embedTheme} shape={embedShape} />
              </div>
            </div>
          </div>
        </>)}
        {page === "sdk" && (
          <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 16 }}>
            <Card style={{ padding: 24 }}>
              <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 600 }}>API Credentials</h3>
              <p style={{ fontSize: 13, color: C.text3, margin: "0 0 16px" }}>Use these keys to authenticate SDK and REST API calls.</p>
              {[
                { label: "Partner ID", value: "phantom", secret: false },
                { label: "API Key (Live)", value: "yd_live_pk_7a1c...b9e2", secret: true },
                { label: "API Key (Test)", value: "yd_test_pk_3f8d...c4a1", secret: true },
              ].map((k, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 13, color: C.text3 }}>{k.label}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <code style={{ fontSize: 13, color: C.purple, background: C.purpleDim, padding: "3px 8px", borderRadius: 4 }}>{k.value}</code>
                    <Btn ghost small>📋</Btn>
                  </div>
                </div>
              ))}
            </Card>
            <Card style={{ padding: 24 }}>
              <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 600 }}>Quick Start</h3>
              <div style={{ background: "#faf9fe", borderRadius: 8, padding: "16px 18px", fontFamily: "monospace", fontSize: 12, color: C.text2, lineHeight: 1.8, border: `1px solid ${C.purple}08`, whiteSpace: "pre-wrap" }}>
                  {"npm install @yieldo" + "/sdk\n\n"}
                  {"imp" + "ort { Yieldo } " + "from '@yieldo/sdk';\n\n"}
                  {"const yieldo = new Yieldo({\n"}
                  {"  apiKey: 'yd_live_pk_7a1c...b9e2',\n"}
                  {"  partnerId: 'phantom',\n"}
                  {"});\n\n"}
                  {"// List curated vaults\n"}
                  {"const vaults = await yieldo.getVaults();\n\n"}
                  {"// Deposit\n"}
                  {"await yieldo.deposit({\n"}
                  {"  vaultId: vaults[0].id,\n"}
                  {"  amount: '10000',\n"}
                  {"  token: 'USDC',\n"}
                  {"  userAddress: '0x...',\n"}
                  {"});"}
                </div>
            </Card>
            <Card style={{ padding: 24 }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600 }}>API Endpoints</h3>
              {[
                { method: "GET", path: "/v1/vaults", desc: "List curated vaults with filters" },
                { method: "GET", path: "/v1/vaults/:id", desc: "Get vault details, APY, risk score" },
                { method: "POST", path: "/v1/deposit", desc: "Create deposit transaction" },
                { method: "POST", path: "/v1/withdraw", desc: "Create withdrawal transaction" },
                { method: "GET", path: "/v1/portfolio/:address", desc: "User portfolio positions" },
                { method: "GET", path: "/v1/partner/revenue", desc: "Your revenue & payout history" },
                { method: "GET", path: "/v1/partner/campaigns", desc: "Available & enrolled campaigns" },
              ].map((ep, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 6px", borderRadius: 3, background: ep.method === "GET" ? C.tealDim : C.greenDim, color: ep.method === "GET" ? C.teal : C.green, fontFamily: "monospace" }}>{ep.method}</span>
                  <code style={{ fontSize: 12, color: C.purple }}>{ep.path}</code>
                  <span style={{ fontSize: 12, color: C.text3, marginLeft: "auto" }}>{ep.desc}</span>
                </div>
              ))}
              <Btn small style={{ marginTop: 12 }}>View Full API Docs →</Btn>
            </Card>
            <Card style={{ padding: 24 }}>
              <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 600 }}>Webhooks</h3>
              <p style={{ fontSize: 13, color: C.text3, margin: "0 0 14px" }}>Get notified when deposits, withdrawals, or payouts happen.</p>
              <div style={{ padding: "10px 14px", background: C.surfaceAlt, borderRadius: 8, border: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <code style={{ fontSize: 12, color: C.text2 }}>https://api.phantom.app/webhooks/yieldo</code>
                <Badge color={C.green}>Active</Badge>
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: C.text3 }}>Events: <code style={{ color: C.purple }}>deposit.completed</code>, <code style={{ color: C.purple }}>withdrawal.completed</code>, <code style={{ color: C.purple }}>payout.sent</code></div>
            </Card>
          </div>
        )}
        {page === "settings" && (
          <div style={{ maxWidth: 640, display: "flex", flexDirection: "column", gap: 16 }}>
            <Card style={{ padding: 24 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600 }}>Partner Details</h3>
              {[["Wallet Name", "Phantom"], ["Partner ID", "phantom"], ["Payout Address", "0x9a8b...7c6d"], ["Payout Frequency", "Weekly (Mondays)"], ["Payout Token", "USDC"]].map(([l, v], i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 13, color: C.text3 }}>{l}</span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </Card>
            <Card style={{ padding: 24 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600 }}>Notifications</h3>
              {["New campaign available", "Payout received", "Vault APY change > 2%", "New vault listed", "Weekly revenue digest"].map((n, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 13, color: C.text2 }}>{n}</span>
                  <div style={{ width: 38, height: 22, borderRadius: 11, background: i < 3 ? C.purpleDim2 : C.border, position: "relative", cursor: "pointer" }}>
                    <div style={{ width: 16, height: 16, borderRadius: "50%", background: i < 3 ? C.purple : "rgba(0,0,0,0.15)", position: "absolute", top: 3, left: i < 3 ? 19 : 3, transition: "left .2s" }} />
                  </div>
                </div>
              ))}
            </Card>
            <Card style={{ padding: 24 }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600 }}>Team Access</h3>
              {[["dev@phantom.app", "Admin"], ["product@phantom.app", "Viewer"]].map(([email, role], i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 13, color: C.text2 }}>{email}</span>
                  <Badge color={i === 0 ? C.purple : C.teal}>{role}</Badge>
                </div>
              ))}
              <Btn small style={{ marginTop: 12 }}>+ Invite team member</Btn>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
