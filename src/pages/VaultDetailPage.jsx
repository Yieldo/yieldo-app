import { useState, useMemo, useRef, useEffect, useCallback, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useVaultDetail } from "../hooks/useVaultData.js";
import { useUserAuth } from "../hooks/useUserAuth.js";
import { useDepositMeta } from "../hooks/useDepositMeta.js";
const DepositModal = lazy(() => import("../components/DepositModal.jsx"));
const UserDeposits = lazy(() => import("../components/UserDeposits.jsx"));
const DEPOSIT_API = import.meta.env.VITE_PARTNER_API || "https://api.yieldo.xyz";

function useWindowWidth() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => { const h = () => setW(window.innerWidth); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);
  return w;
}

// DeFiLlama pool IDs for benchmark verification — matches backend third_party.py
const BENCHMARK_URLS = {
  // USDC
  "usdc_1": "https://defillama.com/yields/pool/aa70268e-4b52-42bf-a116-608b370f9501",
  "usdc_8453": "https://defillama.com/yields/pool/7e0661bf-8cf3-45e6-9424-31916d4c7b84",
  "usdc_42161": "https://defillama.com/yields/pool/d9fa8e14-0447-4207-9ae8-7810199dfa1f",
  "usdc_10": "https://defillama.com/yields/pool/0758c3b8-4ffb-4176-b0a9-f446e367db46",
  // USDT
  "usdt_1": "https://defillama.com/yields/pool/f981a304-bb6c-45b8-b0c5-fd2f515ad23a",
  "usdt_42161": "https://defillama.com/yields/pool/f981a304-bb6c-45b8-b0c5-fd2f515ad23a",
  "usdt_10": "https://defillama.com/yields/pool/bde08c85-41c5-4d80-9bb1-0835a4352efa",
  // WETH / ETH-like → ALL use Lido stETH (backend uses lido_steth for all ETH assets, all chains)
  "weth_1": "https://defillama.com/yields/pool/747c1d2a-c668-4682-b9f9-296708a3dd90",
  "wsteth_1": "https://defillama.com/yields/pool/747c1d2a-c668-4682-b9f9-296708a3dd90",
  "re7lrt_1": "https://defillama.com/yields/pool/747c1d2a-c668-4682-b9f9-296708a3dd90",
  "weth_8453": "https://defillama.com/yields/pool/747c1d2a-c668-4682-b9f9-296708a3dd90",
  "weth_42161": "https://defillama.com/yields/pool/747c1d2a-c668-4682-b9f9-296708a3dd90",
  "weth_10": "https://defillama.com/yields/pool/747c1d2a-c668-4682-b9f9-296708a3dd90",
  "weth_747474": "https://defillama.com/yields/pool/747c1d2a-c668-4682-b9f9-296708a3dd90",
  "weth_143": "https://defillama.com/yields/pool/747c1d2a-c668-4682-b9f9-296708a3dd90",
  // WBTC / BTC-like
  "wbtc_1": "https://defillama.com/yields/pool/7e382157-b1bc-406d-b17b-facba43b716e",
  "cbbtc_1": "https://defillama.com/yields/pool/7e382157-b1bc-406d-b17b-facba43b716e",
  "lbtc_1": "https://defillama.com/yields/pool/7e382157-b1bc-406d-b17b-facba43b716e",
  "ubtc_1": "https://defillama.com/yields/pool/7e382157-b1bc-406d-b17b-facba43b716e",
  "ubtc_999": "https://defillama.com/yields/pool/7e382157-b1bc-406d-b17b-facba43b716e",
  "wbtc_42161": "https://defillama.com/yields/pool/7c5e69a4-2430-4fa2-b7cb-857f79d7d1bf",
  "wbtc_10": "https://defillama.com/yields/pool/e053590b-54f1-40aa-ae0d-14e701ca734c",
  // PYUSD
  "pyusd_1": "https://defillama.com/yields/pool/d118f505-e75f-4152-bad3-49a2dc7482bf",
  // WHYPE → Hyperliquid Foundation staking
  "whype_999": "https://app.hyperliquid.xyz/staking",
};
// Stablecoins that use USDC benchmark as fallback
const STABLE_ASSETS = ["usdc","usdt","dai","pyusd","susd","eurc","usds","usda","ausd","usdtb"];
function getBenchmarkUrl(asset, chainId) {
  const a = (asset || "").toLowerCase();
  const key = `${a}_${chainId}`;
  if (BENCHMARK_URLS[key]) return BENCHMARK_URLS[key];
  // Stablecoin fallback: use USDC on same chain, then USDC on ETH
  if (STABLE_ASSETS.includes(a)) {
    const fallback = BENCHMARK_URLS[`usdc_${chainId}`] || BENCHMARK_URLS["usdc_1"];
    return fallback;
  }
  // ETH-like fallback
  if (["eth","weth","wsteth","re7lrt","cbeth","reth"].includes(a)) {
    return BENCHMARK_URLS[`weth_${chainId}`] || BENCHMARK_URLS["weth_1"];
  }
  // BTC-like fallback
  if (["wbtc","cbbtc","lbtc","ubtc"].includes(a)) {
    return BENCHMARK_URLS[`wbtc_${chainId}`] || BENCHMARK_URLS["wbtc_1"];
  }
  return "https://defillama.com/yields";
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

const EXPLORER_URL = {
  1: "https://etherscan.io",
  8453: "https://basescan.org",
  42161: "https://arbiscan.io",
  10: "https://optimistic.etherscan.io",
  999: "https://hyperevmscan.io",
  747474: "https://katana.explorers.caldera.xyz",
  143: "https://explorer.monad.xyz",
};

const getExplorerLink = (chainId, address) => {
  const base = EXPLORER_URL[chainId];
  if (!base || !address) return null;
  return `${base}/address/${address}`;
};

const KNOWN_NAMES = {
  "0x0000000000000000000000000000000000000000": "Zero Address",
};

const Btn = ({ children, primary, small, ghost, active, onClick, disabled, title, style: sx = {} }) => {
  const b = { fontFamily: "'Inter',sans-serif", fontSize: small ? 13 : 14, fontWeight: 500, border: "none", borderRadius: 6, cursor: disabled ? "not-allowed" : "pointer", padding: small ? "6px 12px" : "10px 18px", display: "inline-flex", alignItems: "center", gap: 6, transition: "all .15s", opacity: disabled ? 0.5 : 1, ...sx };
  if (primary) return <button onClick={onClick} disabled={disabled} title={title} style={{ ...b, backgroundImage: C.purpleGrad, color: "#fff", boxShadow: C.purpleShadow }}>{children}</button>;
  if (ghost) return <button onClick={onClick} disabled={disabled} title={title} style={{ ...b, background: active ? C.purpleDim : "transparent", color: active ? C.purple : C.text3, fontWeight: active ? 600 : 500 }}>{children}</button>;
  return <button onClick={onClick} disabled={disabled} title={title} style={{ ...b, background: C.white, color: C.text2, border: `1px solid ${C.border2}`, boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>{children}</button>;
};

const Badge = ({ children, color = C.purple, bg }) => <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 4, background: bg || `${color}12`, color, whiteSpace: "nowrap" }}>{children}</span>;

const Card = ({ children, style: sx = {} }) => <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, boxShadow: "0 1px 3px rgba(0,0,0,.03)", ...sx }}>{children}</div>;

function ScoreRing({ score, size = 44, sw = 4 }) {
  if (score === null || score === undefined) score = 0;
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

const fmtTvl = n => {
  if (n === 0 || n === null || n === undefined) return "$0";
  if (n >= 1e9) return `$${(n/1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n/1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n/1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

const fmt = (v, suffix = "", fallback = "N/A") => {
  if (v === null || v === undefined || v === "Insufficient Data") return fallback;
  if (typeof v === "number") return `${v.toFixed(v % 1 === 0 ? 0 : 2)}${suffix}`;
  return `${v}${suffix}`;
};

function APYChart({ data, dates = [], benchmarkData, width: propWidth = 560, height: propHeight = 200 }) {
  // Make chart responsive — use container width
  const containerRef = useRef(null);
  const [containerW, setContainerW] = useState(propWidth);
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(entries => { for (const e of entries) setContainerW(e.contentRect.width); });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);
  const width = Math.max(200, containerW);
  const height = Math.min(propHeight, width * 0.4);
  const [range, setRange] = useState("All");
  const [hover, setHover] = useState(null);
  const svgRef = useRef(null);
  const ranges = { "7d": 7, "30d": 30, "90d": 90, "All": data.length };
  const sliced = data.slice(-ranges[range]);
  const slicedDates = dates.slice(-ranges[range]);
  const benchSliced = benchmarkData ? benchmarkData.slice(-ranges[range]) : [];
  const allVals = [...sliced, ...(benchSliced || [])].filter(v => typeof v === "number");
  if (allVals.length < 2) return <div style={{ fontSize: 12, color: C.text4, padding: 20, textAlign: "center" }}>Insufficient APY history data</div>;

  // Compute clipping ceiling so spikes don't squash the chart.
  // Use median × 4 as a reasonable headroom. Clamp to [5%, 50%] for stables, more for high-yield.
  const sortedVals = [...allVals].sort((a, b) => a - b);
  const median = sortedVals[Math.floor(sortedVals.length / 2)];
  const rawMax = Math.max(...allVals);
  const rawMin = Math.min(...allVals);
  // Default cap: 4× median, with 5% floor and 50% ceiling
  let cap = Math.max(Math.abs(median) * 4, 5);
  cap = Math.min(cap, 50);
  // If the data never reaches the cap, just use rawMax (no clipping needed)
  const needsClipping = rawMax > cap;
  const mx = needsClipping ? cap : rawMax;
  const mn = Math.min(rawMin, 0);
  const pad = { t: 20, r: 16, b: 32, l: 44 };
  const cw = width - pad.l - pad.r, ch = height - pad.t - pad.b;
  const rng = mx - mn || 1;
  const toX = i => pad.l + (i / (sliced.length - 1)) * cw;
  // Clamp y to chart bounds — values above cap pin to top of chart
  const toY = v => {
    const clamped = Math.min(Math.max(v, mn), mx);
    return pad.t + ch - ((clamped - mn) / rng) * ch;
  };
  // Identify outliers so we can render them as labeled markers at the top
  const outliers = needsClipping
    ? sliced.map((v, i) => (typeof v === "number" && v > cap ? { i, v } : null)).filter(Boolean)
    : [];
  const mainPath = sliced.map((v, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");
  const benchPath = benchSliced.length > 0 ? benchSliced.map((v, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ") : "";
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
    <div ref={containerRef} style={{ width: "100%", overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 12, height: 2, background: C.purple, borderRadius: 1 }} /><span style={{ fontSize: 10, color: C.text3 }}>Vault APY</span></div>
          {benchSliced.length > 0 && <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 12, height: 2, background: C.text4, borderRadius: 1, opacity: .5 }} /><span style={{ fontSize: 10, color: C.text4 }}>Benchmark</span></div>}
          {needsClipping && <span style={{ fontSize: 9, color: C.amber, fontWeight: 600, padding: "2px 6px", borderRadius: 4, background: "rgba(217,119,6,.08)", border: "1px solid rgba(217,119,6,.2)" }}>⚠ Y-axis clipped at {cap.toFixed(0)}% — outliers labeled above</span>}
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          {Object.keys(ranges).filter(k => ranges[k] <= data.length || k === "All").map(k => (
            <button key={k} onClick={() => setRange(k)} style={{ padding: "3px 8px", borderRadius: 4, fontSize: 10, fontWeight: range === k ? 600 : 400, background: range === k ? C.purpleDim : "transparent", border: `1px solid ${range === k ? C.purple + "30" : "transparent"}`, color: range === k ? C.purple : C.text4, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>{k}</button>
          ))}
        </div>
      </div>
      <svg ref={svgRef} width={width} height={height} style={{ display: "block", cursor: "crosshair" }} onMouseMove={handleMouse} onMouseLeave={() => setHover(null)}>
        {yLines.map((v, i) => (
          <g key={i}><line x1={pad.l} y1={toY(v)} x2={width - pad.r} y2={toY(v)} stroke="rgba(0,0,0,.04)" strokeWidth="1" /><text x={pad.l - 6} y={toY(v) + 3} textAnchor="end" fontSize="9" fill={C.text4} fontFamily="'Inter',sans-serif">{v.toFixed(1)}%</text></g>
        ))}
        {slicedDates.length > 0 && (() => {
          const labelCount = Math.min(6, slicedDates.length);
          const step = Math.max(1, Math.floor((slicedDates.length - 1) / (labelCount - 1)));
          const indices = Array.from({ length: labelCount }, (_, i) => Math.min(i * step, slicedDates.length - 1));
          return indices.map(idx => {
            const d = slicedDates[idx];
            if (!d) return null;
            const parts = d.split("-");
            const label = parts.length >= 3 ? `${parts[1]}/${parts[2]}` : d;
            return <text key={idx} x={toX(idx)} y={pad.t + ch + 16} textAnchor="middle" fontSize="9" fill={C.text4} fontFamily="'Inter',sans-serif">{label}</text>;
          });
        })()}
        <path d={areaPath} fill="url(#apyGrad)" />
        <defs><linearGradient id="apyGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.purple} stopOpacity=".12" /><stop offset="100%" stopColor={C.purple} stopOpacity=".01" /></linearGradient></defs>
        {benchPath && <path d={benchPath} fill="none" stroke={C.text4} strokeWidth="1" strokeDasharray="4 3" opacity=".4" />}
        <path d={mainPath} fill="none" stroke={C.purple} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Outlier markers — pinned to top of chart with value labels */}
        {outliers.map(({ i, v }) => {
          const x = toX(i);
          const y = pad.t + 2;
          // Format very large values: 4117% as "4,117%", 1.72e14 as "172T%"
          const fmtOutlier = (val) => {
            const abs = Math.abs(val);
            if (abs >= 1e12) return `${(val / 1e12).toFixed(1)}T%`;
            if (abs >= 1e9) return `${(val / 1e9).toFixed(1)}B%`;
            if (abs >= 1e6) return `${(val / 1e6).toFixed(1)}M%`;
            if (abs >= 1e3) return `${(val / 1e3).toFixed(1)}K%`;
            return `${val.toFixed(0)}%`;
          };
          const label = fmtOutlier(v);
          const date = slicedDates[i] ? slicedDates[i].slice(5) : "";
          const labelW = label.length * 6 + 14;
          return (
            <g key={`outlier-${i}`}>
              {/* Vertical dashed line connecting outlier to chart */}
              <line x1={x} y1={pad.t} x2={x} y2={pad.t + ch} stroke={C.amber} strokeWidth="1" strokeDasharray="2 2" opacity=".35" />
              {/* Triangle marker pointing up */}
              <polygon points={`${x - 4},${y + 6} ${x + 4},${y + 6} ${x},${y - 1}`} fill={C.amber} stroke="#fff" strokeWidth="1" />
              {/* Label background */}
              <rect x={x - labelW / 2} y={y + 8} width={labelW} height="13" rx="3" fill="#fff" stroke={C.amber} strokeWidth="0.8" />
              <text x={x} y={y + 17} textAnchor="middle" fontSize="9" fontWeight="700" fill={C.amber} fontFamily="'Inter',sans-serif">{label}{date && ` · ${date}`}</text>
            </g>
          );
        })}
        {hover !== null && hover < sliced.length && (() => {
          const hv = sliced[hover];
          const isOutlier = needsClipping && hv > cap;
          // Format outlier values with abbreviation, normal values with 2 decimals
          const fmtHover = (val) => {
            const abs = Math.abs(val);
            if (abs >= 1e12) return `${(val / 1e12).toFixed(1)}T%`;
            if (abs >= 1e9) return `${(val / 1e9).toFixed(1)}B%`;
            if (abs >= 1e6) return `${(val / 1e6).toFixed(1)}M%`;
            if (abs >= 1e3) return `${(val / 1e3).toFixed(1)}K%`;
            return `${val.toFixed(2)}%`;
          };
          const valueLabel = fmtHover(hv);
          const dateLabel = slicedDates[hover] ? slicedDates[hover].slice(5) + " · " : "";
          const fullLabel = `${dateLabel}${valueLabel}`;
          const tipW = Math.max(96, fullLabel.length * 6 + 16);
          // Pin tooltip to chart top if value is an outlier (clamped)
          const cy = isOutlier ? pad.t : toY(hv);
          return (
            <g>
              <line x1={toX(hover)} y1={pad.t} x2={toX(hover)} y2={pad.t + ch} stroke={C.purple} strokeWidth="1" opacity=".3" strokeDasharray="3 2" />
              <circle cx={toX(hover)} cy={cy} r="4" fill={isOutlier ? C.amber : C.purple} stroke="#fff" strokeWidth="2" />
              <rect x={Math.max(2, Math.min(width - tipW - 2, toX(hover) - tipW / 2))} y={pad.t - 18} width={tipW} height="16" rx="4" fill={C.white} stroke={C.border2} />
              <text x={Math.max(tipW / 2 + 2, Math.min(width - tipW / 2 - 2, toX(hover)))} y={pad.t - 7} textAnchor="middle" fontSize="10" fontWeight="600" fill={isOutlier ? C.amber : C.purple} fontFamily="'Inter',sans-serif">{fullLabel}</text>
            </g>
          );
        })()}
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
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: C.text3 }}>Score Breakdown</span>
        {conf < 1 && <span style={{ fontSize: 10, color: C.blue, fontWeight: 500 }}>× {conf} confidence = {finalScore}</span>}
      </div>
      <div style={{ display: "flex", height: 24, borderRadius: 6, overflow: "hidden", marginBottom: 8 }}>
        {cats.map(c => (
          <div key={c.key} title={`${c.label}: ${subScores[c.key]} × ${c.w}`} style={{ width: `${c.w * 100}%`, background: c.color, opacity: .75 + (subScores[c.key] / 100) * .25, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#fff" }}>
            {c.w >= .15 && <span>{(subScores[c.key] * c.w).toFixed(0)}</span>}
          </div>
        ))}
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

const MR = ({ label, value, unit, trend, flag, desc, trigger }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
        {label}
        {flag && <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 5px", borderRadius: 3, background: SEV[flag].bg, color: SEV[flag].color }}>{SEV[flag].icon}</span>}
      </div>
      {desc && <div style={{ fontSize: 11, color: C.text4, marginTop: 2 }}>{desc}</div>}
      {trigger && <div style={{ fontSize: 10, color: SEV[flag]?.color || C.text4, marginTop: 2, fontStyle: "italic" }}>→ {trigger}</div>}
    </div>
    <div style={{ textAlign: "right", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
      {trend !== undefined && trend !== null && <span style={{ fontSize: 11, fontWeight: 600, color: trend >= 0 ? C.green : C.red }}>{trend >= 0 ? "▲" : "▼"} {typeof trend === "number" ? Math.abs(trend).toFixed(1) : trend}%</span>}
      <span style={{ fontSize: 15, fontWeight: 700 }}>{value}{unit && <span style={{ fontSize: 11, fontWeight: 400, color: C.text3, marginLeft: 2 }}>{unit}</span>}</span>
    </div>
  </div>
);

export default function VaultDetailPage({ vault: listVault, onBack }) {
  const params = useParams();
  const navigate = useNavigate();
  const vaultId = listVault?.id || params.vaultId || null;
  const { vault: detailVault, loading } = useVaultDetail(vaultId);
  const v = detailVault || listVault;
  // Go back via history if there's somewhere to return to (e.g. /wallets), otherwise default to /vault
  const handleBack = onBack || (() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/vault");
    }
  });
  const winW = useWindowWidth();
  const isMobile = winW < 768;
  const pad = isMobile ? "14px 16px" : "24px 32px";
  const weights = { capital: .20, performance: .25, risk: .35, trust: .20 };
  const [tvlTf, setTvlTf] = useState("7d");
  const [nfTf, setNfTf] = useState("7d");
  const [apyTf, setApyTf] = useState("7d");
  const [benchTf, setBenchTf] = useState("7d");
  const [volTf, setVolTf] = useState("30d");
  const [ddTf, setDdTf] = useState("90d");
  const [incTf, setIncTf] = useState("90d");
  const [capRetTf, setCapRetTf] = useState("30d");
  const [userRetTf, setUserRetTf] = useState("30d");
  const [fbOpen, setFbOpen] = useState(false);
  const [fbField, setFbField] = useState("");
  const [fbDesc, setFbDesc] = useState("");
  const [fbEmail, setFbEmail] = useState("");
  const [fbSending, setFbSending] = useState(false);
  const [fbDone, setFbDone] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { isAuthenticated, login: userLogin, loading: authLoading } = useUserAuth();

  // Shared single-fetch hook — one /v1/vaults network call per page load,
  // shared across every component on the page (deposit modal, this header, etc.)
  const depositMeta = useDepositMeta(vaultId);
  const vaultType = depositMeta?.type || null;
  const vaultMin = {
    raw: depositMeta?.min_deposit ?? null,
    decimals: depositMeta?.asset?.decimals ?? 6,
    symbol: (depositMeta?.asset?.symbol || "USDC").toUpperCase(),
    noMin: !!depositMeta?.no_minimum,
  };

  const depositDisabled = vaultType === "unsupported";

  const handleDeposit = useCallback(async () => {
    if (depositDisabled) return;
    if (!isConnected) { openConnectModal(); return; }
    setDepositOpen(true);
  }, [depositDisabled, isConnected, openConnectModal]);

  const submitFeedback = async () => {
    setFbSending(true);
    try {
      const url = import.meta.env.VITE_FEEDBACK_SHEET_URL;
      if (!url) { alert("Feedback endpoint not configured"); setFbSending(false); return; }
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Timestamp: new Date().toISOString(),
          "Vault ID": v.id, "Vault Name": v.name, Chain: v.chain, "Chain ID": v.chain_id,
          Field: fbField, Description: fbDesc, Reporter: fbEmail || "",
          Status: "New",
        }),
      });
      if (!res.ok) throw new Error();
      setFbDone(true);
      setTimeout(() => { setFbOpen(false); setFbDone(false); setFbField(""); setFbDesc(""); setFbEmail(""); }, 1800);
    } catch { alert("Failed to submit — please try again."); }
    setFbSending(false);
  };

  if (!v && loading) return (
    <div style={{ fontFamily: "'Inter',sans-serif", background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, backgroundImage: C.purpleGrad, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}><span style={{ color: "#fff", fontWeight: 700, fontSize: 18 }}>Y</span></div>
        <div style={{ fontSize: 16, fontWeight: 600, color: C.text2, marginBottom: 8 }}>Loading Vault...</div>
      </div>
    </div>
  );
  if (!v) return null;

  const apyHistory = v.apyHistory && v.apyHistory.length > 0 ? v.apyHistory : [];
  const apyDates = v.apyDates && v.apyDates.length > 0 ? v.apyDates : [];
  const hasHistory = apyHistory.length >= 2;

  return (
    <div style={{ fontFamily: "'Inter',sans-serif", background: C.bg, color: C.text, minHeight: "100vh" }}>
      <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: isMobile ? "10px 12px" : "14px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          <img src="/yieldo-new.png" alt="Yieldo" style={{ width: 26, height: 26, borderRadius: 6, flexShrink: 0 }} />
          {!isMobile && <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: ".05em" }}>YIELDO</span>}
          <span style={{ color: C.text4 }}>/</span>
          <button style={{ fontSize: 13, fontWeight: 500, color: C.purple, background: "none", border: "none", cursor: "pointer", fontFamily: "'Inter',sans-serif", whiteSpace: "nowrap" }} onClick={handleBack}>← Vaults</button>
          {!isMobile && <><span style={{ color: C.text4 }}>/</span><span style={{ fontSize: 13, fontWeight: 500, color: C.text2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.name}</span></>}
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {!isMobile && <Btn small onClick={() => setFbOpen(true)}>Report Issue</Btn>}
          <Btn primary small onClick={handleDeposit} disabled={depositDisabled} title={depositDisabled ? "Deposits paused on protocol — not supported" : undefined}>{depositDisabled ? "Paused" : (authLoading ? "Signing in..." : "Deposit")}</Btn>
        </div>
      </div>
      {loading && <div style={{ padding: isMobile ? "8px 16px" : "8px 32px", background: C.purpleDim, fontSize: 12, color: C.purple }}>Loading detailed data...</div>}
      <div style={{ padding: pad, maxWidth: 1200, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 12 : 20, marginBottom: 20 }}>
          <Card style={{ flex: "1 1 0", padding: isMobile ? 16 : 24 }}>
            <div style={{ display: "flex", gap: isMobile ? 12 : 16, alignItems: "flex-start", marginBottom: 16 }}>
              <ScoreRing score={v.yieldoScore} size={isMobile ? 56 : 72} sw={isMobile ? 5 : 6} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontSize: isMobile ? 16 : 20, fontWeight: 700 }}>{v.name}</span>
                  <ConfBadge age={v.age} />
                </div>
                <div style={{ fontSize: 13, color: C.text3, marginBottom: 6 }}>Curated by {v.curator} · {v.chain} · {v.protocol}</div>
                <div style={{ fontSize: 11, color: C.text4, marginBottom: 8, fontFamily: "monospace", wordBreak: "break-all" }}>{isMobile ? `${v.vault_address?.slice(0, 10)}...${v.vault_address?.slice(-8)}` : v.vault_address}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <Badge color={v.riskC}>{v.risk} Risk</Badge>
                  <YieldBadge t={v.yieldType} />
                  <Badge color={C.text3} bg={C.surfaceAlt}>{v.asset}</Badge>
                  <Badge color={v.protocol === "Hyperbeat" ? "#E040FB" : v.protocol === "Veda" ? "#FF6B35" : C.blue} bg={v.protocol === "Hyperbeat" ? "#FCE4EC" : v.protocol === "Veda" ? "#FFF3E0" : C.blueBg}>{v.protocol}</Badge>
                  <Badge color={C.text3} bg={C.surfaceAlt}>{v.chain}</Badge>
                  <Badge color={C.text3} bg={C.surfaceAlt}>{v.age}d old</Badge>
                  <Badge color={C.text3} bg={C.surfaceAlt}>{v.maturity}</Badge>
                  {v.fee !== null && v.fee !== undefined && <Badge color={C.text3} bg={C.surfaceAlt}>Fee: {v.fee.toFixed(1)}%</Badge>}
                </div>
                <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 8, background: C.purpleDim, border: `1px solid ${C.purple}22`, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, color: C.text3, fontWeight: 500 }}>This vault accepts</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.purple, textTransform: "uppercase" }}>{v.asset}</span>
                  <span style={{ fontSize: 11, color: C.text3 }}>·</span>
                  <span style={{ fontSize: 11, color: C.text2 }}>
                    You can deposit any token — Yieldo auto-swaps to {(v.asset || "").toUpperCase()} for you.
                  </span>
                </div>
              </div>
            </div>
            <ScoreBar subScores={v.subScores} weights={weights} finalScore={v.yieldoScore} conf={v.conf} />
          </Card>
          <div style={{ width: isMobile ? "100%" : 280, display: "flex", flexDirection: "column", gap: 10 }}>
            <Card style={{ padding: "16px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div>
                  <div style={{ fontSize: 10, color: C.text4, fontWeight: 600, textTransform: "uppercase" }}>Current APY</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: C.purple, margin: "2px 0" }}>{v.apy.toFixed(2)}%</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: C.text4, fontWeight: 600, textTransform: "uppercase" }}>vs. Benchmark</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: v.apyVsBenchmark && v.apyVsBenchmark >= 1.2 ? C.green : C.text2, marginTop: 2 }}>{v.apyVsBenchmark !== null ? `${v.apyVsBenchmark.toFixed(2)}×` : "N/A"}</div>
                  {(v.benchAave || v.benchLido) ? <div style={{ fontSize: 10, color: C.text4 }}>{v.benchLido ? "Lido" : "Aave"}: {(v.benchAave || v.benchLido).toFixed(2)}% <a href={getBenchmarkUrl(v.asset, v.chain_id)} target="_blank" rel="noopener noreferrer" style={{ color: C.purple, textDecoration: "none", fontSize: 9 }}>verify ↗</a></div> : null}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, marginTop: 8, padding: "6px 0", borderTop: `1px solid ${C.border}` }}>
                <div style={{ textAlign: "center" }}><div style={{ fontSize: 9, color: C.text4, fontWeight: 600 }}>WEEKLY</div><div style={{ fontSize: 12, fontWeight: 600, color: C.text2 }}>{v.weeklyApy.toFixed(2)}%</div></div>
                <div style={{ textAlign: "center" }}><div style={{ fontSize: 9, color: C.text4, fontWeight: 600 }}>MONTHLY</div><div style={{ fontSize: 12, fontWeight: 600, color: C.text2 }}>{v.monthlyApy.toFixed(2)}%</div></div>
                <div style={{ textAlign: "center" }}><div style={{ fontSize: 9, color: C.text4, fontWeight: 600 }}>ALL TIME</div><div style={{ fontSize: 12, fontWeight: 600, color: C.text2 }}>{v.allTimeApy.toFixed(2)}%</div></div>
              </div>
              <div style={{ height: 1, background: C.border, margin: "8px 0" }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div style={{ textAlign: "center", padding: "6px 0" }}>
                  <div style={{ fontSize: 10, color: C.text4, fontWeight: 600, textTransform: "uppercase" }}>SHARPE</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: v.sharpe && v.sharpe >= 1.5 ? C.green : v.sharpe && v.sharpe >= 1 ? C.gold : C.text2 }}>{fmt(v.sharpe)}</div>
                </div>
                <div style={{ textAlign: "center", padding: "6px 0" }}>
                  <div style={{ fontSize: 10, color: C.text4, fontWeight: 600, textTransform: "uppercase" }}>MAX DD</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: v.maxDD && v.maxDD < -5 ? C.red : C.text2 }}>{fmt(v.maxDD, "%")}</div>
                </div>
              </div>
            </Card>
            <Card style={{ padding: "16px 20px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: C.text4, fontWeight: 600, textTransform: "uppercase" }}>TVL</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{fmtTvl(v.tvl)}</div>
                  {v.tvlChange7d !== null && <div style={{ fontSize: 10, color: v.tvlChange7d >= 0 ? C.green : C.red, fontWeight: 500 }}>{v.tvlChange7d >= 0 ? "▲" : "▼"} {Math.abs(v.tvlChange7d).toFixed(1)}% 7d</div>}
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: C.text4, fontWeight: 600, textTransform: "uppercase" }}>DEPOSITORS</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{v.depositors.toLocaleString()}</div>
                  {v.netDep30d !== null && <div style={{ fontSize: 10, color: v.netDep30d >= 0 ? C.green : C.red, fontWeight: 500 }}>{v.netDep30d >= 0 ? "+" : ""}{v.netDep30d} net/30d</div>}
                </div>
              </div>
              {v.vol24h !== null && v.vol24h > 0 && (
                <div style={{ marginTop: 8, padding: "6px 0", borderTop: `1px solid ${C.border}`, textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: C.text4, fontWeight: 600 }}>24H VOLUME</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{fmtTvl(v.vol24h)}</div>
                </div>
              )}
              {(vaultMin.raw || vaultMin.noMin) && (
                <div style={{ marginTop: 8, padding: "6px 0", borderTop: `1px solid ${C.border}`, textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: C.text4, fontWeight: 600 }}>MINIMUM DEPOSIT</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: vaultMin.noMin ? C.green : C.text }}>
                    {vaultMin.noMin
                      ? "No minimum"
                      : `${(Number(vaultMin.raw) / Math.pow(10, vaultMin.decimals)).toLocaleString()} ${vaultMin.symbol}`}
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* APY History Chart */}
        {hasHistory && (
          <Card style={{ padding: isMobile ? "12px 10px" : "20px 24px", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, padding: isMobile ? "0 6px" : 0 }}>
              <span style={{ fontSize: 16 }}>📈</span>
              <span style={{ fontSize: 15, fontWeight: 700 }}>APY History</span>
              <span style={{ fontSize: 11, color: C.text4 }}>({apyHistory.length} days)</span>
            </div>
            <APYChart data={apyHistory} dates={apyDates} benchmarkData={null} height={isMobile ? 160 : 220} />
          </Card>
        )}

        {/* Flags */}
        {v.flags && v.flags.length > 0 && (
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
                    </div>
                    <Badge color={s.color} bg={s.bg}>{f.severity.toUpperCase()}</Badge>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Metric Sections */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 12 : 16 }}>
          {/* Capital */}
          <Card style={{ padding: isMobile ? "14px 12px" : "20px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: "#6366f1" }} />
              <span style={{ fontSize: 15, fontWeight: 700 }}>Capital</span>
              <ScoreRing score={v.subScores.capital} size={28} sw={3} />
              <span style={{ fontSize: 11, color: C.text4, marginLeft: "auto" }}>20% weight</span>
            </div>
            <MR label="Total Value Locked" value={fmtTvl(v.tvl)} trend={v.tvlChange7d} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>TVL Change</span>
                <select value={tvlTf} onChange={e => setTvlTf(e.target.value)} style={{ fontSize: 11, padding: "2px 4px", borderRadius: 4, border: `1px solid ${C.border2}`, background: C.white, color: C.text2, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
                  <option value="1d">1d</option>
                  <option value="7d">7d</option>
                  <option value="30d">30d</option>
                </select>
              </div>
              <span style={{ fontSize: 15, fontWeight: 700, color: (tvlTf === "1d" ? v.tvlChange1d : tvlTf === "7d" ? v.tvlChange7d : v.tvlChange30d) !== null && (tvlTf === "1d" ? v.tvlChange1d : tvlTf === "7d" ? v.tvlChange7d : v.tvlChange30d) >= 0 ? C.green : C.red }}>{(() => { const val = tvlTf === "1d" ? v.tvlChange1d : tvlTf === "7d" ? v.tvlChange7d : v.tvlChange30d; return val !== null ? `${val >= 0 ? "+" : ""}${val.toFixed(2)}%` : "N/A"; })()}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>Net Flow</span>
                <select value={nfTf} onChange={e => setNfTf(e.target.value)} style={{ fontSize: 11, padding: "2px 4px", borderRadius: 4, border: `1px solid ${C.border2}`, background: C.white, color: C.text2, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
                  <option value="1d">1d</option>
                  <option value="7d">7d</option>
                  <option value="30d">30d</option>
                </select>
              </div>
              <span style={{ fontSize: 15, fontWeight: 700, color: (nfTf === "1d" ? v.netFlow1d : nfTf === "7d" ? v.netFlow7d : v.netFlow30d) !== null && (nfTf === "1d" ? v.netFlow1d : nfTf === "7d" ? v.netFlow7d : v.netFlow30d) >= 0 ? C.green : C.red }}>{(() => { const val = nfTf === "1d" ? v.netFlow1d : nfTf === "7d" ? v.netFlow7d : v.netFlow30d; return val !== null ? `${val >= 0 ? "+" : "-"}${fmtTvl(Math.abs(val))}` : "N/A"; })()}</span>
            </div>
            <MR label="Unique Depositors" value={v.depositors.toLocaleString()} flag={v.depositors < 10 ? "warning" : undefined} trigger={v.depositors < 10 ? "Less than 10 depositors" : undefined} />
            {v._raw?.C08_low_dep && <MR label="Low Depositors" value="Yes" flag="warning" />}
            <MR label="Deposit Type" value={v.C06 === 0 ? "Instant" : fmt(v.C06)} />
            {v.withdrawalType === "Async" && v.supply_queue_length !== undefined && <MR label="Supply Queue" value={v.supply_queue_length} />}
            {v.withdrawalType === "Async" && v.withdraw_queue_length !== undefined && <MR label="Withdraw Queue" value={v.withdraw_queue_length} />}
          </Card>

          {/* Performance */}
          <Card style={{ padding: isMobile ? "14px 12px" : "20px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: C.teal }} />
              <span style={{ fontSize: 15, fontWeight: 700 }}>Performance</span>
              <ScoreRing score={v.subScores.performance} size={28} sw={3} />
              <span style={{ fontSize: 11, color: C.text4, marginLeft: "auto" }}>20% weight</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>Net APY</span>
                <select value={apyTf} onChange={e => setApyTf(e.target.value)} style={{ fontSize: 11, padding: "2px 4px", borderRadius: 4, border: `1px solid ${C.border2}`, background: C.white, color: C.text2, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
                  <option value="1d">1d</option>
                  <option value="7d">7d</option>
                  <option value="30d">30d</option>
                </select>
              </div>
              <span style={{ fontSize: 15, fontWeight: 700, color: C.purple }}>{(() => { const val = apyTf === "1d" ? v.apy1d : apyTf === "7d" ? v.apy7d : v.apy30d; return val !== null ? `${val.toFixed(2)}%` : "N/A"; })()}</span>
            </div>
            {v._raw?.P02 && <MR label="Negative Daily APY" value="Yes" flag="warning" />}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                  APY vs Benchmark
                  <select value={benchTf} onChange={e => setBenchTf(e.target.value)} style={{ fontSize: 11, padding: "2px 4px", borderRadius: 4, border: `1px solid ${C.border2}`, background: C.white, color: C.text2, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
                    <option value="1d">1d</option>
                    <option value="7d">7d</option>
                    <option value="30d">30d</option>
                  </select>
                  {v.P03b && <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 5px", borderRadius: 3, background: SEV.warning.bg, color: SEV.warning.color }}>{SEV.warning.icon}</span>}
                </div>
                {(v.benchAave || v.benchLido) ? <div style={{ fontSize: 11, color: C.text4, marginTop: 2 }}>{v.benchLido ? "Lido" : "Aave"}: {(v.benchAave || v.benchLido).toFixed(2)}% <a href={getBenchmarkUrl(v.asset, v.chain_id)} target="_blank" rel="noopener noreferrer" style={{ color: C.purple, textDecoration: "none", fontSize: 9 }}>verify ↗</a></div> : null}
                {v.P03b && <div style={{ fontSize: 10, color: SEV.warning.color, marginTop: 2, fontStyle: "italic" }}>→ Below 80% of benchmark</div>}
              </div>
              <span style={{ fontSize: 15, fontWeight: 700 }}>{(() => { const val = benchTf === "1d" ? v.apyVsBench1d : benchTf === "7d" ? v.apyVsBench7d : v.apyVsBench30d; return val !== null ? `${val.toFixed(2)}×` : (v.apyVsBenchmark !== null ? `${v.apyVsBenchmark.toFixed(2)}×` : "N/A"); })()}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>APY Volatility</span>
                <select value={volTf} onChange={e => setVolTf(e.target.value)} style={{ fontSize: 11, padding: "2px 4px", borderRadius: 4, border: `1px solid ${C.border2}`, background: C.white, color: C.text2, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
                  <option value="30d">30d</option>
                  <option value="365d">365d</option>
                </select>
              </div>
              <span style={{ fontSize: 15, fontWeight: 700 }}>{(() => { const p = v.P04; const val = p && typeof p === "object" ? p[volTf] : (typeof p === "number" ? p : null); return val !== null && val !== undefined ? `${(val * 100).toFixed(2)}%` : "N/A"; })()}</span>
            </div>
            <MR label="Sharpe Ratio" value={fmt(v.sharpe)} desc={v.age < 90 ? "Requires 90+ days" : "Excess return per unit of volatility vs Aave"} />
            <MR label="Win Rate" value={v.winRate !== null ? `${(v.winRate * 100).toFixed(1)}%` : "N/A"} desc={v.perfDetail?.win_rate ? `Beat benchmark ${v.perfDetail.win_rate.win_weeks} / ${v.perfDetail.win_rate.total_weeks} weeks` : "% of weeks outperforming benchmark"} />
            <MR label="Worst Week" value={v.worstWeek !== null ? `${(v.worstWeek * 100).toFixed(2)}%` : "N/A"} desc="Largest single-week underperformance vs benchmark" />
            <MR label="Alpha Consistency" value={v.alphaConsistency !== null ? `${(v.alphaConsistency * 100).toFixed(1)}%` : "N/A"} desc="Higher = steadier outperformance (1 - CV of positive spreads)" />
            {(() => { const val = ddTf === "30d" ? v.maxDD30d : ddTf === "90d" ? v.maxDD90d : v.maxDD365d; const flag = val !== null && val < -10 ? "critical" : val !== null && val < -5 ? "warning" : undefined; return (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>Max Drawdown</span>
                  <select value={ddTf} onChange={e => setDdTf(e.target.value)} style={{ fontSize: 11, padding: "2px 4px", borderRadius: 4, border: `1px solid ${C.border2}`, background: C.white, color: C.text2, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
                    <option value="30d">30d</option>
                    <option value="90d">90d</option>
                    <option value="365d">365d</option>
                  </select>
                  {flag && <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 5px", borderRadius: 3, background: SEV[flag].bg, color: SEV[flag].color }}>{SEV[flag].icon}</span>}
                </div>
                <span style={{ fontSize: 15, fontWeight: 700, color: val !== null && val < -5 ? C.red : C.text }}>{val !== null ? `${val.toFixed(2)}%` : "N/A"}</span>
              </div>
            ); })()}
            <MR label="Drawdown Duration" value={fmt(v.P09)} />
            <MR label="Yield Composition" value={`${100 - v.incRatio}% organic`} desc={`${v.incRatio}% from incentives`} />
            <MR label="Yield Type" value={v._raw?.P12 || v.yieldType} />
          </Card>

          {/* Risk */}
          <Card style={{ padding: isMobile ? "14px 12px" : "20px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: "#ef4444" }} />
              <span style={{ fontSize: 15, fontWeight: 700 }}>Risk</span>
              <ScoreRing score={v.subScores.risk} size={28} sw={3} />
              <span style={{ fontSize: 11, color: C.text4, marginLeft: "auto" }}>35% weight</span>
            </div>
            <MR label="Asset Price" value={v.assetPrice !== null ? `$${typeof v.assetPrice === "number" ? v.assetPrice.toFixed(4) : v.assetPrice}` : "N/A"} />
            {v.depegEvents > 0 && <MR label="Depeg Alert" value="DEPEG DETECTED" flag="critical" desc="Price deviation >3% from peg" />}
            <MR label="Pause Events" value={v.pauseEvents} />
            {v._raw?.R05 && <MR label="Emergency Events" value="Yes" flag="critical" />}
            <MR label="Withdrawal Latency" value={v.withdrawalType === "Async" ? "Async" : "Instant"} flag={v.withdrawalType === "Async" ? "info" : undefined} />
            {v.withdrawalType === "Async" && <MR label="Pending Withdrawals" value={v.pendingWithdrawals !== null ? `${v.pendingWithdrawals}%` : "N/A"} flag={v.pendingWithdrawalsFlag} desc="% of TVL in pending withdrawals" />}
            <MR label="Top-1 Concentration" value={v.top1 !== null ? `${v.top1}%` : "N/A"} flag={v.top1 !== null && v.top1 > 50 ? "critical" : v.top1 !== null && v.top1 > 25 ? "warning" : undefined} />
            <MR label="Top-5 Concentration" value={v.top5 !== null && v.top5 > 0 ? `${v.top5}%` : "N/A"} flag={v.top5 !== null && v.top5 > 80 ? "critical" : v.top5 !== null && v.top5 > 50 ? "warning" : undefined} desc="Share of TVL held by top 5" />
            {(() => { const val = v.incidentCount[incTf] ?? 0; return (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>Incidents</span>
                  <select value={incTf} onChange={e => setIncTf(e.target.value)} style={{ fontSize: 11, padding: "2px 4px", borderRadius: 4, border: `1px solid ${C.border2}`, background: C.white, color: C.text2, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
                    <option value="90d">90d</option>
                    <option value="365d">365d</option>
                  </select>
                </div>
                <span style={{ fontSize: 15, fontWeight: 700, color: val > 0 ? "#ef4444" : C.text }}>{val}</span>
              </div>
            ); })()}
            {v.owner && (() => {
              const name = KNOWN_NAMES[v.owner.toLowerCase()];
              const link = getExplorerLink(v.chain_id, v.owner);
              const display = name || `${v.owner.slice(0, 6)}...${v.owner.slice(-4)}`;
              return <MR label="Owner" value={link ? <a href={link} target="_blank" rel="noopener noreferrer" style={{ color: C.purple, textDecoration: "none", fontWeight: 700, fontSize: 15 }}>{display} ↗</a> : display} desc={name ? v.owner : undefined} />;
            })()}
            {v.guardian && (() => {
              const name = KNOWN_NAMES[v.guardian.toLowerCase()];
              const link = getExplorerLink(v.chain_id, v.guardian);
              const display = name || `${v.guardian.slice(0, 6)}...${v.guardian.slice(-4)}`;
              return <MR label="Guardian" value={link ? <a href={link} target="_blank" rel="noopener noreferrer" style={{ color: C.purple, textDecoration: "none", fontWeight: 700, fontSize: 15 }}>{display} ↗</a> : display} desc={name ? v.guardian : undefined} />;
            })()}
            {v.timelock > 0 && <MR label="Timelock" value={`${v.timelock}s`} />}
          </Card>

          {/* Trust */}
          <Card style={{ padding: isMobile ? "14px 12px" : "20px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: C.gold }} />
              <span style={{ fontSize: 15, fontWeight: 700 }}>Trust</span>
              <ScoreRing score={v.subScores.trust} size={28} sw={3} />
              <span style={{ fontSize: 11, color: C.text4, marginLeft: "auto" }}>25% weight</span>
            </div>
            {(() => { const val = v.capitalRetention?.[capRetTf] ?? null; const d = typeof val === "number" ? Math.round(val) : null; const flag = d !== null && d < 50 ? "critical" : d !== null && d < 70 ? "warning" : undefined; return (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>Capital Retention</span>
                  <select value={capRetTf} onChange={e => setCapRetTf(e.target.value)} style={{ fontSize: 11, padding: "2px 4px", borderRadius: 4, border: `1px solid ${C.border2}`, background: C.white, color: C.text2, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
                    <option value="30d">30d</option>
                    <option value="365d">365d</option>
                  </select>
                </div>
                <span style={{ fontSize: 15, fontWeight: 700, color: flag === "critical" ? "#ef4444" : flag === "warning" ? "#f59e0b" : C.text }}>{d !== null ? `${d}%` : "N/A"}</span>
              </div>
            ); })()}
            {(() => { const val = v.userRetention?.[userRetTf] ?? null; const d = typeof val === "number" ? Math.round(val) : null; return (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>User Retention</span>
                  <select value={userRetTf} onChange={e => setUserRetTf(e.target.value)} style={{ fontSize: 11, padding: "2px 4px", borderRadius: 4, border: `1px solid ${C.border2}`, background: C.white, color: C.text2, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
                    <option value="30d">30d</option>
                    <option value="365d">365d</option>
                  </select>
                </div>
                <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{d !== null ? `${d}%` : "N/A"}</span>
              </div>
            ); })()}
            <MR label="Avg Holding Days" value={fmt(v.avgHold)} unit="days" flag={v.avgHold !== null && v.avgHold < 3 ? "critical" : v.avgHold !== null && v.avgHold < 10 ? "warning" : undefined} />
            {v._raw?.T05_short_hold && <MR label="Short Hold Flag" value="Yes" flag="warning" />}
            <MR label="Quick Exit Rate" value={fmt(v.quickExitRate, "%")} flag={v.quickExitRate !== null && v.quickExitRate > 25 ? "warning" : undefined} desc="% exiting within 7 days" />
            <MR label="Holders 90+ Days" value={fmt(v.holders90plus)} />
            <MR label="HOLD Ratio" value={v.T11 !== null ? `${v.T11.toFixed(1)}%` : "N/A"} desc="% of all-time depositors still holding" />
            <MR label="Avg Deposit Duration" value={fmt(v.avgDepDuration)} unit="days" />
            <MR label="Net Depositors (30d)" value={v.netDep30d !== null ? `${v.netDep30d >= 0 ? "+" : ""}${v.netDep30d}` : "N/A"} />
            {v.netDep30d !== null && v.depositors > 0 && <MR label="Net User Flow (30d)" value={`${v.netDep30d >= 0 ? "+" : ""}${((v.netDep30d / v.depositors) * 100).toFixed(1)}%`} desc={`${Math.abs(v.netDep30d)} of ${v.depositors} depositors ${v.netDep30d >= 0 ? "net in" : "net out"}`} />}
            {v.T10b && typeof v.T10b === "object" && <MR label="Net Capital Flow (30d)" value={`${v.T10b.net_flow_pct >= 0 ? "+" : ""}${v.T10b.net_flow_pct}%`} desc={`Score: ${v.T10b.score}/100 · (Net deposits − withdrawals) / TVL`} />}
            {/* <MR label="External Ratings" value={fmt(v.T14)} desc="Independent risk ratings count" /> */}
          </Card>
        </div>

        {/* Data Confidence */}
        <Card style={{ padding: "16px 20px", marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 16 }}>📊</span>
            <span style={{ fontSize: 15, fontWeight: 700 }}>Data Confidence</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: isMobile ? 8 : 16 }}>
            {[
              { lbl: "Vault Age", val: `${v.age}`, unit: "days", sub: v.maturity, col: v.age >= 90 ? C.green : C.blue },
              { lbl: "Maturity", val: v.maturity, sub: v.age >= 90 ? "Full metrics available" : "Limited data", col: v.age >= 90 ? C.green : C.amber },
              { lbl: "Confidence", val: `${Math.round(v.conf * 100)}%`, sub: v.conf < 1 ? `Score discounted ${Math.round((1 - v.conf) * 100)}%` : "Full score", col: v.conf < .8 ? C.amber : C.green },
              { lbl: "Data Points", val: fmt(v.D03), sub: `Missing metrics: ${fmt(v.D04, "", "0")}`, col: C.blue },
            ].map((d, i) => (
              <div key={i} style={{ padding: 12, borderRadius: 8, background: C.surfaceAlt, textAlign: "center" }}>
                <div style={{ fontSize: 10, color: C.text4, fontWeight: 600, textTransform: "uppercase" }}>{d.lbl}</div>
                <div style={{ fontSize: 20, fontWeight: 700, margin: "4px 0", color: d.col }}>{d.val}{d.unit && <span style={{ fontSize: 12, fontWeight: 400, color: C.text3 }}> {d.unit}</span>}</div>
                <div style={{ fontSize: 10, color: C.text3 }}>{d.sub}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Metadata */}
        <Card style={{ padding: "16px 20px", marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 16 }}>ℹ️</span>
            <span style={{ fontSize: 15, fontWeight: 700 }}>Vault Info</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div style={{ padding: "8px 12px", borderRadius: 6, background: C.surfaceAlt }}>
              <div style={{ fontSize: 10, color: C.text4, fontWeight: 600 }}>ADDRESS</div>
              <div style={{ fontSize: 11, fontFamily: "monospace", color: C.text2, wordBreak: "break-all" }}>{v.vault_address}</div>
            </div>
            <div style={{ padding: "8px 12px", borderRadius: 6, background: C.surfaceAlt }}>
              <div style={{ fontSize: 10, color: C.text4, fontWeight: 600 }}>CHAIN</div>
              <div style={{ fontSize: 11, color: C.text2 }}>{v.chain} (ID: {v.chain_id})</div>
            </div>
            {v.creation_date && <div style={{ padding: "8px 12px", borderRadius: 6, background: C.surfaceAlt }}>
              <div style={{ fontSize: 10, color: C.text4, fontWeight: 600 }}>CREATED</div>
              <div style={{ fontSize: 11, color: C.text2 }}>{new Date(v.creation_date).toLocaleDateString()}</div>
            </div>}
            {v.timestamp && <div style={{ padding: "8px 12px", borderRadius: 6, background: C.surfaceAlt }}>
              <div style={{ fontSize: 10, color: C.text4, fontWeight: 600 }}>LAST INDEXED</div>
              <div style={{ fontSize: 11, color: C.text2 }}>{v.timestamp}</div>
            </div>}
          </div>
        </Card>

        <Suspense fallback={null}>
          <UserDeposits vaultId={v.id} />
        </Suspense>

        <div style={{ padding: "12px 16px", borderRadius: 8, background: C.amberDim, border: `1px solid ${C.amber}20`, marginTop: 16, display: "flex", gap: 10 }}>
          <span style={{ fontSize: 14 }}>⚠️</span>
          <div style={{ fontSize: 11, color: "rgba(0,0,0,.5)", lineHeight: 1.5 }}><strong>Disclaimer:</strong> Yieldo Scores and all metrics are for <strong>data visualization only</strong> — not financial advice. Past performance ≠ future results.</div>
        </div>
      </div>

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
                <div style={{ fontSize: 12, color: C.text3, marginBottom: 16 }}>Help us improve — flag incorrect or suspicious data for <strong>{v.name}</strong></div>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.text3, display: "block", marginBottom: 4 }}>Which field looks wrong?</label>
                <select value={fbField} onChange={e => setFbField(e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: `1px solid ${C.border2}`, fontSize: 13, marginBottom: 12, fontFamily: "'Inter',sans-serif", background: C.white }}>
                  <option value="">Select a field...</option>
                  <optgroup label="Capital">
                    <option>TVL</option><option>Depositors</option><option>Net Flows</option>
                  </optgroup>
                  <optgroup label="Performance">
                    <option>APY</option><option>Benchmark Ratio</option><option>Volatility</option><option>Max Drawdown</option>
                  </optgroup>
                  <optgroup label="Risk">
                    <option>Asset Price</option><option>Pause Events</option><option>Concentration</option><option>Owner / Guardian</option>
                  </optgroup>
                  <optgroup label="Trust">
                    <option>Capital Retention</option><option>User Retention</option><option>Holding Days</option>
                  </optgroup>
                  <optgroup label="Other">
                    <option>Yieldo Score</option><option>Vault Info / Metadata</option><option>Other</option>
                  </optgroup>
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
      {depositOpen && v && (
        <Suspense fallback={null}>
          <DepositModal vault={v} onClose={() => setDepositOpen(false)} />
        </Suspense>
      )}
    </div>
  );
}
