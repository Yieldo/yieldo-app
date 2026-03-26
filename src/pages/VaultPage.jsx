import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAccount, useDisconnect } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useVaults } from "../hooks/useVaultData.js";
import { useWalletBalances } from "../hooks/useWalletBalances.js";

function useWindowWidth() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return w;
}

const C = {
  bg: "#f8f7fc", white: "#fff", black: "#121212", surfaceAlt: "#faf9fe",
  border: "rgba(0,0,0,.06)", border2: "rgba(0,0,0,.1)",
  text: "#121212", text2: "rgba(0,0,0,.65)", text3: "rgba(0,0,0,.4)", text4: "rgba(0,0,0,.25)",
  purple: "#7A1CCB", purpleLight: "#9E3BFF", purpleDim: "rgba(122,28,203,.06)", purpleDim2: "rgba(122,28,203,.1)",
  purpleGrad: "linear-gradient(100deg,#4B0CA6 0%,#7A1CCB 58%,#9E3BFF 114%)",
  purpleShadow: "0 0 17px rgba(80,14,170,.12)",
  teal: "#2E9AB8", tealBright: "#45C7F2", tealDim: "rgba(69,199,242,.08)",
  green: "#1a9d3f", greenDim: "rgba(26,157,63,.07)",
  red: "#d93636", redDim: "rgba(217,54,54,.06)", redBg: "#FFF0F0",
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

const Card = ({ children, style: sx = {}, onClick }) => <div onClick={onClick} style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, boxShadow: "0 1px 3px rgba(0,0,0,.03)", ...sx }}>{children}</div>;

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

const fmtTvl = n => {
  if (n === 0 || n === null || n === undefined) return "$0";
  if (n >= 1e9) return `$${(n/1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n/1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n/1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

function Sparkline({ data, height = 32, color = C.tealBright, width: fixedWidth }) {
  if (!data || data.length < 2) return null;
  const [hover, setHover] = useState(null);
  const [dims, setDims] = useState({ w: fixedWidth || 120 });
  const containerRef = useCallback((node) => {
    if (!node) return;
    const w = fixedWidth || node.clientWidth || 120;
    setDims({ w });
  }, [fixedWidth]);
  const w = dims.w;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * w,
    y: height - ((v - min) / range) * (height - 4) - 2,
    val: v,
  }));
  const polyline = pts.map(p => `${p.x},${p.y}`).join(" ");
  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    let closest = 0, bestDist = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const d = Math.abs(pts[i].x - mx);
      if (d < bestDist) { bestDist = d; closest = i; }
    }
    setHover({ idx: closest, x: pts[closest].x, y: pts[closest].y, val: pts[closest].val });
  };
  return (
    <div ref={containerRef} style={{ position: "relative", width: fixedWidth || "100%", height }}>
      <svg width={w} height={height} style={{ display: "block", width: fixedWidth || "100%" }}
        onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <polyline points={polyline} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" opacity={0.7}/>
        {hover && <circle cx={hover.x} cy={hover.y} r={3} fill={color} stroke="#fff" strokeWidth={1.5}/>}
      </svg>
      {hover && (
        <div style={{ position: "absolute", left: Math.min(hover.x, w - 60), top: -20, background: C.black, color: "#fff", fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4, pointerEvents: "none", whiteSpace: "nowrap" }}>
          {fmtTvl(hover.val)}
        </div>
      )}
    </div>
  );
}

const Chip = ({ label, active, onClick, count, icon, small: sm }) => (
  <button onClick={onClick} style={{ padding: sm ? "4px 8px" : "6px 11px", borderRadius: 6, fontSize: sm ? 11 : 12, fontWeight: active ? 600 : 400, background: active ? C.purpleDim : "transparent", border: `1px solid ${active ? C.purple+"30" : C.border}`, color: active ? C.purple : C.text3, cursor: "pointer", fontFamily: "'Inter',sans-serif", display: "inline-flex", alignItems: "center", gap: 4, transition: "all .15s", whiteSpace: "nowrap" }}>
    {icon && <span style={{ fontSize: sm ? 10 : 12 }}>{icon}</span>}{label}
    {count !== undefined && <span style={{ fontSize: 10, padding: "1px 5px", borderRadius: 10, background: active ? C.purple+"18" : "rgba(0,0,0,.04)", color: active ? C.purple : C.text4 }}>{count}</span>}
  </button>
);

const ActivePill = ({ label, onRemove }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px 3px 10px", borderRadius: 20, background: C.purpleDim, color: C.purple, fontSize: 11, fontWeight: 500 }}>
    {label}
    <span onClick={onRemove} style={{ cursor: "pointer", fontSize: 10, opacity: .6, marginLeft: 2, lineHeight: 1 }}>✕</span>
  </span>
);

const FL = ({ children }) => <div style={{ fontSize: 10, fontWeight: 600, color: C.text4, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>{children}</div>;

const NumInput = ({ label, value, onChange, prefix, suffix, width }) => (
  <div>
    {label && <FL>{label}</FL>}
    <div style={{ display: "flex", alignItems: "center", gap: 2, background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: "0 8px", ...(width ? { width } : {}) }}>
      {prefix && <span style={{ fontSize: 11, color: C.text4 }}>{prefix}</span>}
      <input type="number" value={value||""} onChange={e=>onChange(e.target.value===""?0:+e.target.value)} placeholder="Any" style={{ width: "100%", padding: "6px 2px", border: "none", background: "transparent", fontSize: 12, fontFamily: "'Inter',sans-serif", color: C.text, outline: "none" }}/>
      {suffix && <span style={{ fontSize: 11, color: C.text4, whiteSpace: "nowrap" }}>{suffix}</span>}
    </div>
  </div>
);

function TagInput({ label, allOptions, selected, onChange }) {
  const [inp, setInp] = useState(""); const [show, setShow] = useState(false);
  const matches = inp.length > 0 ? allOptions.filter(o => o.toLowerCase().includes(inp.toLowerCase()) && !selected.includes(o)) : [];
  return (
    <div style={{ position: "relative" }}>
      {label && <FL>{label}</FL>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: "4px 6px", minHeight: 32, background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 6, alignItems: "center" }}>
        {selected.map(t => <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 6px", borderRadius: 4, background: C.purpleDim, color: C.purple, fontSize: 11, fontWeight: 500 }}>{t}<span onClick={() => onChange(selected.filter(x=>x!==t))} style={{ cursor: "pointer", fontSize: 10, opacity: .6 }}>✕</span></span>)}
        <input value={inp} onChange={e=>{setInp(e.target.value);setShow(true)}} onFocus={()=>setShow(true)} onBlur={()=>setTimeout(()=>setShow(false),150)} placeholder={selected.length===0?"Type to search...":""} style={{ border: "none", background: "transparent", fontSize: 12, fontFamily: "'Inter',sans-serif", color: C.text, outline: "none", flex: 1, minWidth: 80, padding: "2px 0" }}/>
      </div>
      {show && matches.length > 0 && <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 2, background: C.white, border: `1px solid ${C.border2}`, borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,.1)", zIndex: 20, maxHeight: 160, overflow: "auto" }}>{matches.map(m=><div key={m} onMouseDown={()=>{onChange([...selected,m]);setInp("")}} style={{ padding: "7px 12px", fontSize: 12, cursor: "pointer", color: C.text2 }} onMouseEnter={e=>e.currentTarget.style.background=C.surfaceAlt} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>{m}</div>)}</div>}
    </div>
  );
}

const FlagBadge = ({ flags, compact }) => {
  if (!flags?.length) return compact ? <span style={{ fontSize: 11, color: C.green, fontWeight: 600 }}>✓ Clean</span> : null;
  const c = flags.filter(f=>f.severity==="critical").length, w = flags.filter(f=>f.severity==="warning").length, inf = flags.filter(f=>f.severity==="info").length;
  if (compact) return <div style={{ display: "flex", gap: 3 }}>{c>0&&<span style={{ fontSize: 11, fontWeight: 700, color: C.red, background: C.redBg, padding: "2px 6px", borderRadius: 4 }}>🔴{c}</span>}{w>0&&<span style={{ fontSize: 11, fontWeight: 700, color: C.amber, background: C.amberBg, padding: "2px 6px", borderRadius: 4 }}>🟡{w}</span>}{inf>0&&<span style={{ fontSize: 11, fontWeight: 600, color: C.blue, background: C.blueBg, padding: "2px 6px", borderRadius: 4 }}>🔵{inf}</span>}</div>;
  return <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{flags.map((f,idx)=>{const s=SEV[f.severity];return <span key={idx} style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4, background: s.bg, color: s.color, border: `1px solid ${s.bd}`, whiteSpace: "nowrap" }}>{s.icon} {f.label}</span>})}</div>;
};

const ConfBadge = ({ age }) => age >= 90 ? null : <Badge color={C.blue} bg={C.blueBg}>{age<14?"New":age<30?"Early":"Establishing"}</Badge>;

const YieldBadge = ({ t }) => t==="real" ? <Badge color={C.green} bg={C.greenDim}>Real Yield</Badge> : <Badge color={C.teal} bg={C.tealDim}>Incentivized</Badge>;

const ATYPES = [
  { id: "stablecoin", label: "Stablecoin", icon: "💵", assets: ["USDC","USDT","DAI","FRAX","GHO","crvUSD","PYUSD","SUSD","EURC","USDS","USDA"] },
  { id: "eth", label: "ETH", icon: "⟠", assets: ["ETH","stETH","wstETH","cbETH","rETH","WETH","RE7LRT","WSTETH"] },
  { id: "btc", label: "BTC", icon: "₿", assets: ["WBTC","tBTC","cbBTC","CBBTC","LBTC","UBTC"] },
  { id: "other", label: "Other", icon: "💎", assets: ["LINK","UNI","ARB","OP","WHYPE","WMON"] },
];



function SearchableSelect({ label, options, value, onChange, placeholder = "All" }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = search ? options.filter(o => o.toLowerCase().includes(search.toLowerCase())) : options;
  return (
    <div style={{ minWidth: 140, position: "relative" }}>
      {label && <FL>{label}</FL>}
      <div onClick={() => setOpen(!open)} style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${value ? C.purple + "40" : C.border2}`, fontSize: 12, fontFamily: "'Inter',sans-serif", color: value ? C.purple : C.text3, background: value ? C.purpleDim : C.white, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>{value || placeholder}</span>
        <span style={{ fontSize: 10, color: C.text4 }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, background: C.white, border: `1px solid ${C.border2}`, borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,.12)", zIndex: 30, maxHeight: 220, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "6px 8px", borderBottom: `1px solid ${C.border}` }}>
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ width: "100%", padding: "5px 8px", borderRadius: 4, border: `1px solid ${C.border}`, fontSize: 12, fontFamily: "'Inter',sans-serif", outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ overflow: "auto", maxHeight: 170 }}>
            <div onClick={() => { onChange(""); setOpen(false); setSearch(""); }} style={{ padding: "7px 12px", fontSize: 12, cursor: "pointer", color: !value ? C.purple : C.text2, fontWeight: !value ? 600 : 400, background: !value ? C.purpleDim : "transparent" }} onMouseEnter={e => e.currentTarget.style.background = C.surfaceAlt} onMouseLeave={e => e.currentTarget.style.background = !value ? C.purpleDim : "transparent"}>{placeholder}</div>
            {filtered.map(o => (
              <div key={o} onClick={() => { onChange(o); setOpen(false); setSearch(""); }} style={{ padding: "7px 12px", fontSize: 12, cursor: "pointer", color: value === o ? C.purple : C.text2, fontWeight: value === o ? 600 : 400, background: value === o ? C.purpleDim : "transparent" }} onMouseEnter={e => e.currentTarget.style.background = C.surfaceAlt} onMouseLeave={e => e.currentTarget.style.background = value === o ? C.purpleDim : "transparent"}>{o}</div>
            ))}
            {filtered.length === 0 && <div style={{ padding: "12px", fontSize: 11, color: C.text4, textAlign: "center" }}>No matches</div>}
          </div>
        </div>
      )}
      {open && <div onClick={() => { setOpen(false); setSearch(""); }} style={{ position: "fixed", inset: 0, zIndex: 29 }} />}
    </div>
  );
}

const fmtNum = (n, suffix = "") => {
  if (n === null || n === undefined || n === "Insufficient Data") return "N/A";
  return typeof n === "number" ? `${n.toFixed(1)}${suffix}` : `${n}${suffix}`;
};

function DashboardTab({ vaults, navigate }) {
  const winW = useWindowWidth();
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { balances, totalIdle } = useWalletBalances();
  const topVaults = useMemo(() => vaults.filter(v => v.yieldoScore >= 70 && v.critFlags === 0).sort((a, b) => b.yieldoScore - a.yieldoScore).slice(0, 5), [vaults]);
  const bestApy = topVaults[0]?.apy || 0;
  const monthlyEarn = (totalIdle * bestApy / 100) / 12;
  const totalTvl = useMemo(() => vaults.reduce((s, v) => s + (v.tvl || 0), 0), [vaults]);
  const avgApy = useMemo(() => vaults.length ? vaults.reduce((s, v) => s + (v.apy || 0), 0) / vaults.length : 0, [vaults]);
  const fmtTvlD = n => { if (n >= 1e9) return `$${(n/1e9).toFixed(2)}B`; if (n >= 1e6) return `$${(n/1e6).toFixed(1)}M`; return `$${(n/1e3).toFixed(0)}K`; };
  const fmtUsd = n => `$${n.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 20px" }}>
      {/* Hero — connected with idle balance */}
      {isConnected && totalIdle > 0 ? (
        <div style={{ backgroundImage: C.purpleGrad, borderRadius: 14, padding: "24px 28px", marginBottom: 20, color: "#fff", boxShadow: C.purpleShadow, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -30, right: -30, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,.05)" }} />
          <div style={{ position: "relative" }}>
            <div style={{ fontSize: 12, opacity: .7, marginBottom: 6 }}>Your idle stablecoins</div>
            <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>{fmtUsd(totalIdle)} earning 0%</div>
            <div style={{ fontSize: 14, opacity: .85, marginBottom: 16 }}>At <strong>{bestApy.toFixed(2)}% APY</strong> (best scored vault) that's <strong>{fmtUsd(monthlyEarn)}/month</strong> you're leaving on the table.</div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button onClick={() => navigate("/vault")} style={{ background: "#fff", color: C.purple, border: "none", borderRadius: 8, padding: "11px 24px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter',sans-serif", boxShadow: "0 2px 8px rgba(0,0,0,.1)" }}>Browse scored vaults →</button>
              <button onClick={() => navigate("/apply")} style={{ background: "rgba(255,255,255,.2)", color: "#fff", border: "2px solid rgba(255,255,255,.5)", borderRadius: 8, padding: "9px 22px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>Become a Partner</button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ backgroundImage: C.purpleGrad, borderRadius: 14, padding: "28px 28px", marginBottom: 20, color: "#fff", boxShadow: C.purpleShadow, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -30, right: -30, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,.05)" }} />
          <div style={{ position: "relative" }}>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Curated on-chain yield — scored for safety</div>
            <div style={{ fontSize: 13, opacity: .85, marginBottom: 18, maxWidth: 500 }}>Yieldo scores DeFi vaults across Capital, Performance, Risk, and Trust so you can find the best yield without the guesswork.</div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {!isConnected && <button onClick={openConnectModal} style={{ background: "#fff", color: C.purple, border: "none", borderRadius: 8, padding: "11px 24px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter',sans-serif", boxShadow: "0 2px 8px rgba(0,0,0,.1)" }}>Connect Wallet</button>}
              <button onClick={() => navigate("/vault")} style={{ background: "#fff", color: C.purple, border: "none", borderRadius: 8, padding: "11px 24px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter',sans-serif", boxShadow: "0 2px 8px rgba(0,0,0,.1)" }}>Browse Vaults →</button>
              <button onClick={() => navigate("/apply")} style={{ background: "rgba(255,255,255,.2)", color: "#fff", border: "2px solid rgba(255,255,255,.5)", borderRadius: 8, padding: "9px 22px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>Become a Partner</button>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Balances — only when connected */}
      {isConnected && balances && (
        <div style={{ display: "grid", gridTemplateColumns: winW >= 640 ? `repeat(${Math.min(Object.keys(balances).length, 4)}, 1fr)` : "repeat(2, 1fr)", gap: 10, marginBottom: 20 }}>
          {Object.entries(balances).filter(([, b]) => b.balance > 0).map(([key, b]) => {
            const isStable = ["USDC", "USDT", "DAI"].includes(b.symbol);
            return (
              <div key={key} style={{ background: C.white, borderRadius: 11, border: `1px solid ${C.border}`, padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 14 }}>{b.icon}</span>
                  <span style={{ fontSize: 12, color: C.text3, fontWeight: 500 }}>{b.symbol}</span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{isStable ? fmtUsd(b.balance) : `${b.balance.toFixed(4)}`}</div>
                {b.chains && b.chains.length > 1 && (
                  <div style={{ fontSize: 9, color: C.text4, marginTop: 3 }}>
                    {b.chains.map((c, ci) => <span key={ci}>{ci > 0 ? " · " : ""}{c.chain}: {isStable ? fmtUsd(c.balance) : c.balance.toFixed(3)}</span>)}
                  </div>
                )}
                {isStable && b.balance > 0 && (
                  <div style={{ fontSize: 10, color: C.red, marginTop: 3, display: "flex", alignItems: "center", gap: 3 }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: C.red, display: "inline-block" }} />
                    Earning 0% — could earn {fmtUsd((b.balance * bestApy / 100) / 12)}/mo
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: winW >= 640 ? "repeat(4,1fr)" : "repeat(2,1fr)", gap: 10, marginBottom: 24 }}>
        {[
          { icon: "🏦", label: "Total Vaults", value: vaults.length },
          { icon: "💰", label: "Total TVL", value: fmtTvlD(totalTvl) },
          { icon: "📈", label: "Avg APY", value: `${avgApy.toFixed(2)}%` },
          { icon: "🔗", label: "Chains", value: new Set(vaults.map(v => v.chain)).size },
        ].map((s, i) => (
          <div key={i} style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: C.purpleDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{s.icon}</div>
              <span style={{ fontSize: 12, color: C.text3, fontWeight: 500 }}>{s.label}</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Top Picks */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Top Scored Vaults</div>
            <div style={{ fontSize: 12, color: C.text3, marginTop: 2 }}>Score ≥ 70 · No critical flags</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {topVaults.map(v => {
            const userStable = totalIdle;
            const mp = (userStable * v.apy / 100) / 12;
            return (
              <div key={v.id} onClick={() => navigate(`/vault/${encodeURIComponent(v.id)}`)}
                style={{ background: C.white, borderRadius: 11, border: `1px solid ${C.border}`, padding: "14px 18px", cursor: "pointer", transition: "border-color .15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.purple; e.currentTarget.style.boxShadow = "0 2px 10px rgba(122,28,203,.08)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = "none"; }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <ScoreRing score={v.yieldoScore} size={40} sw={4} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>{v.name}</span>
                      <span style={{ fontSize: 11, color: C.text3 }}>{v.protocol} · {v.chain}</span>
                    </div>
                    <div style={{ display: "flex", gap: 10, fontSize: 11, color: C.text3 }}>
                      <span>TVL: {fmtTvl(v.tvl)}</span>
                      <span>{v.depositors} depositors</span>
                      <span style={{ color: v.critFlags === 0 && v.warnFlags === 0 ? C.green : C.amber }}>{v.critFlags === 0 && v.warnFlags === 0 ? "✓ Clean" : `🟡 ${v.warnFlags} flags`}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: C.green }}>{v.apy.toFixed(2)}%</div>
                    <div style={{ fontSize: 10, color: C.text4 }}>APY</div>
                    {isConnected && userStable > 0 && <div style={{ fontSize: 10, color: C.text2, marginTop: 2 }}>= <strong>{fmtUsd(mp)}</strong>/mo</div>}
                  </div>
                  <div style={{ fontSize: 16, color: C.text4 }}>›</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Disclaimer */}
      <div style={{ padding: "10px 14px", borderRadius: 8, background: C.amberDim, border: `1px solid ${C.amber}20`, display: "flex", gap: 10 }}>
        <span>⚠️</span>
        <div style={{ fontSize: 11, color: "rgba(0,0,0,.5)", lineHeight: 1.5 }}><strong>Disclaimer:</strong> Yieldo Scores and all metrics are for data visualization only — not financial advice.</div>
      </div>
    </div>
  );
}

export default function VaultPage() {
  const winW = useWindowWidth();
  const gridCols = winW >= 1800 ? 5 : winW >= 1400 ? 4 : winW >= 1000 ? 3 : winW >= 640 ? 2 : 1;
  const pad = winW >= 1000 ? "18px 32px" : winW >= 640 ? "14px 20px" : "10px 12px";
  const headerPad = winW >= 1000 ? "14px 32px" : winW >= 640 ? "12px 20px" : "10px 12px";
  const { vaults: ALL, loading, error } = useVaults();
  const navigate = useNavigate();
  const location = useLocation();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();
  const activeTab = location.pathname === "/dashboard" ? "dashboard" : "vaults";
  const setActiveTab = (tab) => navigate(tab === "dashboard" ? "/dashboard" : "/vault");
  const [widgetDismissed, setWidgetDismissed] = useState(false);
  const { balances, totalIdle } = useWalletBalances();

  // Track wallet connections in DB
  useEffect(() => {
    if (!isConnected || !address) return;
    fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet_address: address }),
    }).catch(() => {});
  }, [isConnected, address]);

  const [view, setView] = useState("grid"), [search, setSearch] = useState(""), [moreFilters, setMoreFilters] = useState(false);
  const [fAt, setFAt] = useState([]), [fCh, setFCh] = useState([]), [fRi, setFRi] = useState([]), [fYT, setFYT] = useState("all"), [fPr, setFPr] = useState([]);
  const [fCu, setFCu] = useState([]), [fFS, setFFS] = useState([]);
  const [fSc, setFSc] = useState(0), [fApy, setFApy] = useState(0), [fTvl, setFTvl] = useState(0), [fAge, setFAge] = useState(0), [fDep, setFDep] = useState(0);
  const [sortBy, setSortBy] = useState("yieldoScore");
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [activePreset, setActivePreset] = useState(null);
  const [cmpList, setCmpList] = useState([]), [enrolled, setEnrolled] = useState(new Set());
  const [fbOpen, setFbOpen] = useState(false);
  const [fbVault, setFbVault] = useState("");
  const [fbField, setFbField] = useState("");
  const [fbDesc, setFbDesc] = useState("");
  const [fbEmail, setFbEmail] = useState("");
  const [fbSending, setFbSending] = useState(false);
  const [fbDone, setFbDone] = useState(false);

  const submitFeedback = async () => {
    setFbSending(true);
    try {
      const url = import.meta.env.VITE_FEEDBACK_SHEET_URL;
      if (!url) { alert("Feedback endpoint not configured"); setFbSending(false); return; }
      const matched = ALL.find(v => v.name === fbVault);
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Timestamp: new Date().toISOString(),
          "Vault ID": matched?.id || "", "Vault Name": fbVault || "General", Chain: matched?.chain || "", "Chain ID": matched?.chain_id || "",
          Field: fbField, Description: fbDesc, Reporter: fbEmail || "",
          Status: "New",
        }),
      });
      if (!res.ok) throw new Error();
      setFbDone(true);
      setTimeout(() => { setFbOpen(false); setFbDone(false); setFbVault(""); setFbField(""); setFbDesc(""); setFbEmail(""); }, 1800);
    } catch { alert("Failed to submit — please try again."); }
    setFbSending(false);
  };

  const tog = (a,s,v) => { s(a.includes(v)?a.filter(x=>x!==v):[...a,v]); setActivePreset(null); };
  const togCmp = v => { cmpList.find(c=>c.id===v.id)?setCmpList(cmpList.filter(c=>c.id!==v.id)):cmpList.length<4&&setCmpList([...cmpList,v]); };
  const togEnr = id => { const n=new Set(enrolled); n.has(id)?n.delete(id):n.add(id); setEnrolled(n); };

  const CHAINS = useMemo(() => [...new Set(ALL.map(v => v.chain))].sort(), [ALL]);
  const PROTOCOLS = useMemo(() => [...new Set(ALL.map(v => v.protocol))].filter(Boolean).sort(), [ALL]);
  const CURATORS = useMemo(() => [...new Set(ALL.map(v => v.curator))].filter(Boolean).sort(), [ALL]);

  const PRESETS = {
    conservative: { icon: "🛡️", label: "Conservative", desc: "Score ≥80 · No flags · Stables · Real yield · 90d+", fSc: 80, fAge: 90, fTvl: 10e6, fDep: 50, fAt: ["stablecoin"], fCh: ["Ethereum"], fYT: "real", sort: "yieldoScore" },
    balanced: { icon: "⚖️", label: "Balanced", desc: "Score ≥60 · All assets · 30d+", fSc: 60, fAge: 30, fTvl: 1e6, fDep: 10, fAt: [], fCh: [], fYT: "all", sort: "yieldoScore" },
    aggressive: { icon: "🔥", label: "Aggressive", desc: "Score ≥40 · High APY", fSc: 40, fAge: 14, fTvl: 100e3, fDep: 0, fAt: [], fCh: [], fYT: "all", sort: "apy" },
  };
  const applyPreset = (key) => {
    if (activePreset === key) { clearAll(); setActivePreset(null); return; }
    const p = PRESETS[key];
    setSearch(""); setFCu([]); setFFS([]); setFRi([]); setFPr([]);
    setFSc(p.fSc); setFAge(p.fAge); setFTvl(p.fTvl); setFDep(p.fDep);
    setFAt(p.fAt); setFCh(p.fCh); setFYT(p.fYT); setFApy(0);
    setSortBy(p.sort); setActivePreset(key);
  };
  const clearAll = () => { setSearch("");setFCh([]);setFAt([]);setFRi([]);setFCu([]);setFFS([]);setFYT("all");setFPr([]);setFApy(0);setFTvl(0);setFDep(0);setFAge(0);setFSc(0);setActivePreset(null); };
  const secCount = [fCu,fFS].filter(a=>a.length).length + (fSc>0?1:0) + (fApy>0?1:0) + (fTvl>0?1:0) + (fAge>0?1:0) + (fDep>0?1:0);
  const totalActive = [fAt,fCh,fRi,fPr].filter(a=>a.length).length + (fYT!=="all"?1:0) + secCount;
  const pills = [];
  fAt.forEach(a => pills.push({ label: ATYPES.find(x=>x.id===a)?.label, remove: ()=>tog(fAt,setFAt,a) }));
  fCh.forEach(c => pills.push({ label: c, remove: ()=>tog(fCh,setFCh,c) }));
  fRi.forEach(r => pills.push({ label: `${r} risk`, remove: ()=>tog(fRi,setFRi,r) }));
  fPr.forEach(p => pills.push({ label: p, remove: ()=>tog(fPr,setFPr,p) }));
  if(fYT!=="all") pills.push({ label: fYT==="real"?"Real Yield":"Incentivized", remove: ()=>setFYT("all") });
  fCu.forEach(c => pills.push({ label: c, remove: ()=>setFCu(fCu.filter(x=>x!==c)) }));
  fFS.forEach(f => pills.push({ label: f==="clean"?"✓ Clean":f==="warning"?"🟡 Warning":"🔴 Critical", remove: ()=>tog(fFS,setFFS,f) }));
  if(fSc>0) pills.push({ label: `Score ≥${fSc}`, remove: ()=>setFSc(0) });
  if(fApy>0) pills.push({ label: `APY ≥${fApy}%`, remove: ()=>setFApy(0) });
  if(fTvl>0) pills.push({ label: `TVL ≥$${fTvl}`, remove: ()=>setFTvl(0) });
  if(fAge>0) pills.push({ label: `Age ≥${fAge}d`, remove: ()=>setFAge(0) });
  if(fDep>0) pills.push({ label: `Dep. ≥${fDep}`, remove: ()=>setFDep(0) });

  const filtered = useMemo(() => {
    let r=[...ALL];
    if(search){const q=search.toLowerCase();r=r.filter(v=>v.name.toLowerCase().includes(q)||v.asset.toLowerCase().includes(q)||v.curator.toLowerCase().includes(q)||v.chain.toLowerCase().includes(q));}
    if(fCh.length)r=r.filter(v=>fCh.includes(v.chain));
    if(fPr.length)r=r.filter(v=>fPr.includes(v.protocol));
    if(fAt.length)r=r.filter(v=>fAt.includes(v.assetType));
    if(fRi.length)r=r.filter(v=>fRi.includes(v.risk));
    if(fCu.length)r=r.filter(v=>fCu.includes(v.curator));
    if(fFS.length)r=r.filter(v=>{if(fFS.includes("clean")&&v.flags.filter(f=>f.severity!=="info").length===0)return true;if(fFS.includes("warning")&&v.warnFlags>0&&v.critFlags===0)return true;if(fFS.includes("critical")&&v.critFlags>0)return true;return false;});
    if(fYT!=="all")r=r.filter(v=>v.yieldType===fYT);
    if(fApy>0)r=r.filter(v=>v.apy>=fApy);if(fTvl>0)r=r.filter(v=>v.tvl>=fTvl);if(fDep>0)r=r.filter(v=>v.depositors>=fDep);
    if(fAge>0)r=r.filter(v=>v.age>=fAge);if(fSc>0)r=r.filter(v=>v.yieldoScore>=fSc);
    const sm={yieldoScore:(a,b)=>b.yieldoScore-a.yieldoScore,apy:(a,b)=>b.apy-a.apy,tvl:(a,b)=>b.tvl-a.tvl,risk:(a,b)=>({Low:0,Medium:1,High:2}[a.risk]-{Low:0,Medium:1,High:2}[b.risk]),depositors:(a,b)=>b.depositors-a.depositors,age:(a,b)=>b.age-a.age,sharpe:(a,b)=>(b.sharpe||0)-(a.sharpe||0),retention:(a,b)=>(b.capRet||0)-(a.capRet||0),perfScore:(a,b)=>(b.perfComposite||0)-(a.perfComposite||0)};
    if(sm[sortBy])r.sort(sm[sortBy]); return r;
  }, [ALL,search,fCh,fPr,fAt,fRi,fCu,fFS,fYT,fApy,fTvl,fDep,fAge,fSc,sortBy]);

  if (loading) return (
    <div style={{ fontFamily: "'Inter',sans-serif", background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, backgroundImage: C.purpleGrad, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}><span style={{ color: "#fff", fontWeight: 700, fontSize: 18 }}>Y</span></div>
        <div style={{ fontSize: 16, fontWeight: 600, color: C.text2, marginBottom: 8 }}>Loading Vaults...</div>
        <div style={{ fontSize: 12, color: C.text4 }}>Fetching data from indexer</div>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ fontFamily: "'Inter',sans-serif", background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Card style={{ padding: 32, textAlign: "center", maxWidth: 400 }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Failed to Load</div>
        <div style={{ fontSize: 13, color: C.text3, marginBottom: 16 }}>{error}</div>
        <Btn primary onClick={() => { localStorage.removeItem("yieldo_vaults_cache"); window.location.reload(); }}>Retry</Btn>
      </Card>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Inter',sans-serif", background: C.bg, color: C.text, minHeight: "100vh", paddingBottom: cmpList.length>0?400:0 }}>
      {/* Header */}
      <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: `0 ${winW >= 640 ? "20px" : "12px"}`, display: "flex", justifyContent: "space-between", alignItems: "center", height: 52, position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 6px rgba(0,0,0,.04)", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <img src="/yieldo-new.png" alt="Yieldo" style={{ width: 26, height: 26, borderRadius: 6 }} />
          {winW >= 480 && <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-.01em" }}>YIELDO</span>}
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          {[["dashboard", "Dashboard"], ["vaults", "Vaults"]].map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)} style={{ fontFamily: "'Inter',sans-serif", fontSize: winW >= 640 ? 13 : 12, fontWeight: activeTab === id ? 600 : 400, border: "none", cursor: "pointer", padding: winW >= 640 ? "6px 16px" : "6px 10px", borderRadius: 6, background: activeTab === id ? C.purpleDim : "transparent", color: activeTab === id ? C.purple : C.text3, transition: "all .15s" }}>{label}</button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {winW >= 768 && <Btn small onClick={() => setFbOpen(true)}>Report Issue</Btn>}
          {winW >= 640 && <Btn small onClick={() => navigate("/apply")}>Integrate Now</Btn>}
          {isConnected && address ? (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ fontSize: 11, color: C.text2, background: C.surfaceAlt, padding: "5px 8px", borderRadius: 6, border: `1px solid ${C.border}`, fontFamily: "monospace" }}>
                <span style={{ width: 6, height: 6, borderRadius: 3, background: C.green, display: "inline-block", marginRight: 4 }} />
                {address.slice(0, 4)}...{address.slice(-3)}
              </div>
              <button onClick={() => disconnect()} style={{ fontSize: 10, color: C.text4, background: "none", border: `1px solid ${C.border}`, borderRadius: 5, padding: "4px 6px", cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>✕</button>
            </div>
          ) : (
            <button onClick={openConnectModal} style={{ backgroundImage: C.purpleGrad, color: "#fff", border: "none", borderRadius: 7, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif", boxShadow: C.purpleShadow, whiteSpace: "nowrap" }}>{winW >= 640 ? "Connect Wallet" : "Connect"}</button>
          )}
        </div>
      </div>
      {/* Dashboard Tab */}
      {activeTab === "dashboard" && <DashboardTab vaults={ALL} navigate={navigate} />}

      {/* Vaults Tab */}
      {activeTab === "vaults" && <><div style={{ padding: pad, maxWidth: 1600, margin: "0 auto" }}>
        <div style={{ padding: "10px 16px", borderRadius: 8, background: C.amberDim, border: `1px solid ${C.amber}20`, marginBottom: 16, display: "flex", gap: 10 }}><span style={{ fontSize: 14 }}>⚠️</span><div style={{ fontSize: 12, color: "rgba(0,0,0,.55)", lineHeight: 1.5 }}><strong>Disclaimer:</strong> Yieldo Scores and all metrics are for <strong>data visualization only</strong> — not financial advice.</div></div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: C.text4, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>Wallet Presets</div>
          <div style={{ display: "grid", gridTemplateColumns: winW >= 640 ? "repeat(3, 1fr)" : "1fr", gap: 10 }}>
            {Object.entries(PRESETS).map(([key, p]) => {
              const active = activePreset === key;
              return (
                <Card key={key} onClick={() => applyPreset(key)} style={{ padding: "12px 16px", cursor: "pointer", border: active ? `1.5px solid ${C.purple}` : `1px solid ${C.border}`, background: active ? C.purpleDim : C.white, transition: "all .15s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 15 }}>{p.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: active ? C.purple : C.text }}>{p.label}</span>
                  </div>
                  <div style={{ fontSize: 11, color: C.text3, lineHeight: 1.4 }}>{p.desc}</div>
                </Card>
              );
            })}
          </div>
        </div>
        <div style={{ position: "relative" }}>
        <Card style={{ padding: "10px 16px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center", border: `1px solid ${C.border}`, background: C.white }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontSize: 16 }}>🤖</span><div><div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Auto-Curate</div><div style={{ fontSize: 11, color: C.text3 }}>Top 12 by Yieldo Score within risk tolerance</div></div></div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div onClick={()=>setShowComingSoon(true)} style={{ width: 40, height: 22, borderRadius: 11, background: "rgba(0,0,0,.1)", position: "relative", cursor: "pointer", transition: "background .2s" }}><div style={{ width: 16, height: 16, borderRadius: 8, background: "#fff", position: "absolute", top: 3, left: 3, transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.15)" }}/></div>
          </div>
        </Card>
        {showComingSoon && <div style={{ position: "absolute", right: 12, top: "100%", marginTop: -8, zIndex: 20, background: C.white, border: `1px solid ${C.purple}30`, borderRadius: 8, padding: "12px 16px", boxShadow: "0 4px 16px rgba(0,0,0,.1)", maxWidth: 260 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.purple, marginBottom: 4 }}>Coming Soon</div>
          <div style={{ fontSize: 12, color: C.text3, lineHeight: 1.5 }}>Auto-Curate will automatically select the best vaults for your risk profile. Stay tuned!</div>
          <button onClick={()=>setShowComingSoon(false)} style={{ marginTop: 8, fontSize: 11, fontWeight: 500, color: C.purple, background: C.purpleDim, border: "none", borderRadius: 4, padding: "4px 10px", cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>Got it</button>
        </div>}
        </div>
        {/* Search + Sort + View */}
        <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center" }}>
          <div style={{ flex: 1, position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: C.text4 }}>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search vaults, assets, curators, chains..." style={{ width: "100%", padding: "10px 14px 10px 34px", background: C.white, border: `1px solid ${C.border2}`, borderRadius: 8, fontSize: 13, fontFamily: "'Inter',sans-serif", outline: "none", boxSizing: "border-box", color: C.text }}/>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: C.text4, whiteSpace: "nowrap" }}>Sort:</span>
            <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{ padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.border2}`, fontSize: 12, fontFamily: "'Inter',sans-serif", color: C.text2, background: C.white, cursor: "pointer", outline: "none" }}>
              {[["yieldoScore","Yieldo Score"],["apy","APY"],["tvl","TVL"],["risk","Risk"],["sharpe","Sharpe"],["perfScore","Perf Score"],["retention","Retention"],["depositors","Depositors"],["age","Age"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          {winW >= 640 && <div style={{ display: "flex", gap: 2, background: C.surfaceAlt, borderRadius: 8, padding: 3, border: `1px solid ${C.border}` }}>
            <button onClick={()=>setView("grid")} style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, padding: "5px 10px", borderRadius: 6, border: "none", cursor: "pointer", background: view==="grid" ? C.white : "transparent", color: view==="grid" ? C.purple : C.text4, boxShadow: view==="grid" ? "0 1px 3px rgba(0,0,0,.06)" : "none", fontWeight: view==="grid" ? 600 : 400 }}>▦ Grid</button>
            <button onClick={()=>setView("table")} style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, padding: "5px 10px", borderRadius: 6, border: "none", cursor: "pointer", background: view==="table" ? C.white : "transparent", color: view==="table" ? C.purple : C.text4, boxShadow: view==="table" ? "0 1px 3px rgba(0,0,0,.06)" : "none", fontWeight: view==="table" ? 600 : 400 }}>☰ Table</button>
          </div>}
        </div>

        {/* Filters */}
        <Card style={{ padding: winW >= 768 ? "16px 20px" : "12px 14px", marginBottom: 12, border: `1px solid ${C.border}` }}>
          {/* Row 1: Asset + Chain */}
          <div style={{ display: "flex", gap: winW >= 768 ? 24 : 12, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.text3, letterSpacing: ".03em" }}>Asset</span>
              {ATYPES.map(a=><Chip key={a.id} label={a.label} icon={a.icon} active={fAt.includes(a.id)} onClick={()=>tog(fAt,setFAt,a.id)} small/>)}
            </div>
            {winW >= 768 && <div style={{ width: 1, height: 24, background: C.border }} />}
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.text3, letterSpacing: ".03em" }}>Chain</span>
              {CHAINS.map(c=><Chip key={c} label={c} active={fCh.includes(c)} onClick={()=>tog(fCh,setFCh,c)} small/>)}
            </div>
          </div>
          {/* Row 2: Risk + Yield + Protocol */}
          <div style={{ display: "flex", gap: winW >= 768 ? 24 : 12, flexWrap: "wrap", alignItems: "center", paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.text3, letterSpacing: ".03em" }}>Risk</span>
              {["Low","Medium","High"].map(r=><Chip key={r} label={r} active={fRi.includes(r)} onClick={()=>tog(fRi,setFRi,r)} small/>)}
            </div>
            {winW >= 768 && <div style={{ width: 1, height: 24, background: C.border }} />}
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.text3, letterSpacing: ".03em" }}>Yield</span>
              {[["all","All"],["real","Real"],["incentivized","Incent."]].map(([id,l])=><Chip key={id} label={l} active={fYT===id} onClick={()=>setFYT(fYT===id?"all":id)} small/>)}
            </div>
            {winW >= 768 && <div style={{ width: 1, height: 24, background: C.border }} />}
            <SearchableSelect label="" options={PROTOCOLS} value={fPr[0] || ""} onChange={v => setFPr(v ? [v] : [])} placeholder="All protocols" />
            <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
              <Chip label={moreFilters?"Less ▲":"More ▼"} active={moreFilters||secCount>0} onClick={()=>setMoreFilters(!moreFilters)} small/>
              {totalActive>0 && <button onClick={clearAll} style={{ fontSize: 11, color: C.purple, background: C.purpleDim, border: "none", cursor: "pointer", fontFamily: "'Inter',sans-serif", padding: "5px 12px", borderRadius: 6, fontWeight: 600 }}>Clear ({totalActive})</button>}
            </div>
          </div>
        </Card>
        {moreFilters && (
          <Card style={{ padding: winW >= 768 ? "16px 20px" : "12px 14px", marginBottom: 12, marginTop: -4, borderTop: "none", borderTopLeftRadius: 0, borderTopRightRadius: 0, background: C.surfaceAlt }}>
            <div style={{ display: "flex", gap: winW >= 768 ? 24 : 12, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
              <SearchableSelect label="Curator" options={CURATORS} value={fCu[0] || ""} onChange={v => setFCu(v ? [v] : [])} placeholder="All curators" />
              <div>
                <FL>Flags</FL>
                <div style={{ display: "flex", gap: 5 }}>
                  <Chip label="✓ Clean" active={fFS.includes("clean")} onClick={()=>tog(fFS,setFFS,"clean")} small/>
                  <Chip label="🟡 Warn" active={fFS.includes("warning")} onClick={()=>tog(fFS,setFFS,"warning")} small/>
                  <Chip label="🔴 Crit" active={fFS.includes("critical")} onClick={()=>tog(fFS,setFFS,"critical")} small/>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
              <NumInput label="Min Score" value={fSc} onChange={v=>setFSc(v)} width={75}/>
              <NumInput label="Min APY" value={fApy} onChange={v=>setFApy(v)} suffix="%" width={70}/>
              <NumInput label="Min TVL" value={fTvl} onChange={v=>setFTvl(v)} prefix="$" width={85}/>
              <NumInput label="Min Age" value={fAge} onChange={v=>setFAge(v)} suffix="d" width={65}/>
              <NumInput label="Min Deps" value={fDep} onChange={v=>setFDep(v)} width={70}/>
            </div>
          </Card>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, minHeight: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, color: C.text3 }}><strong style={{ color: C.text }}>{filtered.length}</strong> vaults</span>
            {pills.length>0 && <div style={{ width: 1, height: 16, background: C.border, margin: "0 4px" }}/>}
            {pills.map((p,i) => <ActivePill key={i} label={p.label} onRemove={p.remove}/>)}
          </div>
          {cmpList.length>0&&<Badge color={C.purple}>⚖️ {cmpList.length} comparing</Badge>}
        </div>
        {view==="grid" && (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${gridCols}, 1fr)`, gap: 12 }}>
            {filtered.map(v=>{
              const isCmp=!!cmpList.find(c=>c.id===v.id), isEnr=enrolled.has(v.id);
              return (
                <Card key={v.id} onClick={()=>navigate(`/vault/${v.id}`)} style={{ padding: 0, overflow: "hidden", border: isCmp?`2px solid ${C.purple}`:isEnr?`1.5px solid ${C.purple}20`:`1px solid ${C.border}`, transition: "all .2s", cursor: "pointer", display: "flex", flexDirection: "column" }}>
                  <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flex: 1, minWidth: 0 }}><ScoreRing score={v.yieldoScore} size={40}/><div style={{ minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.name}</div><div style={{ fontSize: 11, color: C.text3 }}>{v.curator !== "Unknown" ? `${v.curator} · ` : ""}{v.chain}</div></div></div>
                      <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 8 }}><div style={{ fontSize: 17, fontWeight: 700, color: C.purple }}>{v.apy.toFixed(2)}%</div><div style={{ fontSize: 10, color: C.text4 }}>APY</div></div>
                    </div>
                    <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap" }}><Badge color={v.riskC}>{v.risk}</Badge><YieldBadge t={v.yieldType}/><Badge color={v.protocol==="Hyperbeat"?"#E040FB":v.protocol==="Veda"?"#FF6B35":C.blue} bg={v.protocol==="Hyperbeat"?"#FCE4EC":v.protocol==="Veda"?"#FFF3E0":C.blueBg}>{v.protocol}</Badge><Badge color={C.text3} bg={C.surfaceAlt}>{v.chain}</Badge><Badge color={C.text3} bg={C.surfaceAlt}>{v.asset}</Badge><ConfBadge age={v.age}/></div>
                    {v.flags.filter(f=>f.severity!=="info").length>0&&<div style={{ marginBottom: 8 }}><FlagBadge flags={v.flags.filter(f=>f.severity!=="info")} compact/></div>}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, fontSize: 10, marginBottom: 8, padding: "8px 0", borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
                      <div style={{ textAlign: "center" }}><div style={{ color: C.text4, fontWeight: 600 }}>TVL</div><div style={{ color: C.text2, fontWeight: 600, fontSize: 12 }}>{fmtTvl(v.tvl)}</div></div>
                      <div style={{ textAlign: "center" }}><div style={{ color: C.text4, fontWeight: 600 }}>SHARPE</div><div style={{ color: C.text2, fontWeight: 600, fontSize: 12 }}>{fmtNum(v.sharpe)}</div></div>
                      <div style={{ textAlign: "center" }}><div style={{ color: C.text4, fontWeight: 600 }}>DEPOSITORS</div><div style={{ color: C.text2, fontWeight: 600, fontSize: 12 }}>{v.depositors.toLocaleString()}</div></div>
                    </div>
                    <div style={{ marginTop: "auto" }}>
                    {v.tvlSpark && <div style={{ padding: "4px 0" }}><Sparkline data={v.tvlSpark} height={28}/></div>}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 2 }}>
                      {["capital","performance","risk","trust"].map(k=><div key={k} style={{ display: "flex", alignItems: "center", gap: 2, justifyContent: "center" }}><ScoreRing score={v.subScores[k]} size={18} sw={2}/><span style={{ fontSize: 9, color: C.text4, textTransform: "uppercase" }}>{k[0]}</span></div>)}
                    </div>
                    <div style={{ display: "flex", gap: 6, paddingTop: 10 }}>
                      <button onClick={e=>{e.stopPropagation();navigate(`/vault/${v.id}`)}} style={{ flex: 1, padding: "8px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif", backgroundImage: C.purpleGrad, border: "none", color: "#fff", boxShadow: C.purpleShadow }}>Explore</button>
                      <button onClick={e=>{e.stopPropagation();togCmp(v)}} style={{ padding: "8px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "'Inter',sans-serif", background: isCmp?C.purpleDim:C.surfaceAlt, border: `1px solid ${isCmp?C.purple+"30":C.border}`, color: isCmp?C.purple:C.text3 }}>⚖️</button>
                    </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
        {view==="table" && (
          <Card><div style={{ overflow: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: ".25fr 1.4fr .4fr .5fr .4fr .45fr .5fr .45fr .45fr .5fr .4fr .35fr", padding: "8px 12px", fontSize: 10, fontWeight: 600, color: C.text4, textTransform: "uppercase", letterSpacing: ".04em", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap", minWidth: 1000 }}><div></div><div>Vault</div><div>Score</div><div>APY</div><div>Risk</div><div>Flags</div><div>Sharpe</div><div>TVL</div><div>Dep.</div><div>Yield</div><div>Age</div><div></div></div>
            {filtered.map(v=>{const isEnr=enrolled.has(v.id),isCmp=!!cmpList.find(c=>c.id===v.id);return(
              <div key={v.id} onClick={()=>navigate(`/vault/${v.id}`)} style={{ display: "grid", gridTemplateColumns: ".25fr 1.4fr .4fr .5fr .4fr .45fr .5fr .45fr .45fr .5fr .4fr .35fr", padding: "7px 12px", fontSize: 12, borderBottom: `1px solid ${C.border}`, alignItems: "center", background: isCmp?C.purpleDim:"transparent", minWidth: 1000, cursor: "pointer", transition: "background .1s" }} onMouseEnter={e=>{if(!isCmp)e.currentTarget.style.background=C.surfaceAlt}} onMouseLeave={e=>{if(!isCmp)e.currentTarget.style.background="transparent"}}>
                <div><input type="checkbox" checked={isEnr} onChange={e=>{e.stopPropagation();togEnr(v.id)}} style={{ accentColor: C.purple, cursor: "pointer" }}/></div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}><span style={{ fontSize: 13 }}>{v.icon}</span><div style={{ minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.name}</div><div style={{ fontSize: 9, color: C.text4 }}>{v.curator !== "Unknown" ? `${v.curator} · ` : ""}{v.chain}</div></div></div>
                <div><ScoreRing score={v.yieldoScore} size={26} sw={2.5}/></div>
                <div style={{ fontWeight: 700, color: C.purple, fontSize: 13 }}>{v.apy.toFixed(2)}%</div>
                <div><Badge color={v.riskC}>{v.risk}</Badge></div>
                <div><FlagBadge flags={v.flags.filter(f=>f.severity!=="info")} compact/></div>
                <div style={{ fontSize: 11, color: C.text2 }}>{fmtNum(v.sharpe)}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ fontSize: 11, color: C.text2 }}>{fmtTvl(v.tvl)}</span>{v.tvlSpark && <Sparkline data={v.tvlSpark} width={40} height={16}/>}</div>
                <div style={{ fontSize: 11, color: C.text2 }}>{v.depositors.toLocaleString()}</div>
                <div><YieldBadge t={v.yieldType}/></div>
                <div style={{ fontSize: 11, color: C.text2 }}>{v.age}d</div>
                <div><button onClick={e=>{e.stopPropagation();togCmp(v)}} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: isCmp?C.purple:C.text4 }}>⚖️</button></div>
              </div>
            )})}
          </div></Card>
        )}
      </div>
      {cmpList.length>0&&<div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50, background: C.white, borderTop: `2px solid ${C.purple}`, boxShadow: "0 -8px 32px rgba(0,0,0,.1)", padding: winW >= 1000 ? "14px 32px 18px" : "10px 16px 14px", fontFamily: "'Inter',sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 14, fontWeight: 600 }}>⚖️ Comparing {cmpList.length}</span><Badge color={C.purple}>{cmpList.length}/4</Badge></div><div style={{ display: "flex", gap: 8 }}><Btn primary small>✓ Add All</Btn><Btn ghost small onClick={()=>setCmpList([])}>✕ Clear</Btn></div></div>
        <div style={{ display: "grid", gridTemplateColumns: `120px repeat(${cmpList.length}, 1fr)`, gap: 0, fontSize: 12 }}>
          <div style={{ display: "flex", flexDirection: "column" }}><div style={{ padding: "6px 0", borderBottom: `1px solid ${C.border}`, height: 36 }}/>{["Score","APY","Yield","Risk","Flags","Sharpe","TVL","Retention","Dep."].map((l,i)=><div key={i} style={{ padding: "4px 0", fontSize: 10, fontWeight: 600, color: C.text4, textTransform: "uppercase", borderBottom: `1px solid ${C.border}`, minHeight: 24, display: "flex", alignItems: "center" }}>{l}</div>)}</div>
          {cmpList.map((v,vi)=><div key={vi} style={{ display: "flex", flexDirection: "column", borderLeft: `1px solid ${C.border}`, paddingLeft: 10 }}>
            <div style={{ padding: "6px 0", borderBottom: `1px solid ${C.border}`, height: 36, display: "flex", alignItems: "center", gap: 6 }}><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.name}</div></div><button onClick={()=>setCmpList(cmpList.filter(c=>c.id!==v.id))} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: C.text4 }}>✕</button></div>
            {[<div style={{ display: "flex", alignItems: "center", gap: 4 }}><ScoreRing score={v.yieldoScore} size={22} sw={2.5}/><span style={{ fontWeight: 600 }}>{v.yieldoScore}</span></div>,<span style={{ fontWeight: 700, color: C.purple }}>{v.apy.toFixed(2)}%</span>,<YieldBadge t={v.yieldType}/>,<Badge color={v.riskC}>{v.risk}</Badge>,<FlagBadge flags={v.flags.filter(f=>f.severity!=="info")} compact/>,<span>{fmtNum(v.sharpe)}</span>,<span>{fmtTvl(v.tvl)}</span>,<span style={{ color: (v.capRet||0)<60?C.red:C.text2 }}>{v.capRet||"N/A"}%</span>,<span>{v.depositors.toLocaleString()}</span>].map((el,i)=><div key={i} style={{ padding: "4px 0", borderBottom: `1px solid ${C.border}`, minHeight: 24, display: "flex", alignItems: "center" }}>{el}</div>)}
          </div>)}
        </div>
      </div>}
      </>}

      {/* Floating Idle Balance Widget — shown on Vaults tab when wallet connected */}
      {activeTab === "vaults" && isConnected && totalIdle > 0 && !widgetDismissed && (
        <div style={{ position: "fixed", bottom: winW >= 640 ? 20 : 12, left: winW >= 640 ? 20 : 12, right: winW >= 640 ? "auto" : 12, zIndex: 90, background: C.white, borderRadius: 14, border: `1.5px solid ${C.purple}30`, boxShadow: "0 8px 32px rgba(122,28,203,.15)", padding: "14px 18px", maxWidth: winW >= 640 ? 280 : "none", fontFamily: "'Inter',sans-serif", cursor: "pointer", transition: "transform .2s" }}
          onClick={() => setActiveTab("dashboard")}
          onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
          onMouseLeave={e => e.currentTarget.style.transform = "none"}>
          <button onClick={e => { e.stopPropagation(); setWidgetDismissed(true); }} style={{ position: "absolute", top: 6, right: 8, background: "none", border: "none", cursor: "pointer", fontSize: 12, color: C.text4, padding: "2px 4px" }}>✕</button>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, backgroundImage: C.purpleGrad, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ color: "#fff", fontSize: 16 }}>💤</span>
            </div>
            <div>
              <div style={{ fontSize: 11, color: C.text3, marginBottom: 2 }}>Idle stablecoins</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.purple }}>${totalIdle.toLocaleString("en", { maximumFractionDigits: 0 })}</div>
              <div style={{ fontSize: 10, color: C.green, fontWeight: 500 }}>Could earn ${((totalIdle * (ALL[0]?.apy || 5) / 100) / 12).toFixed(0)}/mo →</div>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {fbOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }} onClick={() => setFbOpen(false)}>
          <div style={{ background: C.white, borderRadius: 12, padding: 28, width: 420, maxWidth: "90vw", boxShadow: "0 20px 60px rgba(0,0,0,.2)" }} onClick={e => e.stopPropagation()}>
            {fbDone ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>Thanks!</div>
                <div style={{ fontSize: 14, color: C.text3 }}>Your report has been submitted.</div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Report Data Issue</div>
                <div style={{ fontSize: 12, color: C.text3, marginBottom: 16 }}>Help us improve — flag incorrect or suspicious data</div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.text3, display: "block", marginBottom: 4 }}>Which vault?</label>
                <select value={fbVault} onChange={e => setFbVault(e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: `1px solid ${C.border2}`, fontSize: 13, marginBottom: 12, fontFamily: "'Inter',sans-serif", background: C.white }}>
                  <option value="">General / not specific</option>
                  {ALL.map(v => <option key={v.id} value={v.name}>{v.name} ({v.chain})</option>)}
                </select>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.text3, display: "block", marginBottom: 4 }}>Which field looks wrong?</label>
                <select value={fbField} onChange={e => setFbField(e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: `1px solid ${C.border2}`, fontSize: 13, marginBottom: 12, fontFamily: "'Inter',sans-serif", background: C.white }}>
                  <option value="">Select a field...</option>
                  <optgroup label="Capital"><option>TVL</option><option>Depositors</option><option>Net Flows</option></optgroup>
                  <optgroup label="Performance"><option>APY</option><option>Benchmark Ratio</option><option>Volatility</option><option>Max Drawdown</option></optgroup>
                  <optgroup label="Risk"><option>Asset Price</option><option>Pause Events</option><option>Concentration</option><option>Owner / Guardian</option></optgroup>
                  <optgroup label="Trust"><option>Capital Retention</option><option>User Retention</option><option>Holding Days</option></optgroup>
                  <optgroup label="Other"><option>Yieldo Score</option><option>Vault Info / Metadata</option><option>Other</option></optgroup>
                </select>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.text3, display: "block", marginBottom: 4 }}>What seems wrong?</label>
                <textarea value={fbDesc} onChange={e => setFbDesc(e.target.value)} placeholder="e.g. APY shows 500% but the vault page shows 12%" rows={3} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: `1px solid ${C.border2}`, fontSize: 13, marginBottom: 12, fontFamily: "'Inter',sans-serif", resize: "vertical" }} />
                <label style={{ fontSize: 12, fontWeight: 600, color: C.text3, display: "block", marginBottom: 4 }}>Email (optional — for follow-up)</label>
                <input value={fbEmail} onChange={e => setFbEmail(e.target.value)} placeholder="you@example.com" style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: `1px solid ${C.border2}`, fontSize: 13, marginBottom: 16, fontFamily: "'Inter',sans-serif" }} />
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <Btn small onClick={() => setFbOpen(false)}>Cancel</Btn>
                  <Btn primary small onClick={submitFeedback} style={{ opacity: !fbField || !fbDesc ? 0.5 : 1, pointerEvents: !fbField || !fbDesc || fbSending ? "none" : "auto" }}>
                    {fbSending ? "Sending..." : "Submit Report"}
                  </Btn>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
