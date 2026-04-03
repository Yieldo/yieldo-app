import { useState, useMemo } from "react";
import { useVaults } from "../hooks/useVaultData.js";
import {
  scoreTVL, scoreTVLVelocity, scoreDepositors, scorePendingWithdrawals,
  scoreNetFlows7d, scoreDepositLatency, scoreSharpe,
  scoreWinRate, scoreWorstWeek, scoreAlphaConsistency,
  scoreMaxDrawdown, scoreDrawdownDuration, scoreYieldComposition,
  scoreAPYvsBenchmark, scoreIncidents, scoreDepegRisk, scoreConcentration,
  scoreWithdrawalLatency, scoreTimelock, scoreHoldRatio, scoreCapitalRetention,
  scoreAvgDepositDuration, scoreHolders90Plus, scoreNetDepositors, scoreNetFlowDirection,
  scoreQuickExitRate, scoreUserRetention, getConfidence,
  calcExternalRatingBonus, getTrustBoost, getTvlUsd, getAssetType,
} from "../hooks/useVaultData.js";

const C = {
  bg: "#f8f7fc", white: "#fff", black: "#121212", surfaceAlt: "#faf9fe",
  border: "rgba(0,0,0,.06)", border2: "rgba(0,0,0,.1)",
  text: "#121212", text2: "rgba(0,0,0,.65)", text3: "rgba(0,0,0,.4)", text4: "rgba(0,0,0,.25)",
  purple: "#7A1CCB", purpleLight: "#9E3BFF", purpleDim: "rgba(122,28,203,.06)",
  purpleGrad: "linear-gradient(100deg,#4B0CA6 0%,#7A1CCB 58%,#9E3BFF 114%)",
  teal: "#2E9AB8", green: "#1a9d3f", greenDim: "rgba(26,157,63,.07)",
  red: "#d93636", redBg: "#FFF0F0",
  amber: "#d97706", amberBg: "#FFFBEB",
  blue: "#1565C0", blueBg: "#E3F2FD",
  gold: "#b8960a",
};

const SEV = {
  critical: { icon: "🔴", color: C.red, bg: C.redBg },
  warning: { icon: "🟡", color: C.amber, bg: C.amberBg },
  info: { icon: "🔵", color: C.blue, bg: C.blueBg },
};

const scoreColor = s => s >= 80 ? C.green : s >= 60 ? C.gold : s >= 40 ? C.amber : C.red;

const fmtTvl = n => {
  if (!n) return "$0";
  if (n >= 1e9) return `$${(n/1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n/1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n/1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

const fv = (v, dec = 2) => {
  if (v === null || v === undefined) return "N/A";
  if (typeof v === "number") return v.toFixed(dec);
  return String(v);
};

function ScoreRing({ score, size = 36, sw = 3 }) {
  const r = (size - sw) / 2, circ = 2 * Math.PI * r, off = circ * (1 - score / 100);
  const col = scoreColor(score);
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(0,0,0,.04)" strokeWidth={sw}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={sw} strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"/>
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: col }}>{score}</div>
    </div>
  );
}

function calcBreakdown(raw) {
  const c02 = raw.C02 || {};
  const c04 = raw.C04 || {};
  const tvlUsd = getTvlUsd(raw);
  const assetType = getAssetType((raw.asset || "").toLowerCase());

  const sharpeVal = raw.P05 === "Insufficient Data" ? null : (typeof raw.P05 === "number" ? raw.P05 : null);
  const p08 = raw.P08 || {};
  const dd = typeof p08 === "object"
    ? (p08["90d"] ?? p08["365d"] ?? p08["30d"] ?? 0)
    : (typeof raw.P08 === "number" ? raw.P08 : 0);
  const ddDuration = typeof raw.P09 === "number" ? raw.P09 : 0;
  const organicPct = raw.P10 ? raw.P10.organic_pct : 100;
  const p03 = raw.P03 || {};
  const benchRatio = typeof p03 === "object" && typeof p03["7d"] === "number"
    ? p03["7d"]
    : (typeof raw.P03 === "number" ? raw.P03 : null);

  const r10 = raw.R10;
  const incidents = typeof r10 === "number" ? r10 : (r10 && typeof r10 === "object" ? (r10["90d"] ?? 0) : 0);
  const top5raw = typeof raw.R09_top5 === "number" ? raw.R09_top5 : 0;
  const top5 = top5raw > 1 ? top5raw / 100 : top5raw;

  const ret30d = raw.T01 && typeof raw.T01 === "object" ? raw.T01["30d"] : (typeof raw.T01 === "number" ? raw.T01 : null);
  const avgDuration = typeof raw.T09 === "number" ? raw.T09 : null;
  const holders90 = typeof raw.T07 === "number" ? raw.T07 : 0;
  const netDep = typeof raw.T10 === "number" ? raw.T10 : null;
  const netFlowPct = raw.T10b && typeof raw.T10b === "object" ? raw.T10b.net_flow_pct : null;
  const quickExit = typeof raw.T06 === "number" ? raw.T06 : null;
  const userRet = raw.T03 && typeof raw.T03 === "object" ? raw.T03["30d"] : (typeof raw.T03 === "number" ? raw.T03 : null);
  const holdRatio = typeof raw.T11 === "number" ? raw.T11 : null;

  const tvlVel30d = typeof c02["30d"] === "number" ? c02["30d"] : null;
  const netFlow7d = typeof c04["7d"] === "number" ? c04["7d"] : null;

  const capital = [
    { metric: "C01", label: "TVL", rawVal: tvlUsd, rawFmt: fmtTvl(tvlUsd), score: scoreTVL(tvlUsd), weight: 0.1875 },
    { metric: "C02.30d", label: "TVL Velocity (30d)", rawVal: tvlVel30d, rawFmt: tvlVel30d !== null ? `${tvlVel30d.toFixed(1)}%` : "N/A", score: scoreTVLVelocity(tvlVel30d), weight: 0.1875 },
    { metric: "C07", label: "Depositors", rawVal: raw.C07 || 0, rawFmt: String(raw.C07 || 0), score: scoreDepositors(raw.C07 || 0), weight: 0.1875 },
    { metric: "R07", label: "Pending Withdrawals", rawVal: raw.R07 || 0, rawFmt: `${fv(raw.R07 || 0, 1)}%`, score: scorePendingWithdrawals(raw.R07 || 0), weight: 0.1875 },
    { metric: "C04.7d", label: "Net Flows (7d)", rawVal: netFlow7d, rawFmt: netFlow7d !== null ? fmtTvl(netFlow7d) : "N/A", score: scoreNetFlows7d(netFlow7d, tvlUsd), weight: 0.1875 },
    { metric: "R06", label: "Deposit Latency", rawVal: raw.R06 || "Instant", rawFmt: raw.R06 || "Instant", score: scoreDepositLatency(raw.R06 || "Instant"), weight: 0.0625 },
  ];

  // P06=Win Rate, P07=Worst Week, P13=Alpha Consistency (from perf_alpha.py)
  const winRateVal = raw.P06 === "Insufficient Data" ? null : (typeof raw.P06 === "number" ? raw.P06 : null);
  const worstWeekVal = raw.P07 === "Insufficient Data" ? null : (typeof raw.P07 === "number" ? raw.P07 : null);
  const consistencyVal = raw.P13 === "Insufficient Data" ? null : (typeof raw.P13 === "number" ? raw.P13 : null);

  const performance = [
    { metric: "P05", label: "Sharpe Ratio", rawVal: sharpeVal, rawFmt: fv(sharpeVal), score: scoreSharpe(sharpeVal), weight: 0.15 },
    { metric: "P06", label: "Win Rate", rawVal: winRateVal, rawFmt: winRateVal !== null ? `${(winRateVal * 100).toFixed(1)}%` : "N/A", score: scoreWinRate(winRateVal), weight: 0.10 },
    { metric: "P07", label: "Worst Week", rawVal: worstWeekVal, rawFmt: worstWeekVal !== null ? `${(worstWeekVal * 100).toFixed(2)}%` : "N/A", score: scoreWorstWeek(worstWeekVal), weight: 0.05 },
    { metric: "P13", label: "Alpha Consistency", rawVal: consistencyVal, rawFmt: consistencyVal !== null ? `${(consistencyVal * 100).toFixed(1)}%` : "N/A", score: scoreAlphaConsistency(consistencyVal), weight: 0.05 },
    { metric: "P08", label: "Max Drawdown", rawVal: dd, rawFmt: `${fv(dd)}%`, score: scoreMaxDrawdown(dd), weight: 0.25 },
    { metric: "P09", label: "Drawdown Duration", rawVal: ddDuration, rawFmt: `${ddDuration}d`, score: scoreDrawdownDuration(ddDuration), weight: 0.05 },
    { metric: "P10", label: "Yield Composition", rawVal: organicPct, rawFmt: `${fv(organicPct, 0)}% organic`, score: scoreYieldComposition(organicPct), weight: 0.10 },
    { metric: "P03.7d", label: "APY vs Benchmark", rawVal: benchRatio, rawFmt: benchRatio !== null ? `${fv(benchRatio)}x` : "N/A", score: scoreAPYvsBenchmark(benchRatio), weight: 0.25 },
  ];

  const risk = [
    { metric: "R10", label: "Incidents (90d)", rawVal: incidents, rawFmt: String(incidents), score: scoreIncidents(incidents), weight: 0.353 },
    { metric: "R01", label: "Depeg Risk", rawVal: raw.R01, rawFmt: raw.R01 !== null && raw.R01 !== undefined ? `$${fv(raw.R01, 4)}` : "N/A", score: scoreDepegRisk(raw.R01, assetType), weight: 0.294 },
    { metric: "R09_top5", label: "Concentration (Top5)", rawVal: top5, rawFmt: `${(top5 * 100).toFixed(1)}%`, score: scoreConcentration(top5, raw.C07 || 0), weight: 0.176 },
    { metric: "R06", label: "Withdrawal Latency", rawVal: raw.R06 || "Instant", rawFmt: raw.R06 || "Instant", score: scoreWithdrawalLatency(raw.R06 || "Instant"), weight: 0.118 },
    { metric: "timelock", label: "Timelock", rawVal: raw.timelock || 0, rawFmt: raw.timelock ? `${((raw.timelock || 0) / 3600).toFixed(1)}h` : "None", score: scoreTimelock(raw.timelock || 0), weight: 0.059 },
  ];

  const trust = [
    { metric: "T01.30d", label: "Capital Retention", rawVal: ret30d, rawFmt: ret30d !== null ? `${fv(ret30d)}%` : "N/A", score: scoreCapitalRetention(ret30d), weight: 0.20 },
    { metric: "T09", label: "Avg Deposit Duration", rawVal: avgDuration, rawFmt: avgDuration !== null ? `${fv(avgDuration, 0)}d` : "N/A", score: scoreAvgDepositDuration(avgDuration), weight: 0.15 },
    { metric: "T07", label: "Holders 90+ Days", rawVal: holders90, rawFmt: `${holders90} / ${raw.C07 || 0}`, score: scoreHolders90Plus(holders90, raw.C07 || 0), weight: 0.10 },
    { metric: "T11", label: "HOLD Ratio", rawVal: holdRatio, rawFmt: holdRatio !== null ? `${fv(holdRatio, 1)}%` : "N/A", score: scoreHoldRatio(holdRatio), weight: 0.15 },
    { metric: "T10", label: "Net Depositors (30d)", rawVal: netDep, rawFmt: netDep !== null ? String(netDep) : "N/A", score: scoreNetDepositors(netDep), weight: 0.05 },
    { metric: "T10b", label: "Net Flow Direction", rawVal: netFlowPct, rawFmt: netFlowPct !== null ? `${fv(netFlowPct)}%` : "N/A", score: scoreNetFlowDirection(netFlowPct), weight: 0.20 },
    { metric: "T06", label: "Quick Exit Rate", rawVal: quickExit, rawFmt: quickExit !== null ? `${fv(quickExit)}%` : "N/A", score: scoreQuickExitRate(quickExit), weight: 0.10 },
    { metric: "T03.30d", label: "User Retention", rawVal: userRet, rawFmt: userRet !== null ? `${fv(userRet)}%` : "N/A", score: scoreUserRetention(userRet), weight: 0.05 },
  ];

  const capTotal = capital.reduce((s, r) => s + r.score * r.weight, 0);
  const perfTotal = performance.reduce((s, r) => s + r.score * r.weight, 0);
  const riskTotal = risk.reduce((s, r) => s + r.score * r.weight, 0);
  const trustRaw = trust.reduce((s, r) => s + r.score * r.weight, 0);
  const trustBoost = getTrustBoost(tvlUsd, raw.C07 || 0);
  const trustTotal = Math.min(100, trustRaw * trustBoost);

  const age = raw.D01 || raw.D03 || 0;
  const conf = getConfidence(age);
  const extBonus = calcExternalRatingBonus(raw.T14);

  return { capital, performance, risk, trust, capTotal, perfTotal, riskTotal, trustRaw, trustBoost, trustTotal, conf, extBonus, age };
}

const FORMULAS = {
  C01: { formula: "$0-1M: (TVL/1M)×40\n$1M-10M: 40+((TVL-1M)/9M)×40\n>$10M: 80+min(20, (TVL/100M)×20)", source: "On-chain totalAssets() + CoinGecko price" },
  "C02.30d": { formula: "Growth(>+5%): 100\nStable(0-5%): 90\nChurn(-1 to -10%): 60\nOutflow(-10 to -25%): 30\nRun(<-25%): 0", source: "Computed from TVL snapshot diffs" },
  C07: { formula: "min(100, log10(count) × 33.3)\n10 deps→33, 100→67, 500→90, 1000→100", source: "Morpho API positions (>$100 filter)" },
  R07: { formula: "100 − (pending_pct × 2)\n0%→100, 25%→50, 50%→0", source: "On-chain (async vaults only)" },
  "C04.7d": { formula: "pct = (net_flow_7d / TVL) × 100\n>5%: 100, ±2%: 70, 2-5%: 85\n-2 to -10%: 40, <-10%: 0", source: "Computed from TVL snapshot diffs" },
  R06: { formula: "Instant: 100, <1hr: 80\n1-24hr: 40, >24hr: 0", source: "On-chain ERC-7540 interface check" },
  P05: { formula: "Benchmark-relative Sharpe:\nmean(spread) / σ(spread)\nspread = vault_apy − benchmark_apy\n13w(40%) + 52w(60%) blend\n\n<0→0, 0-0.5→30, 0.5-1→50\n1-1.5→70, 1.5-2→85, >2→100", source: "perf_alpha.py (snapshots + DeFiLlama benchmark)" },
  P06: { formula: "Win Rate = wins / total_weeks\nwins = weeks where vault APY > benchmark\n13w(40%) + 52w(60%) blend\n\n<30%→10, 30-50%→30, 50-65%→50\n65-80%→75, 80-90%→90, >90%→100", source: "perf_alpha.py (snapshots + DeFiLlama benchmark)" },
  P07: { formula: "Worst Week = min(weekly spread)\nspread = vault_apy − benchmark_apy\n13w(40%) + 52w(60%) blend\n\nabs=0→100, <0.5%→90, <1%→75\n<2%→50, <5%→30, >5%→10", source: "perf_alpha.py" },
  P13: { formula: "Alpha Consistency = 1 − CV(positive_spreads)\nCV = stdev / mean of winning weeks\n13w(40%) + 52w(60%) blend\n\n<10%→10, 10-25%→30, 25-40%→50\n40-60%→75, 60-80%→90, >80%→100", source: "perf_alpha.py" },
  P08: { formula: "Min(NAV_t / Max(NAV_0..t) − 1)\nUsing synthetic share prices from APY\n\n<1%→100, 1-2%→85, 2-5%→65\n5-10%→40, >10%→0", source: "Computed from daily APY snapshots" },
  P09: { formula: "Max consecutive days below NAV peak\n\n<3d→100, 3-7d→70, 7-14d→50\n14-30d→25, >30d→0", source: "Computed from daily APY snapshots" },
  P10: { formula: "organic_pct = 100 − incentive_pct\nincentive = sum(reward supplyApr) / netApy\n\n100% organic→100, >70%→80\n50-70%→50, <50%→20, 0%→0", source: "Morpho API rewards array (non-Morpho defaults 100%)" },
  "P03.7d": { formula: "ratio = vault_7d_APY / benchmark_APY\nBenchmark: Aave (stables), Lido (ETH), Aave WBTC (BTC)\n\n≥2x→100, ≥1.5x→85, ≥1.2x→70\n~1x(±10%)→55, 0.5-0.9x→30\n0.25-0.5x→10, <0.25x→0", source: "P01 / DeFiLlama benchmark" },
  R10: { formula: "Count of pauses, exploits, emergency events\n\n0→100, 1→40, 2→10, >2→0", source: "Morpho API events + on-chain log scanning" },
  R01: { formula: "Stablecoins: deviation from $1.00 peg\n>$0.995→100, $0.99-0.995→70\n$0.98-0.99→30, <$0.98→0\nNon-stablecoins: default 80", source: "CoinGecko price" },
  R09_top5: { formula: "≥500 depositors (standard):\n<10%→100, 10-25%→80, 25-40%→60\n40-60%→30, >60%→10\n\n<500 depositors (strict):\n<10%→100, 10-20%→80, 20-35%→60\n35-50%→30, >50%→10", source: "Morpho API positions / on-chain Transfer events" },
  "R06.wd": { formula: "Instant→100, <1h→90, 1-24h→60\n1-7d→30, >7d→10", source: "On-chain ERC-7540 check + hardcoded list" },
  timelock: { formula: "Immutable or ≥48h→100\n12-48h→60\nInstant upgrade→0", source: "On-chain timelock() contract read" },
  "T01.30d": { formula: "current_tvl / tvl_30d_ago × 100\nCapped at 100%\n\n>95%→100, 90-95%→85, 80-90%→70\n70-80%→50, 50-70%→25, <50%→0", source: "TVL snapshot ratio (not cohort-based)" },
  T09: { formula: "Mean(withdraw_time − deposit_time)\nFor completed deposit-withdraw cycles\nFiltered: deposits ≥$100\n\n>90d→100, 60-90d→80, 30-60d→60\n7-30d→30, <7d→10", source: "Morpho API / on-chain events" },
  T07: { formula: "ratio = holders_90d / total_depositors\n\n>50%→100, 30-50%→80, 10-30%→60\n5-10%→40, <5%→20", source: "Morpho API / on-chain events (>$100 filter)" },
  T11: { formula: "HODL = active_addrs / total_known_depositors\n\n>70%→100, 50-70%→75\n30-50%→45, <30%→15", source: "Computed from depositor tracking" },
  T10: { formula: "net = new_depositors − full_exits (30d)\n\n>10→100, 1-10→70, 0→40, negative→0", source: "Morpho API / on-chain events" },
  T10b: { formula: "(net_deposits − net_withdrawals) / TVL\nOver trailing 30 days\n\n>+10%→100, 5-10%→90, 3-5%→80\n0-3%→70, 0 to -10%→40, <-10%→20", source: "Computed from depositor tracking / TVL" },
  T06: { formula: "% of depositors exiting within 7 days\nFiltered: deposits ≥$100\n\n<5%→100, 5-10%→80, 10-15%→55\n15-25%→35, >25%→15", source: "Morpho API / on-chain events" },
  "T03.30d": { formula: "active_users / total_unique_users × 100\nActive = balance > $100\n\n>80%→100, 60-80%→70\n40-60%→40, <40%→15", source: "Morpho API positions / on-chain events" },
};

function MetricRow({ r, isExpanded, onToggle }) {
  const info = FORMULAS[r.metric] || {};
  return (
    <>
      <tr onClick={e => { e.stopPropagation(); onToggle(); }} style={{ borderBottom: isExpanded ? "none" : `1px solid ${C.border}`, cursor: "pointer", transition: "background .1s" }} onMouseEnter={e => e.currentTarget.style.background = C.surfaceAlt} onMouseLeave={e => e.currentTarget.style.background = isExpanded ? "#f0eef8" : "transparent"}>
        <td style={td}><code style={{ fontSize: 11, background: C.surfaceAlt, padding: "1px 4px", borderRadius: 3 }}>{r.metric}</code></td>
        <td style={td}><span style={{ display: "flex", alignItems: "center", gap: 4 }}>{r.label} <span style={{ fontSize: 10, color: C.purple }}>{isExpanded ? "▼" : "▶"}</span></span></td>
        <td style={{ ...td, textAlign: "right", fontFamily: "monospace" }}>{r.rawFmt}</td>
        <td style={{ ...td, textAlign: "right", fontWeight: 600, color: scoreColor(Math.round(r.score)) }}>{r.score.toFixed(1)}</td>
        <td style={{ ...td, textAlign: "right", color: C.text3 }}>{(r.weight * 100).toFixed(1)}%</td>
        <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>{(r.score * r.weight).toFixed(1)}</td>
      </tr>
      {isExpanded && (
        <tr onClick={e => e.stopPropagation()} style={{ borderBottom: `1px solid ${C.border}` }}>
          <td colSpan={6} style={{ padding: "0 10px 10px", background: "#f0eef8" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "10px 0" }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.purple, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>Scoring Formula</div>
                <pre style={{ margin: 0, fontSize: 11, color: C.text2, lineHeight: 1.5, fontFamily: "'JetBrains Mono', 'Fira Code', monospace", whiteSpace: "pre-wrap", background: C.white, padding: 8, borderRadius: 6, border: `1px solid ${C.border}` }}>{info.formula || "—"}</pre>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.teal, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>Live Calculation</div>
                <div style={{ background: C.white, padding: 8, borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 11, lineHeight: 1.6, fontFamily: "monospace" }}>
                  <div>Input: <strong>{r.rawFmt}</strong> (raw: {r.rawVal === null ? "null" : typeof r.rawVal === "number" ? r.rawVal.toFixed(6) : String(r.rawVal)})</div>
                  <div>Score: <strong style={{ color: scoreColor(Math.round(r.score)) }}>{r.score.toFixed(2)}</strong> / 100</div>
                  <div>Weight: {(r.weight * 100).toFixed(1)}%</div>
                  <div>Contribution: <strong>{(r.score * r.weight).toFixed(2)}</strong></div>
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.text4, textTransform: "uppercase", letterSpacing: ".05em", marginTop: 8, marginBottom: 2 }}>Data Source</div>
                <div style={{ fontSize: 11, color: C.text3 }}>{info.source || "—"}</div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function MetricTable({ title, rows, totalScore, weight, color }) {
  const [expandedMetric, setExpandedMetric] = useState(null);
  const weighted = totalScore * weight;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: color + "10", borderRadius: "8px 8px 0 0", borderBottom: `2px solid ${color}40` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
          <span style={{ fontSize: 13, fontWeight: 700 }}>{title}</span>
          <span style={{ fontSize: 11, color: C.text3 }}>Weight: {(weight * 100).toFixed(0)}%</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>Sub-Score: <span style={{ color: scoreColor(Math.round(totalScore)) }}>{totalScore.toFixed(1)}</span></span>
          <span style={{ fontSize: 12, fontWeight: 600, color }}>Contribution: {weighted.toFixed(1)}</span>
        </div>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: C.surfaceAlt }}>
            <th style={th}>Metric</th>
            <th style={th}>Label</th>
            <th style={{ ...th, textAlign: "right" }}>Raw Value</th>
            <th style={{ ...th, textAlign: "right" }}>Score (0-100)</th>
            <th style={{ ...th, textAlign: "right" }}>Weight</th>
            <th style={{ ...th, textAlign: "right" }}>Weighted</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <MetricRow key={i} r={r} isExpanded={expandedMetric === i} onToggle={() => setExpandedMetric(expandedMetric === i ? null : i)} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

const th = { padding: "6px 10px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "rgba(0,0,0,.5)", borderBottom: `1px solid ${C.border2}` };
const td = { padding: "6px 10px", fontSize: 12 };

function ScoringDetail({ vault }) {
  const raw = vault._raw;
  if (!raw) return <div style={{ padding: 20, color: C.text3 }}>No raw data available</div>;

  const b = calcBreakdown(raw);
  const flagPenalty = vault.flags.reduce((s, f) => s + (f.penalty || 0), 0);
  const weighted = b.capTotal * 0.20 + b.perfTotal * 0.20 + b.riskTotal * 0.35 + b.trustTotal * 0.25;
  const afterConf = weighted * b.conf;
  const finalScore = Math.max(0, Math.min(100, Math.round(afterConf + flagPenalty + b.extBonus)));

  return (
    <div style={{ padding: "16px 20px", background: C.surfaceAlt, borderTop: `1px solid ${C.border2}` }}>
      <MetricTable title="Capital Score" rows={b.capital} totalScore={b.capTotal} weight={0.20} color="#6366f1" />
      <MetricTable title="Performance Score" rows={b.performance} totalScore={b.perfTotal} weight={0.20} color={C.teal} />
      <MetricTable title="Risk Score" rows={b.risk} totalScore={b.riskTotal} weight={0.35} color="#ef4444" />
      <MetricTable title="Trust Score" rows={b.trust} totalScore={b.trustRaw} weight={0.25} color={C.gold} />

      {b.trustBoost > 1 && (
        <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8, background: `${C.gold}10`, border: `1px solid ${C.gold}30`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14 }}>🛡️</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>Trust Scale Boost Applied: ×{b.trustBoost.toFixed(2)}</div>
              <div style={{ fontSize: 11, color: C.text3 }}>TVL {fmtTvl(getTvlUsd(raw))} + {raw.C07 || 0} depositors → battle-tested vault gets trust floor protection</div>
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: 12 }}>
            <div style={{ color: C.text3 }}>Raw: {b.trustRaw.toFixed(1)} × {b.trustBoost.toFixed(2)}</div>
            <div style={{ fontWeight: 700, color: C.gold }}>Boosted: {b.trustTotal.toFixed(1)}</div>
          </div>
        </div>
      )}

      <div style={{ background: C.white, borderRadius: 8, border: `1px solid ${C.border2}`, padding: 16, marginTop: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Final Score Calculation</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <tbody>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              <td style={td}>Weighted Sum</td>
              <td style={{ ...td, textAlign: "right", fontFamily: "monospace" }}>
                ({b.capTotal.toFixed(1)} × 0.20) + ({b.perfTotal.toFixed(1)} × 0.20) + ({b.riskTotal.toFixed(1)} × 0.35) + ({b.trustTotal.toFixed(1)} × 0.25)
              </td>
              <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{weighted.toFixed(2)}</td>
            </tr>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              <td style={td}>Confidence (age: {b.age}d)</td>
              <td style={{ ...td, textAlign: "right", fontFamily: "monospace" }}>× {b.conf}</td>
              <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{afterConf.toFixed(2)}</td>
            </tr>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              <td style={td}>Flag Penalties</td>
              <td style={{ ...td, textAlign: "right", fontFamily: "monospace" }}>{flagPenalty === 0 ? "None" : `${flagPenalty}`}</td>
              <td style={{ ...td, textAlign: "right", fontWeight: 700, color: flagPenalty < 0 ? C.red : C.text }}>{flagPenalty}</td>
            </tr>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              <td style={td}>External Rating Bonus (T14: {raw.T14 ?? "N/A"})</td>
              <td style={{ ...td, textAlign: "right", fontFamily: "monospace" }}>+{b.extBonus}</td>
              <td style={{ ...td, textAlign: "right", fontWeight: 700, color: b.extBonus > 0 ? C.green : C.text }}>{b.extBonus}</td>
            </tr>
            <tr style={{ background: C.purpleDim }}>
              <td style={{ ...td, fontWeight: 700, fontSize: 14 }}>Final Yieldo Score</td>
              <td style={{ ...td, textAlign: "right", fontFamily: "monospace", fontSize: 11, color: C.text3 }}>
                clamp(0, 100, round({afterConf.toFixed(2)} + {flagPenalty} + {b.extBonus}))
              </td>
              <td style={{ ...td, textAlign: "right", fontWeight: 700, fontSize: 18, color: scoreColor(finalScore) }}>{finalScore}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {vault.flags.length > 0 && (
        <div style={{ marginTop: 16, background: C.white, borderRadius: 8, border: `1px solid ${C.border2}`, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Active Flags ({vault.flags.length})</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: C.surfaceAlt }}>
                <th style={th}>ID</th>
                <th style={th}>Severity</th>
                <th style={th}>Label</th>
                <th style={{ ...th, textAlign: "right" }}>Penalty</th>
              </tr>
            </thead>
            <tbody>
              {vault.flags.map((f, i) => {
                const sev = SEV[f.severity] || SEV.info;
                return (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={td}><code style={{ fontSize: 11 }}>{f.id}</code></td>
                    <td style={td}><span style={{ fontSize: 11, fontWeight: 600, padding: "2px 6px", borderRadius: 3, background: sev.bg, color: sev.color }}>{sev.icon} {f.severity}</span></td>
                    <td style={td}>{f.label}</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 600, color: f.penalty < 0 ? C.red : C.text }}>{f.penalty}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function VaultScoringPage() {
  const { vaults, loading, error } = useVaults();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("yieldoScore");
  const [sortDir, setSortDir] = useState("desc");
  const [expanded, setExpanded] = useState(null);

  const sorted = useMemo(() => {
    let list = vaults;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(v => v.name?.toLowerCase().includes(q) || v.protocol?.toLowerCase().includes(q) || v.asset?.toLowerCase().includes(q) || v.chain?.toLowerCase().includes(q));
    }
    list = [...list].sort((a, b) => {
      const get = (v, k) => k.includes(".") ? k.split(".").reduce((o, p) => o?.[p], v) : v[k];
      const av = get(a, sortBy) ?? 0, bv = get(b, sortBy) ?? 0;
      return sortDir === "desc" ? bv - av : av - bv;
    });
    return list;
  }, [vaults, search, sortBy, sortDir]);

  const toggleSort = (key) => {
    if (sortBy === key) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortBy(key); setSortDir("desc"); }
  };

  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, fontFamily: "'Inter',sans-serif" }}><div style={{ fontSize: 14, color: C.text3 }}>Loading vaults...</div></div>;
  if (error) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, fontFamily: "'Inter',sans-serif" }}><div style={{ fontSize: 14, color: C.red }}>Error: {error}</div></div>;

  const SortHeader = ({ label, field, style: sx = {} }) => (
    <th onClick={() => toggleSort(field)} style={{ ...th, cursor: "pointer", userSelect: "none", ...sx }}>
      {label} {sortBy === field ? (sortDir === "desc" ? "↓" : "↑") : ""}
    </th>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Inter',sans-serif", color: C.text }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>Vault Scoring Debugger</div>
            <div style={{ fontSize: 13, color: C.text3 }}>Internal tool — click any vault to see full score breakdown</div>
          </div>
          <div style={{ fontSize: 12, color: C.text3 }}>{sorted.length} vaults</div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <input
            type="text"
            placeholder="Search by name, protocol, asset, chain..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 360, padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.border2}`, fontSize: 13, fontFamily: "'Inter',sans-serif", outline: "none", background: C.white }}
          />
        </div>

        <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: C.surfaceAlt }}>
                <th style={th}>#</th>
                <th style={th}>Vault</th>
                <th style={th}>Protocol</th>
                <th style={th}>Chain</th>
                <th style={th}>Asset</th>
                <SortHeader label="Score" field="yieldoScore" style={{ textAlign: "right" }} />
                <SortHeader label="Capital" field="subScores.capital" style={{ textAlign: "right" }} />
                <SortHeader label="Perf" field="subScores.performance" style={{ textAlign: "right" }} />
                <SortHeader label="Risk" field="subScores.risk" style={{ textAlign: "right" }} />
                <SortHeader label="Trust" field="subScores.trust" style={{ textAlign: "right" }} />
                <SortHeader label="Conf" field="conf" style={{ textAlign: "right" }} />
                <th style={{ ...th, textAlign: "right" }}>Flags</th>
                <SortHeader label="APY" field="apy" style={{ textAlign: "right" }} />
                <SortHeader label="TVL" field="tvl" style={{ textAlign: "right" }} />
              </tr>
            </thead>
            <tbody>
              {sorted.map((v, idx) => {
                const isExpanded = expanded === v.id;
                return (
                  <tr key={v.id} style={{ cursor: "pointer" }} onClick={() => setExpanded(isExpanded ? null : v.id)}>
                    <td colSpan={14} style={{ padding: 0 }}>
                      <div>
                        <div style={{ display: "grid", gridTemplateColumns: "40px 1.5fr 0.8fr 0.7fr 0.6fr repeat(5, 0.5fr) 0.4fr 0.5fr 0.6fr 0.7fr", alignItems: "center", padding: "10px 10px", borderBottom: `1px solid ${C.border}`, background: isExpanded ? C.purpleDim : (idx % 2 === 0 ? C.white : C.surfaceAlt), transition: "background .15s" }}>
                          <div style={{ fontSize: 11, color: C.text4 }}>{idx + 1}</div>
                          <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingRight: 8 }}>{v.name}</div>
                          <div style={{ fontSize: 11, color: C.text2 }}>{v.protocol}</div>
                          <div style={{ fontSize: 11, color: C.text3 }}>{v.chain}</div>
                          <div style={{ fontSize: 11, fontWeight: 600 }}>{v.asset}</div>
                          <div style={{ textAlign: "right" }}><ScoreRing score={v.yieldoScore} size={32} sw={3} /></div>
                          <div style={{ textAlign: "right", fontSize: 12, fontWeight: 600, color: scoreColor(v.subScores.capital) }}>{v.subScores.capital}</div>
                          <div style={{ textAlign: "right", fontSize: 12, fontWeight: 600, color: scoreColor(v.subScores.performance) }}>{v.subScores.performance}</div>
                          <div style={{ textAlign: "right", fontSize: 12, fontWeight: 600, color: scoreColor(v.subScores.risk) }}>{v.subScores.risk}</div>
                          <div style={{ textAlign: "right", fontSize: 12, fontWeight: 600, color: scoreColor(v.subScores.trust) }}>{v.subScores.trust}</div>
                          <div style={{ textAlign: "right", fontSize: 11, color: v.conf < 1 ? C.blue : C.text3 }}>{v.conf}</div>
                          <div style={{ textAlign: "right" }}>
                            {v.critFlags > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: C.red, marginRight: 2 }}>🔴{v.critFlags}</span>}
                            {v.warnFlags > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: C.amber }}>🟡{v.warnFlags}</span>}
                            {v.critFlags === 0 && v.warnFlags === 0 && <span style={{ fontSize: 10, color: C.green }}>✓</span>}
                          </div>
                          <div style={{ textAlign: "right", fontSize: 12, fontWeight: 600, color: C.green }}>{v.apy.toFixed(2)}%</div>
                          <div style={{ textAlign: "right", fontSize: 12, color: C.text2 }}>{fmtTvl(v.tvl)}</div>
                        </div>
                        {isExpanded && <ScoringDetail vault={v} />}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
