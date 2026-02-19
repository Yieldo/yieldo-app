import { useState, useMemo } from "react";
import VaultDetailPage from "./VaultDetailPage.jsx";
import { useVaults } from "../hooks/useVaultData.js";

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

const NumInput = ({ label, value, onChange, prefix, suffix, width = 80 }) => (
  <div>
    {label && <FL>{label}</FL>}
    <div style={{ display: "flex", alignItems: "center", gap: 2, background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: "0 8px", width }}>
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
  { id: "btc", label: "BTC", icon: "₿", assets: ["WBTC","tBTC","cbBTC","CBBTC","LBTC"] },
  { id: "other", label: "Other", icon: "💎", assets: ["LINK","UNI","ARB","OP","WHYPE","WMON"] },
];

const fmtTvl = n => {
  if (n === 0 || n === null || n === undefined) return "$0";
  if (n >= 1e9) return `$${(n/1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n/1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n/1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

const fmtNum = (n, suffix = "") => {
  if (n === null || n === undefined || n === "Insufficient Data") return "N/A";
  return typeof n === "number" ? `${n.toFixed(1)}${suffix}` : `${n}${suffix}`;
};

export default function VaultPage() {
  const { vaults: ALL, loading, error } = useVaults();
  const [view, setView] = useState("grid"), [search, setSearch] = useState(""), [moreFilters, setMoreFilters] = useState(false), [selVault, setSelVault] = useState(null);
  const [fAt, setFAt] = useState([]), [fCh, setFCh] = useState([]), [fRi, setFRi] = useState([]), [fYT, setFYT] = useState("all");
  const [fCu, setFCu] = useState([]), [fFS, setFFS] = useState([]);
  const [fSc, setFSc] = useState(0), [fApy, setFApy] = useState(0), [fTvl, setFTvl] = useState(0), [fAge, setFAge] = useState(0), [fDep, setFDep] = useState(0);
  const [sortBy, setSortBy] = useState("yieldoScore"), [autoCurate, setAutoCurate] = useState(false), [riskTol, setRiskTol] = useState("medium");
  const [cmpList, setCmpList] = useState([]), [enrolled, setEnrolled] = useState(new Set());
  const tog = (a,s,v) => { s(a.includes(v)?a.filter(x=>x!==v):[...a,v]); };
  const togCmp = v => { cmpList.find(c=>c.id===v.id)?setCmpList(cmpList.filter(c=>c.id!==v.id)):cmpList.length<4&&setCmpList([...cmpList,v]); };
  const togEnr = id => { const n=new Set(enrolled); n.has(id)?n.delete(id):n.add(id); setEnrolled(n); };

  const CHAINS = useMemo(() => [...new Set(ALL.map(v => v.chain))].sort(), [ALL]);
  const CURATORS = useMemo(() => [...new Set(ALL.map(v => v.curator))].filter(Boolean).sort(), [ALL]);

  const clearAll = () => { setSearch("");setFCh([]);setFAt([]);setFRi([]);setFCu([]);setFFS([]);setFYT("all");setFApy(0);setFTvl(0);setFDep(0);setFAge(0);setFSc(0);setAutoCurate(false); };
  const secCount = [fCu,fFS].filter(a=>a.length).length + (fSc>0?1:0) + (fApy>0?1:0) + (fTvl>0?1:0) + (fAge>0?1:0) + (fDep>0?1:0);
  const totalActive = [fAt,fCh,fRi].filter(a=>a.length).length + (fYT!=="all"?1:0) + secCount;
  const pills = [];
  fAt.forEach(a => pills.push({ label: ATYPES.find(x=>x.id===a)?.label, remove: ()=>tog(fAt,setFAt,a) }));
  fCh.forEach(c => pills.push({ label: c, remove: ()=>tog(fCh,setFCh,c) }));
  fRi.forEach(r => pills.push({ label: `${r} risk`, remove: ()=>tog(fRi,setFRi,r) }));
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
    if(fAt.length)r=r.filter(v=>fAt.includes(v.assetType));
    if(fRi.length)r=r.filter(v=>fRi.includes(v.risk));
    if(fCu.length)r=r.filter(v=>fCu.includes(v.curator));
    if(fFS.length)r=r.filter(v=>{if(fFS.includes("clean")&&v.flags.filter(f=>f.severity!=="info").length===0)return true;if(fFS.includes("warning")&&v.warnFlags>0&&v.critFlags===0)return true;if(fFS.includes("critical")&&v.critFlags>0)return true;return false;});
    if(fYT!=="all")r=r.filter(v=>v.yieldType===fYT);
    if(fApy>0)r=r.filter(v=>v.apy>=fApy);if(fTvl>0)r=r.filter(v=>v.tvl>=fTvl);if(fDep>0)r=r.filter(v=>v.depositors>=fDep);
    if(fAge>0)r=r.filter(v=>v.age>=fAge);if(fSc>0)r=r.filter(v=>v.yieldoScore>=fSc);
    if(autoCurate){const mx=riskTol==="low"?["Low"]:riskTol==="medium"?["Low","Medium"]:["Low","Medium","High"];r=r.filter(v=>mx.includes(v.risk)).sort((a,b)=>b.yieldoScore-a.yieldoScore).slice(0,12);}
    const sm={yieldoScore:(a,b)=>b.yieldoScore-a.yieldoScore,apy:(a,b)=>b.apy-a.apy,tvl:(a,b)=>b.tvl-a.tvl,risk:(a,b)=>({Low:0,Medium:1,High:2}[a.risk]-{Low:0,Medium:1,High:2}[b.risk]),depositors:(a,b)=>b.depositors-a.depositors,age:(a,b)=>b.age-a.age,sharpe:(a,b)=>(b.sharpe||0)-(a.sharpe||0),retention:(a,b)=>(b.capRet||0)-(a.capRet||0)};
    if(sm[sortBy])r.sort(sm[sortBy]); return r;
  }, [ALL,search,fCh,fAt,fRi,fCu,fFS,fYT,fApy,fTvl,fDep,fAge,fSc,sortBy,autoCurate,riskTol]);

  if(selVault) return <VaultDetailPage vault={selVault} onBack={()=>setSelVault(null)}/>;

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
      <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: "14px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 30, height: 30, borderRadius: 7, backgroundImage: C.purpleGrad, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: "#fff", fontWeight: 700, fontSize: 12 }}>Y</span></div>
          <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: ".05em" }}>YIELDO</span><span style={{ color: C.text4, margin: "0 4px" }}>/</span>
          <span style={{ fontSize: 15, fontWeight: 500, color: C.text2 }}>🏦 Vault Catalog</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontSize: 13, color: C.text3 }}>{enrolled.size} enrolled</span><Btn primary small>Save Selection</Btn></div>
      </div>
      <div style={{ padding: "18px 32px" }}>
        <div style={{ padding: "10px 16px", borderRadius: 8, background: C.amberDim, border: `1px solid ${C.amber}20`, marginBottom: 16, display: "flex", gap: 10 }}><span style={{ fontSize: 14 }}>⚠️</span><div style={{ fontSize: 12, color: "rgba(0,0,0,.55)", lineHeight: 1.5 }}><strong>Disclaimer:</strong> Yieldo Scores and all metrics are for <strong>data visualization only</strong> — not financial advice.</div></div>
        <Card style={{ padding: "10px 16px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center", border: autoCurate?`1.5px solid ${C.purple}25`:`1px solid ${C.border}`, background: autoCurate?C.purpleDim:C.white }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontSize: 16 }}>🤖</span><div><div style={{ fontSize: 13, fontWeight: 600, color: autoCurate?C.purple:C.text }}>Auto-Curate</div><div style={{ fontSize: 11, color: C.text3 }}>Top 12 by Yieldo Score within risk tolerance</div></div></div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {autoCurate&&<div style={{ display: "flex", gap: 3 }}>{["low","medium","high"].map(r=><button key={r} onClick={()=>setRiskTol(r)} style={{ padding: "4px 10px", borderRadius: 5, fontSize: 11, fontWeight: riskTol===r?600:400, background: riskTol===r?C.purpleDim2:"transparent", border: `1px solid ${riskTol===r?C.purple+"30":C.border}`, color: riskTol===r?C.purple:C.text3, cursor: "pointer", fontFamily: "'Inter',sans-serif", textTransform: "capitalize" }}>{r}</button>)}</div>}
            <div onClick={()=>setAutoCurate(!autoCurate)} style={{ width: 40, height: 22, borderRadius: 11, background: autoCurate?C.purple:"rgba(0,0,0,.1)", position: "relative", cursor: "pointer", transition: "background .2s" }}><div style={{ width: 16, height: 16, borderRadius: 8, background: "#fff", position: "absolute", top: 3, left: autoCurate?21:3, transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.15)" }}/></div>
          </div>
        </Card>
        <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
          <div style={{ flex: 1, position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: C.text4 }}>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search vaults, assets, curators, chains..." style={{ width: "100%", padding: "9px 14px 9px 34px", background: C.white, border: `1px solid ${C.border2}`, borderRadius: 8, fontSize: 13, fontFamily: "'Inter',sans-serif", outline: "none", boxSizing: "border-box", color: C.text }}/>
          </div>
          <div style={{ height: 18, width: 1, background: C.border }}/>
          <Btn ghost small active={view==="grid"} onClick={()=>setView("grid")}>▦</Btn>
          <Btn ghost small active={view==="table"} onClick={()=>setView("table")}>☰</Btn>
          <div style={{ height: 18, width: 1, background: C.border }}/>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{ padding: "6px 8px", borderRadius: 6, border: `1px solid ${C.border2}`, fontSize: 11, fontFamily: "'Inter',sans-serif", color: C.text2, background: C.white, cursor: "pointer", outline: "none" }}>
            {[["yieldoScore","Yieldo Score"],["apy","APY"],["tvl","TVL"],["risk","Risk"],["sharpe","Sharpe"],["retention","Retention"],["depositors","Depositors"],["age","Age"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", gap: 16, marginBottom: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: C.text4, textTransform: "uppercase", letterSpacing: ".05em", marginRight: 4 }}>Asset</span>
            {ATYPES.map(a=><Chip key={a.id} label={a.label} icon={a.icon} active={fAt.includes(a.id)} onClick={()=>tog(fAt,setFAt,a.id)} small/>)}
          </div>
          <div style={{ width: 1, height: 20, background: C.border }}/>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: C.text4, textTransform: "uppercase", letterSpacing: ".05em", marginRight: 4 }}>Chain</span>
            {CHAINS.map(c=><Chip key={c} label={c} active={fCh.includes(c)} onClick={()=>tog(fCh,setFCh,c)} small/>)}
          </div>
          <div style={{ width: 1, height: 20, background: C.border }}/>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: C.text4, textTransform: "uppercase", letterSpacing: ".05em", marginRight: 4 }}>Risk</span>
            {["Low","Medium","High"].map(r=><Chip key={r} label={r} active={fRi.includes(r)} onClick={()=>tog(fRi,setFRi,r)} small/>)}
          </div>
          <div style={{ width: 1, height: 20, background: C.border }}/>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: C.text4, textTransform: "uppercase", letterSpacing: ".05em", marginRight: 4 }}>Yield</span>
            {[["all","All"],["real","Real"],["incentivized","Incent."]].map(([id,l])=><Chip key={id} label={l} active={fYT===id} onClick={()=>setFYT(fYT===id?"all":id)} small/>)}
          </div>
          <div style={{ width: 1, height: 20, background: C.border }}/>
          <Chip label={moreFilters?"Less filters":"More filters"} icon={moreFilters?"▲":"▼"} active={moreFilters||secCount>0} onClick={()=>setMoreFilters(!moreFilters)} small/>
          {totalActive>0 && <button onClick={clearAll} style={{ fontSize: 11, color: C.text4, background: "none", border: "none", cursor: "pointer", fontFamily: "'Inter',sans-serif", textDecoration: "underline" }}>Clear all</button>}
        </div>
        {moreFilters && (
          <Card style={{ padding: "14px 18px", marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 200px", maxWidth: 280 }}><TagInput label="Curator" allOptions={CURATORS} selected={fCu} onChange={v=>setFCu(v)}/></div>
              <div>
                <FL>Flag Status</FL>
                <div style={{ display: "flex", gap: 4 }}>
                  <Chip label="Clean" icon="✓" active={fFS.includes("clean")} onClick={()=>tog(fFS,setFFS,"clean")} small/>
                  <Chip label="Warning" icon="🟡" active={fFS.includes("warning")} onClick={()=>tog(fFS,setFFS,"warning")} small/>
                  <Chip label="Critical" icon="🔴" active={fFS.includes("critical")} onClick={()=>tog(fFS,setFFS,"critical")} small/>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.border}`, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
              <NumInput label="Min Score" value={fSc} onChange={v=>setFSc(v)} width={65}/>
              <NumInput label="Min APY" value={fApy} onChange={v=>setFApy(v)} suffix="%" width={65}/>
              <NumInput label="Min TVL" value={fTvl} onChange={v=>setFTvl(v)} prefix="$" width={80}/>
              <NumInput label="Min Age" value={fAge} onChange={v=>setFAge(v)} suffix="d" width={60}/>
              <NumInput label="Min Depositors" value={fDep} onChange={v=>setFDep(v)} width={65}/>
            </div>
          </Card>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, minHeight: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, color: C.text3 }}><strong style={{ color: C.text }}>{filtered.length}</strong> vaults{autoCurate&&<> · <strong style={{ color: C.purple }}>Auto-curated</strong></>}</span>
            {pills.length>0 && <div style={{ width: 1, height: 16, background: C.border, margin: "0 4px" }}/>}
            {pills.map((p,i) => <ActivePill key={i} label={p.label} onRemove={p.remove}/>)}
          </div>
          {cmpList.length>0&&<Badge color={C.purple}>⚖️ {cmpList.length} comparing</Badge>}
        </div>
        {view==="grid" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {filtered.map(v=>{
              const isCmp=!!cmpList.find(c=>c.id===v.id), isEnr=enrolled.has(v.id);
              return (
                <Card key={v.id} onClick={()=>setSelVault(v)} style={{ padding: 0, overflow: "hidden", border: isCmp?`2px solid ${C.purple}`:isEnr?`1.5px solid ${C.purple}20`:`1px solid ${C.border}`, transition: "all .2s", cursor: "pointer" }}>
                  <div style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flex: 1, minWidth: 0 }}><ScoreRing score={v.yieldoScore} size={40}/><div style={{ minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.name}</div><div style={{ fontSize: 11, color: C.text3 }}>{v.curator} · {v.chain}</div></div></div>
                      <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 8 }}><div style={{ fontSize: 17, fontWeight: 700, color: C.purple }}>{v.apy.toFixed(2)}%</div><div style={{ fontSize: 10, color: C.text4 }}>APY</div></div>
                    </div>
                    <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap" }}><Badge color={v.riskC}>{v.risk}</Badge><YieldBadge t={v.yieldType}/><Badge color={C.text3} bg={C.surfaceAlt}>{v.chain}</Badge><Badge color={C.text3} bg={C.surfaceAlt}>{v.asset}</Badge><ConfBadge age={v.age}/></div>
                    {v.flags.filter(f=>f.severity!=="info").length>0&&<div style={{ marginBottom: 8 }}><FlagBadge flags={v.flags.filter(f=>f.severity!=="info")} compact/></div>}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, fontSize: 10, marginBottom: 8, padding: "8px 0", borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
                      <div style={{ textAlign: "center" }}><div style={{ color: C.text4, fontWeight: 600 }}>TVL</div><div style={{ color: C.text2, fontWeight: 600, fontSize: 12 }}>{fmtTvl(v.tvl)}</div></div>
                      <div style={{ textAlign: "center" }}><div style={{ color: C.text4, fontWeight: 600 }}>SHARPE</div><div style={{ color: C.text2, fontWeight: 600, fontSize: 12 }}>{fmtNum(v.sharpe)}</div></div>
                      <div style={{ textAlign: "center" }}><div style={{ color: C.text4, fontWeight: 600 }}>DEPOSITORS</div><div style={{ color: C.text2, fontWeight: 600, fontSize: 12 }}>{v.depositors.toLocaleString()}</div></div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 2 }}>
                      {["capital","performance","risk","trust"].map(k=><div key={k} style={{ display: "flex", alignItems: "center", gap: 2, justifyContent: "center" }}><ScoreRing score={v.subScores[k]} size={18} sw={2}/><span style={{ fontSize: 9, color: C.text4, textTransform: "uppercase" }}>{k[0]}</span></div>)}
                    </div>
                    <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                      <button onClick={e=>{e.stopPropagation();togEnr(v.id)}} style={{ flex: 1, padding: "8px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif", backgroundImage: isEnr?"none":C.purpleGrad, background: isEnr?C.surfaceAlt:undefined, border: isEnr?`1px solid ${C.border2}`:"none", color: isEnr?C.text3:"#fff", boxShadow: isEnr?"none":C.purpleShadow }}>{isEnr?"✓ Enrolled":"+ Add"}</button>
                      <button onClick={e=>{e.stopPropagation();togCmp(v)}} style={{ padding: "8px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "'Inter',sans-serif", background: isCmp?C.purpleDim:C.surfaceAlt, border: `1px solid ${isCmp?C.purple+"30":C.border}`, color: isCmp?C.purple:C.text3 }}>⚖️</button>
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
              <div key={v.id} onClick={()=>setSelVault(v)} style={{ display: "grid", gridTemplateColumns: ".25fr 1.4fr .4fr .5fr .4fr .45fr .5fr .45fr .45fr .5fr .4fr .35fr", padding: "7px 12px", fontSize: 12, borderBottom: `1px solid ${C.border}`, alignItems: "center", background: isCmp?C.purpleDim:"transparent", minWidth: 1000, cursor: "pointer", transition: "background .1s" }} onMouseEnter={e=>{if(!isCmp)e.currentTarget.style.background=C.surfaceAlt}} onMouseLeave={e=>{if(!isCmp)e.currentTarget.style.background="transparent"}}>
                <div><input type="checkbox" checked={isEnr} onChange={e=>{e.stopPropagation();togEnr(v.id)}} style={{ accentColor: C.purple, cursor: "pointer" }}/></div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}><span style={{ fontSize: 13 }}>{v.icon}</span><div style={{ minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.name}</div><div style={{ fontSize: 9, color: C.text4 }}>{v.curator} · {v.chain}</div></div></div>
                <div><ScoreRing score={v.yieldoScore} size={26} sw={2.5}/></div>
                <div style={{ fontWeight: 700, color: C.purple, fontSize: 13 }}>{v.apy.toFixed(2)}%</div>
                <div><Badge color={v.riskC}>{v.risk}</Badge></div>
                <div><FlagBadge flags={v.flags.filter(f=>f.severity!=="info")} compact/></div>
                <div style={{ fontSize: 11, color: C.text2 }}>{fmtNum(v.sharpe)}</div>
                <div style={{ fontSize: 11, color: C.text2 }}>{fmtTvl(v.tvl)}</div>
                <div style={{ fontSize: 11, color: C.text2 }}>{v.depositors.toLocaleString()}</div>
                <div><YieldBadge t={v.yieldType}/></div>
                <div style={{ fontSize: 11, color: C.text2 }}>{v.age}d</div>
                <div><button onClick={e=>{e.stopPropagation();togCmp(v)}} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: isCmp?C.purple:C.text4 }}>⚖️</button></div>
              </div>
            )})}
          </div></Card>
        )}
      </div>
      {cmpList.length>0&&<div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50, background: C.white, borderTop: `2px solid ${C.purple}`, boxShadow: "0 -8px 32px rgba(0,0,0,.1)", padding: "14px 32px 18px", fontFamily: "'Inter',sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 14, fontWeight: 600 }}>⚖️ Comparing {cmpList.length}</span><Badge color={C.purple}>{cmpList.length}/4</Badge></div><div style={{ display: "flex", gap: 8 }}><Btn primary small>✓ Add All</Btn><Btn ghost small onClick={()=>setCmpList([])}>✕ Clear</Btn></div></div>
        <div style={{ display: "grid", gridTemplateColumns: `120px repeat(${cmpList.length}, 1fr)`, gap: 0, fontSize: 12 }}>
          <div style={{ display: "flex", flexDirection: "column" }}><div style={{ padding: "6px 0", borderBottom: `1px solid ${C.border}`, height: 36 }}/>{["Score","APY","Yield","Risk","Flags","Sharpe","TVL","Retention","Dep."].map((l,i)=><div key={i} style={{ padding: "4px 0", fontSize: 10, fontWeight: 600, color: C.text4, textTransform: "uppercase", borderBottom: `1px solid ${C.border}`, minHeight: 24, display: "flex", alignItems: "center" }}>{l}</div>)}</div>
          {cmpList.map((v,vi)=><div key={vi} style={{ display: "flex", flexDirection: "column", borderLeft: `1px solid ${C.border}`, paddingLeft: 10 }}>
            <div style={{ padding: "6px 0", borderBottom: `1px solid ${C.border}`, height: 36, display: "flex", alignItems: "center", gap: 6 }}><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.name}</div></div><button onClick={()=>setCmpList(cmpList.filter(c=>c.id!==v.id))} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: C.text4 }}>✕</button></div>
            {[<div style={{ display: "flex", alignItems: "center", gap: 4 }}><ScoreRing score={v.yieldoScore} size={22} sw={2.5}/><span style={{ fontWeight: 600 }}>{v.yieldoScore}</span></div>,<span style={{ fontWeight: 700, color: C.purple }}>{v.apy.toFixed(2)}%</span>,<YieldBadge t={v.yieldType}/>,<Badge color={v.riskC}>{v.risk}</Badge>,<FlagBadge flags={v.flags.filter(f=>f.severity!=="info")} compact/>,<span>{fmtNum(v.sharpe)}</span>,<span>{fmtTvl(v.tvl)}</span>,<span style={{ color: (v.capRet||0)<60?C.red:C.text2 }}>{v.capRet||"N/A"}%</span>,<span>{v.depositors.toLocaleString()}</span>].map((el,i)=><div key={i} style={{ padding: "4px 0", borderBottom: `1px solid ${C.border}`, minHeight: 24, display: "flex", alignItems: "center" }}>{el}</div>)}
          </div>)}
        </div>
      </div>}
    </div>
  );
}
