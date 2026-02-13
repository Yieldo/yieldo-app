import { useState } from "react";

const C = {
  bg: "#f8f7fc", white: "#ffffff", black: "#121212", surfaceAlt: "#faf9fe",
  border: "rgba(0,0,0,0.06)", border2: "rgba(0,0,0,0.1)",
  text: "#121212", text2: "rgba(0,0,0,0.65)", text3: "rgba(0,0,0,0.4)", text4: "rgba(0,0,0,0.25)",
  purple: "#7A1CCB", purpleDim: "rgba(122,28,203,0.06)", purpleDim2: "rgba(122,28,203,0.1)",
  purpleGrad: "linear-gradient(100deg, #4B0CA6 0%, #7A1CCB 58%, #9E3BFF 114%)",
  purpleShadow: "0 0 17px rgba(80,14,170,0.12)",
  teal: "#2E9AB8", tealBright: "#45C7F2", tealDim: "rgba(69,199,242,0.08)",
  green: "#1a9d3f", greenDim: "rgba(26,157,63,0.07)",
  red: "#d93636", redDim: "rgba(217,54,54,0.06)",
  gold: "#b8960a", goldDim: "rgba(184,150,10,0.07)",
  amber: "#d97706", amberDim: "rgba(217,119,6,0.07)",
};

function Btn({ children, primary, small, ghost, active, danger, full, onClick, style: sx = {} }) {
  const base = { fontFamily: "'Inter',sans-serif", fontSize: small ? 13 : 14, fontWeight: 500, border: "none", borderRadius: 6, cursor: "pointer", padding: small ? "6px 12px" : "10px 18px", display: "inline-flex", alignItems: "center", gap: 6, width: full ? "100%" : undefined, justifyContent: full ? "center" : undefined, transition: "all .15s", ...sx };
  if (primary) return <button onClick={onClick} style={{ ...base, backgroundImage: C.purpleGrad, color: "#fff", boxShadow: C.purpleShadow }}>{children}</button>;
  if (danger) return <button onClick={onClick} style={{ ...base, background: C.redDim, color: C.red }}>{children}</button>;
  if (ghost) return <button onClick={onClick} style={{ ...base, background: active ? C.purpleDim : "transparent", color: active ? C.purple : C.text3, fontWeight: active ? 600 : 500 }}>{children}</button>;
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
          <div style={{ width: 32, height: 32, borderRadius: 8, background: accent === "teal" ? C.tealDim : accent === "green" ? C.greenDim : accent === "gold" ? C.goldDim : C.purpleDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{icon}</div>
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
        <button key={t.id} onClick={() => onChange(t.id)} style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, fontWeight: active === t.id ? 600 : 400, padding: "7px 14px", borderRadius: 6, border: "none", cursor: "pointer", background: active === t.id ? C.white : "transparent", color: active === t.id ? C.purple : C.text3, boxShadow: active === t.id ? "0 1px 3px rgba(0,0,0,0.06)" : "none", transition: "all .15s" }}>{t.label}</button>
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
        <div key={ri} style={{ display: "grid", gridTemplateColumns: columns.map(c => c.w || "1fr").join(" "), padding: "10px 16px", fontSize: 13, color: C.text2, borderBottom: `1px solid ${C.border}`, transition: "background .1s" }} onMouseEnter={e => e.currentTarget.style.background = C.surfaceAlt} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
          {columns.map((c, ci) => <div key={ci} style={{ textAlign: c.align, display: "flex", alignItems: "center", justifyContent: c.align || "flex-start", gap: 6 }}>{c.render ? c.render(row) : row[c.key]}</div>)}
        </div>
      ))}
    </div>
  );
}

function PageEditorPreview({ profile, vaults, reorderVault }) {
  return (
    <div style={{ background: C.surfaceAlt, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24, display: "flex", justifyContent: "center" }}>
      <div style={{ width: 340, background: "#fff", borderRadius: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.06)", overflow: "hidden", fontFamily: "'Inter',sans-serif" }}>
        <div style={{ padding: "24px 20px 14px", textAlign: "center", backgroundImage: "linear-gradient(100deg, rgba(75,12,166,0.05) 0%, rgba(122,28,203,0.05) 58%, rgba(158,59,255,0.05) 114%)" }}>
          <div style={{ width: 56, height: 56, borderRadius: 28, backgroundImage: C.purpleGrad, margin: "0 auto 10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#fff", fontSize: 22 }}>🎯</span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{profile.handle}</div>
          <div style={{ fontSize: 12, color: C.text3, marginTop: 2 }}>{profile.tagline}</div>
          <p style={{ fontSize: 12, color: C.text3, margin: "8px 0 0", lineHeight: 1.4 }}>{profile.bio}</p>
        </div>
        <div style={{ display: "flex", borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
          {[{ n: "$1.2M", l: "AUM" }, { n: "847", l: "Depositors" }, { n: "12.4%", l: "Avg APY" }].map((s, i) => (
            <div key={i} style={{ flex: 1, textAlign: "center", padding: "8px 0", borderRight: i < 2 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.purple }}>{s.n}</div>
              <div style={{ fontSize: 9, color: C.text4 }}>{s.l}</div>
            </div>
          ))}
        </div>
        <div style={{ padding: "10px 14px" }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: C.text4, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>My Top Picks</div>
          {vaults.map((v, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 10, color: C.text4, cursor: "grab" }}>⠿</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{v.name}</div>
                  <span style={{ fontSize: 9, padding: "1px 4px", borderRadius: 3, background: v.riskColor + "12", color: v.riskColor }}>{v.risk}</span>
                </div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.purple }}>{v.apy}</div>
            </div>
          ))}
        </div>
        <div style={{ padding: "8px 14px 14px" }}>
          <div style={{ width: "100%", padding: "10px", borderRadius: 10, backgroundImage: C.purpleGrad, textAlign: "center", color: "#fff", fontSize: 13, fontWeight: 600 }}>Deposit Now</div>
          <div style={{ textAlign: "center", fontSize: 9, color: C.text4, marginTop: 4 }}>Powered by Yieldo</div>
        </div>
      </div>
    </div>
  );
}

export default function KolApp() {
  const [page, setPage] = useState("dashboard");
  const [payoutTab, setPayoutTab] = useState("all");
  const profile = { handle: "@defi_sage", tagline: "DeFi analyst · 45K followers", bio: "These are my personally vetted yield strategies. I use them myself." };
  const myVaults = [
    { name: "USDC Lending Optimizer", apy: "12.4%", risk: "Low", riskColor: C.green, platform: "Morpho", curator: "Gauntlet", campaign: true, campaignBonus: "+15%", campaignType: "A" },
    { name: "ETH Staking Yield", apy: "8.7%", risk: "Low", riskColor: C.green, platform: "Lido", curator: "Steakhouse", campaign: false },
    { name: "Stablecoin Compounder", apy: "18.2%", risk: "Medium", riskColor: C.gold, platform: "Yearn", curator: "9Summits", campaign: true, campaignBonus: "+20%", campaignType: "B" },
    { name: "DAI Savings Plus", apy: "9.8%", risk: "Low", riskColor: C.green, platform: "Spark", curator: "Block Analitica", campaign: false },
  ];
  const campaigns = [
    { vault: "USDC Lending Optimizer", type: "A", bonus: "+15%", criteria: "AUM stays 60d+", yourAum: "$423K", earned: "$634", status: "enrolled" },
    { vault: "Stablecoin Compounder", type: "B", bonus: "+20%", criteria: "Any deposit ≥$1K", yourAum: "$89K", earned: "$178", status: "enrolled" },
    { vault: "Multi-chain Arb Vault", type: "B", bonus: "+25%", criteria: "30d window", yourAum: "—", earned: "—", status: "available" },
    { vault: "ETH Mega Yield", type: "A", bonus: "+12%", criteria: "AUM stays 90d+", yourAum: "—", earned: "—", status: "available" },
    { vault: "BTC Yield Strategy", type: "B", bonus: "+18%", criteria: "Min $5K deposit", yourAum: "—", earned: "—", status: "available" },
  ];
  const payouts = [
    { date: "Feb 8", source: "Base Rev Share", vault: "USDC Lending", amount: "$212", type: "base", tx: "0xa3f...2b1" },
    { date: "Feb 8", source: "Q2 Loyalty Campaign", vault: "USDC Lending", amount: "$634", type: "campaign", tx: "0xb7e...9c4" },
    { date: "Feb 7", source: "Base Rev Share", vault: "ETH Staking", amount: "$87", type: "base", tx: "0xc1d...5e8" },
    { date: "Feb 7", source: "Growth Sprint", vault: "Stablecoin Comp.", amount: "$178", type: "campaign", tx: "0xd4a...7f2" },
    { date: "Feb 6", source: "Base Rev Share", vault: "DAI Savings", amount: "$49", type: "base", tx: "0xe8b...1a6" },
    { date: "Feb 5", source: "Base Rev Share", vault: "USDC Lending", amount: "$198", type: "base", tx: "0xf2c...8d3" },
  ];
  const referralData = [
    { source: "Twitter / X", clicks: 4821, deposits: 312, volume: "$468K", conv: "6.5%", earned: "$1,240" },
    { source: "YouTube", clicks: 2104, deposits: 89, volume: "$133K", conv: "4.2%", earned: "$442" },
    { source: "Newsletter", clicks: 1560, deposits: 156, volume: "$234K", conv: "10.0%", earned: "$780" },
    { source: "Discord", clicks: 890, deposits: 42, volume: "$63K", conv: "4.7%", earned: "$210" },
    { source: "Direct", clicks: 3210, deposits: 248, volume: "$372K", conv: "7.7%", earned: "$1,240" },
  ];
  const earningsData = [1.2, 2.1, 1.8, 3.4, 2.9, 4.1, 3.6, 5.2, 4.8, 6.8, 5.9, 7.8];
  const clicksData = [120, 280, 240, 420, 380, 520, 460, 680, 580, 820, 740, 960];
  const depositorsData = [24, 48, 38, 72, 62, 94, 78, 124, 108, 156, 132, 178];
  const navItems = [
    { id: "dashboard", icon: "📊", label: "Overview" },
    { id: "page", icon: "🎨", label: "My Page" },
    { id: "vaults", icon: "🏦", label: "My Vaults" },
    { id: "analytics", icon: "📈", label: "Analytics" },
    { id: "campaigns", icon: "🎯", label: "Campaigns" },
    { id: "payouts", icon: "💰", label: "Payouts" },
    { id: "links", icon: "🔗", label: "Links" },
    { id: "settings", icon: "⚙️", label: "Settings" },
  ];
  return (
    <div style={{ fontFamily: "'Inter',sans-serif", background: C.bg, color: C.text, minHeight: "100vh", display: "flex" }}>
      <aside style={{ width: 230, background: C.white, borderRight: `1px solid ${C.border}`, padding: "20px 0", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", boxShadow: "1px 0 8px rgba(0,0,0,0.02)" }}>
        <div style={{ padding: "0 20px 20px", display: "flex", alignItems: "center", gap: 8, borderBottom: `1px solid ${C.border}`, marginBottom: 8, paddingBottom: 18 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, backgroundImage: C.purpleGrad, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>Y</span></div>
          <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: ".05em" }}>YIELDO</span>
          <Badge color={C.green}>Creator</Badge>
        </div>
        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 1, padding: "0 8px" }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setPage(item.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", background: page === item.id ? C.purpleDim : "transparent", border: "none", borderRadius: 8, color: page === item.id ? C.purple : C.text3, fontSize: 14, fontWeight: page === item.id ? 600 : 400, cursor: "pointer", fontFamily: "'Inter',sans-serif", textAlign: "left", transition: "all .15s" }}>
              <span style={{ fontSize: 15 }}>{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: "14px 16px", margin: "0 8px", background: C.purpleDim, borderRadius: 10, border: `1px solid ${C.purple}15` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 16 }}>⭐</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.purple }}>Creator Tier</span>
          </div>
          <div style={{ fontSize: 11, color: C.text3 }}>7 bps base · $412K AUM</div>
          <div style={{ marginTop: 6, height: 4, borderRadius: 2, background: C.border }}>
            <div style={{ height: "100%", width: "41%", borderRadius: 2, backgroundImage: C.purpleGrad }} />
          </div>
          <div style={{ fontSize: 10, color: C.text4, marginTop: 3 }}>$588K to Partner tier (10 bps)</div>
        </div>
        <div style={{ padding: "12px 20px", borderTop: `1px solid ${C.border}`, margin: "8px 8px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 24, height: 24, borderRadius: 12, backgroundImage: C.purpleGrad, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: "#fff", fontSize: 9, fontWeight: 700 }}>DS</span></div>
            <span style={{ fontSize: 13, fontWeight: 600 }}>@defi_sage</span>
          </div>
        </div>
      </aside>
      <main style={{ flex: 1, padding: "24px 32px", overflow: "auto", maxWidth: 1200 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>{navItems.find(n => n.id === page)?.icon} {navItems.find(n => n.id === page)?.label}</h1>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn small onClick={() => {}}>📋 Copy Page Link</Btn>
            <Btn primary small onClick={() => setPage("page")}>🎨 Edit My Page</Btn>
          </div>
        </div>
        {page === "dashboard" && (<>
          <div style={{ display: "flex", gap: 14, marginBottom: 20 }}>
            <StatCard icon="💰" label="Total Earned" value="$4,231" sub="MTD" trend={32} accent="green" />
            <StatCard icon="📈" label="AUM Referred" value="$1.27M" trend={18.5} accent="purple" />
            <StatCard icon="👤" label="Depositors" value="847" trend={14.2} accent="teal" />
            <StatCard icon="🎯" label="Campaign Bonus" value="$812" sub="MTD" trend={45} accent="gold" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 14, marginBottom: 20 }}>
            <Card style={{ padding: 20 }}><AreaChart data={earningsData} color={C.green} label="Monthly Earnings" height={170} /></Card>
            <Card style={{ padding: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.text3, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 14 }}>Revenue Split</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: 3, backgroundImage: C.purpleGrad }} /><span style={{ fontSize: 13 }}>Base (7 bps)</span></div>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>$3,419</span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: C.surfaceAlt }}><div style={{ height: "100%", width: "81%", backgroundImage: C.purpleGrad, borderRadius: 4 }} /></div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: 3, background: C.green }} /><span style={{ fontSize: 13 }}>Campaign Bonuses</span></div>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>$812</span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: C.surfaceAlt }}><div style={{ height: "100%", width: "19%", background: C.green, borderRadius: 4 }} /></div>
              </div>
              <div style={{ marginTop: 18, padding: 12, background: C.greenDim, borderRadius: 8, border: `1px solid ${C.green}20` }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.green, marginBottom: 2 }}>💡 3 new campaigns available</div>
                <div style={{ fontSize: 11, color: C.text3 }}>Enroll in vault campaigns to earn bonus revenue on top of your base rate.</div>
                <Btn small style={{ marginTop: 6, background: C.greenDim, color: C.green, border: `1px solid ${C.green}30` }} onClick={() => setPage("campaigns")}>Browse campaigns →</Btn>
              </div>
            </Card>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <Card style={{ padding: 20 }}><AreaChart data={clicksData} color={C.tealBright} label="Page Clicks" height={100} /></Card>
            <Card style={{ padding: 20 }}><AreaChart data={depositorsData} color={C.purple} label="New Depositors" height={100} /></Card>
            <Card style={{ padding: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.text3, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 14 }}>Top Vaults by Revenue</div>
              {myVaults.slice(0, 3).map((v, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${C.border}` }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{v.name.split(" ").slice(0, 2).join(" ")}</div>
                    <div style={{ fontSize: 10, color: C.text4 }}>{v.platform}</div>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.green }}>{["$1.8K", "$920", "$780"][i]}</span>
                </div>
              ))}
            </Card>
          </div>
        </>)}
        {page === "page" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Card style={{ padding: 24 }}>
                <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600 }}>Profile</h3>
                {[
                  { label: "Handle", value: "@defi_sage", type: "text" },
                  { label: "Tagline", value: "DeFi analyst · 45K followers", type: "text" },
                  { label: "Bio", value: "These are my personally vetted yield strategies. I use them myself.", type: "textarea" },
                  { label: "Twitter", value: "https://x.com/defi_sage", type: "text" },
                  { label: "YouTube", value: "https://youtube.com/@defisage", type: "text" },
                ].map((f, i) => (
                  <div key={i} style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 12, color: C.text3, fontWeight: 600, display: "block", marginBottom: 4 }}>{f.label}</label>
                    {f.type === "textarea" ? (
                      <textarea defaultValue={f.value} rows={2} style={{ width: "100%", padding: "8px 12px", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, fontFamily: "'Inter',sans-serif", resize: "vertical", outline: "none", boxSizing: "border-box", color: C.text }} />
                    ) : (
                      <input defaultValue={f.value} style={{ width: "100%", padding: "8px 12px", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, fontFamily: "'Inter',sans-serif", outline: "none", boxSizing: "border-box", color: C.text }} />
                    )}
                  </div>
                ))}
                <Btn primary small>Save Profile</Btn>
              </Card>
              <Card style={{ padding: 24 }}>
                <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 600 }}>Vault Order</h3>
                <p style={{ fontSize: 12, color: C.text3, margin: "0 0 12px" }}>Drag to reorder how vaults appear on your page.</p>
                {myVaults.map((v, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", marginBottom: 4, borderRadius: 8, background: C.surfaceAlt, border: `1px solid ${C.border}`, cursor: "grab" }}>
                    <span style={{ color: C.text4, fontSize: 14 }}>⠿</span>
                    <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{v.name}</span>
                    <Badge color={v.riskColor}>{v.risk}</Badge>
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.purple }}>{v.apy}</span>
                  </div>
                ))}
                <Btn small style={{ marginTop: 8 }} onClick={() => setPage("vaults")}>+ Add More Vaults</Btn>
              </Card>
              <Card style={{ padding: 24 }}>
                <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 600 }}>Page URL</h3>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ flex: 1, padding: "10px 14px", background: C.surfaceAlt, borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, fontFamily: "monospace", color: C.purple }}>yieldo.io/@defi_sage</div>
                  <Btn small>📋 Copy</Btn>
                </div>
              </Card>
            </div>
            <div style={{ position: "sticky", top: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.text3, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>Live Preview</div>
              <PageEditorPreview profile={profile} vaults={myVaults} />
            </div>
          </div>
        )}
        {page === "vaults" && (<>
          <Card>
            <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>Vaults on My Page ({myVaults.length})</span>
              <Btn primary small>+ Browse Vault Catalog</Btn>
            </div>
            <Table
              columns={[
                { label: "Vault", w: "1.4fr", render: r => <div><div style={{ fontWeight: 500 }}>{r.name}</div><div style={{ fontSize: 10, color: C.text4 }}>{r.platform} · {r.curator}</div></div> },
                { label: "APY", w: ".5fr", render: r => <span style={{ fontWeight: 700, color: C.purple }}>{r.apy}</span> },
                { label: "Risk", w: ".5fr", render: r => <Badge color={r.riskColor}>{r.risk}</Badge> },
                { label: "Campaign", w: ".8fr", render: r => r.campaign ? <Badge color={r.campaignType === "A" ? C.purple : C.teal}>{r.campaignType === "A" ? "🔗" : "💳"} {r.campaignBonus}</Badge> : <span style={{ color: C.text4 }}>—</span> },
                { label: "", w: ".4fr", align: "right", render: () => <Btn ghost small>✕</Btn> },
              ]}
              rows={myVaults}
            />
          </Card>
        </>)}
        {page === "analytics" && (<>
          <div style={{ display: "flex", gap: 14, marginBottom: 20 }}>
            <StatCard icon="👆" label="Total Clicks" value="12,585" trend={22} accent="teal" />
            <StatCard icon="👤" label="Total Depositors" value="847" trend={14} accent="purple" />
            <StatCard icon="💵" label="Total Volume" value="$1.27M" trend={18} accent="green" />
            <StatCard icon="🎯" label="Conversion Rate" value="6.7%" trend={3.2} accent="gold" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
            <Card style={{ padding: 20 }}><AreaChart data={clicksData} color={C.tealBright} label="Clicks Over Time" height={170} /></Card>
            <Card style={{ padding: 20 }}><AreaChart data={depositorsData} color={C.green} label="Depositors Over Time" height={170} /></Card>
          </div>
          <Card>
            <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>Traffic Sources</span>
            </div>
            <Table
              columns={[
                { label: "Source", w: "1fr", render: r => <span style={{ fontWeight: 500 }}>{r.source}</span> },
                { label: "Clicks", w: ".6fr", key: "clicks" },
                { label: "Deposits", w: ".6fr", key: "deposits" },
                { label: "Volume", w: ".7fr", render: r => <span style={{ color: C.teal, fontWeight: 500 }}>{r.volume}</span> },
                { label: "Conv. Rate", w: ".6fr", render: r => <span style={{ color: parseFloat(r.conv) >= 7 ? C.green : C.text2 }}>{r.conv}</span> },
                { label: "Earned", w: ".6fr", render: r => <span style={{ fontWeight: 600, color: C.green }}>{r.earned}</span> },
              ]}
              rows={referralData}
            />
          </Card>
        </>)}
        {page === "campaigns" && (<>
          <div style={{ display: "flex", gap: 14, marginBottom: 20 }}>
            <StatCard icon="🎯" label="Enrolled" value="2" accent="green" />
            <StatCard icon="💰" label="Campaign Earnings" value="$812" sub="MTD" trend={45} accent="green" />
            <StatCard icon="📊" label="Available" value="3" accent="teal" />
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Enrolled Campaigns</div>
          <Card style={{ marginBottom: 24 }}>
            <Table
              columns={[
                { label: "Vault", w: "1.3fr", render: r => <span style={{ fontWeight: 500 }}>{r.vault}</span> },
                { label: "Type", w: ".4fr", render: r => <Badge color={r.type === "A" ? C.purple : C.teal}>{r.type === "A" ? "🔗 A" : "💳 B"}</Badge> },
                { label: "Bonus", w: ".5fr", render: r => <span style={{ fontWeight: 600, color: C.green }}>{r.bonus}</span> },
                { label: "Criteria", w: ".9fr", render: r => <span style={{ fontSize: 12, color: C.text3 }}>{r.criteria}</span> },
                { label: "Your AUM", w: ".6fr", render: r => <span style={{ fontWeight: 500, color: C.teal }}>{r.yourAum}</span> },
                { label: "Earned", w: ".5fr", render: r => <span style={{ fontWeight: 600, color: C.green }}>{r.earned}</span> },
              ]}
              rows={campaigns.filter(c => c.status === "enrolled")}
            />
          </Card>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Available Campaigns</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {campaigns.filter(c => c.status === "available").map((c, i) => (
              <Card key={i} style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Badge color={c.type === "A" ? C.purple : C.teal}>{c.type === "A" ? "🔗 A" : "💳 B"}</Badge>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{c.vault}</div>
                    <div style={{ fontSize: 12, color: C.text3, marginTop: 1 }}>{c.criteria}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: C.green }}>{c.bonus}</div>
                    <div style={{ fontSize: 10, color: C.text4 }}>bonus rev share</div>
                  </div>
                  <Btn primary small>Enroll →</Btn>
                </div>
              </Card>
            ))}
          </div>
        </>)}
        {page === "payouts" && (<>
          <div style={{ display: "flex", gap: 14, marginBottom: 20 }}>
            <StatCard icon="💵" label="Total Earned" value="$28,940" accent="green" />
            <StatCard icon="📊" label="Base Share" value="$24,180" accent="purple" />
            <StatCard icon="🎯" label="Campaign Bonuses" value="$4,760" accent="teal" />
            <StatCard icon="📅" label="Next Payout" value="Feb 14" accent="gold" />
          </div>
          <Card>
            <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>Payout History</span>
              <Tabs tabs={[{ id: "all", label: "All" }, { id: "base", label: "Base" }, { id: "campaign", label: "Campaign" }]} active={payoutTab} onChange={setPayoutTab} />
            </div>
            <Table
              columns={[
                { label: "Date", w: ".5fr", key: "date" },
                { label: "Source", w: "1.2fr", render: r => <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Badge color={r.type === "base" ? C.purple : C.green}>{r.type === "base" ? "Base" : "Campaign"}</Badge><span style={{ fontSize: 12 }}>{r.source}</span></div> },
                { label: "Vault", w: ".8fr", render: r => <span style={{ fontSize: 12 }}>{r.vault}</span> },
                { label: "Amount", w: ".5fr", render: r => <span style={{ fontWeight: 600, color: C.green }}>{r.amount}</span> },
                { label: "Tx", w: ".6fr", render: r => <span style={{ fontSize: 11, color: C.purple, fontFamily: "monospace" }}>{r.tx}</span> },
              ]}
              rows={payoutTab === "all" ? payouts : payouts.filter(p => p.type === payoutTab)}
            />
          </Card>
        </>)}
        {page === "links" && (<>
          <Card style={{ padding: 24, marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 600 }}>Your Referral Links</h3>
            <p style={{ fontSize: 13, color: C.text3, margin: "0 0 16px" }}>Use these links to track referrals from different platforms. All clicks and deposits are attributed automatically.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { label: "Main Page", url: "yieldo.io/@defi_sage" },
                { label: "Twitter UTM", url: "yieldo.io/@defi_sage?utm=twitter" },
                { label: "YouTube UTM", url: "yieldo.io/@defi_sage?utm=youtube" },
                { label: "Newsletter UTM", url: "yieldo.io/@defi_sage?utm=newsletter" },
                { label: "Discord UTM", url: "yieldo.io/@defi_sage?utm=discord" },
              ].map((l, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: C.surfaceAlt, borderRadius: 8, border: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.text3, minWidth: 100 }}>{l.label}</span>
                  <code style={{ flex: 1, fontSize: 13, color: C.purple }}>{l.url}</code>
                  <Btn ghost small>📋</Btn>
                </div>
              ))}
            </div>
          </Card>
          <Card style={{ padding: 24, marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 600 }}>Deep Links to Specific Vaults</h3>
            <p style={{ fontSize: 13, color: C.text3, margin: "0 0 16px" }}>Link directly to a specific vault on your page — great for targeted content.</p>
            {myVaults.map((v, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", marginBottom: 4, background: C.surfaceAlt, borderRadius: 8, border: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 13, fontWeight: 500, flex: "0 0 180px" }}>{v.name}</span>
                <code style={{ flex: 1, fontSize: 12, color: C.purple }}>yieldo.io/@defi_sage/{v.name.toLowerCase().replace(/\s+/g, "-").slice(0, 20)}</code>
                <Btn ghost small>📋</Btn>
              </div>
            ))}
          </Card>
          <Card style={{ padding: 24 }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 600 }}>QR Code</h3>
            <p style={{ fontSize: 13, color: C.text3, margin: "0 0 14px" }}>For conferences, meetups, or printed materials.</p>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ width: 120, height: 120, borderRadius: 10, background: C.surfaceAlt, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 1.5, width: 80, height: 80 }}>
                  {Array.from({ length: 64 }, (_, i) => (
                    <div key={i} style={{ background: Math.random() > 0.45 ? C.purple : "transparent", borderRadius: 1 }} />
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>yieldo.io/@defi_sage</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <Btn small>⬇ Download PNG</Btn>
                  <Btn small>⬇ Download SVG</Btn>
                </div>
              </div>
            </div>
          </Card>
        </>)}
        {page === "settings" && (
          <div style={{ maxWidth: 640, display: "flex", flexDirection: "column", gap: 16 }}>
            <Card style={{ padding: 24 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600 }}>Payout Details</h3>
              {[["Payout Address", "0x9a8b...7c6d"], ["Payout Token", "USDC"], ["Frequency", "Bi-weekly (Creator tier)"], ["Next Payout", "Feb 14, 2025"]].map(([l, v], i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 13, color: C.text3 }}>{l}</span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </Card>
            <Card style={{ padding: 24 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600 }}>Notifications</h3>
              {["New deposit through your page", "Payout received", "New campaign available", "Weekly earnings digest", "Vault APY change > 2%"].map((n, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 13, color: C.text2 }}>{n}</span>
                  <div style={{ width: 38, height: 22, borderRadius: 11, background: i < 4 ? C.purpleDim2 : C.border, position: "relative", cursor: "pointer" }}>
                    <div style={{ width: 16, height: 16, borderRadius: "50%", background: i < 4 ? C.purple : "rgba(0,0,0,0.15)", position: "absolute", top: 3, left: i < 4 ? 19 : 3, transition: "left .2s" }} />
                  </div>
                </div>
              ))}
            </Card>
            <Card style={{ padding: 24 }}>
              <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 600 }}>Disclaimer on Your Page</h3>
              <p style={{ fontSize: 12, color: C.text3, margin: "0 0 12px" }}>This standard disclaimer is shown at the bottom of your yield page.</p>
              <div style={{ padding: 12, background: C.surfaceAlt, borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12, color: C.text3, lineHeight: 1.5, fontStyle: "italic" }}>
                "The vaults shown are curated by @defi_sage and powered by Yieldo. This is not financial advice. All investments carry risk. Do your own research before depositing. Past performance does not guarantee future results."
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
