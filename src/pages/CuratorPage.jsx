import { useState } from "react";

/* ============ DESIGN TOKENS (Light Theme — matching landing pages) ============ */
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
  purpleShadow: "0px 0px 17px rgba(80,14,170,0.12)",
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

/* ============ UTILITY ============ */
const fmt = (n) => {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n}`;
};

function GradientText({ children, style = {} }) {
  return <span style={{ backgroundImage: C.purpleGrad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", ...style }}>{children}</span>;
}

/* ============ BASE COMPONENTS ============ */
function Btn({ children, primary, small, ghost, danger, full, onClick, disabled, style: sx = {} }) {
  const base = { fontFamily: "'Inter',sans-serif", fontSize: small ? 13 : 14, fontWeight: 500, border: "none", borderRadius: 6, cursor: disabled ? "not-allowed" : "pointer", padding: small ? "6px 12px" : "10px 18px", display: "inline-flex", alignItems: "center", gap: 6, width: full ? "100%" : "auto", justifyContent: full ? "center" : undefined, transition: "all .15s", opacity: disabled ? 0.5 : 1, ...sx };
  if (primary) return <button onClick={onClick} disabled={disabled} style={{ ...base, backgroundImage: C.purpleGrad, color: "#fff", boxShadow: C.purpleShadow }}>{children}</button>;
  if (danger) return <button onClick={onClick} disabled={disabled} style={{ ...base, background: C.redDim, color: C.red }}>{children}</button>;
  if (ghost) return <button onClick={onClick} disabled={disabled} style={{ ...base, background: "transparent", color: C.text3 }}>{children}</button>;
  return <button onClick={onClick} disabled={disabled} style={{ ...base, background: C.white, color: C.text2, border: `1px solid ${C.border2}`, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>{children}</button>;
}

function Badge({ children, color = C.purple, bg }) {
  return <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 4, background: bg || `${color}12`, color, letterSpacing: ".02em", whiteSpace: "nowrap" }}>{children}</span>;
}

function Card({ children, style: sx = {}, hover }) {
  const [h, setH] = useState(false);
  return (
    <div
      onMouseEnter={() => hover && setH(true)}
      onMouseLeave={() => hover && setH(false)}
      style={{ background: C.white, borderRadius: 12, border: `1px solid ${h ? "rgba(122,28,203,0.15)" : C.border}`, boxShadow: h ? "0 4px 20px rgba(122,28,203,0.06)" : "0 1px 3px rgba(0,0,0,0.03)", transition: "all .2s", ...sx }}
    >
      {children}
    </div>
  );
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
        <span style={{ fontSize: 28, fontWeight: 700, color: C.text, letterSpacing: "-.02em" }}>{value}</span>
        {trend !== undefined && <span style={{ fontSize: 12, fontWeight: 600, color: trend >= 0 ? C.green : C.red }}>{trend >= 0 ? "\u2191" : "\u2193"}{Math.abs(trend)}%</span>}
      </div>
    </Card>
  );
}

/* ============ CHART ============ */
function AreaChart({ data, color = C.tealBright, height = 140, label, showGrid }) {
  const max = Math.max(...data) * 1.1;
  const min = Math.min(...data) * 0.9;
  const range = max - min || 1;
  const w = 600; const pad = 2;
  const pts = data.map((v, i) => ({ x: pad + (i / (data.length - 1)) * (w - pad * 2), y: pad + (1 - (v - min) / range) * (height - pad * 2) }));
  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaD = `${pathD} L${pts.at(-1).x},${height} L${pts[0].x},${height} Z`;
  const gid = `ag-${color.replace("#", "")}-${Math.random().toString(36).slice(2, 6)}`;
  return (
    <div>
      {label && <div style={{ fontSize: 12, fontWeight: 600, color: C.text3, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>{label}</div>}
      <svg width="100%" viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" style={{ display: "block" }}>
        <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".18" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
        {showGrid && [0.25, 0.5, 0.75].map(p => <line key={p} x1={0} x2={w} y1={height * p} y2={height * p} stroke="rgba(0,0,0,0.04)" strokeWidth="1" />)}
        <path d={areaD} fill={`url(#${gid})`} /><path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={pts.at(-1).x} cy={pts.at(-1).y} r="4" fill={color} /><circle cx={pts.at(-1).x} cy={pts.at(-1).y} r="7" fill={color} fillOpacity=".2" />
      </svg>
    </div>
  );
}

/* ============ DONUT ============ */
function DonutChart({ segments, size = 120, label }) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  let cum = 0;
  const r = size / 2 - 8; const cx = size / 2; const cy = size / 2;
  return (
    <div style={{ textAlign: "center" }}>
      {label && <div style={{ fontSize: 12, fontWeight: 600, color: C.text3, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>{label}</div>}
      <svg width={size} height={size} style={{ display: "block", margin: "0 auto" }}>
        {segments.map((seg, i) => {
          const pct = seg.value / total;
          const startAngle = cum * Math.PI * 2 - Math.PI / 2;
          cum += pct;
          const endAngle = cum * Math.PI * 2 - Math.PI / 2;
          const large = pct > 0.5 ? 1 : 0;
          const d = `M${cx + r * Math.cos(startAngle)},${cy + r * Math.sin(startAngle)} A${r},${r} 0 ${large} 1 ${cx + r * Math.cos(endAngle)},${cy + r * Math.sin(endAngle)}`;
          return <path key={i} d={d} fill="none" stroke={seg.color} strokeWidth="14" strokeLinecap="round" />;
        })}
        <text x={cx} y={cy - 4} textAnchor="middle" style={{ fontSize: 20, fontWeight: 700, fill: C.text }}>{total}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" style={{ fontSize: 10, fill: C.text3 }}>partners</text>
      </svg>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 8 }}>
        {segments.map((s, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: C.text3 }}><div style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />{s.label}</div>)}
      </div>
    </div>
  );
}

/* ============ TABS ============ */
function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: "flex", gap: 2, background: C.surfaceAlt, borderRadius: 8, padding: 3, border: `1px solid ${C.border}` }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, fontWeight: active === t.id ? 600 : 400, padding: "7px 16px", borderRadius: 6, border: "none", cursor: "pointer", background: active === t.id ? C.white : "transparent", color: active === t.id ? C.purple : C.text3, boxShadow: active === t.id ? "0 1px 3px rgba(0,0,0,0.06)" : "none", transition: "all .15s" }}>
          {t.icon && <span style={{ marginRight: 5 }}>{t.icon}</span>}{t.label}
        </button>
      ))}
    </div>
  );
}

/* ============ DATA TABLE ============ */
function Table({ columns, rows }) {
  return (
    <div style={{ overflow: "auto" }}>
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

/* ============ CAMPAIGN BUILDER MODAL ============ */
function CampaignModal({ type, onClose }) {
  const isA = type === "A";
  const [step, setStep] = useState(1);
  const [name, setName] = useState(isA ? "Q2 Revenue Share Program" : "Growth Sprint \u2014 March");
  const [basePct, setBasePct] = useState(10);
  const [boostPct, setBoostPct] = useState(20);
  const [lockDays, setLockDays] = useState(60);
  const [minAum, setMinAum] = useState(50000);
  const [budget, setBudget] = useState(25000);
  const [duration, setDuration] = useState(90);
  const [chain, setChain] = useState("Ethereum");
  const [token, setToken] = useState("USDC");
  const [target, setTarget] = useState("all");

  const Slider = ({ min: mn, max: mx, step: st, value, onChange, color, label, format }) => (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: C.text3, fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color }}>{format ? format(value) : value}</span>
      </div>
      <input type="range" min={mn} max={mx} step={st || 1} value={value} onChange={e => onChange(+e.target.value)} style={{ width: "100%", accentColor: color, height: 4 }} />
    </div>
  );

  const Chips = ({ options, value, onChange, color }) => (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {options.map(o => (
        <button key={o} onClick={() => onChange(o)} style={{ padding: "7px 14px", borderRadius: 6, background: value === o ? `${color}12` : C.surfaceAlt, border: `1px solid ${value === o ? `${color}30` : C.border}`, color: value === o ? color : C.text3, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>{o}</button>
      ))}
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.25)", backdropFilter: "blur(6px)" }}>
      <div style={{ width: 680, maxHeight: "92vh", overflow: "auto", background: C.white, borderRadius: 16, border: `1px solid ${C.border2}`, boxShadow: "0 24px 64px rgba(0,0,0,0.12)" }}>
        {/* Header */}
        <div style={{ padding: "22px 28px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <Badge color={isA ? C.purple : C.teal}>{isA ? "\uD83D\uDD17 TYPE A \u00B7 ON-CHAIN" : "\uD83D\uDCB3 TYPE B \u00B7 MARKETING"}</Badge>
            </div>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: C.text }}>{isA ? "Smart Contract Revenue Share" : "Marketing Campaign"}</h3>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: C.text3 }}>{isA ? "Fee splits enforced trustlessly at the contract level. No budget needed." : "Fund a budget, set KPIs, and let the wallet network compete for your rewards."}</p>
          </div>
          <Btn ghost small onClick={onClose}>\u2715</Btn>
        </div>

        {/* Step indicator */}
        <div style={{ padding: "12px 28px 0", display: "flex", gap: 4 }}>
          {["Basics", "Incentives", "Review"].map((s, i) => (
            <div key={i} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ height: 3, borderRadius: 2, background: i + 1 <= step ? (isA ? C.purple : C.teal) : C.border, transition: "background .3s", marginBottom: 4 }} />
              <span style={{ fontSize: 10, color: i + 1 <= step ? (isA ? C.purple : C.teal) : C.text4, fontWeight: i + 1 === step ? 600 : 400 }}>{s}</span>
            </div>
          ))}
        </div>

        <div style={{ padding: "24px 28px" }}>
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <label style={{ fontSize: 12, color: C.text3, fontWeight: 600, display: "block", marginBottom: 6 }}>Campaign Name</label>
                <input value={name} onChange={e => setName(e.target.value)} style={{ width: "100%", padding: "10px 14px", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 14, fontFamily: "'Inter',sans-serif", outline: "none", boxSizing: "border-box" }} />
              </div>
              {isA ? (
                <>
                  <div>
                    <label style={{ fontSize: 12, color: C.text3, fontWeight: 600, display: "block", marginBottom: 6 }}>Vault Contract Address</label>
                    <input placeholder="0x..." style={{ width: "100%", padding: "10px 14px", background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 14, fontFamily: "monospace", outline: "none", boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: C.text3, fontWeight: 600, display: "block", marginBottom: 6 }}>Chain</label>
                    <Chips options={["Ethereum", "Base", "Arbitrum", "Polygon"]} value={chain} onChange={setChain} color={C.purple} />
                  </div>
                  <div style={{ padding: 16, borderRadius: 10, background: C.purpleDim, border: `1px solid ${C.purple}18` }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 4 }}>How it works</div>
                    <p style={{ fontSize: 12, color: C.text3, margin: 0, lineHeight: 1.6 }}>A fee-splitting proxy is deployed on-chain. When users deposit into your vault through Yieldo, fees are automatically routed: your defined % goes to the referring wallet. Fully trustless, no manual payouts, no budget caps.</p>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <Slider label="Campaign Budget" min={1000} max={200000} step={1000} value={budget} onChange={setBudget} color={C.teal} format={fmt} />
                    <Slider label="Duration (days)" min={7} max={365} value={duration} onChange={setDuration} color={C.teal} format={v => `${v}d`} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: C.text3, fontWeight: 600, display: "block", marginBottom: 6 }}>Payment Token</label>
                    <Chips options={["USDC", "USDT", "DAI", "ETH"]} value={token} onChange={setToken} color={C.teal} />
                  </div>
                  <div style={{ padding: 16, borderRadius: 10, background: C.tealDim, border: `1px solid ${C.tealBright}18` }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 4 }}>How it works</div>
                    <p style={{ fontSize: 12, color: C.text3, margin: 0, lineHeight: 1.6 }}>Fund an escrow with {fmt(budget)} {token}. Yieldo distributes rewards to wallet partners as they hit your KPIs. Unspent budget is refundable. You can pause or cancel anytime.</p>
                  </div>
                </>
              )}
            </div>
          )}

          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <Card style={{ padding: 20, border: `1px solid ${C.purple}15` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, backgroundImage: C.purpleGrad, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#fff" }}>\uD83D\uDCCA</div>
                  <div><div style={{ fontSize: 14, fontWeight: 600 }}>Base Tier</div><div style={{ fontSize: 11, color: C.text3 }}>{isA ? "Revenue share on all routed AUM" : "Reward rate for any qualifying AUM"}</div></div>
                </div>
                <Slider label="Base Revenue Share" min={1} max={30} value={basePct} onChange={setBasePct} color={C.purple} format={v => `${v}%`} />
              </Card>

              <Card style={{ padding: 20, border: `1px solid ${C.green}25` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${C.greenBright}, ${C.green})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#fff" }}>\uD83D\uDE80</div>
                  <div><div style={{ fontSize: 14, fontWeight: 600, color: C.green }}>Loyalty Boost</div><div style={{ fontSize: 11, color: C.text3 }}>Higher rate for sticky capital</div></div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <Slider label="Boosted Revenue Share" min={basePct + 1} max={50} value={boostPct} onChange={setBoostPct} color={C.green} format={v => `${v}%`} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <Slider label="Min Lock Period" min={7} max={180} value={lockDays} onChange={setLockDays} color={C.green} format={v => `${v} days`} />
                    <Slider label="Min AUM per Wallet" min={1000} max={500000} step={1000} value={minAum} onChange={setMinAum} color={C.green} format={fmt} />
                  </div>
                </div>
              </Card>

              <div>
                <label style={{ fontSize: 12, color: C.text3, fontWeight: 600, display: "block", marginBottom: 6 }}>Target Partners</label>
                <Chips options={["all", "top-20", "wallets-only", "kols-only", "custom"]} value={target} onChange={setTarget} color={C.purple} />
              </div>

              {/* Live preview */}
              <div style={{ padding: 16, borderRadius: 10, background: C.surfaceAlt, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.text4, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>How wallets will see your offer</div>
                <div style={{ display: "flex", gap: 16 }}>
                  <div style={{ flex: 1, padding: 12, borderRadius: 8, background: C.white, border: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 11, color: C.text4, marginBottom: 2 }}>Base</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: C.purple }}>{basePct}%</div>
                    <div style={{ fontSize: 10, color: C.text4 }}>on any AUM</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", fontSize: 16, color: C.text4 }}>+</div>
                  <div style={{ flex: 1, padding: 12, borderRadius: 8, background: C.white, border: `1px solid ${C.green}25` }}>
                    <div style={{ fontSize: 11, color: C.green, fontWeight: 600 }}>Loyalty Boost</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: C.green }}>{boostPct}%</div>
                    <div style={{ fontSize: 10, color: C.text4 }}>if locked \u2265 {lockDays}d & \u2265 {fmt(minAum)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <Card style={{ padding: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.text4, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 14 }}>Summary</div>
                {[
                  ["Name", name],
                  ["Type", isA ? "A \u2014 On-Chain Revenue Share" : "B \u2014 Marketing Campaign"],
                  ["Base Share", `${basePct}% on all AUM`],
                  ["Loyalty Boost", `${boostPct}% for \u2265 ${lockDays}d lock & \u2265 ${fmt(minAum)} AUM`],
                  ["Target", target === "all" ? "All Partners" : target],
                  ...(isA ? [["Chain", chain], ["Enforcement", "Smart contract (trustless)"]] : [["Budget", `${fmt(budget)} ${token}`], ["Duration", `${duration} days`], ["Payout", "Weekly from escrow"]]),
                ].map(([l, v], i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ fontSize: 13, color: C.text3 }}>{l}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{v}</span>
                  </div>
                ))}
              </Card>

              <Card style={{ padding: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.text4, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 14 }}>Projected Impact @ $10M AUM</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  {[
                    { label: "Base Payouts", value: `$${((1e7 * basePct / 100) * 0.001).toLocaleString()}`, color: C.purple },
                    { label: "Boost Pool (~60%)", value: `$${((1e7 * boostPct / 100) * 0.001 * 0.6).toLocaleString()}`, color: C.green },
                    { label: "Priority Listing", value: "Top 20%", color: C.teal },
                  ].map((s, i) => (
                    <div key={i} style={{ textAlign: "center", padding: 12, background: C.surfaceAlt, borderRadius: 8 }}>
                      <div style={{ fontSize: 10, color: C.text4, marginBottom: 2 }}>{s.label}</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                    </div>
                  ))}
                </div>
              </Card>

              <div style={{ padding: 14, borderRadius: 8, background: isA ? C.purpleDim : C.tealDim, border: `1px solid ${isA ? C.purple : C.tealBright}18`, display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ fontSize: 16 }}>{isA ? "\uD83D\uDD17" : "\uD83D\uDCB3"}</span>
                <div style={{ fontSize: 12, color: isA ? C.purple : C.teal, lineHeight: 1.5 }}>
                  {isA ? <><strong>On-chain deployment.</strong> A fee-splitting proxy contract will be created. Sign with your vault admin wallet. Revenue share is enforced trustlessly &mdash; no manual payouts ever.</> : <><strong>Budget funding.</strong> Transfer {fmt(budget)} {token} to Yieldo escrow. Funds release as partners hit KPIs. Unspent budget is fully refundable.</>}
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: "14px 28px 22px", display: "flex", justifyContent: "space-between", borderTop: `1px solid ${C.border}` }}>
          <Btn ghost onClick={() => step > 1 ? setStep(step - 1) : onClose()}>{step > 1 ? "\u2190 Back" : "Cancel"}</Btn>
          <Btn primary onClick={() => step < 3 ? setStep(step + 1) : null}>{step < 3 ? "Continue \u2192" : isA ? "\uD83D\uDD17 Deploy On-Chain" : "\uD83D\uDCB3 Fund & Launch"}</Btn>
        </div>
      </div>
    </div>
  );
}

/* ============ VAULT LISTING CARD ============ */
function VaultListingCard({ vault }) {
  return (
    <Card hover style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: C.purpleDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{vault.icon}</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{vault.name}</div>
            <div style={{ fontSize: 12, color: C.text3 }}>{vault.chain} \u00B7 {vault.strategy}</div>
          </div>
        </div>
        <Badge color={vault.status === "live" ? C.green : C.gold}>{vault.status}</Badge>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
        {[
          { l: "TVL", v: vault.tvl },
          { l: "APY", v: vault.apy },
          { l: "Risk", v: vault.risk, c: vault.risk === "Low" ? C.green : C.gold },
          { l: "Partners", v: vault.partners },
        ].map((m, i) => (
          <div key={i}>
            <div style={{ fontSize: 10, color: C.text4, marginBottom: 2 }}>{m.l}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: m.c || C.text }}>{m.v}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {vault.campaigns.map((c, i) => <Badge key={i} color={c.type === "A" ? C.purple : C.teal}>{c.type === "A" ? "\uD83D\uDD17" : "\uD83D\uDCB3"} {c.name}</Badge>)}
      </div>
    </Card>
  );
}

/* ============ MAIN APP ============ */
export default function CuratorPage() {
  const [page, setPage] = useState("dashboard");
  const [modal, setModal] = useState(null);
  const [campaignFilter, setCampaignFilter] = useState("all");

  const aumData = [120, 340, 280, 520, 450, 680, 620, 890, 780, 1050, 980, 1234];
  const revData = [2, 5, 4, 8, 7, 12, 10, 15, 14, 18, 16, 22];
  const retentionData = [60, 62, 58, 65, 68, 72, 70, 75, 73, 78, 76, 82];

  const campaigns = [
    { id: 1, name: "Q2 Revenue Share", type: "A", status: "active", base: "10%", boost: "20% / 60d", partners: 34, aum: "$2.1M", spent: "\u2014", loyalty: "78%", startDate: "Jan 15" },
    { id: 2, name: "March Growth Sprint", type: "B", status: "active", base: "15%", boost: "\u2014", partners: 12, aum: "$890K", spent: "$8.2K / $25K", loyalty: "52%", startDate: "Mar 1" },
    { id: 3, name: "Whale Acquisition", type: "B", status: "paused", base: "8%", boost: "30% / $500K+", partners: 5, aum: "$1.4M", spent: "$12K / $50K", loyalty: "91%", startDate: "Feb 10" },
    { id: 4, name: "Base Chain Push", type: "A", status: "ended", base: "12%", boost: "18% / 30d", partners: 22, aum: "$680K", spent: "\u2014", loyalty: "65%", startDate: "Dec 1" },
  ];

  const partners = [
    { rank: 1, name: "Phantom Wallet", type: "wallet", aum: "$423,456", deposits: 156, payout: "$4,234", loyalty: 78, tier: "boost", campaign: "Q2 Revenue Share" },
    { rank: 2, name: "@cryptoKOL", type: "kol", aum: "$312,890", deposits: 42, payout: "$3,128", loyalty: 85, tier: "boost", campaign: "Q2 Revenue Share" },
    { rank: 3, name: "Nightly App", type: "wallet", aum: "$289,100", deposits: 89, payout: "$2,891", loyalty: 62, tier: "base", campaign: "March Growth Sprint" },
    { rank: 4, name: "@defi_guru", type: "kol", aum: "$198,450", deposits: 18, payout: "$1,984", loyalty: 91, tier: "boost", campaign: "Whale Acquisition" },
    { rank: 5, name: "Zerion", type: "wallet", aum: "$156,780", deposits: 67, payout: "$1,567", loyalty: 72, tier: "base", campaign: "Q2 Revenue Share" },
    { rank: 6, name: "@yieldmax", type: "kol", aum: "$134,200", deposits: 24, payout: "$1,342", loyalty: 88, tier: "boost", campaign: "Q2 Revenue Share" },
  ];

  const vaults = [
    { name: "USDC Lending Optimizer", chain: "Ethereum", strategy: "Lending", icon: "\uD83D\uDCB5", tvl: "$4.2M", apy: "8.2\u201314.5%", risk: "Low", status: "live", partners: 34, campaigns: [{ type: "A", name: "Q2 RevShare" }, { type: "B", name: "Growth Sprint" }] },
    { name: "ETH Staking Yield", chain: "Ethereum", strategy: "Staking", icon: "\u27E0", tvl: "$1.8M", apy: "5.1\u20139.8%", risk: "Low", status: "live", partners: 18, campaigns: [{ type: "A", name: "Base Push" }] },
    { name: "Multi-asset Compounder", chain: "Base", strategy: "Yield Farming", icon: "\uD83D\uDD04", tvl: "$920K", apy: "12\u201334%", risk: "Medium", status: "live", partners: 8, campaigns: [{ type: "B", name: "Whale Acq." }] },
  ];

  const navItems = [
    { id: "dashboard", icon: "\uD83D\uDCCA", label: "Overview" },
    { id: "campaigns", icon: "\uD83C\uDFAF", label: "Campaigns" },
    { id: "partners", icon: "\uD83E\uDD1D", label: "Partners" },
    { id: "vaults", icon: "\uD83C\uDFE6", label: "My Vaults" },
    { id: "revenue", icon: "\uD83D\uDCB0", label: "Revenue" },
    { id: "settings", icon: "\u2699\uFE0F", label: "Settings" },
  ];

  const filteredCampaigns = campaignFilter === "all" ? campaigns : campaigns.filter(c => c.status === campaignFilter);

  return (
    <div style={{ fontFamily: "'Inter',sans-serif", background: C.bg, color: C.text, minHeight: "100vh", display: "flex" }}>
      {/* ---- SIDEBAR ---- */}
      <aside style={{ width: 230, background: C.white, borderRight: `1px solid ${C.border}`, padding: "20px 0", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", boxShadow: "1px 0 8px rgba(0,0,0,0.02)" }}>
        <div style={{ padding: "0 20px 24px", display: "flex", alignItems: "center", gap: 8, borderBottom: `1px solid ${C.border}`, marginBottom: 8, paddingBottom: 20 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, backgroundImage: C.purpleGrad, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>Y</span></div>
          <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: ".05em", color: C.text }}>YIELDO</span>
          <Badge color={C.purple}>Vault</Badge>
        </div>

        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 1, padding: "0 8px" }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => setPage(item.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", background: page === item.id ? C.purpleDim : "transparent", border: "none", borderRadius: 8, color: page === item.id ? C.purple : C.text3, fontSize: 14, fontWeight: page === item.id ? 600 : 400, cursor: "pointer", fontFamily: "'Inter',sans-serif", textAlign: "left", transition: "all .15s" }}>
              <span style={{ fontSize: 15 }}>{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>

        <div style={{ padding: "16px 20px", borderTop: `1px solid ${C.border}`, margin: "0 8px" }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: C.text2, marginBottom: 2 }}>USDC Lending Vault</div>
          <div style={{ fontSize: 11, color: C.text4, fontFamily: "monospace" }}>0x1a2b...3c4d</div>
          <div style={{ fontSize: 11, color: C.text4, marginTop: 2 }}>Ethereum</div>
        </div>
      </aside>

      {/* ---- MAIN ---- */}
      <main style={{ flex: 1, padding: "24px 32px", overflow: "auto", maxWidth: 1200 }}>
        {/* Top bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: "-.01em" }}>
            {navItems.find(n => n.id === page)?.icon} {navItems.find(n => n.id === page)?.label}
          </h1>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={() => setModal("A")}>{"\uD83D\uDD17"} On-Chain Share</Btn>
            <Btn primary onClick={() => setModal("B")}>{"\uD83D\uDCB3"} Marketing Campaign</Btn>
          </div>
        </div>

        {/* ===== DASHBOARD ===== */}
        {page === "dashboard" && (<>
          <div style={{ display: "flex", gap: 14, marginBottom: 20 }}>
            <StatCard icon={"\uD83D\uDCB0"} label="Total AUM" value="$1.23M" trend={12.4} accent="purple" />
            <StatCard icon={"\uD83D\uDC65"} label="Active Partners" value="34" trend={8} accent="teal" />
            <StatCard icon={"\uD83D\uDCC8"} label="Deposits (7d)" value="$180K" sub="7d" trend={23.1} accent="green" />
            <StatCard icon={"\uD83D\uDD01"} label="Rev. Shared (MTD)" value="$4.8K" sub="MTD" trend={18} accent="purple" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 14, marginBottom: 20 }}>
            <Card style={{ padding: 20 }}><AreaChart data={aumData} color={C.tealBright} label="AUM Over Time" height={170} showGrid /></Card>
            <Card style={{ padding: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.text3, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 14 }}>Active Campaigns</div>
              {campaigns.filter(c => c.status === "active").map((c, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Badge color={c.type === "A" ? C.purple : C.teal}>{c.type === "A" ? "\uD83D\uDD17" : "\uD83D\uDCB3"}</Badge>
                    <div><div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div><div style={{ fontSize: 11, color: C.text4 }}>{c.partners} partners \u00B7 {c.base} base</div></div>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.teal }}>{c.aum}</span>
                </div>
              ))}
              <Btn ghost small style={{ marginTop: 8 }} onClick={() => setPage("campaigns")}>View all campaigns \u2192</Btn>
            </Card>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <Card style={{ padding: 20 }}><AreaChart data={revData} color={C.purple} label="Revenue Shared" height={100} /></Card>
            <Card style={{ padding: 20 }}><AreaChart data={retentionData} color={C.green} label="Retention Rate (%)" height={100} /></Card>
            <Card style={{ padding: 20 }}>
              <DonutChart label="Partner Mix" size={110} segments={[{ value: 18, color: C.tealBright, label: "Wallets" }, { value: 12, color: C.purple, label: "KOLs" }, { value: 4, color: C.gold, label: "Apps" }]} />
            </Card>
          </div>
        </>)}

        {/* ===== CAMPAIGNS ===== */}
        {page === "campaigns" && (<>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
            <Card hover style={{ padding: 22, cursor: "pointer", borderColor: `${C.purple}15` }} onClick={() => setModal("A")}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 28 }}>{"\uD83D\uDD17"}</span>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>Type A: On-Chain Revenue Share</div>
                  <div style={{ fontSize: 12, color: C.text3 }}>Trustless fee splits from your vault's smart contract</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 16, fontSize: 12, color: C.text3, marginBottom: 14 }}>
                <span>{"\u2713"} No budget needed</span><span>{"\u2713"} Automatic payouts</span><span>{"\u2713"} Scales with AUM</span>
              </div>
              <Btn full>Create On-Chain Share \u2192</Btn>
            </Card>
            <Card hover style={{ padding: 22, cursor: "pointer", borderColor: `${C.tealBright}15` }} onClick={() => setModal("B")}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 28 }}>{"\uD83D\uDCB3"}</span>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>Type B: Marketing Campaign</div>
                  <div style={{ fontSize: 12, color: C.text3 }}>Budget-funded campaigns with custom KPIs</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 16, fontSize: 12, color: C.text3, marginBottom: 14 }}>
                <span>{"\u2713"} Full budget control</span><span>{"\u2713"} Custom criteria</span><span>{"\u2713"} Pause anytime</span>
              </div>
              <Btn primary full>Create Marketing Campaign \u2192</Btn>
            </Card>
          </div>

          <Card>
            <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>All Campaigns</span>
              <Tabs tabs={[{ id: "all", label: "All" }, { id: "active", label: "Active" }, { id: "paused", label: "Paused" }, { id: "ended", label: "Ended" }]} active={campaignFilter} onChange={setCampaignFilter} />
            </div>
            <Table
              columns={[
                { label: "Campaign", w: "1.6fr", render: r => <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Badge color={r.type === "A" ? C.purple : C.teal}>{r.type === "A" ? "\uD83D\uDD17 A" : "\uD83D\uDCB3 B"}</Badge><div><div style={{ fontWeight: 500, color: C.text }}>{r.name}</div><div style={{ fontSize: 11, color: C.text4 }}>Since {r.startDate}</div></div></div> },
                { label: "Status", w: ".6fr", render: r => <Badge color={r.status === "active" ? C.green : r.status === "paused" ? C.gold : C.text4}>{r.status}</Badge> },
                { label: "Base / Boost", w: ".9fr", render: r => <span>{r.base} / {r.boost}</span> },
                { label: "Partners", w: ".5fr", key: "partners" },
                { label: "AUM", w: ".6fr", render: r => <span style={{ fontWeight: 600, color: C.teal }}>{r.aum}</span> },
                { label: "Loyalty", w: ".5fr", render: r => <span style={{ color: parseInt(r.loyalty) >= 75 ? C.green : C.gold }}>{r.loyalty}</span> },
                { label: "Budget", w: ".8fr", render: r => <span style={{ color: r.type === "A" ? C.text4 : C.text2, fontSize: 12 }}>{r.spent}</span> },
                { label: "", w: ".3fr", align: "right", render: () => <Btn ghost small>{"\u2022\u2022\u2022"}</Btn> },
              ]}
              rows={filteredCampaigns}
            />
          </Card>
        </>)}

        {/* ===== PARTNERS ===== */}
        {page === "partners" && (<>
          <div style={{ display: "flex", gap: 14, marginBottom: 20 }}>
            <StatCard icon={"\uD83E\uDD1D"} label="Total Partners" value="34" accent="teal" />
            <StatCard icon={"\uD83D\uDCB0"} label="Total Payouts" value="$15.1K" accent="green" />
            <StatCard icon={"\u23F1"} label="Avg. Loyalty" value="77%" accent="purple" />
            <StatCard icon={"\u2B50"} label="Boost-Qualified" value="22" accent="green" />
          </div>
          <Card>
            <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>Partner Leaderboard</span>
              <Tabs tabs={[{ id: "all", label: "All" }, { id: "wallets", label: "Wallets" }, { id: "kols", label: "KOLs" }]} active="all" onChange={() => {}} />
            </div>
            <Table
              columns={[
                { label: "#", w: ".3fr", render: (_, i) => <span style={{ fontWeight: 600, color: C.text4 }}>{i + 1}</span> },
                { label: "Partner", w: "1.3fr", render: r => <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Badge color={r.type === "wallet" ? C.teal : C.purple}>{r.type === "wallet" ? "\uD83D\uDC5B" : "\uD83D\uDCE3"}</Badge><span style={{ fontWeight: 500, color: C.text }}>{r.name}</span></div> },
                { label: "AUM", w: ".8fr", render: r => <span style={{ fontWeight: 600, color: C.teal }}>{r.aum}</span> },
                { label: "Deposits", w: ".5fr", key: "deposits" },
                { label: "Payout", w: ".7fr", render: r => <span style={{ color: C.green }}>{r.payout}</span> },
                { label: "Loyalty", w: ".6fr", render: r => (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 48, height: 4, borderRadius: 2, background: C.border }}><div style={{ height: "100%", borderRadius: 2, width: `${r.loyalty}%`, background: r.loyalty >= 80 ? C.green : r.loyalty >= 60 ? C.gold : C.red }} /></div>
                    <span style={{ fontSize: 12, color: r.loyalty >= 80 ? C.green : C.gold }}>{r.loyalty}%</span>
                  </div>
                )},
                { label: "Tier", w: ".5fr", render: r => <Badge color={r.tier === "boost" ? C.green : C.text3}>{r.tier}</Badge> },
                { label: "Campaign", w: ".9fr", render: r => <span style={{ fontSize: 12, color: C.text3 }}>{r.campaign}</span> },
              ]}
              rows={partners}
            />
          </Card>
        </>)}

        {/* ===== MY VAULTS ===== */}
        {page === "vaults" && (<>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <p style={{ margin: 0, fontSize: 14, color: C.text3 }}>Manage your listed vaults and their active campaigns.</p>
            <Btn primary>+ List New Vault</Btn>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {vaults.map((v, i) => <VaultListingCard key={i} vault={v} />)}
          </div>
        </>)}

        {/* ===== REVENUE ===== */}
        {page === "revenue" && (<>
          <div style={{ display: "flex", gap: 14, marginBottom: 20 }}>
            <StatCard icon={"\uD83D\uDCB5"} label="Total Rev. Shared" value="$15.1K" trend={22} accent="green" />
            <StatCard icon={"\uD83D\uDD17"} label="On-Chain (Type A)" value="$9.8K" accent="purple" />
            <StatCard icon={"\uD83D\uDCB3"} label="Marketing (Type B)" value="$5.3K" accent="teal" />
            <StatCard icon={"\uD83D\uDCCA"} label="Avg. Cost per $1K AUM" value="$1.20" accent="purple" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
            <Card style={{ padding: 20 }}><AreaChart data={revData} color={C.purple} label="Revenue Shared (cumulative)" height={170} showGrid /></Card>
            <Card style={{ padding: 20 }}><AreaChart data={[0.8, 1.1, 0.9, 1.3, 1.2, 1.4, 1.1, 1.5, 1.3, 1.2, 1.1, 1.2]} color={C.teal} label="Cost per $1K AUM" height={170} showGrid /></Card>
          </div>

          <Card>
            <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>Payout History</span>
            </div>
            <Table
              columns={[
                { label: "Date", w: ".7fr", key: "date" },
                { label: "Campaign", w: "1.2fr", render: r => <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Badge color={r.type === "A" ? C.purple : C.teal}>{r.type}</Badge><span>{r.campaign}</span></div> },
                { label: "Partner", w: "1fr", key: "partner" },
                { label: "AUM", w: ".7fr", render: r => <span style={{ color: C.teal, fontWeight: 500 }}>{r.aum}</span> },
                { label: "Tier", w: ".5fr", render: r => <Badge color={r.tier === "boost" ? C.green : C.text3}>{r.tier}</Badge> },
                { label: "Amount", w: ".7fr", render: r => <span style={{ fontWeight: 600, color: C.green }}>{r.amount}</span> },
                { label: "Tx", w: ".5fr", render: r => <span style={{ fontSize: 11, color: C.purple, fontFamily: "monospace" }}>{r.tx}</span> },
              ]}
              rows={[
                { date: "Feb 8", type: "A", campaign: "Q2 Revenue Share", partner: "Phantom Wallet", aum: "$423K", tier: "boost", amount: "$846", tx: "0xa3f...2b1" },
                { date: "Feb 8", type: "A", campaign: "Q2 Revenue Share", partner: "@cryptoKOL", aum: "$312K", tier: "boost", amount: "$624", tx: "0xb7e...9c4" },
                { date: "Feb 7", type: "B", campaign: "Growth Sprint", partner: "Nightly App", aum: "$289K", tier: "base", amount: "$433", tx: "0xc1d...5e8" },
                { date: "Feb 7", type: "A", campaign: "Q2 Revenue Share", partner: "Zerion", aum: "$156K", tier: "base", amount: "$156", tx: "0xd4a...7f2" },
                { date: "Feb 6", type: "B", campaign: "Whale Acquisition", partner: "@defi_guru", aum: "$198K", tier: "boost", amount: "$594", tx: "0xe8b...1a6" },
              ]}
            />
          </Card>
        </>)}

        {/* ===== SETTINGS ===== */}
        {page === "settings" && (
          <div style={{ maxWidth: 640, display: "flex", flexDirection: "column", gap: 16 }}>
            <Card style={{ padding: 24 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600 }}>Vault Details</h3>
              {[["Vault Name", "USDC Lending Optimizer"], ["Contract", "0x1a2b3c4d...e5f6g7h8"], ["Chain", "Ethereum"], ["Strategy", "Lending"], ["Current APY", "8.2% \u2014 14.5%"], ["Credora Score", "A+ (87/100)"]].map(([l, v], i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 13, color: C.text3 }}>{l}</span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </Card>
            <Card style={{ padding: 24 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600 }}>Notifications</h3>
              {["New partner joined campaign", "AUM milestone reached", "Campaign budget 80% spent", "Weekly performance digest", "Partner payout completed"].map((n, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 13, color: C.text2 }}>{n}</span>
                  <div style={{ width: 38, height: 22, borderRadius: 11, background: i < 4 ? C.purpleDim2 : C.border, position: "relative", cursor: "pointer", transition: "background .2s" }}>
                    <div style={{ width: 16, height: 16, borderRadius: "50%", background: i < 4 ? C.purple : "rgba(0,0,0,0.15)", position: "absolute", top: 3, left: i < 4 ? 19 : 3, transition: "left .2s" }} />
                  </div>
                </div>
              ))}
            </Card>
            <Card style={{ padding: 24 }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600 }}>Team</h3>
              <p style={{ fontSize: 13, color: C.text3, margin: "0 0 14px" }}>Manage who can create campaigns and view analytics.</p>
              {[["0xAdmin...1234", "Owner", C.purple], ["0xDev...5678", "Manager", C.teal]].map(([addr, role, color], i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 13, fontFamily: "monospace", color: C.text2 }}>{addr}</span>
                  <Badge color={color}>{role}</Badge>
                </div>
              ))}
              <Btn small style={{ marginTop: 12 }}>+ Add team member</Btn>
            </Card>
            <Card style={{ padding: 24, borderColor: C.redDim }}>
              <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 600, color: C.red }}>Danger Zone</h3>
              <p style={{ fontSize: 13, color: C.text3, margin: "0 0 14px" }}>Delist your vault from the Yieldo network. Active campaigns will be settled first.</p>
              <Btn danger>Delist Vault</Btn>
            </Card>
          </div>
        )}
      </main>

      {modal && <CampaignModal type={modal} onClose={() => setModal(null)} />}
    </div>
  );
}
