// Shared vault filter + table used by VaultPage and WalletsPage
import { useState, useMemo, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";

export const C = {
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

export const SEV = {
  critical: { icon: "🔴", color: C.red, bg: C.redBg, bd: "rgba(217,54,54,.2)" },
  warning: { icon: "🟡", color: C.amber, bg: C.amberBg, bd: "rgba(217,119,6,.2)" },
  info: { icon: "🔵", color: C.blue, bg: C.blueBg, bd: "rgba(21,101,192,.15)" },
};

// Common style for SVG icons
const _svgStyle = { display: "inline-block", verticalAlign: "middle", flexShrink: 0 };

// Real SVG logos
export const EthIcon = ({ size = 14 }) => (
  <svg viewBox="0 0 320 320" width={size} height={size} style={_svgStyle}>
    <path fill="#343434" d="M160,0 L160,118 L298,164 Z" />
    <path fill="#8C8C8C" d="M160,0 L22,164 L160,118 Z" />
    <path fill="#3C3C3B" d="M160,243 L160,320 L299,178 Z" />
    <path fill="#8C8C8C" d="M160,320 L160,243 L22,178 Z" />
    <path fill="#141414" d="M160,217 L298,164 L160,118 Z" />
    <path fill="#393939" d="M22,164 L160,217 L160,118 Z" />
  </svg>
);

export const BtcIcon = ({ size = 14 }) => (
  <svg viewBox="0 0 64 64" width={size} height={size} style={_svgStyle}>
    <circle cx="32" cy="32" r="32" fill="#F7931A" />
    <path fill="#FFFFFF" d="M45.6,28.4c0.6-4.1-2.5-6.3-6.7-7.8l1.4-5.5l-3.4-0.8l-1.3,5.4c-0.9-0.2-1.8-0.4-2.7-0.6l1.3-5.4l-3.4-0.8l-1.4,5.5c-0.7-0.2-1.5-0.3-2.2-0.5l0,0L22.6,17l-0.9,3.6c0,0,2.5,0.6,2.5,0.6c1.4,0.3,1.6,1.2,1.6,2L24.2,29.5c0.1,0,0.2,0.1,0.4,0.1c-0.1,0-0.2-0.1-0.4-0.1l-2.2,8.8c-0.2,0.4-0.6,1-1.5,0.8c0,0-2.5-0.6-2.5-0.6l-1.7,3.9l4.4,1.1c0.8,0.2,1.6,0.4,2.4,0.6l-1.4,5.6l3.4,0.8l1.4-5.5c0.9,0.3,1.8,0.5,2.7,0.7l-1.4,5.5l3.4,0.8l1.4-5.6c5.8,1.1,10.1,0.7,11.9-4.6c1.5-4.2-0.1-6.6-3.1-8.2C43.6,33.4,45.3,31.9,45.6,28.4z M37.6,38.7c-1.1,4.2-8.1,1.9-10.4,1.4L29,33C31.3,33.6,38.7,34.4,37.6,38.7z M38.6,28.3c-1,3.8-6.8,1.9-8.7,1.4l1.7-6.7C33.4,23.5,39.6,24.4,38.6,28.3z" />
  </svg>
);

// USDC official logo — blue circle with $ in arcs
export const UsdcIcon = ({ size = 14 }) => (
  <svg viewBox="0 0 32 32" width={size} height={size} style={_svgStyle}>
    <circle cx="16" cy="16" r="16" fill="#2775CA" />
    <path fill="#FFFFFF" d="M20.022 18.124c0-2.124-1.28-2.852-3.84-3.156-1.828-.243-2.193-.728-2.193-1.578 0-.85.61-1.396 1.828-1.396 1.097 0 1.707.364 2.011 1.275a.464.464 0 0 0 .427.303h.975a.428.428 0 0 0 .427-.425v-.06a3.04 3.04 0 0 0-2.743-2.49V8.972c0-.243-.183-.425-.487-.486h-.915c-.243 0-.426.182-.487.485v1.578c-1.829.243-2.987 1.456-2.987 2.974 0 2.002 1.218 2.79 3.778 3.095 1.707.303 2.255.668 2.255 1.638 0 .97-.853 1.638-2.011 1.638-1.585 0-2.133-.667-2.316-1.578-.061-.242-.244-.364-.427-.364h-1.036a.428.428 0 0 0-.426.425v.06c.243 1.518 1.219 2.61 3.23 2.913v1.638c0 .242.183.425.487.485h.915c.243 0 .426-.182.487-.485V21.34c1.829-.303 3.048-1.578 3.048-3.217z"/>
    <path fill="#FFFFFF" d="M12.581 23.948c-4.692-1.7-7.07-6.94-5.3-11.554a9.054 9.054 0 0 1 5.3-5.249.466.466 0 0 0 .305-.485v-.85c0-.242-.122-.425-.366-.485-.061 0-.183 0-.244.06-5.667 1.821-8.776 7.86-6.948 13.474a10.745 10.745 0 0 0 6.948 6.94c.244.121.488 0 .549-.243.061-.06.061-.121.061-.242v-.85c0-.181-.122-.363-.305-.516zm6.523-18.563c-.244-.122-.488 0-.549.243-.061.06-.061.121-.061.242v.85c0 .182.122.364.305.486 4.692 1.699 7.07 6.94 5.3 11.554a9.054 9.054 0 0 1-5.3 5.249.466.466 0 0 0-.305.485v.85c0 .242.122.425.366.485.061 0 .183 0 .244-.06 5.667-1.822 8.776-7.86 6.948-13.475a10.86 10.86 0 0 0-6.948-6.91z"/>
  </svg>
);

// USDT official logo — teal circle with white T
export const UsdtIcon = ({ size = 14 }) => (
  <svg viewBox="0 0 32 32" width={size} height={size} style={_svgStyle}>
    <circle cx="16" cy="16" r="16" fill="#26A17B" />
    <path fill="#FFFFFF" d="M17.922 17.383v-.002c-.11.008-.677.042-1.942.042-1.01 0-1.721-.03-1.971-.042v.003c-3.888-.171-6.79-.848-6.79-1.658 0-.809 2.902-1.486 6.79-1.66v2.644c.254.018.982.061 1.988.061 1.207 0 1.812-.05 1.925-.06v-2.643c3.88.173 6.775.85 6.775 1.658 0 .81-2.895 1.485-6.775 1.657m0-3.59v-2.366h5.414V7.819H8.595v3.608h5.414v2.365c-4.4.202-7.709 1.074-7.709 2.118 0 1.044 3.309 1.915 7.709 2.118v7.582h3.913v-7.584c4.393-.202 7.694-1.073 7.694-2.116 0-1.043-3.301-1.914-7.694-2.117"/>
  </svg>
);

// DAI official logo — golden circle with stylized D
export const DaiIcon = ({ size = 14 }) => (
  <svg viewBox="0 0 32 32" width={size} height={size} style={_svgStyle}>
    <circle cx="16" cy="16" r="16" fill="#F5AC37" />
    <path fill="#FFFFFF" d="M9.277 8h6.552c3.985 0 7.006 2.116 8.13 5.194H26v1.861h-1.611c.031.294.047.591.047.892v.045c0 .342-.02.68-.06 1.013H26v1.86h-2.085c-1.142 3.052-4.149 5.135-8.114 5.135H9.277V18.86H7.339v-1.86h1.938v-1.948H7.339v-1.861h1.938V8zm1.954 9v1.946h4.602c2.5 0 4.318-1.21 5.171-1.946H11.23zm9.864-1.86H11.23v-1.948h9.882c-.86-.736-2.681-1.945-5.183-1.945H11.23v-1.392h4.598c2.49 0 4.301 1.207 5.155 1.939h2.32c-.7-1.978-2.96-3.34-5.473-3.34h-4.6V18.97h4.6c2.518 0 4.776-1.366 5.474-3.346h-2.327z"/>
  </svg>
);

// Generic stablecoin badge for smaller stables (FRAX, GHO, PYUSD, etc.)
const StableBadge = ({ size = 14, letter = "S", color = "#16a34a" }) => (
  <svg viewBox="0 0 32 32" width={size} height={size} style={_svgStyle}>
    <circle cx="16" cy="16" r="16" fill={color} />
    <text x="16" y="22" textAnchor="middle" fontSize="18" fontWeight="700" fill="#FFFFFF" fontFamily="'Inter',sans-serif">{letter}</text>
  </svg>
);

// Render the appropriate icon for an asset symbol
export const AssetIcon = ({ asset, size = 14 }) => {
  const a = (asset || "").toLowerCase();
  // ETH-family
  if (a === "weth" || a === "wsteth" || a === "eth" || a === "steth" || a === "cbeth" || a === "reth" || a === "re7lrt") return <EthIcon size={size} />;
  // BTC-family
  if (a === "wbtc" || a === "cbbtc" || a === "lbtc" || a === "ubtc" || a === "tbtc" || a === "btc") return <BtcIcon size={size} />;
  // Major stables
  if (a === "usdc") return <UsdcIcon size={size} />;
  if (a === "usdt") return <UsdtIcon size={size} />;
  if (a === "dai") return <DaiIcon size={size} />;
  // Other stables — colored circle with first letter
  if (a === "frax") return <StableBadge size={size} letter="F" color="#000000" />;
  if (a === "gho") return <StableBadge size={size} letter="G" color="#A4C8C5" />;
  if (a === "crvusd") return <StableBadge size={size} letter="C" color="#FF0000" />;
  if (a === "pyusd") return <StableBadge size={size} letter="P" color="#0070BA" />;
  if (a === "susd") return <StableBadge size={size} letter="S" color="#1E1A31" />;
  if (a === "eurc") return <StableBadge size={size} letter="€" color="#2775CA" />;
  if (a === "usds") return <StableBadge size={size} letter="S" color="#FFC700" />;
  if (a === "usda") return <StableBadge size={size} letter="A" color="#1A237E" />;
  // Other tokens
  if (a === "whype") return <StableBadge size={size} letter="H" color="#97FCE4" />;
  if (a === "wmon") return <StableBadge size={size} letter="M" color="#836EF9" />;
  // Fallback
  return <StableBadge size={size} letter={(asset || "?").charAt(0).toUpperCase()} color="#9CA3AF" />;
};

export const ATYPES = [
  { id: "stablecoin", label: "Stablecoin", icon: <UsdcIcon size={12} />, assets: ["USDC","USDT","DAI","FRAX","GHO","crvUSD","PYUSD","SUSD","EURC","USDS","USDA"] },
  { id: "eth", label: "ETH", icon: <EthIcon size={12} />, assets: ["ETH","stETH","wstETH","cbETH","rETH","WETH","RE7LRT","WSTETH"] },
  { id: "btc", label: "BTC", icon: <BtcIcon size={12} />, assets: ["WBTC","tBTC","cbBTC","CBBTC","LBTC","UBTC"] },
  { id: "other", label: "Other", icon: <span style={{ fontSize: 11 }}>💎</span>, assets: ["LINK","UNI","ARB","OP","WHYPE","WMON"] },
];

export const Badge = ({ children, color = C.purple, bg }) => (
  <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 4, background: bg || `${color}12`, color, whiteSpace: "nowrap" }}>{children}</span>
);

export const Card = ({ children, style: sx = {}, onClick }) => (
  <div onClick={onClick} style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, boxShadow: "0 1px 3px rgba(0,0,0,.03)", ...sx }}>{children}</div>
);

export function ScoreRing({ score, size = 44, sw = 4 }) {
  const r = (size - sw) / 2, circ = 2 * Math.PI * r, off = circ * (1 - score / 100);
  const col = score >= 80 ? C.green : score >= 60 ? C.gold : score >= 40 ? C.amber : C.red;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(0,0,0,.04)" strokeWidth={sw}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={sw} strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"/>
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size < 24 ? 8 : size < 32 ? 10 : 13, fontWeight: 700, color: col }}>{score}</div>
    </div>
  );
}

export const fmtTvl = n => {
  if (n === 0 || n === null || n === undefined) return "$0";
  if (n >= 1e9) return `$${(n/1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n/1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n/1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

export const fmtNum = (n, suffix = "") => {
  if (n === null || n === undefined || n === "Insufficient Data") return "N/A";
  return typeof n === "number" ? `${n.toFixed(1)}${suffix}` : `${n}${suffix}`;
};

export function Sparkline({ data, height = 32, color = C.tealBright, width: fixedWidth }) {
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

export const FlagBadge = ({ flags, compact }) => {
  if (!flags?.length) return compact ? <span style={{ fontSize: 11, color: C.green, fontWeight: 600 }}>✓ Clean</span> : null;
  const c = flags.filter(f=>f.severity==="critical").length, w = flags.filter(f=>f.severity==="warning").length, inf = flags.filter(f=>f.severity==="info").length;
  if (compact) return (
    <div style={{ display: "flex", gap: 3 }}>
      {c>0 && <span style={{ fontSize: 11, fontWeight: 700, color: C.red, background: C.redBg, padding: "2px 6px", borderRadius: 4 }}>🔴{c}</span>}
      {w>0 && <span style={{ fontSize: 11, fontWeight: 700, color: C.amber, background: C.amberBg, padding: "2px 6px", borderRadius: 4 }}>🟡{w}</span>}
      {inf>0 && <span style={{ fontSize: 11, fontWeight: 600, color: C.blue, background: C.blueBg, padding: "2px 6px", borderRadius: 4 }}>🔵{inf}</span>}
    </div>
  );
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {flags.map((f, idx) => {
        const s = SEV[f.severity];
        return <span key={idx} style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4, background: s.bg, color: s.color, border: `1px solid ${s.bd}`, whiteSpace: "nowrap" }}>{s.icon} {f.label}</span>;
      })}
    </div>
  );
};

export const YieldBadge = ({ t }) => t === "real"
  ? <Badge color={C.green} bg={C.greenDim}>Real Yield</Badge>
  : <Badge color={C.teal} bg={C.tealDim}>Incentivized</Badge>;

export const FL = ({ children }) => (
  <div style={{ fontSize: 10, fontWeight: 600, color: C.text4, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>{children}</div>
);

export const NumInput = ({ label, value, onChange, prefix, suffix, width }) => (
  <div>
    {label && <FL>{label}</FL>}
    <div style={{ display: "flex", alignItems: "center", gap: 2, background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: "0 8px", ...(width ? { width } : {}) }}>
      {prefix && <span style={{ fontSize: 11, color: C.text4 }}>{prefix}</span>}
      <input type="number" value={value || ""} onChange={e => onChange(e.target.value === "" ? 0 : +e.target.value)} placeholder="Any" style={{ width: "100%", padding: "6px 2px", border: "none", background: "transparent", fontSize: 12, fontFamily: "'Inter',sans-serif", color: C.text, outline: "none" }}/>
      {suffix && <span style={{ fontSize: 11, color: C.text4, whiteSpace: "nowrap" }}>{suffix}</span>}
    </div>
  </div>
);

export function SearchableSelect({ label, options, value, onChange, placeholder = "All" }) {
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
            <div onClick={() => { onChange(""); setOpen(false); setSearch(""); }} style={{ padding: "7px 12px", fontSize: 12, cursor: "pointer", color: !value ? C.purple : C.text2, fontWeight: !value ? 600 : 400, background: !value ? C.purpleDim : "transparent" }}>{placeholder}</div>
            {filtered.map(o => (
              <div key={o} onClick={() => { onChange(o); setOpen(false); setSearch(""); }} style={{ padding: "7px 12px", fontSize: 12, cursor: "pointer", color: value === o ? C.purple : C.text2, fontWeight: value === o ? 600 : 400, background: value === o ? C.purpleDim : "transparent" }}>{o}</div>
            ))}
            {filtered.length === 0 && <div style={{ padding: "12px", fontSize: 11, color: C.text4, textAlign: "center" }}>No matches</div>}
          </div>
        </div>
      )}
      {open && <div onClick={() => { setOpen(false); setSearch(""); }} style={{ position: "fixed", inset: 0, zIndex: 29 }} />}
    </div>
  );
}

export const ActivePill = ({ label, onRemove }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px 3px 10px", borderRadius: 20, background: C.purpleDim, color: C.purple, fontSize: 11, fontWeight: 500 }}>
    {label}
    <span onClick={onRemove} style={{ cursor: "pointer", fontSize: 10, opacity: .6, marginLeft: 2, lineHeight: 1 }}>✕</span>
  </span>
);

/**
 * VaultExplorer — filter bar + (table | grid) for vault listings
 *
 * Props:
 *   vaults: array (mapped from useVaults)
 *   variant: "explore" (default — no per-row checkbox) | "enroll" (per-row checkbox for wallet partner enrollment)
 *   enrolled: Set<vaultId> — only used when variant === "enroll"
 *   onToggleEnroll: (vaultId) => void
 *   compareList: array — optional compare functionality (kept for future)
 *   onToggleCompare: (vault) => void
 */
export function VaultExplorer({
  vaults: ALL,
  variant = "explore",
  enrolled,
  onToggleEnroll,
  compareList = [],
  onToggleCompare,
}) {
  const [view, setView] = useState("table"); // table | grid
  const [search, setSearch] = useState("");
  const [moreFilters, setMoreFilters] = useState(false);
  const [fAt, setFAt] = useState([]);
  const [fCh, setFCh] = useState([]);
  const [fRi, setFRi] = useState([]);
  const [fYT, setFYT] = useState("all");
  const [fPr, setFPr] = useState([]);
  const [fCu, setFCu] = useState([]);
  const [fFS, setFFS] = useState([]);
  const [fSc, setFSc] = useState(0);
  const [fApy, setFApy] = useState(0);
  const [fTvl, setFTvl] = useState(0);
  const [fAge, setFAge] = useState(0);
  const [fDep, setFDep] = useState(0);
  const [sortBy, setSortBy] = useState("yieldoScore");
  const [sortDir, setSortDir] = useState("desc");
  const toggleSort = (key) => {
    if (sortBy === key) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortBy(key); setSortDir("desc"); }
  };

  const tog = (a, s, v) => s(a.includes(v) ? a.filter(x => x !== v) : [...a, v]);

  const SUPPORTED_CHAINS = ["Ethereum", "Base", "Arbitrum", "Optimism", "Monad", "HyperEVM", "Katana"];
  const CHAINS = useMemo(() => {
    const all = [...new Set(ALL.map(v => v.chain))].sort();
    return all.filter(c => SUPPORTED_CHAINS.includes(c));
  }, [ALL]);
  const PROTOCOLS = useMemo(() => [...new Set(ALL.map(v => v.protocol))].filter(Boolean).sort(), [ALL]);
  const CURATORS = useMemo(() => [...new Set(ALL.map(v => v.curator))].filter(Boolean).sort(), [ALL]);

  const clearAll = () => {
    setSearch(""); setFCh([]); setFAt([]); setFRi([]); setFCu([]); setFFS([]);
    setFYT("all"); setFPr([]); setFApy(0); setFTvl(0); setFDep(0); setFAge(0); setFSc(0);
  };

  const secCount = [fCu, fFS].filter(a => a.length).length + (fSc > 0 ? 1 : 0) + (fApy > 0 ? 1 : 0) + (fTvl > 0 ? 1 : 0) + (fAge > 0 ? 1 : 0) + (fDep > 0 ? 1 : 0);
  const totalActive = [fAt, fCh, fRi, fPr].filter(a => a.length).length + (fYT !== "all" ? 1 : 0) + secCount;

  const pills = [];
  fAt.forEach(a => pills.push({ label: ATYPES.find(x => x.id === a)?.label, remove: () => tog(fAt, setFAt, a) }));
  fCh.forEach(c => pills.push({ label: c, remove: () => tog(fCh, setFCh, c) }));
  fRi.forEach(r => pills.push({ label: `${r} risk`, remove: () => tog(fRi, setFRi, r) }));
  fPr.forEach(p => pills.push({ label: p, remove: () => tog(fPr, setFPr, p) }));
  if (fYT !== "all") pills.push({ label: fYT === "real" ? "Real Yield" : "Incentivized", remove: () => setFYT("all") });
  fCu.forEach(c => pills.push({ label: c, remove: () => setFCu(fCu.filter(x => x !== c)) }));
  fFS.forEach(f => pills.push({ label: f === "clean" ? "✓ Clean" : f === "warning" ? "🟡 Warning" : "🔴 Critical", remove: () => tog(fFS, setFFS, f) }));
  if (fSc > 0) pills.push({ label: `Score ≥${fSc}`, remove: () => setFSc(0) });
  if (fApy > 0) pills.push({ label: `APY ≥${fApy}%`, remove: () => setFApy(0) });
  if (fTvl > 0) pills.push({ label: `TVL ≥$${fTvl}`, remove: () => setFTvl(0) });
  if (fAge > 0) pills.push({ label: `Age ≥${fAge}d`, remove: () => setFAge(0) });
  if (fDep > 0) pills.push({ label: `Dep. ≥${fDep}`, remove: () => setFDep(0) });

  const filtered = useMemo(() => {
    let r = [...ALL];
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(v => v.name.toLowerCase().includes(q) || v.asset.toLowerCase().includes(q) || v.curator.toLowerCase().includes(q) || v.chain.toLowerCase().includes(q));
    }
    if (fCh.length) r = r.filter(v => fCh.includes(v.chain));
    if (fPr.length) r = r.filter(v => fPr.includes(v.protocol));
    if (fAt.length) r = r.filter(v => fAt.includes(v.assetType));
    if (fRi.length) r = r.filter(v => fRi.includes(v.risk));
    if (fCu.length) r = r.filter(v => fCu.includes(v.curator));
    if (fFS.length) r = r.filter(v => {
      if (fFS.includes("clean") && v.flags.filter(f => f.severity !== "info").length === 0) return true;
      if (fFS.includes("warning") && v.warnFlags > 0 && v.critFlags === 0) return true;
      if (fFS.includes("critical") && v.critFlags > 0) return true;
      return false;
    });
    if (fYT !== "all") r = r.filter(v => v.yieldType === fYT);
    if (fApy > 0) r = r.filter(v => v.apy >= fApy);
    if (fTvl > 0) r = r.filter(v => v.tvl >= fTvl);
    if (fDep > 0) r = r.filter(v => v.depositors >= fDep);
    if (fAge > 0) r = r.filter(v => v.age >= fAge);
    if (fSc > 0) r = r.filter(v => v.yieldoScore >= fSc);
    const sm = {
      yieldoScore: (a, b) => b.yieldoScore - a.yieldoScore,
      apy: (a, b) => b.apy - a.apy,
      tvl: (a, b) => b.tvl - a.tvl,
      risk: (a, b) => ({ Low: 0, Medium: 1, High: 2 }[a.risk] - { Low: 0, Medium: 1, High: 2 }[b.risk]),
      depositors: (a, b) => b.depositors - a.depositors,
      age: (a, b) => b.age - a.age,
      sharpe: (a, b) => (b.sharpe || 0) - (a.sharpe || 0),
      retention: (a, b) => (b.capRet || 0) - (a.capRet || 0),
    };
    if (sm[sortBy]) { r.sort(sm[sortBy]); if (sortDir === "asc") r.reverse(); }
    return r;
  }, [ALL, search, fCh, fPr, fAt, fRi, fCu, fFS, fYT, fApy, fTvl, fDep, fAge, fSc, sortBy, sortDir]);

  return (
    <>
      <div style={{ background: C.white, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ padding: "12px 20px", maxWidth: 1600, margin: "0 auto" }}>
          {/* Row 1: Search + Asset + Risk */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", rowGap: 8 }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: C.text4 }}>🔍</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vaults, assets, curators…" style={{ paddingLeft: 30, paddingRight: 12, paddingTop: 7, paddingBottom: 7, borderRadius: 8, border: `1.5px solid ${search ? C.purple : C.border2}`, fontSize: 12, fontFamily: "'Inter',sans-serif", outline: "none", width: 220, color: C.text, background: C.white, transition: "border-color .15s" }} />
            </div>
            <div style={{ width: 1, height: 24, background: C.border, flexShrink: 0 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 11, color: C.text3, fontWeight: 500, whiteSpace: "nowrap" }}>Asset</span>
              <div style={{ display: "flex", gap: 3 }}>
                {ATYPES.map(a => (
                  <button key={a.id} onClick={() => tog(fAt, setFAt, a.id)} style={{ padding: "5px 9px", borderRadius: 6, fontSize: 11, fontWeight: fAt.includes(a.id) ? 700 : 400, backgroundImage: fAt.includes(a.id) ? C.purpleGrad : "none", background: fAt.includes(a.id) ? undefined : "transparent", border: `1px solid ${fAt.includes(a.id) ? "transparent" : C.border}`, color: fAt.includes(a.id) ? "#fff" : C.text2, cursor: "pointer", fontFamily: "'Inter',sans-serif", display: "inline-flex", alignItems: "center", gap: 4 }}>
                    {a.icon}{a.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ width: 1, height: 24, background: C.border, flexShrink: 0 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 11, color: C.text3, fontWeight: 500 }}>Risk</span>
              <div style={{ display: "flex", gap: 3 }}>
                {[["Low", C.green], ["Medium", C.amber], ["High", C.red]].map(([r, col]) => (
                  <button key={r} onClick={() => tog(fRi, setFRi, r)} style={{ padding: "5px 9px", borderRadius: 6, fontSize: 11, fontWeight: fRi.includes(r) ? 700 : 400, background: fRi.includes(r) ? `${col}18` : "transparent", border: `1px solid ${fRi.includes(r) ? col + "50" : C.border}`, color: fRi.includes(r) ? col : C.text2, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>{r}</button>
                ))}
              </div>
            </div>
          </div>
          {/* Row 2: Chain + Yield + Protocol + Advanced + Sort */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 10, rowGap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 11, color: C.text3, fontWeight: 500 }}>Chain</span>
              <div style={{ display: "flex", gap: 3 }}>
                {CHAINS.map(c => (
                  <button key={c} onClick={() => tog(fCh, setFCh, c)} style={{ padding: "5px 9px", borderRadius: 6, fontSize: 11, fontWeight: fCh.includes(c) ? 600 : 400, background: fCh.includes(c) ? C.purpleDim2 : "transparent", border: `1px solid ${fCh.includes(c) ? C.purple + "40" : C.border}`, color: fCh.includes(c) ? C.purple : C.text2, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>{c}</button>
                ))}
              </div>
            </div>
            <div style={{ width: 1, height: 24, background: C.border, flexShrink: 0 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 11, color: C.text3, fontWeight: 500 }}>Yield</span>
              <div style={{ display: "flex", gap: 3 }}>
                {[["all", "All"], ["real", "Real"], ["incentivized", "Incent."]].map(([id, l]) => (
                  <button key={id} onClick={() => setFYT(fYT === id ? "all" : id)} style={{ padding: "5px 9px", borderRadius: 6, fontSize: 11, fontWeight: fYT === id && id !== "all" ? 600 : 400, background: fYT === id && id !== "all" ? C.tealDim : "transparent", border: `1px solid ${fYT === id && id !== "all" ? C.teal + "40" : C.border}`, color: fYT === id && id !== "all" ? C.teal : C.text2, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>{l}</button>
                ))}
              </div>
            </div>
            <div style={{ width: 1, height: 24, background: C.border, flexShrink: 0 }} />
            <SearchableSelect label="" options={PROTOCOLS} value={fPr[0] || ""} onChange={v => setFPr(v ? [v] : [])} placeholder="All protocols" />
            <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
              <button onClick={() => setMoreFilters(!moreFilters)} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "'Inter',sans-serif", background: moreFilters || secCount > 0 ? C.purpleDim : "transparent", border: `1px solid ${moreFilters || secCount > 0 ? C.purple + "30" : C.border2}`, color: moreFilters || secCount > 0 ? C.purple : C.text2, transition: "all .15s" }}>
                ⚙️ Advanced{secCount > 0 && <span style={{ background: C.purple, color: "#fff", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 10 }}>{secCount}</span>}<span style={{ fontSize: 10, opacity: .6 }}>{moreFilters ? "▲" : "▼"}</span>
              </button>
              <div style={{ width: 1, height: 20, background: C.border }} />
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 11, color: C.text3 }}>Sort</span>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ fontSize: 11, border: `1px solid ${C.border2}`, borderRadius: 6, padding: "5px 8px", background: C.white, fontFamily: "'Inter',sans-serif", color: C.text, cursor: "pointer", outline: "none" }}>
                  {[["yieldoScore", "Yieldo Score"], ["apy", "APY"], ["tvl", "TVL"], ["risk", "Risk"], ["sharpe", "Sharpe"], ["retention", "Retention"], ["depositors", "Depositors"], ["age", "Age"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", background: C.surfaceAlt, borderRadius: 7, border: `1px solid ${C.border}`, padding: 2, gap: 2 }}>
                {[["table","☰","Table"],["grid","⊞","Cards"]].map(([v, icon, label]) => (
                  <button key={v} onClick={() => setView(v)} title={label} style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, padding: "4px 9px", borderRadius: 5, border: "none", cursor: "pointer", background: view === v ? C.white : "transparent", color: view === v ? C.text : C.text3, boxShadow: view === v ? "0 1px 3px rgba(0,0,0,.08)" : "none", transition: "all .12s" }}>{icon}</button>
                ))}
              </div>
              {totalActive > 0 && <button onClick={clearAll} style={{ fontSize: 11, color: C.text3, background: "none", border: `1px solid ${C.border}`, borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>✕ Clear</button>}
            </div>
          </div>
        </div>

        {/* Advanced filters */}
        {moreFilters && (
          <div style={{ borderTop: `1px solid ${C.border}`, padding: "14px 20px", background: "#FAFAF8", maxWidth: 1600, margin: "0 auto" }}>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
              <SearchableSelect label="Curator" options={CURATORS} value={fCu[0] || ""} onChange={v => setFCu(v ? [v] : [])} placeholder="All curators" />
              <div>
                <FL>Flags</FL>
                <div style={{ display: "flex", gap: 4 }}>
                  {[["clean", "✓ Clean", C.green], ["warning", "🟡 Warning", C.amber], ["critical", "🔴 Critical", C.red]].map(([id, l, col]) => (
                    <button key={id} onClick={() => tog(fFS, setFFS, id)} style={{ padding: "5px 9px", borderRadius: 6, fontSize: 11, fontWeight: fFS.includes(id) ? 600 : 400, background: fFS.includes(id) ? `${col}15` : "transparent", border: `1px solid ${fFS.includes(id) ? col + "40" : C.border}`, color: fFS.includes(id) ? col : C.text2, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>{l}</button>
                  ))}
                </div>
              </div>
              <NumInput label="Min Score" value={fSc} onChange={v => setFSc(v)} width={75}/>
              <NumInput label="Min APY" value={fApy} onChange={v => setFApy(v)} suffix="%" width={70}/>
              <NumInput label="Min TVL" value={fTvl} onChange={v => setFTvl(v)} prefix="$" width={85}/>
              <NumInput label="Min Age" value={fAge} onChange={v => setFAge(v)} suffix="d" width={65}/>
              <NumInput label="Min Deps" value={fDep} onChange={v => setFDep(v)} width={70}/>
            </div>
          </div>
        )}
      </div>

      {/* Result count + active pills */}
      <div style={{ padding: "16px 20px", maxWidth: 1600, margin: "0 auto" }}>
        {(() => {
          // Select-all state across the currently filtered vaults
          const enrolledInFiltered = variant === "enroll" && enrolled
            ? filtered.filter(v => enrolled.has(v.id)).length
            : 0;
          const allSelected = variant === "enroll" && filtered.length > 0 && enrolledInFiltered === filtered.length;
          const someSelected = variant === "enroll" && enrolledInFiltered > 0 && enrolledInFiltered < filtered.length;
          const handleMaster = () => {
            if (!onToggleEnroll) return;
            if (allSelected) {
              filtered.forEach(v => { if (enrolled.has(v.id)) onToggleEnroll(v.id); });
            } else {
              filtered.forEach(v => { if (!enrolled.has(v.id)) onToggleEnroll(v.id); });
            }
          };
          return (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, minHeight: 28, flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                {variant === "enroll" && enrolled && (
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", padding: "4px 10px", borderRadius: 6, background: someSelected || allSelected ? C.purpleDim : "transparent", border: `1px solid ${someSelected || allSelected ? C.purple + "30" : C.border}`, transition: "background .1s" }}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={el => { if (el) el.indeterminate = someSelected; }}
                      onChange={handleMaster}
                      style={{ accentColor: C.purple, cursor: "pointer", width: 14, height: 14, margin: 0 }}
                    />
                    <span style={{ fontSize: 12, fontWeight: 600, color: someSelected || allSelected ? C.purple : C.text3, userSelect: "none" }}>
                      {allSelected ? "Deselect all" : someSelected ? `Select all (${filtered.length - enrolledInFiltered} more)` : `Select all (${filtered.length})`}
                    </span>
                  </label>
                )}
                <span style={{ fontSize: 13, color: C.text3 }}><strong style={{ color: C.text }}>{filtered.length}</strong> vaults</span>
                {pills.length > 0 && <div style={{ width: 1, height: 16, background: C.border, margin: "0 4px" }}/>}
                {pills.map((p, i) => <ActivePill key={i} label={p.label} onRemove={p.remove}/>)}
              </div>
              {variant === "enroll" && enrolled && (
                <Badge color={C.purple}>✓ {enrolled.size} enrolled</Badge>
              )}
            </div>
          );
        })()}

        {/* TABLE VIEW */}
        {view === "table" && (
          <Card><div style={{ overflow: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: variant === "enroll"
              ? ".25fr 1.5fr .4fr .55fr .4fr .5fr .5fr .5fr .55fr .45fr"
              : "1.6fr .4fr .55fr .4fr .5fr .5fr .5fr .55fr .45fr",
              padding: "8px 12px", fontSize: 10, fontWeight: 600, color: C.text4, textTransform: "uppercase", letterSpacing: ".04em", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap", minWidth: variant === "enroll" ? 960 : 900 }}>
              {variant === "enroll" && (() => {
                const enrInFilt = filtered.filter(v => enrolled?.has(v.id)).length;
                const allSel = filtered.length > 0 && enrInFilt === filtered.length;
                const someSel = enrInFilt > 0 && enrInFilt < filtered.length;
                return (
                  <div title={allSel ? "Deselect all visible" : "Select all visible"}>
                    <input
                      type="checkbox"
                      checked={allSel}
                      ref={el => { if (el) el.indeterminate = someSel; }}
                      onChange={() => {
                        if (!onToggleEnroll) return;
                        if (allSel) filtered.forEach(v => { if (enrolled.has(v.id)) onToggleEnroll(v.id); });
                        else filtered.forEach(v => { if (!enrolled.has(v.id)) onToggleEnroll(v.id); });
                      }}
                      style={{ accentColor: C.purple, cursor: "pointer", width: 14, height: 14, margin: 0 }}
                    />
                  </div>
                );
              })()}
              <div>Vault</div>
              {[["Score","yieldoScore"],["APY","apy"],["Risk","risk"],["Flags",null],["TVL","tvl"],["Dep.","depositors"],["Yield",null],["Age","age"]].map(([label,key])=>(
                <div key={label} onClick={key ? ()=>toggleSort(key) : undefined} style={{ cursor: key ? "pointer" : "default", color: sortBy===key ? C.purple : C.text4, userSelect: "none" }}>
                  {label}{sortBy===key ? (sortDir==="desc" ? " \u2193" : " \u2191") : ""}
                </div>
              ))}
            </div>
            {filtered.map(v => {
              const isEnr = enrolled?.has(v.id);
              const rowStyle = {
                display: "grid",
                gridTemplateColumns: variant === "enroll"
                  ? ".25fr 1.5fr .4fr .55fr .4fr .5fr .5fr .5fr .55fr .45fr"
                  : "1.6fr .4fr .55fr .4fr .5fr .5fr .5fr .55fr .45fr",
                padding: "7px 12px", fontSize: 12, borderBottom: `1px solid ${C.border}`, alignItems: "center",
                background: isEnr && variant === "enroll" ? "rgba(122,28,203,.04)" : "transparent",
                minWidth: variant === "enroll" ? 960 : 900, cursor: "pointer", transition: "background .1s",
                textDecoration: "none", color: "inherit",
              };
              return (
                <Link
                  key={v.id}
                  to={`/vault/${encodeURIComponent(v.id)}`}
                  style={rowStyle}
                  onMouseEnter={e => { e.currentTarget.style.background = C.surfaceAlt; }}
                  onMouseLeave={e => { e.currentTarget.style.background = isEnr && variant === "enroll" ? "rgba(122,28,203,.04)" : "transparent"; }}
                >
                  {variant === "enroll" && (
                    /* Stop click + prevent default so checkbox doesn't trigger Link navigation */
                    <div onClick={e => { e.stopPropagation(); e.preventDefault(); }}>
                      <input
                        type="checkbox"
                        checked={isEnr || false}
                        onClick={e => { e.stopPropagation(); }}
                        onChange={e => { e.stopPropagation(); onToggleEnroll?.(v.id); }}
                        style={{ accentColor: C.purple, cursor: "pointer", width: 16, height: 16 }}
                      />
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                    <AssetIcon asset={v.asset} size={14} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.name}</div>
                      <div style={{ fontSize: 9, color: C.text4 }}>{v.curator !== "Unknown" ? `${v.curator} · ` : ""}{v.chain}</div>
                    </div>
                  </div>
                  <div><ScoreRing score={v.yieldoScore} size={26} sw={2.5}/></div>
                  <div style={{ fontWeight: 700, color: C.purple, fontSize: 13 }}>{v.apy.toFixed(2)}%</div>
                  <div><Badge color={v.riskC}>{v.risk}</Badge></div>
                  <div><FlagBadge flags={v.flags.filter(f => f.severity !== "info")} compact/></div>
                  <div style={{ fontSize: 11, color: C.text2 }}>{fmtTvl(v.tvl)}</div>
                  <div style={{ fontSize: 11, color: C.text2 }}>{v.depositors.toLocaleString()}</div>
                  <div><YieldBadge t={v.yieldType}/></div>
                  <div style={{ fontSize: 11, color: C.text2 }}>{v.age}d</div>
                </Link>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ padding: 60, textAlign: "center", color: C.text3 }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>🏦</div>
                <div style={{ fontSize: 14 }}>No vaults match the current filters.</div>
              </div>
            )}
          </div></Card>
        )}

        {/* GRID / CARD VIEW */}
        {view === "grid" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            {filtered.map(v => {
              const isEnr = enrolled?.has(v.id);
              return (
                <Link
                  key={v.id}
                  to={`/vault/${encodeURIComponent(v.id)}`}
                  style={{
                    background: C.white, borderRadius: 12, overflow: "hidden",
                    border: isEnr && variant === "enroll" ? `1.5px solid ${C.purple}40` : `1px solid ${C.border}`,
                    boxShadow: "0 1px 3px rgba(0,0,0,.03)", cursor: "pointer",
                    textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column",
                    transition: "all .15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(122,28,203,.1)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,.03)"; e.currentTarget.style.transform = "none"; }}
                >
                  <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flex: 1, minWidth: 0 }}>
                        <ScoreRing score={v.yieldoScore} size={40} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.name}</div>
                          <div style={{ fontSize: 11, color: C.text3 }}>{v.curator !== "Unknown" ? `${v.curator} · ` : ""}{v.chain}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 8 }}>
                        <div style={{ fontSize: 17, fontWeight: 700, color: C.purple }}>{v.apy.toFixed(2)}%</div>
                        <div style={{ fontSize: 10, color: C.text4 }}>APY</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 4, marginBottom: 10, flexWrap: "wrap" }}>
                      <Badge color={v.riskC}>{v.risk}</Badge>
                      <YieldBadge t={v.yieldType}/>
                      <Badge color={C.text3} bg={C.surfaceAlt}>{v.protocol}</Badge>
                      <Badge color={C.text3} bg={C.surfaceAlt}>{v.asset}</Badge>
                    </div>
                    {v.flags.filter(f => f.severity !== "info").length > 0 && (
                      <div style={{ marginBottom: 10 }}><FlagBadge flags={v.flags.filter(f => f.severity !== "info")} compact/></div>
                    )}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, fontSize: 10, padding: "10px 0", borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, marginBottom: 10 }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ color: C.text4, fontWeight: 600 }}>TVL</div>
                        <div style={{ color: C.text2, fontWeight: 600, fontSize: 12 }}>{fmtTvl(v.tvl)}</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ color: C.text4, fontWeight: 600 }}>DEPOSITORS</div>
                        <div style={{ color: C.text2, fontWeight: 600, fontSize: 12 }}>{v.depositors.toLocaleString()}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, marginTop: "auto", alignItems: "center" }}>
                      {variant === "enroll" ? (
                        <button
                          onClick={e => { e.stopPropagation(); e.preventDefault(); onToggleEnroll?.(v.id); }}
                          style={{
                            flex: 1, padding: "9px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                            cursor: "pointer", fontFamily: "'Inter',sans-serif",
                            background: isEnr ? C.greenDim : undefined,
                            backgroundImage: isEnr ? "none" : C.purpleGrad,
                            border: isEnr ? `1px solid rgba(26,157,63,.25)` : "none",
                            color: isEnr ? C.green : "#fff",
                            boxShadow: isEnr ? "none" : C.purpleShadow,
                          }}
                        >
                          {isEnr ? "✓ Enrolled" : "+ Enroll"}
                        </button>
                      ) : (
                        <div
                          style={{
                            flex: 1, padding: "9px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                            fontFamily: "'Inter',sans-serif", textAlign: "center",
                            backgroundImage: C.purpleGrad, color: "#fff", boxShadow: C.purpleShadow,
                          }}
                        >Explore →</div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ gridColumn: "1 / -1", padding: 60, textAlign: "center", color: C.text3 }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>🏦</div>
                <div style={{ fontSize: 14 }}>No vaults match the current filters.</div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
