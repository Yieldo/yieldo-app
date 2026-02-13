import { useState, useMemo, useRef, useEffect } from "react";

const C = {
  bg: "#f8f7fc", white: "#fff", black: "#121212", surfaceAlt: "#faf9fe",
  border: "rgba(0,0,0,.06)", border2: "rgba(0,0,0,.1)",
  text: "#121212", text2: "rgba(0,0,0,.65)", text3: "rgba(0,0,0,.4)", text4: "rgba(0,0,0,.25)",
  purple: "#7A1CCB", purpleLight: "#9E3BFF", purpleDim: "rgba(122,28,203,.06)", purpleDim2: "rgba(122,28,203,.1)",
  purpleGrad: "linear-gradient(100deg,#4B0CA6 0%,#7A1CCB 58%,#9E3BFF 114%)",
  purpleShadow: "0 0 17px rgba(80,14,170,.12)",
  teal: "#2E9AB8", tealBright: "#45C7F2", tealDim: "rgba(69,199,242,.08)",
  green: "#1a9d3f", greenDim: "rgba(26,157,63,.07)",
  red: "#d93636", redBg: "#FFF0F0",
  amber: "#d97706", amberDim: "rgba(217,119,6,.07)", amberBg: "#FFFBEB",
  blue: "#1565C0", blueBg: "#E3F2FD",
  gold: "#b8960a",
};

const SEV = {
  critical: { icon: "🔴", color: C.red, bg: C.redBg, bd: "rgba(217,54,54,.2)" },
  warning: { icon: "🟡", color: C.amber, bg: C.amberBg, bd: "rgba(217,119,6,.2)" },
  info: { icon: "🔵", color: C.blue, bg: C.blueBg, bd: "rgba(21,101,192,.15)" },
};

const Btn = ({ children, primary, small, ghost, active, onClick, style: sx = {} }) => {
  const b = { fontFamily: "'Inter',sans-serif", fontSize: small ? 13 : 14, fontWeight: 500, border: "none", borderRadius: 6, cursor: "pointer", padding: small ? "6px 12px" : "10px 18px", display: "inline-flex", alignItems: "center", gap: 6, transition: "all .15s", ...sx };
  if (primary) return <button onClick={onClick} style={{ ...b, backgroundImage: C.purpleGrad, color: "#fff", boxShadow: C.purpleShadow }}>{children}</button>;
  if (ghost) return <button onClick={onClick} style={{ ...b, background: active ? C.purpleDim : "transparent", color: active ? C.purple : C.text3, fontWeight: active ? 600 : 500 }}>{children}</button>;
  return <button onClick={onClick} style={{ ...b, background: C.white, color: C.text2, border: `1px solid ${C.border2}`, boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>{children}</button>;
};

const Badge = ({ children, color = C.purple, bg }) => <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 4, background: bg || `${color}12`, color, whiteSpace: "nowrap" }}>{children}</span>;

const Card = ({ children, style: sx = {} }) => <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, boxShadow: "0 1px 3px rgba(0,0,0,.03)", ...sx }}>{children}</div>;

function ScoreRing({ score, size = 44, sw = 4 }) {
  const r = (size - sw) / 2, circ = 2 * Math.PI * r, off = circ * (1 - score / 100);
  const col = score >= 80 ? C.green : score >= 60 ? C.gold : score >= 40 ? C.amber : C.red;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(0,0,0,.04)" strokeWidth={sw}/><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={sw} strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"/></svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size < 24 ? 8 : size < 32 ? 10 : 13, fontWeight: 700, color: col }}>{score}</div>
    </div>
  );
}

const ConfBadge = ({ age }) => age >= 90 ? null : <Badge color={C.blue} bg={C.blueBg}>{age<14?"New":age<30?"Early":"Establishing"}</Badge>;

const YieldBadge = ({ t }) => t==="real" ? <Badge color={C.green} bg={C.greenDim}>Real Yield</Badge> : <Badge color={C.teal} bg={C.tealDim}>Incentivized</Badge>;

const FlagBadge = ({ flags, compact }) => {
  if (!flags?.length) return compact ? <span style={{ fontSize: 11, color: C.green, fontWeight: 600 }}>✓ Clean</span> : null;
  const c = flags.filter(f=>f.severity==="critical").length, w = flags.filter(f=>f.severity==="warning").length, inf = flags.filter(f=>f.severity==="info").length;
  if (compact) return <div style={{ display: "flex", gap: 3 }}>{c>0&&<span style={{ fontSize: 11, fontWeight: 700, color: C.red, background: C.redBg, padding: "2px 6px", borderRadius: 4 }}>🔴{c}</span>}{w>0&&<span style={{ fontSize: 11, fontWeight: 700, color: C.amber, background: C.amberBg, padding: "2px 6px", borderRadius: 4 }}>🟡{w}</span>}{inf>0&&<span style={{ fontSize: 11, fontWeight: 600, color: C.blue, background: C.blueBg, padding: "2px 6px", borderRadius: 4 }}>🔵{inf}</span>}</div>;
  return null;
};

const fmtTvl = n => n>=1e6 ? `$${(n/1e6).toFixed(1)}M` : `$${(n/1e3).toFixed(0)}K`;

function APYChart({ data, benchmarkData, width = 560, height = 200 }) {
  const [range, setRange] = useState("90d");
  const [hover, setHover] = useState(null);
  const svgRef = useRef(null);
  const ranges = { "7d": 7, "30d": 30, "90d": 90, "All": data.length };
  const sliced = data.slice(-ranges[range]);
  const benchSliced = benchmarkData.slice(-ranges[range]);
  const allVals = [...sliced, ...benchSliced];
  const mx = Math.max(...allVals), mn = Math.min(...allVals);
  const pad = { t: 20, r: 16, b: 32, l: 44 };
  const cw = width - pad.l - pad.r, ch = height - pad.t - pad.b;
  const rng = mx - mn || 1;
  const toX = i => pad.l + (i / (sliced.length - 1)) * cw;
  const toY = v => pad.t + ch - ((v - mn) / rng) * ch;
  const mainPath = sliced.map((v, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");
  const benchPath = benchSliced.map((v, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");
  const areaPath = mainPath + ` L${toX(sliced.length-1).toFixed(1)},${(pad.t+ch).toFixed(1)} L${toX(0).toFixed(1)},${(pad.t+ch).toFixed(1)} Z`;
  const ySteps = 5;
  const yLines = Array.from({ length: ySteps + 1 }, (_, i) => mn + (rng / ySteps) * i);
  const handleMouse = (e) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const idx = Math.round(((x - pad.l) / cw) * (sliced.length - 1));
    if (idx >= 0 && idx < sliced.length) setHover(idx);
  };
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 12, height: 2, background: C.purple, borderRadius: 1 }} />
            <span style={{ fontSize: 10, color: C.text3 }}>Vault APY</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 12, height: 2, background: C.text4, borderRadius: 1, opacity: .5 }} />
            <span style={{ fontSize: 10, color: C.text4 }}>Aave Benchmark</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          {Object.keys(ranges).map(k => (
            <button key={k} onClick={() => setRange(k)} style={{ padding: "3px 8px", borderRadius: 4, fontSize: 10, fontWeight: range === k ? 600 : 400, background: range === k ? C.purpleDim : "transparent", border: `1px solid ${range === k ? C.purple + "30" : "transparent"}`, color: range === k ? C.purple : C.text4, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>{k}</button>
          ))}
        </div>
      </div>
      <svg ref={svgRef} width={width} height={height} style={{ display: "block", cursor: "crosshair" }} onMouseMove={handleMouse} onMouseLeave={() => setHover(null)}>
        {yLines.map((v, i) => (
          <g key={i}>
            <line x1={pad.l} y1={toY(v)} x2={width - pad.r} y2={toY(v)} stroke="rgba(0,0,0,.04)" strokeWidth="1" />
            <text x={pad.l - 6} y={toY(v) + 3} textAnchor="end" fontSize="9" fill={C.text4} fontFamily="'Inter',sans-serif">{v.toFixed(1)}%</text>
          </g>
        ))}
        {[0, Math.floor(sliced.length * .25), Math.floor(sliced.length * .5), Math.floor(sliced.length * .75), sliced.length - 1].map((idx, i) => (
          <text key={i} x={toX(idx)} y={height - 8} textAnchor="middle" fontSize="9" fill={C.text4} fontFamily="'Inter',sans-serif">{sliced.length - idx}d ago</text>
        ))}
        <path d={areaPath} fill="url(#apyGrad)" />
        <defs><linearGradient id="apyGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.purple} stopOpacity=".12" /><stop offset="100%" stopColor={C.purple} stopOpacity=".01" /></linearGradient></defs>
        <path d={benchPath} fill="none" stroke={C.text4} strokeWidth="1" strokeDasharray="4 3" opacity=".4" />
        <path d={mainPath} fill="none" stroke={C.purple} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {hover !== null && hover < sliced.length && (
          <g>
            <line x1={toX(hover)} y1={pad.t} x2={toX(hover)} y2={pad.t + ch} stroke={C.purple} strokeWidth="1" opacity=".3" strokeDasharray="3 2" />
            <circle cx={toX(hover)} cy={toY(sliced[hover])} r="4" fill={C.purple} stroke="#fff" strokeWidth="2" />
            {hover < benchSliced.length && <circle cx={toX(hover)} cy={toY(benchSliced[hover])} r="3" fill={C.text4} stroke="#fff" strokeWidth="1.5" />}
            <rect x={toX(hover) - 50} y={pad.t - 18} width="100" height="16" rx="4" fill={C.white} stroke={C.border2} />
            <text x={toX(hover)} y={pad.t - 7} textAnchor="middle" fontSize="10" fontWeight="600" fill={C.purple} fontFamily="'Inter',sans-serif">{sliced[hover].toFixed(2)}%{hover < benchSliced.length ? ` vs ${benchSliced[hover].toFixed(2)}%` : ""}</text>
          </g>
        )}
      </svg>
    </div>
  );
}

function ScoreBar({ subScores, weights, finalScore, conf }) {
  const cats = [
    { key: "capital", label: "Capital", w: weights.capital, color: "#6366f1" },
    { key: "performance", label: "Perf.", w: weights.performance, color: C.teal },
    { key: "risk", label: "Risk", w: weights.risk, color: "#ef4444" },
    { key: "trust", label: "Trust", w: weights.trust, color: C.gold },
  ];
  const totalWeighted = cats.reduce((s, c) => s + subScores[c.key] * c.w, 0);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: C.text3 }}>Score Breakdown</span>
        {conf < 1 && <span style={{ fontSize: 10, color: C.blue, fontWeight: 500 }}>× {conf} confidence = {finalScore}</span>}
      </div>
      <div style={{ display: "flex", height: 24, borderRadius: 6, overflow: "hidden", marginBottom: 8 }}>
        {cats.map(c => {
          const contrib = (subScores[c.key] * c.w / 100) * 100;
          return (
            <div key={c.key} title={`${c.label}: ${subScores[c.key]} × ${c.w} = ${(subScores[c.key] * c.w).toFixed(1)}pts`} style={{ width: `${c.w * 100}%`, background: c.color, opacity: .75 + (subScores[c.key] / 100) * .25, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#fff", position: "relative", transition: "opacity .2s" }}>
              {c.w >= .15 && <span>{(subScores[c.key] * c.w).toFixed(0)}</span>}
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        {cats.map(c => (
          <div key={c.key} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: c.color }} />
            <span style={{ fontSize: 10, color: C.text3 }}>{c.label} <strong style={{ color: C.text2 }}>{subScores[c.key]}</strong><span style={{ color: C.text4 }}> × {(c.w * 100).toFixed(0)}%</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}

function makeVault() {
  const v = {
    id: 42, name: "USDC Lending Optimizer", asset: "USDC", platform: "Morpho", curator: "Gauntlet",
    chain: "Ethereum", strategy: "Lending", risk: "Low", riskC: C.green, apy: 7.82,
    yieldoScore: 84, tvl: 24500000, depositors: 847, age: 142, icon: "💵",
    hasCampaign: true, campaignBonus: "+12%", campaignType: "A",
    flags: [
      { id: "F22", severity: "info", label: "Incentivized Yield", trigger: "Yield Composition: 28% incentivized" },
    ],
    critFlags: 0, warnFlags: 0, yieldType: "real", incRatio: 28,
    subScores: { capital: 88, performance: 82, risk: 91, trust: 78 },
    conf: 1.0, maxDD: -1.8, sharpe: 2.1, sortino: 3.2, capRet: 94, avgHold: 67, top5: 18,
    extScores: { Bluechip: true, Credora: true, "DeFi Safety": true, Exponential: false },
    apyVsBenchmark: 1.42,
    tvlChange7d: 3.2, tvlChange30d: 12.1, netFlows7d: 1200000, pendingPct: 2.1,
    incidentCount: 0, depegEvents: 0, pauseEvents: 0, withdrawalType: "Instant",
    hodlRatio: 72, netDep30d: 23, quickExitRate: 8, avgDepDuration: 54,
    holders90plus: 312, holders90trend: 5,
  };
  const apyHistory = []; const benchHistory = [];
  let apy = 6.5; let bench = 4.8;
  for (let i = 0; i < 180; i++) {
    apy += (Math.random() - .48) * .3; apy = Math.max(3, Math.min(14, apy));
    bench += (Math.random() - .5) * .08; bench = Math.max(2, Math.min(7, bench));
    apyHistory.push(apy); benchHistory.push(bench);
  }
  v.apyHistory = apyHistory; v.benchHistory = benchHistory;
  return v;
}

const MR = ({ label, value, unit, trend, flag, desc, trigger }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
        {label}
        {flag && <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 5px", borderRadius: 3, background: SEV[flag].bg, color: SEV[flag].color }}>{SEV[flag].icon}</span>}
      </div>
      {desc && <div style={{ fontSize: 11, color: C.text4, marginTop: 2 }}>{desc}</div>}
      {trigger && <div style={{ fontSize: 10, color: SEV[flag]?.color || C.text4, marginTop: 2, fontStyle: "italic" }}>→ Triggers: {trigger}</div>}
    </div>
    <div style={{ textAlign: "right", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
      {trend !== undefined && <span style={{ fontSize: 11, fontWeight: 600, color: trend >= 0 ? C.green : C.red }}>{trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}%</span>}
      <span style={{ fontSize: 15, fontWeight: 700 }}>{value}{unit && <span style={{ fontSize: 11, fontWeight: 400, color: C.text3, marginLeft: 2 }}>{unit}</span>}</span>
    </div>
  </div>
);

export default function VaultDetailPage({ vault, onBack }) {
  const base = useMemo(() => makeVault(), []);
  const v = useMemo(() => {
    if (!vault) return base;
    return {
      ...base,
      ...vault,
      name: vault.name,
      asset: vault.asset,
      platform: vault.platform,
      curator: vault.curator,
      chain: vault.chain,
      risk: vault.risk,
      riskC: vault.riskC || base.riskC,
      apy: vault.apy ?? base.apy,
      yieldoScore: vault.yieldoScore ?? base.yieldoScore,
      tvl: vault.tvl ?? base.tvl,
      depositors: vault.depositors ?? base.depositors,
      age: vault.age ?? base.age,
      yieldType: vault.yieldType || base.yieldType,
      subScores: vault.subScores || base.subScores,
      conf: vault.conf || base.conf,
      maxDD: vault.maxDD ?? base.maxDD,
      sharpe: vault.sharpe ?? base.sharpe,
      capRet: vault.capRet ?? base.capRet,
      avgHold: vault.avgHold ?? base.avgHold,
      top5: vault.top5 ?? base.top5,
      extScores: vault.extScores || base.extScores,
    };
  }, [vault, base]);
  const weights = { capital: .20, performance: .20, risk: .35, trust: .25 };
  return (
    <div style={{ fontFamily: "'Inter',sans-serif", background: C.bg, color: C.text, minHeight: "100vh" }}>
      <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: "14px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 30, height: 30, borderRadius: 7, backgroundImage: C.purpleGrad, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: "#fff", fontWeight: 700, fontSize: 12 }}>Y</span></div>
          <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: ".05em" }}>YIELDO</span><span style={{ color: C.text4, margin: "0 4px" }}>/</span>
          <button style={{ fontSize: 14, fontWeight: 500, color: C.purple, background: "none", border: "none", cursor: "pointer", fontFamily: "'Inter',sans-serif" }} onClick={onBack}>← Vault Catalog</button>
          <span style={{ color: C.text4 }}>/</span><span style={{ fontSize: 14, fontWeight: 500, color: C.text2 }}>{v.name}</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}><Btn small>⚖️ Compare</Btn><Btn primary small>+ Add to My Vaults</Btn></div>
      </div>
      <div style={{ padding: "24px 32px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
          <Card style={{ flex: "1 1 0", padding: 24 }}>
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 20 }}>
              <ScoreRing score={v.yieldoScore} size={72} sw={6} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 20, fontWeight: 700 }}>{v.name}</span>
                  <ConfBadge age={v.age} />
                </div>
                <div style={{ fontSize: 13, color: C.text3, marginBottom: 12 }}>{v.platform} · Curated by {v.curator} · {v.chain}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <Badge color={v.riskC}>{v.risk} Risk</Badge>
                  <YieldBadge t={v.yieldType} />
                  <Badge color={C.text3} bg={C.surfaceAlt}>{v.asset}</Badge>
                  <Badge color={C.text3} bg={C.surfaceAlt}>{v.chain}</Badge>
                  <Badge color={C.text3} bg={C.surfaceAlt}>{v.age}d old</Badge>
                </div>
              </div>
            </div>
            <ScoreBar subScores={v.subScores} weights={weights} finalScore={v.yieldoScore} conf={v.conf} />
          </Card>
          <div style={{ width: 280, display: "flex", flexDirection: "column", gap: 10 }}>
            <Card style={{ padding: "16px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div>
                  <div style={{ fontSize: 10, color: C.text4, fontWeight: 600, textTransform: "uppercase" }}>Current APY</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: C.purple, margin: "2px 0" }}>{v.apy.toFixed(2)}%</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: C.text4, fontWeight: 600, textTransform: "uppercase" }}>vs. Benchmark</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: v.apyVsBenchmark >= 1.2 ? C.green : C.text2, marginTop: 2 }}>{v.apyVsBenchmark.toFixed(2)}×</div>
                  <div style={{ fontSize: 10, color: C.text4 }}>Aave USDC</div>
                </div>
              </div>
              <div style={{ height: 1, background: C.border, margin: "8px 0" }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div style={{ textAlign: "center", padding: "6px 0" }}>
                  <div style={{ fontSize: 10, color: C.text4, fontWeight: 600, textTransform: "uppercase" }}>SHARPE</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: v.sharpe >= 1.5 ? C.green : v.sharpe >= 1 ? C.gold : C.text2 }}>{v.sharpe}</div>
                </div>
                <div style={{ textAlign: "center", padding: "6px 0" }}>
                  <div style={{ fontSize: 10, color: C.text4, fontWeight: 600, textTransform: "uppercase" }}>MAX DD</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: v.maxDD < -5 ? C.red : C.text2 }}>{v.maxDD}%</div>
                </div>
              </div>
            </Card>
            <Card style={{ padding: "16px 20px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: C.text4, fontWeight: 600, textTransform: "uppercase" }}>TVL</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{fmtTvl(v.tvl)}</div>
                  <div style={{ fontSize: 10, color: v.tvlChange7d >= 0 ? C.green : C.red, fontWeight: 500 }}>{v.tvlChange7d >= 0 ? "▲" : "▼"} {Math.abs(v.tvlChange7d)}% 7d</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: C.text4, fontWeight: 600, textTransform: "uppercase" }}>DEPOSITORS</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{v.depositors.toLocaleString()}</div>
                  <div style={{ fontSize: 10, color: C.green, fontWeight: 500 }}>+{v.netDep30d} net/30d</div>
                </div>
              </div>
              {v.hasCampaign && <div style={{ marginTop: 10, padding: "6px 10px", borderRadius: 6, background: C.greenDim, border: `1px solid ${C.green}20`, textAlign: "center" }}><span style={{ fontSize: 11, fontWeight: 600, color: C.green }}>🎯 Campaign: {v.campaignBonus} rev share</span></div>}
            </Card>
          </div>
        </div>
        <Card style={{ padding: "20px 24px", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 16 }}>📈</span>
            <span style={{ fontSize: 15, fontWeight: 700 }}>APY History</span>
          </div>
          <APYChart data={v.apyHistory} benchmarkData={v.benchHistory} width={1110} height={220} />
        </Card>
        {v.flags.length > 0 && (
          <Card style={{ padding: "16px 20px", marginBottom: 16, border: v.critFlags > 0 ? `1.5px solid ${C.red}30` : v.warnFlags > 0 ? `1.5px solid ${C.amber}30` : `1px solid ${C.border}`, background: v.critFlags > 0 ? `${C.redBg}cc` : C.white }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Active Flags ({v.flags.length})</span>
              <FlagBadge flags={v.flags} compact />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {v.flags.map((f, i) => {
                const s = SEV[f.severity];
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, background: s.bg, border: `1px solid ${s.bd}` }}>
                    <span style={{ fontSize: 14 }}>{s.icon}</span>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: s.color }}>{f.label}</span>
                      <span style={{ fontSize: 11, color: C.text3, marginLeft: 8 }}>{f.id}</span>
                      {f.trigger && <div style={{ fontSize: 10, color: s.color, marginTop: 2, opacity: .8 }}>Triggered by: {f.trigger}</div>}
                    </div>
                    <Badge color={s.color} bg={s.bg}>{f.severity.toUpperCase()}</Badge>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Card style={{ padding: "20px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: "#6366f1" }} />
              <span style={{ fontSize: 15, fontWeight: 700 }}>Capital</span>
              <ScoreRing score={v.subScores.capital} size={28} sw={3} />
              <span style={{ fontSize: 11, color: C.text4, marginLeft: "auto" }}>20% weight</span>
            </div>
            <MR label="Total Value Locked" value={fmtTvl(v.tvl)} trend={v.tvlChange7d} />
            <MR label="TVL Change (30d)" value={`${v.tvlChange30d > 0 ? "+" : ""}${v.tvlChange30d}`} unit="%" />
            <MR label="Net Flows (7d)" value={`+$${(v.netFlows7d / 1e6).toFixed(1)}M`} />
            <MR label="Unique Depositors" value={v.depositors.toLocaleString()} flag={v.depositors < 50 ? "warning" : undefined} trigger={v.depositors < 50 ? "F08: <50 depositors" : undefined} />
            <MR label="Pending Withdrawals" value={v.pendingPct.toFixed(1)} unit="% TVL" flag={v.pendingPct > 10 ? "warning" : undefined} />
          </Card>
          <Card style={{ padding: "20px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: C.teal }} />
              <span style={{ fontSize: 15, fontWeight: 700 }}>Performance</span>
              <ScoreRing score={v.subScores.performance} size={28} sw={3} />
              <span style={{ fontSize: 11, color: C.text4, marginLeft: "auto" }}>20% weight</span>
            </div>
            <MR label="Realized APY (30d)" value={v.apy.toFixed(2)} unit="%" />
            <MR label="APY vs. Benchmark" value={`${v.apyVsBenchmark.toFixed(2)}×`} desc="vs. Aave USDC supply rate" />
            <MR label="Sharpe Ratio (365d)" value={v.sharpe.toFixed(1)} desc={v.age < 90 ? "⚠️ Insufficient data (<90d)" : undefined} />
            <MR label="Sortino Ratio (365d)" value={v.sortino.toFixed(1)} />
            <MR label="Max Drawdown (90d)" value={v.maxDD} unit="%" flag={v.maxDD < -10 ? "critical" : v.maxDD < -5 ? "warning" : undefined} trigger={v.maxDD < -5 ? "F: Max DD >5%" : undefined} />
            <MR label="Yield Composition" value={`${100 - v.incRatio}% real`} desc={`${v.incRatio}% from incentives`} flag={v.incRatio > 50 ? "critical" : v.incRatio > 25 ? "warning" : undefined} trigger={v.incRatio > 25 ? `F17: Incentive ratio ${v.incRatio}%` : undefined} />
          </Card>
          <Card style={{ padding: "20px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: "#ef4444" }} />
              <span style={{ fontSize: 15, fontWeight: 700 }}>Risk</span>
              <ScoreRing score={v.subScores.risk} size={28} sw={3} />
              <span style={{ fontSize: 11, color: C.text4, marginLeft: "auto" }}>35% weight</span>
            </div>
            <MR label="Incident Count (365d)" value={v.incidentCount} flag={v.incidentCount > 0 ? "critical" : undefined} />
            <MR label="Asset Depeg Events" value={v.depegEvents} desc="Price deviation >3% from peg" />
            <MR label="Top-5 Concentration" value={v.top5} unit="%" flag={v.top5 > 40 ? "warning" : undefined} desc="Share of TVL held by top 5 wallets" trigger={v.top5 > 40 ? `F: Top-5 > 40%` : undefined} />
            <MR label="Withdrawal Type" value={v.withdrawalType} flag={v.withdrawalType === "Async" ? "info" : undefined} />
            <MR label="Vault Pause Events" value={v.pauseEvents} flag={v.pauseEvents > 0 ? "critical" : undefined} trigger={v.pauseEvents > 0 ? "F01: Vault paused" : undefined} />
            <MR label="Pending Withdrawals" value={v.pendingPct.toFixed(1)} unit="% TVL" flag={v.pendingPct > 10 ? "warning" : undefined} />
          </Card>
          <Card style={{ padding: "20px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: C.gold }} />
              <span style={{ fontSize: 15, fontWeight: 700 }}>Trust</span>
              <ScoreRing score={v.subScores.trust} size={28} sw={3} />
              <span style={{ fontSize: 11, color: C.text4, marginLeft: "auto" }}>25% weight</span>
            </div>
            <MR label="Capital Retention (30d)" value={v.capRet} unit="%" flag={v.capRet < 50 ? "critical" : v.capRet < 70 ? "warning" : undefined} trigger={v.capRet < 70 ? `F09/F19: Retention ${v.capRet}%` : undefined} />
            <MR label="Avg Holding Days" value={v.avgHold} unit="days" flag={v.avgHold < 3 ? "critical" : v.avgHold < 10 ? "warning" : undefined} />
            <MR label="Holders 90+ Days" value={v.holders90plus} trend={v.holders90trend} />
            <MR label="HODL Ratio" value={v.hodlRatio} unit="%" desc="% of TVL held >60 days" />
            <MR label="Net Depositors (30d)" value={`+${v.netDep30d}`} />
            <MR label="Quick Exit Rate" value={v.quickExitRate} unit="%" desc="% exiting within 7 days" flag={v.quickExitRate > 25 ? "warning" : undefined} />
            <MR label="Avg Deposit Duration" value={v.avgDepDuration} unit="days" />
          </Card>
        </div>
        <Card style={{ padding: "16px 20px", marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 16 }}>📊</span>
            <span style={{ fontSize: 15, fontWeight: 700 }}>Data Confidence</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16 }}>
            {[
              { lbl: "Vault Age", val: `${v.age}`, unit: "days", sub: v.age >= 90 ? "Mature" : v.age >= 60 ? "Establishing" : v.age >= 30 ? "Early" : "New", col: v.age >= 90 ? C.green : C.blue },
              { lbl: "Confidence", val: `${~~(v.conf * 100)}%`, sub: v.conf < 1 ? `Score discounted ${~~((1 - v.conf) * 100)}%` : "Full score — no discount", col: v.conf < .8 ? C.amber : C.green },
              { lbl: "NAV History", val: `${Math.min(v.age, 365)}`, unit: "days", sub: v.age >= 90 ? "Sharpe/Sortino available" : v.age >= 30 ? "30d metrics only" : "Limited data", col: v.age >= 90 ? C.green : C.amber },
            ].map((d, i) => (
              <div key={i} style={{ padding: 12, borderRadius: 8, background: C.surfaceAlt, textAlign: "center" }}>
                <div style={{ fontSize: 10, color: C.text4, fontWeight: 600, textTransform: "uppercase" }}>{d.lbl}</div>
                <div style={{ fontSize: 20, fontWeight: 700, margin: "4px 0", color: d.col }}>{d.val}{d.unit && <span style={{ fontSize: 12, fontWeight: 400, color: C.text3 }}> {d.unit}</span>}</div>
                <div style={{ fontSize: 10, color: C.text3 }}>{d.sub}</div>
              </div>
            ))}
            <div style={{ padding: 12, borderRadius: 8, background: C.surfaceAlt, textAlign: "center" }}>
              <div style={{ fontSize: 10, color: C.text4, fontWeight: 600, textTransform: "uppercase" }}>External Ratings</div>
              <div style={{ display: "flex", gap: 3, justifyContent: "center", margin: "8px 0", flexWrap: "wrap" }}>
                {Object.entries(v.extScores).map(([k, has]) => <span key={k} style={{ fontSize: 9, padding: "2px 5px", borderRadius: 3, background: has ? C.greenDim : "rgba(0,0,0,.03)", color: has ? C.green : C.text4, fontWeight: has ? 600 : 400 }}>{has ? "✓" : "—"} {k}</span>)}
              </div>
            </div>
          </div>
        </Card>
        <div style={{ padding: "12px 16px", borderRadius: 8, background: C.amberDim, border: `1px solid ${C.amber}20`, marginTop: 16, display: "flex", gap: 10 }}>
          <span style={{ fontSize: 14 }}>⚠️</span>
          <div style={{ fontSize: 11, color: "rgba(0,0,0,.5)", lineHeight: 1.5 }}><strong>Disclaimer:</strong> Yieldo Scores and all metrics are for <strong>data visualization only</strong> — not financial advice. Past performance ≠ future results.</div>
        </div>
      </div>
    </div>
  );
}


