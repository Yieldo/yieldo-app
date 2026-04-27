// Yieldo scoring — single source of truth.
//
// Pure functions, no React, no localStorage, no browser APIs. Importable
// from both the React app (useVaultData.js) and from server-side Vercel
// functions (api/badge/[vaultId].js) so the embed badge score always
// matches what the UI displays.

export function getAssetType(asset) {
  const a = (asset || "").toLowerCase();
  if (["usdc", "usdt", "dai", "pyusd", "susd", "eurc", "eurcv", "usds", "usda"].includes(a)) return "stablecoin";
  if (["weth", "wsteth", "re7lrt"].includes(a)) return "eth";
  if (["wbtc", "cbbtc", "lbtc", "ubtc"].includes(a)) return "btc";
  return "other";
}

// ---------- Capital ----------
export function scoreTVL(tvlUSD) {
  if (tvlUSD <= 0) return 0;
  if (tvlUSD < 1e6) return (tvlUSD / 1e6) * 40;
  if (tvlUSD < 1e7) return 40 + ((tvlUSD - 1e6) / 9e6) * 40;
  return 80 + Math.min(20, (tvlUSD / 1e8) * 20);
}
export function scoreTVLVelocity(change30d) {
  if (change30d == null) return 50;
  if (change30d > 5) return 100;
  if (change30d >= 0) return 90;
  if (change30d >= -10) return 60;
  if (change30d >= -25) return 30;
  return 0;
}
export function scoreDepositors(count) {
  if (count <= 0) return 0;
  return Math.min(100, Math.log10(Math.max(1, count)) * 33.3);
}
export function scorePendingWithdrawals(pctTVL) {
  if (pctTVL == null || pctTVL <= 0) return 100;
  return Math.max(0, Math.min(100, 100 - (pctTVL * 2)));
}
export function scoreNetFlows7d(netFlow7d, tvl) {
  if (tvl <= 0 || netFlow7d == null) return 50;
  const pct = (netFlow7d / tvl) * 100;
  if (pct > 5) return 100;
  if (pct >= -2 && pct <= 2) return 70;
  if (pct > 2) return 85;
  if (pct >= -10) return 40;
  return 0;
}
export function scoreDepositLatency(type) {
  if (type === "Instant") return 100;
  if (type === "<1h") return 80;
  if (type === "1h-24h") return 40;
  return 0;
}

// ---------- Performance ----------
export function scoreSharpe(sharpe) {
  if (sharpe == null) return 50;
  if (sharpe < 0) return 0;
  if (sharpe < 0.5) return 30;
  if (sharpe < 1.0) return 50;
  if (sharpe < 1.5) return 70;
  if (sharpe < 2.0) return 85;
  return 100;
}
export function scoreWinRate(winRate) {
  if (winRate == null) return 50;
  if (winRate < 0.3) return 10;
  if (winRate < 0.5) return 30;
  if (winRate < 0.65) return 50;
  if (winRate < 0.8) return 75;
  if (winRate < 0.9) return 90;
  return 100;
}
export function scoreWorstWeek(worstWeek) {
  if (worstWeek == null) return 50;
  const abs = Math.abs(worstWeek);
  if (abs === 0) return 100;
  if (abs < 0.005) return 90;
  if (abs < 0.01) return 75;
  if (abs < 0.02) return 50;
  if (abs < 0.05) return 30;
  return 10;
}
export function scoreAlphaConsistency(consistency) {
  if (consistency == null) return 50;
  if (consistency < 0.1) return 10;
  if (consistency < 0.25) return 30;
  if (consistency < 0.4) return 50;
  if (consistency < 0.6) return 75;
  if (consistency < 0.8) return 90;
  return 100;
}
export function scoreMaxDrawdown(dd) {
  if (dd == null) return 50;
  const absDd = Math.abs(dd);
  if (absDd < 1) return 100;
  if (absDd < 2) return 85;
  if (absDd < 5) return 65;
  if (absDd < 10) return 40;
  return 0;
}
export function scoreDrawdownDuration(days) {
  if (days == null || days === 0) return 100;
  if (days < 3) return 100;
  if (days < 7) return 70;
  if (days < 14) return 50;
  if (days < 30) return 25;
  return 0;
}
export function scoreYieldComposition(organicPct) {
  if (organicPct == null) return 50;
  if (organicPct >= 100) return 100;
  if (organicPct >= 70) return 80;
  if (organicPct >= 50) return 50;
  if (organicPct > 0) return 20;
  return 0;
}
export function scoreAPYvsBenchmark(ratio7d) {
  if (ratio7d == null) return 50;
  if (ratio7d >= 2.0) return 100;
  if (ratio7d >= 1.5) return 85;
  if (ratio7d >= 1.2) return 70;
  if (ratio7d >= 0.9) return 55;
  if (ratio7d >= 0.5) return 30;
  if (ratio7d >= 0.25) return 10;
  return 0;
}
export function scoreSortino(sortino) {
  if (sortino == null) return 50;
  if (sortino < 0) return 0;
  if (sortino < 1) return 30 + (sortino * 50);
  if (sortino < 2) return 30 + ((sortino - 1) * 50);
  if (sortino < 3) return 80;
  return 100;
}

// ---------- Risk ----------
export function scoreIncidents(count) {
  if (count === 0) return 100;
  if (count === 1) return 40;
  if (count === 2) return 10;
  return 0;
}
export function scoreDepegRisk(assetPrice, assetType) {
  if (assetType !== "stablecoin") return 80;
  if (assetPrice == null) return 50;
  const price = assetPrice;
  if (price > 0.995) return 100;
  if (price >= 0.99) return 70;
  if (price >= 0.98) return 30;
  return 0;
}
export function scoreWithdrawalLatency(type) {
  if (type === "Instant") return 100;
  if (type === "<1h") return 90;
  if (type === "1h-24h") return 60;
  if (type === "1d-7d") return 30;
  return 10;
}
export function scoreTimelock(timelock) {
  if (!timelock || timelock <= 0) return 0;
  const hours = timelock / 3600;
  if (hours >= 48) return 100;
  if (hours >= 12) return 60;
  return 0;
}
export function scoreConcentration(top5Share, depositorCount) {
  if (top5Share == null) return 50;
  if (depositorCount >= 500) {
    if (top5Share < 0.10) return 100;
    if (top5Share < 0.25) return 80;
    if (top5Share < 0.40) return 60;
    if (top5Share < 0.60) return 30;
    return 10;
  }
  if (top5Share < 0.10) return 100;
  if (top5Share < 0.20) return 80;
  if (top5Share < 0.35) return 60;
  if (top5Share < 0.50) return 30;
  return 10;
}

// ---------- Trust ----------
export function scoreHoldRatio(pct) {
  if (pct == null) return 50;
  if (pct > 70) return 100;
  if (pct >= 50) return 75;
  if (pct >= 30) return 45;
  return 15;
}
export function scoreCapitalRetention(ret30d) {
  if (ret30d == null) return 50;
  if (ret30d > 95) return 100;
  if (ret30d >= 90) return 85;
  if (ret30d >= 80) return 70;
  if (ret30d >= 70) return 50;
  if (ret30d >= 50) return 25;
  return 0;
}
export function scoreAvgDepositDuration(days) {
  if (days == null) return 50;
  if (days > 90) return 100;
  if (days >= 60) return 80;
  if (days >= 30) return 60;
  if (days >= 7) return 30;
  return 10;
}
export function scoreHolders90Plus(holders90, totalDepositors) {
  if (holders90 == null || totalDepositors <= 0) return 50;
  const ratio = Math.min(1, holders90 / totalDepositors);
  if (ratio > 0.5) return 100;
  if (ratio > 0.3) return 80;
  if (ratio > 0.1) return 60;
  if (ratio > 0.05) return 40;
  return 20;
}
export function scoreNetDepositors(net30d) {
  if (net30d == null) return 50;
  if (net30d > 10) return 100;
  if (net30d > 0) return 70;
  if (net30d === 0) return 40;
  return 0;
}
export function scoreNetFlowDirection(netFlowPct) {
  if (netFlowPct == null) return 50;
  if (netFlowPct > 10) return 100;
  if (netFlowPct >= 5) return 90;
  if (netFlowPct >= 3) return 80;
  if (netFlowPct >= 0) return 70;
  if (netFlowPct >= -10) return 40;
  return 20;
}
export function scoreQuickExitRate(exitRate) {
  if (exitRate == null) return 50;
  if (exitRate < 5) return 100;
  if (exitRate < 10) return 80;
  if (exitRate < 15) return 55;
  if (exitRate < 25) return 35;
  return 15;
}
export function scoreUserRetention(ret30d) {
  if (ret30d == null) return 50;
  if (ret30d > 80) return 100;
  if (ret30d >= 60) return 70;
  if (ret30d >= 40) return 40;
  return 15;
}

// ---------- Trust boost / utility ----------
export function getTrustBoost(tvlUsd, depositorCount) {
  const tvlTier =
    tvlUsd >= 100e6 ? 4 :
    tvlUsd >= 50e6 ? 3 :
    tvlUsd >= 25e6 ? 2 :
    tvlUsd >= 10e6 ? 1 : 0;
  const depTier =
    depositorCount >= 1000 ? 4 :
    depositorCount >= 500 ? 3 :
    depositorCount >= 200 ? 2 :
    depositorCount >= 100 ? 1 : 0;
  const tier = Math.min(tvlTier, depTier);
  return [1.00, 1.03, 1.05, 1.08, 1.12][tier];
}

export function getTvlUsd(raw) {
  if (raw.C01_USD) return raw.C01_USD;
  if (Array.isArray(raw.tvl_spark) && raw.tvl_spark.length > 0) return raw.tvl_spark[raw.tvl_spark.length - 1];
  if (Array.isArray(raw.snapshots) && raw.snapshots.length > 0) {
    const last = raw.snapshots[raw.snapshots.length - 1];
    if (last && last.total_assets_usd > 0) return last.total_assets_usd;
  }
  return 0;
}

// ---------- Composites ----------
export function calcCapitalScore(raw) {
  const c02 = raw.C02 || {};
  const c04 = raw.C04 || {};
  const tvlUsd = getTvlUsd(raw);
  return (
    scoreTVL(tvlUsd) * 0.1875 +
    scoreTVLVelocity(typeof c02["30d"] === "number" ? c02["30d"] : null) * 0.1875 +
    scoreDepositors(raw.C07 || 0) * 0.1875 +
    scorePendingWithdrawals(raw.R07 || 0) * 0.1875 +
    scoreNetFlows7d(typeof c04["7d"] === "number" ? c04["7d"] : null, tvlUsd) * 0.1875 +
    scoreDepositLatency(raw.R06 || "Instant") * 0.0625
  );
}
export function calcPerformanceScore(raw) {
  const sharpeVal = raw.P05 === "Insufficient Data" ? null : (typeof raw.P05 === "number" ? raw.P05 : null);
  const winRateVal = raw.P06 === "Insufficient Data" ? null : (typeof raw.P06 === "number" ? raw.P06 : null);
  const worstWeekVal = raw.P07 === "Insufficient Data" ? null : (typeof raw.P07 === "number" ? raw.P07 : null);
  const consistencyVal = raw.P13 === "Insufficient Data" ? null : (typeof raw.P13 === "number" ? raw.P13 : null);
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
  return (
    scoreSharpe(sharpeVal) * 0.15 +
    scoreWinRate(winRateVal) * 0.10 +
    scoreWorstWeek(worstWeekVal) * 0.05 +
    scoreAlphaConsistency(consistencyVal) * 0.05 +
    scoreMaxDrawdown(dd) * 0.25 +
    scoreDrawdownDuration(ddDuration) * 0.05 +
    scoreYieldComposition(organicPct) * 0.10 +
    scoreAPYvsBenchmark(benchRatio) * 0.25
  );
}
export function calcRiskScore(raw) {
  const r10 = raw.R10;
  const incidents = typeof r10 === "number" ? r10 : (r10 && typeof r10 === "object" ? (r10["90d"] ?? 0) : 0);
  const assetType = getAssetType((raw.asset || "").toLowerCase());
  const top5raw = typeof raw.R09_top5 === "number" ? raw.R09_top5 : 0;
  const top5 = top5raw > 1 ? top5raw / 100 : top5raw;
  return (
    scoreIncidents(incidents) * 0.353 +
    scoreDepegRisk(raw.R01, assetType) * 0.294 +
    scoreConcentration(top5, raw.C07 || 0) * 0.176 +
    scoreWithdrawalLatency(raw.R06 || "Instant") * 0.118 +
    scoreTimelock(raw.timelock || 0) * 0.059
  );
}
export function calcTrustScore(raw) {
  const ret30d = raw.T01 && typeof raw.T01 === "object" ? raw.T01["30d"] : (typeof raw.T01 === "number" ? raw.T01 : null);
  const avgDuration = typeof raw.T09 === "number" ? raw.T09 : null;
  const holders90 = typeof raw.T07 === "number" ? raw.T07 : 0;
  const netDep = typeof raw.T10 === "number" ? raw.T10 : null;
  const netFlowPct = raw.T10b && typeof raw.T10b === "object" ? raw.T10b.net_flow_pct : null;
  const quickExit = typeof raw.T06 === "number" ? raw.T06 : null;
  const userRet = raw.T03 && typeof raw.T03 === "object" ? raw.T03["30d"] : (typeof raw.T03 === "number" ? raw.T03 : null);
  const holdRatio = typeof raw.T11 === "number" ? raw.T11 : null;
  return (
    scoreCapitalRetention(ret30d) * 0.20 +
    scoreAvgDepositDuration(avgDuration) * 0.15 +
    scoreHolders90Plus(holders90, raw.C07 || 0) * 0.10 +
    scoreHoldRatio(holdRatio) * 0.15 +
    scoreNetDepositors(netDep) * 0.05 +
    scoreNetFlowDirection(netFlowPct) * 0.20 +
    scoreQuickExitRate(quickExit) * 0.10 +
    scoreUserRetention(userRet) * 0.05
  );
}
export function getConfidence(age) {
  if (age < 14) return 0.50;
  if (age < 30) return 0.65;
  if (age < 60) return 0.80;
  if (age < 90) return 0.90;
  return 1.00;
}
export function calcExternalRatingBonus(t14) {
  const count = typeof t14 === "number" ? t14 : 0;
  if (count >= 3) return 3;
  if (count === 2) return 1;
  return 0;
}

export function deriveFlags(v) {
  const flags = [];
  const assetType = getAssetType((v.asset || "").toLowerCase());
  if (v.R04) flags.push({ id: "F01", severity: "critical", label: "Vault Paused", penalty: -30 });
  if (v.R05) flags.push({ id: "F02", severity: "critical", label: "Emergency Event", penalty: -50 });
  if (assetType === "stablecoin" && typeof v.R01 === "number") {
    const deviation = Math.abs(1 - v.R01) * 100;
    if (deviation > 4) flags.push({ id: "F03", severity: "critical", label: "Severe Depeg", penalty: -25 });
    else if (deviation > 2) flags.push({ id: "F10", severity: "warning", label: "Minor Depeg", penalty: -10 });
  } else if (v.R02_depeg) {
    flags.push({ id: "F03", severity: "critical", label: "Severe Depeg", penalty: -25 });
  }
  const c02 = v.C02 || {};
  const tvlChg1d = typeof c02["1d"] === "number" ? c02["1d"] : null;
  const tvlChg7d = typeof c02["7d"] === "number" ? c02["7d"] : null;
  const hasFallbackTvl = (v.C01 === 0 || !v.C01) && Array.isArray(v.snapshots) && v.snapshots.length > 0 && v.snapshots[v.snapshots.length - 1]?.total_assets_usd > 0;
  if (!hasFallbackTvl) {
    if (tvlChg1d !== null && tvlChg1d < -20) flags.push({ id: "F04", severity: "critical", label: "TVL Crash (1d)", penalty: -20 });
    else if (tvlChg1d !== null && tvlChg1d < -10) flags.push({ id: "F11", severity: "warning", label: "TVL Drop (1d)", penalty: -8 });
    if (tvlChg7d !== null && tvlChg7d < -40) flags.push({ id: "F05", severity: "critical", label: "TVL Crash (7d)", penalty: -20 });
    else if (tvlChg7d !== null && tvlChg7d < -20) flags.push({ id: "F12", severity: "warning", label: "TVL Drop (7d)", penalty: -8 });
  }
  const depCount = v.C07 || 0;
  if (depCount < 10) flags.push({ id: "F06", severity: "critical", label: "Very Few Depositors (<10)", penalty: -15 });
  else if (depCount < 50) flags.push({ id: "F14", severity: "warning", label: "Low Depositors (<50)", penalty: -5 });
  if (v.P11 === true || v.P11 === "critical") flags.push({ id: "F07", severity: "warning", label: "High Incentive Dep.", penalty: -10 });
  else if (v.P11 === "warning") flags.push({ id: "F17", severity: "info", label: "Moderate Incentive", penalty: -5 });
  if (v.R08 === true || v.R08 === "critical") flags.push({ id: "F08", severity: "critical", label: "Withdrawal Queue Crisis", penalty: -20 });
  else if (v.R08 === "warning") flags.push({ id: "F18", severity: "warning", label: "Elevated Pending Withdrawals", penalty: -8 });
  if (v.T02 === "critical") flags.push({ id: "F09", severity: "critical", label: "Retention Declining", penalty: -15 });
  else if (v.T02 === "warning") flags.push({ id: "F19", severity: "warning", label: "Retention Declining", penalty: -5 });
  if (v.C05) flags.push({ id: "F13", severity: "warning", label: "Net Capital Outflow", penalty: -5 });
  if (v.P02 === "sustained" || v.P02_sustained) flags.push({ id: "F16", severity: "critical", label: "Sustained Negative APY (3d+)", penalty: -20 });
  else if (v.P02) flags.push({ id: "F15", severity: "warning", label: "Negative APY", penalty: -5 });
  if (v.T05_short_hold === true || v.T05_short_hold === "critical") flags.push({ id: "F21", severity: "critical", label: "Very Short Holding", penalty: -10 });
  else if (v.T05_short_hold === "warning") flags.push({ id: "F20", severity: "warning", label: "Short Holding", penalty: -3 });
  const p03 = v.P03 || {};
  const bench7d = typeof p03 === "object" && typeof p03["7d"] === "number" ? p03["7d"] : (typeof v.P03 === "number" ? v.P03 : null);
  if (bench7d !== null) {
    if (bench7d < 0.25) flags.push({ id: "F32", severity: "critical", label: "Severely Below Benchmark", penalty: -15 });
    else if (bench7d < 0.5) flags.push({ id: "F31", severity: "warning", label: "Below Benchmark APY", penalty: -5 });
    else if (bench7d < 0.8) flags.push({ id: "F30", severity: "info", label: "Slightly Below Benchmark", penalty: 0 });
  } else {
    if (v.P03b) flags.push({ id: "F32", severity: "critical", label: "Severely Below Benchmark", penalty: -15 });
  }
  if (v.P12 === "Incentivized Yield") flags.push({ id: "F22", severity: "info", label: "Incentivized Yield", penalty: 0 });
  const age = v.D01 || 0;
  if (age < 30) flags.push({ id: "F23", severity: "info", label: "New Vault", penalty: 0 });
  else if (age < 90) flags.push({ id: "F24", severity: "info", label: "Early Vault", penalty: 0 });
  if (v.R06 === "Async") flags.push({ id: "F25", severity: "info", label: "Async Withdrawals", penalty: 0 });
  const quickExit = typeof v.T06 === "number" ? v.T06 : 0;
  if (quickExit > 25) flags.push({ id: "QE", severity: "warning", label: "High Quick Exit Rate", penalty: 0 });
  return flags;
}

// ---------- The thing the badge actually calls ----------

/**
 * Compute the same composite score the React app shows.
 *   raw      : the indexer vault row (C01, C07, P-fields, R-fields, T-fields)
 *   age      : days since vault creation (defaults to 365 → full confidence)
 * Returns { score: 0-100 int, sub: { capital, performance, risk, trust } }.
 */
export function computeYieldoScore(raw, age = 365) {
  const capScore = calcCapitalScore(raw);
  const perfScore = calcPerformanceScore(raw);
  const riskScore = calcRiskScore(raw);
  const trustRaw = calcTrustScore(raw);
  const tvlUsd = getTvlUsd(raw);
  const depositorCount = raw.C07 || 0;
  const trustBoost = getTrustBoost(tvlUsd, depositorCount);
  const trustScore = Math.min(100, trustRaw * trustBoost);

  const conf = getConfidence(age);
  const flagPenalty = deriveFlags(raw).reduce((sum, f) => sum + (f.penalty || 0), 0);
  const extBonus = calcExternalRatingBonus(raw.T14);

  const rawScore = (capScore * 0.20 + perfScore * 0.20 + riskScore * 0.35 + trustScore * 0.25) * conf
                 + flagPenalty + extBonus;
  return {
    score: Math.max(0, Math.min(100, Math.round(rawScore))),
    sub: {
      capital: Math.max(0, Math.min(100, Math.round(capScore))),
      performance: Math.max(0, Math.min(100, Math.round(perfScore))),
      risk: Math.max(0, Math.min(100, Math.round(riskScore))),
      trust: Math.max(0, Math.min(100, Math.round(trustScore))),
    },
  };
}
