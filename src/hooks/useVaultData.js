import { useState, useEffect } from "react";

const CACHE_KEY = "yieldo_vaults_cache_v3";
const CACHE_DETAIL_PREFIX = "yieldo_vault_detail_v2_";
const CACHE_TTL = 5 * 60 * 1000;

function getCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) {
      localStorage.removeItem(key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function setCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith("yieldo_")) localStorage.removeItem(k);
    }
  }
}

const CHAIN_NAMES = {
  1: "Ethereum",
  8453: "Base",
  42161: "Arbitrum",
  10: "Optimism",
  999: "HyperEVM",
  747474: "Katana",
  143: "Monad",
};

const ASSET_ICONS = {
  usdc: "💵",
  usdt: "💵",
  dai: "💵",
  pyusd: "💵",
  susd: "💵",
  eurc: "💵",
  usds: "💵",
  usda: "💵",
  weth: "⟠",
  wsteth: "⟠",
  re7lrt: "⟠",
  wbtc: "₿",
  cbbtc: "₿",
  lbtc: "₿",
  ubtc: "₿",
  whype: "💎",
  wmon: "💎",
};

function getAssetType(asset) {
  const a = (asset || "").toLowerCase();
  if (
    ["usdc", "usdt", "dai", "pyusd", "susd", "eurc", "usds", "usda"].includes(
      a
    )
  )
    return "stablecoin";
  if (["weth", "wsteth", "re7lrt"].includes(a)) return "eth";
  if (["wbtc", "cbbtc", "lbtc", "ubtc"].includes(a)) return "btc";
  return "other";
}

function scoreTVL(tvlUSD) {
  if (tvlUSD <= 0) return 0;
  if (tvlUSD < 1e6) return (tvlUSD / 1e6) * 40;
  if (tvlUSD < 1e7) return 40 + ((tvlUSD - 1e6) / 9e6) * 40;
  if (tvlUSD < 1e8) return 80 + ((tvlUSD - 1e7) / 9e7) * 15;
  return 95 + Math.min(5, ((tvlUSD - 1e8) / 9e8) * 5);
}

function scoreTVLVelocity(change30d) {
  if (change30d == null) return 50;
  if (change30d > 50) return 100;
  if (change30d > 10) return 80;
  if (change30d > 0) return 70;
  if (change30d > -10) return 50;
  if (change30d > -30) return 30;
  return 10;
}

function scoreDepositors(count) {
  if (count <= 0) return 0;
  return Math.min(100, (Math.log10(count) / 4) * 100);
}

function scorePendingWithdrawals(pctTVL) {
  if (pctTVL == null || pctTVL <= 0) return 100;
  if (pctTVL < 5) return 100 - pctTVL * 5;
  if (pctTVL < 10) return 75 - (pctTVL - 5) * 5;
  if (pctTVL < 20) return 50 - (pctTVL - 10) * 2.5;
  return Math.max(0, 25 - (pctTVL - 20) * 1.25);
}

function scoreNetFlows7d(netFlow7d, tvl) {
  if (tvl <= 0 || netFlow7d == null) return 50;
  const pct = (netFlow7d / tvl) * 100;
  if (pct > 10) return 100;
  if (pct > 5) return 85;
  if (pct > 0) return 70;
  if (pct > -5) return 50;
  if (pct > -10) return 30;
  return 10;
}

function scoreDepositLatency(type) {
  return type === "Instant" ? 100 : 50;
}

function scoreSharpe(sharpe) {
  if (sharpe == null) return 50;
  if (sharpe < 0) return 10;
  if (sharpe < 0.5) return 30;
  if (sharpe < 1) return 50;
  if (sharpe < 2) return 75;
  if (sharpe < 3) return 90;
  return 100;
}

function scoreSortino(sortino) {
  if (sortino == null) return 50;
  if (sortino < 0) return 10;
  if (sortino < 1) return 30;
  if (sortino < 2) return 50;
  if (sortino < 5) return 75;
  if (sortino < 10) return 90;
  return 100;
}

function scoreMaxDrawdown(dd) {
  if (dd == null) return 50;
  const absDd = Math.abs(dd);
  if (absDd === 0) return 100;
  if (absDd < 1) return 90;
  if (absDd < 5) return 70;
  if (absDd < 10) return 50;
  if (absDd < 20) return 30;
  return 10;
}

function scoreDrawdownDuration(days) {
  if (days == null || days === 0) return 100;
  if (days < 7) return 80;
  if (days < 30) return 60;
  if (days < 90) return 40;
  return 20;
}

function scoreYieldComposition(organicPct) {
  if (organicPct == null) return 50;
  if (organicPct >= 100) return 100;
  if (organicPct >= 75) return 80;
  if (organicPct >= 50) return 60;
  if (organicPct >= 25) return 40;
  return 20;
}

function scoreAPYvsBenchmark(ratio7d) {
  if (ratio7d == null) return 50;
  if (ratio7d > 2.0) return 100;
  if (ratio7d > 1.5) return 90;
  if (ratio7d > 1.0) return 75;
  if (ratio7d > 0.8) return 60;
  if (ratio7d > 0.5) return 40;
  if (ratio7d > 0.25) return 20;
  return 5;
}

function scoreIncidents(count) {
  if (count === 0) return 100;
  if (count === 1) return 50;
  if (count === 2) return 25;
  return 5;
}

function scoreDepegRisk(assetPrice, assetType) {
  if (assetType !== "stablecoin") return 80;
  if (assetPrice == null) return 50;
  const deviation = Math.abs(1 - assetPrice) * 100;
  if (deviation < 0.1) return 100;
  if (deviation < 0.5) return 90;
  if (deviation < 1) return 70;
  if (deviation < 2) return 50;
  if (deviation < 3) return 30;
  return 5;
}

function scoreConcentration(top5Share, depositorCount) {
  if (top5Share == null) return 50;
  const scale = depositorCount < 500 ? 0.8 : 1.0;
  const adj = top5Share / scale;
  if (adj < 0.10) return 100;
  if (adj < 0.30) return 80;
  if (adj < 0.50) return 60;
  if (adj < 0.70) return 40;
  if (adj < 0.90) return 20;
  return 5;
}

function scoreCapitalRetention(ret30d) {
  if (ret30d == null) return 50;
  if (ret30d > 95) return 100;
  if (ret30d > 85) return 80;
  if (ret30d > 70) return 60;
  if (ret30d > 50) return 40;
  return 15;
}

function scoreAvgDepositDuration(days) {
  if (days == null) return 50;
  if (days > 180) return 100;
  if (days > 90) return 80;
  if (days > 30) return 60;
  if (days > 10) return 40;
  return 15;
}

function scoreHolders90Plus(holders90, totalDepositors) {
  if (holders90 == null || totalDepositors <= 0) return 50;
  const ratio = Math.min(1, holders90 / totalDepositors);
  if (ratio > 0.5) return 100;
  if (ratio > 0.3) return 80;
  if (ratio > 0.1) return 60;
  if (ratio > 0.05) return 40;
  return 20;
}

function scoreNetDepositors(net30d) {
  if (net30d == null) return 50;
  if (net30d > 50) return 100;
  if (net30d > 10) return 80;
  if (net30d > 0) return 60;
  if (net30d === 0) return 50;
  if (net30d > -10) return 30;
  return 10;
}

function scoreNetFlowDirection(netFlowPct) {
  if (netFlowPct == null) return 50;
  if (netFlowPct > 20) return 100;
  if (netFlowPct > 5) return 85;
  if (netFlowPct > 0) return 70;
  if (netFlowPct > -10) return 40;
  return 20;
}

function scoreQuickExitRate(exitRate) {
  if (exitRate == null) return 50;
  if (exitRate < 5) return 100;
  if (exitRate < 10) return 80;
  if (exitRate < 15) return 60;
  if (exitRate < 25) return 40;
  if (exitRate < 50) return 20;
  return 5;
}

function scoreUserRetention(ret30d) {
  if (ret30d == null) return 50;
  if (ret30d > 95) return 100;
  if (ret30d > 85) return 80;
  if (ret30d > 70) return 60;
  if (ret30d > 50) return 40;
  return 15;
}

function getTvlUsd(raw) {
  if (raw.C01_USD) return raw.C01_USD;
  if (Array.isArray(raw.tvl_spark) && raw.tvl_spark.length > 0) return raw.tvl_spark[raw.tvl_spark.length - 1];
  // Fallback: use last snapshot's total_assets_usd (important for Hyperliquid vaults where C01=0 but snapshots have real TVL)
  if (Array.isArray(raw.snapshots) && raw.snapshots.length > 0) {
    const last = raw.snapshots[raw.snapshots.length - 1];
    if (last && last.total_assets_usd > 0) return last.total_assets_usd;
  }
  return 0;
}

function calcCapitalScore(raw) {
  const c02 = raw.C02 || {};
  const c04 = raw.C04 || {};
  const tvlUsd = getTvlUsd(raw);
  return (
    scoreTVL(tvlUsd) * 0.15 +
    scoreTVLVelocity(typeof c02["30d"] === "number" ? c02["30d"] : null) * 0.15 +
    scoreDepositors(raw.C07 || 0) * 0.15 +
    scorePendingWithdrawals(raw.R07 || 0) * 0.15 +
    scoreNetFlows7d(typeof c04["7d"] === "number" ? c04["7d"] : null, tvlUsd) * 0.15 +
    scoreDepositLatency(raw.R06 || "Instant") * 0.05 +
    70 * 0.20
  );
}

function calcPerformanceScore(raw) {
  const sharpeVal = raw.P05 === "Insufficient Data" ? null : (typeof raw.P05 === "number" ? raw.P05 : null);
  const sortinoVal = raw.P06 === "Insufficient Data" ? null : (typeof raw.P06 === "number" ? raw.P06 : null);
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
    scoreSharpe(sharpeVal) * 0.20 +
    scoreSortino(sortinoVal) * 0.10 +
    scoreMaxDrawdown(dd) * 0.25 +
    scoreDrawdownDuration(ddDuration) * 0.05 +
    scoreYieldComposition(organicPct) * 0.15 +
    scoreAPYvsBenchmark(benchRatio) * 0.25
  );
}

function calcRiskScore(raw) {
  const r10 = raw.R10;
  const incidents = typeof r10 === "number" ? r10 : (r10 && typeof r10 === "object" ? (r10["90d"] ?? 0) : 0);
  const assetType = getAssetType((raw.asset || "").toLowerCase());
  const top5raw = typeof raw.R09_top5 === "number" ? raw.R09_top5 : 0;
  const top5 = top5raw > 1 ? top5raw / 100 : top5raw;
  return (
    scoreIncidents(incidents) * 0.30 +
    scoreDepegRisk(raw.R01, assetType) * 0.25 +
    scoreConcentration(top5, raw.C07 || 0) * 0.15 +
    scoreDepositLatency(raw.R06 || "Instant") * 0.10 +
    50 * 0.15 +
    50 * 0.05
  );
}

function calcTrustScore(raw) {
  const ret30d = raw.T01 && typeof raw.T01 === "object" ? raw.T01["30d"] : (typeof raw.T01 === "number" ? raw.T01 : null);
  const avgDuration = typeof raw.T09 === "number" ? raw.T09 : null;
  const holders90 = typeof raw.T07 === "number" ? raw.T07 : 0;
  const netDep = typeof raw.T10 === "number" ? raw.T10 : null;
  const netFlowPct = raw.T10b && typeof raw.T10b === "object" ? raw.T10b.net_flow_pct : null;
  const quickExit = typeof raw.T06 === "number" ? raw.T06 : null;
  const userRet = raw.T03 && typeof raw.T03 === "object" ? raw.T03["30d"] : (typeof raw.T03 === "number" ? raw.T03 : null);
  return (
    scoreCapitalRetention(ret30d) * 0.20 +
    scoreAvgDepositDuration(avgDuration) * 0.15 +
    scoreHolders90Plus(holders90, raw.C07 || 0) * 0.10 +
    50 * 0.15 +
    scoreNetDepositors(netDep) * 0.05 +
    scoreNetFlowDirection(netFlowPct) * 0.20 +
    scoreQuickExitRate(quickExit) * 0.10 +
    scoreUserRetention(userRet) * 0.05 +
    50 * 0.00
  );
}

function getConfidence(age) {
  if (age < 14) return 0.50;
  if (age < 30) return 0.65;
  if (age < 60) return 0.80;
  if (age < 90) return 0.90;
  return 1.00;
}

function calcExternalRatingBonus(t14) {
  const count = typeof t14 === "number" ? t14 : 0;
  if (count >= 3) return 3;
  if (count === 2) return 1;
  return 0;
}

function deriveFlags(v) {
  const flags = [];
  const assetType = getAssetType((v.asset || "").toLowerCase());

  if (v.R04)
    flags.push({ id: "F01", severity: "critical", label: "Vault Paused", penalty: -30 });

  if (v.R05)
    flags.push({ id: "F02", severity: "critical", label: "Emergency Event", penalty: -50 });

  if (assetType === "stablecoin" && typeof v.R01 === "number") {
    const deviation = Math.abs(1 - v.R01) * 100;
    if (deviation > 4)
      flags.push({ id: "F03", severity: "critical", label: "Severe Depeg", penalty: -25 });
    else if (deviation > 2)
      flags.push({ id: "F10", severity: "warning", label: "Minor Depeg", penalty: -10 });
  } else if (v.R02_depeg) {
    flags.push({ id: "F03", severity: "critical", label: "Severe Depeg", penalty: -25 });
  }

  const c02 = v.C02 || {};
  const tvlChg1d = typeof c02["1d"] === "number" ? c02["1d"] : null;
  const tvlChg7d = typeof c02["7d"] === "number" ? c02["7d"] : null;
  // Skip TVL change flags when C01=0 but snapshots have real TVL (C02 -100% is misleading)
  const hasFallbackTvl = (v.C01 === 0 || !v.C01) && Array.isArray(v.snapshots) && v.snapshots.length > 0 && v.snapshots[v.snapshots.length - 1]?.total_assets_usd > 0;
  if (!hasFallbackTvl) {
    if (tvlChg1d !== null && tvlChg1d < -20)
      flags.push({ id: "F04", severity: "critical", label: "TVL Crash (1d)", penalty: -20 });
    else if (tvlChg1d !== null && tvlChg1d < -10)
      flags.push({ id: "F11", severity: "warning", label: "TVL Drop (1d)", penalty: -8 });
    if (tvlChg7d !== null && tvlChg7d < -40)
      flags.push({ id: "F05", severity: "critical", label: "TVL Crash (7d)", penalty: -20 });
    else if (tvlChg7d !== null && tvlChg7d < -20)
      flags.push({ id: "F12", severity: "warning", label: "TVL Drop (7d)", penalty: -8 });
  }

  const depCount = v.C07 || 0;
  if (depCount < 10)
    flags.push({ id: "F06", severity: "critical", label: "Very Few Depositors (<10)", penalty: -15 });
  else if (depCount < 50)
    flags.push({ id: "F14", severity: "warning", label: "Low Depositors (<50)", penalty: -5 });

  if (v.P11 === true || v.P11 === "critical")
    flags.push({ id: "F07", severity: "critical", label: "High Incentive Dep.", penalty: -10 });
  else if (v.P11 === "warning")
    flags.push({ id: "F17", severity: "warning", label: "Moderate Incentive", penalty: -5 });

  if (v.R08 === true || v.R08 === "critical")
    flags.push({ id: "F08", severity: "critical", label: "Withdrawal Queue Crisis", penalty: -20 });
  else if (v.R08 === "warning")
    flags.push({ id: "F18", severity: "warning", label: "Elevated Pending Withdrawals", penalty: -8 });

  if (v.T02 === "critical")
    flags.push({ id: "F09", severity: "critical", label: "Retention Declining", penalty: -15 });
  else if (v.T02 === "warning")
    flags.push({ id: "F19", severity: "warning", label: "Retention Declining", penalty: -5 });

  if (v.C05)
    flags.push({ id: "F13", severity: "warning", label: "Net Capital Outflow", penalty: -5 });

  if (v.P02)
    flags.push({ id: "F15", severity: "warning", label: "Negative APY", penalty: -5 });

  if (v.T05_short_hold === true || v.T05_short_hold === "critical")
    flags.push({ id: "F21", severity: "critical", label: "Very Short Holding", penalty: -10 });
  else if (v.T05_short_hold === "warning")
    flags.push({ id: "F20", severity: "warning", label: "Short Holding", penalty: -3 });

  const p03 = v.P03 || {};
  const bench7d = typeof p03 === "object" && typeof p03["7d"] === "number"
    ? p03["7d"] : (typeof v.P03 === "number" ? v.P03 : null);
  if (bench7d !== null) {
    if (bench7d < 0.25)
      flags.push({ id: "F32", severity: "critical", label: "Severely Below Benchmark", penalty: -15 });
    else if (bench7d < 0.5)
      flags.push({ id: "F31", severity: "warning", label: "Below Benchmark APY", penalty: -5 });
    else if (bench7d < 0.8)
      flags.push({ id: "F30", severity: "info", label: "Slightly Below Benchmark", penalty: 0 });
  } else {
    if (v.P03b)
      flags.push({ id: "F32", severity: "critical", label: "Severely Below Benchmark", penalty: -15 });
  }

  if (v.P12 === "Incentivized Yield")
    flags.push({ id: "F22", severity: "info", label: "Incentivized Yield", penalty: 0 });

  const age = v.D01 || 0;
  if (age < 30)
    flags.push({ id: "F23", severity: "info", label: "New Vault", penalty: 0 });
  else if (age < 90)
    flags.push({ id: "F24", severity: "info", label: "Early Vault", penalty: 0 });

  if (v.R06 === "Async")
    flags.push({ id: "F25", severity: "info", label: "Async Withdrawals", penalty: 0 });

  if (v.T06b === "info" || v.T06b === "warning")
    flags.push({ id: "F33", severity: "info", label: "Elevated Quick Exit Rate", penalty: 0 });

  const r10val = v.R10;
  const incidents = typeof r10val === "number" ? r10val : (r10val && typeof r10val === "object" ? (r10val["90d"] ?? 0) : 0);
  if (incidents > 0)
    flags.push({ id: "R10_flag", severity: "critical", label: `${incidents} Incident${incidents > 1 ? "s" : ""} (90d)`, penalty: 0 });

  const p08raw = v.P08;
  const ddVal = typeof p08raw === "number" ? p08raw
    : (p08raw && typeof p08raw === "object" ? (p08raw["90d"] ?? p08raw["30d"] ?? 0) : 0);
  if (ddVal < -10)
    flags.push({ id: "DD_flag", severity: "critical", label: "Severe Drawdown", penalty: 0 });
  else if (ddVal < -5)
    flags.push({ id: "DD_flag", severity: "warning", label: "Elevated Drawdown", penalty: 0 });

  const quickExit = typeof v.T06 === "number" ? v.T06 : 0;
  if (quickExit > 25)
    flags.push({ id: "QE_flag", severity: "warning", label: "High Quick Exit Rate", penalty: 0 });

  const top5r = typeof v.R09_top5 === "number" ? v.R09_top5 : 0;
  const top1r = typeof v.R09_top1 === "number" ? v.R09_top1 : 0;
  const top5 = top5r > 1 ? top5r / 100 : top5r;
  const top1 = top1r > 1 ? top1r / 100 : top1r;
  if (v.R09_top5_flag === "critical" || top5 >= 0.8)
    flags.push({ id: "CONC_flag", severity: "critical", label: "High Concentration (Top 5)", penalty: 0 });
  else if (v.R09_top5_flag === "warning" || top5 >= 0.5)
    flags.push({ id: "CONC_flag", severity: "warning", label: "Concentrated Deposits (Top 5)", penalty: 0 });
  if (v.R09_top1_flag === "critical" || top1 >= 0.5)
    flags.push({ id: "CONC1_flag", severity: "critical", label: "Single Depositor ≥50%", penalty: 0 });

  return flags;
}

function inferRisk(v) {
  let score = 0;
  if (v.R02_depeg) score += 3;
  // Skip C03 when C01=0 but snapshots have real TVL (C03 severity is unreliable)
  const c03Unreliable = (v.C01 === 0 || !v.C01) && Array.isArray(v.snapshots) && v.snapshots.length > 0 && v.snapshots[v.snapshots.length - 1]?.total_assets_usd > 0;
  if (v.C03 && !c03Unreliable) score += 3;
  if (v.R05) score += 3;
  if (v.P02) score += 1;
  if (v.C08_low_dep) score += 1;
  if (v.T02 === "critical") score += 2;
  else if (v.T02 === "warning") score += 1;
  const depCount = v.C07 || 0;
  const age = v.D01 || 0;
  if (age < 30) score += 1;
  if (depCount < 50) score += 1;
  const top5 = typeof v.R09_top5 === "number" ? v.R09_top5 : 0;
  const top1 = typeof v.R09_top1 === "number" ? v.R09_top1 : 0;
  if (top5 >= 0.8) score += 3;
  else if (top5 >= 0.5) score += 2;
  if (top1 >= 0.5) score += 2;
  if (score >= 4) return "High";
  if (score >= 2) return "Medium";
  return "Low";
}

function normApy(v) {
  return typeof v === "number" ? v : v;
}

function mapVault(raw) {
  const p01raw = raw.P01 || {};
  const p01 = typeof p01raw === "object" ? { "1d": normApy(p01raw["1d"]), "7d": normApy(p01raw["7d"]), "30d": normApy(p01raw["30d"]) } : p01raw;
  const netApy = typeof raw.net_apy === "number" ? normApy(raw.net_apy) : null;
  const hasSnapshots = Array.isArray(raw.snapshots) && raw.snapshots.length > 0;
  const apy1d = typeof p01 === "object" && typeof p01["1d"] === "number" ? p01["1d"] * 100 : null;
  const apy7d = typeof p01 === "object" && typeof p01["7d"] === "number" ? p01["7d"] * 100 : null;
  const apy30d = typeof p01 === "object" && typeof p01["30d"] === "number" ? p01["30d"] * 100 : null;
  // Current APY: prefer net_apy > P01 > last snapshot
  const snapshotApy = hasSnapshots
    ? (raw.snapshots[raw.snapshots.length - 1].net_apy || 0) * 100
    : null;
  const apy = netApy !== null ? netApy * 100 : (typeof raw.P01 === "number" ? normApy(raw.P01) * 100 : (apy7d || snapshotApy || 0));
  // Weekly = P01 7d, Monthly = P01 30d, All Time = all_time_apy from API
  const weeklyApy = raw.weekly_apy ? normApy(raw.weekly_apy) * 100 : (apy7d !== null ? apy7d : apy);
  const monthlyApy = raw.monthly_apy ? normApy(raw.monthly_apy) * 100 : (apy30d !== null ? apy30d : apy);
  const allTimeApy = typeof raw.all_time_apy === "number" ? normApy(raw.all_time_apy) * 100 : apy;
  const tvl = getTvlUsd(raw);
  const depositors = raw.C07 || 0;
  const age = raw.D01 || raw.D03 || 0;
  const chain = CHAIN_NAMES[raw.chain_id] || `Chain ${raw.chain_id}`;
  const asset = (raw.asset || "usdc").toUpperCase();
  const assetLower = (raw.asset || "usdc").toLowerCase();
  const assetType = getAssetType(assetLower);
  const icon = ASSET_ICONS[assetLower] || "💎";
  const risk = inferRisk(raw);

  const riskColors = {
    Low: "#1a9d3f",
    Medium: "#b8960a",
    High: "#d93636",
  };

  const p10 = raw.P10 || { organic_pct: 100, incentive_pct: 0 };
  const incRatio = Math.round(p10.incentive_pct || 0);
  const yieldType =
    raw.P12 === "Incentivized Yield" ? "incentivized" : "real";

  const sharpe =
    raw.P05 === "Insufficient Data"
      ? null
      : typeof raw.P05 === "number"
        ? raw.P05
        : null;
  const p08 = raw.P08 || {};
  const maxDD30d = typeof p08 === "object" && typeof p08["30d"] === "number" ? p08["30d"] : null;
  const maxDD90d = typeof p08 === "object" && typeof p08["90d"] === "number" ? p08["90d"] : null;
  const maxDD365d = typeof p08 === "object" && typeof p08["365d"] === "number" ? p08["365d"] : null;
  const maxDD = raw.P08 === "Insufficient Data" ? null
    : typeof raw.P08 === "number" ? raw.P08
    : (maxDD90d !== null ? maxDD90d : maxDD30d);
  const sortino =
    raw.P06 === "Insufficient Data"
      ? null
      : typeof raw.P06 === "number"
        ? raw.P06
        : null;

  const p03 = raw.P03 || {};
  const apyVsBench1d = typeof p03 === "object" && typeof p03["1d"] === "number" ? p03["1d"] : null;
  const apyVsBench7d = typeof p03 === "object" && typeof p03["7d"] === "number" ? p03["7d"] : null;
  const apyVsBench30d = typeof p03 === "object" && typeof p03["30d"] === "number" ? p03["30d"] : null;
  const apyVsBenchmark = typeof raw.P03 === "number" ? raw.P03
    : (apyVsBench7d !== null ? apyVsBench7d : null);

  const benchAave = raw.benchmark_aave_apy
    ? raw.benchmark_aave_apy * 100
    : null;
  const benchLido = raw.benchmark_lido_apy
    ? raw.benchmark_lido_apy * 100
    : null;

  const retentionObj = raw.T01 || {};
  const retention30d =
    typeof retentionObj === "object" ? retentionObj["30d"] : retentionObj;
  const capRet =
    typeof retention30d === "number" ? Math.round(retention30d) : null;
  const capitalRetention = typeof retentionObj === "object"
    ? { "30d": retentionObj["30d"] ?? null, "365d": retentionObj["365d"] ?? null }
    : { "30d": typeof retentionObj === "number" ? retentionObj : null, "365d": null };

  const activityObj = raw.T03 || {};
  const activityRate =
    typeof activityObj === "object" ? activityObj["30d"] : activityObj;
  const userRetention = typeof activityObj === "object"
    ? { "30d": activityObj["30d"] ?? null, "365d": activityObj["365d"] ?? null }
    : { "30d": typeof activityObj === "number" ? activityObj : null, "365d": null };

  const avgHold = typeof raw.T04 === "number" ? Math.round(raw.T04) : null;
  const quickExitRate = typeof raw.T06 === "number" ? raw.T06 : null;
  const holders90plus = typeof raw.T07 === "number" ? raw.T07 : null;
  const avgDepDuration = typeof raw.T09 === "number" ? raw.T09 : null;
  const netDep30d = typeof raw.T10 === "number" ? raw.T10 : null;

  const top1 =
    typeof raw.R09_top1 === "number"
      ? Math.round(raw.R09_top1 > 1 ? raw.R09_top1 : raw.R09_top1 * 100)
      : null;
  const top5 =
    typeof raw.R09_top5 === "number"
      ? Math.round(raw.R09_top5 > 1 ? raw.R09_top5 : raw.R09_top5 * 100)
      : null;

  const flags = deriveFlags(raw);
  const critFlags = flags.filter((f) => f.severity === "critical").length;
  const warnFlags = flags.filter((f) => f.severity === "warning").length;

  const capScore = calcCapitalScore(raw);
  const perfScore = calcPerformanceScore(raw);
  const riskScore = calcRiskScore(raw);
  const trustScore = calcTrustScore(raw);

  const conf = getConfidence(age);
  const flagPenalty = flags.reduce((sum, f) => sum + (f.penalty || 0), 0);
  const extBonus = calcExternalRatingBonus(raw.T14);

  const rawScore = (capScore * 0.20 + perfScore * 0.20 + riskScore * 0.35 + trustScore * 0.25) * conf + flagPenalty + extBonus;
  const yieldoScore = Math.max(0, Math.min(100, Math.round(rawScore)));

  const subScores = {
    capital: Math.max(0, Math.min(100, Math.round(capScore))),
    performance: Math.max(0, Math.min(100, Math.round(perfScore))),
    risk: Math.max(0, Math.min(100, Math.round(riskScore))),
    trust: Math.max(0, Math.min(100, Math.round(trustScore))),
  };

  const curator = raw.curator || null;
  const curatorName = raw.curator_name || (curator && !curator.startsWith("0x") ? curator : null) || "Unknown";

  const c02 = raw.C02 || {};
  // When C01=0 but snapshots have real TVL, C02 -100% values are unreliable
  const c02Unreliable = (raw.C01 === 0 || !raw.C01) && Array.isArray(raw.snapshots) && raw.snapshots.length > 0 && raw.snapshots[raw.snapshots.length - 1]?.total_assets_usd > 0;
  const tvlChange1d =
    c02Unreliable ? null : (typeof c02 === "object" && typeof c02["1d"] === "number" ? c02["1d"] : null);
  const tvlChange7d =
    c02Unreliable ? null : (typeof c02 === "object" && typeof c02["7d"] === "number" ? c02["7d"] : null);
  const tvlChange30d =
    c02Unreliable ? null : (typeof c02 === "object" && typeof c02["30d"] === "number"
      ? c02["30d"]
      : null);

  const c04 = raw.C04 || {};
  const netFlow1d =
    typeof c04 === "object" && typeof c04["1d"] === "number" ? c04["1d"] : null;
  const netFlow7d =
    typeof c04 === "object" && typeof c04["7d"] === "number" ? c04["7d"] : null;
  const netFlow30d =
    typeof c04 === "object" && typeof c04["30d"] === "number" ? c04["30d"] : null;

  return {
    id: raw.vault_id,
    vault_address: raw.vault_address,
    name: raw.vault_name,
    asset,
    assetLower,
    assetType,
    protocol: raw.source || "Morpho",
    curator: curatorName,
    chain,
    chain_id: raw.chain_id,
    strategy: "Lending",
    risk,
    riskC: riskColors[risk],
    apy,
    apy1d,
    apy7d,
    apy30d,
    monthlyApy,
    weeklyApy,
    allTimeApy,
    yieldoScore,
    tvl,
    depositors,
    age,
    icon,
    hasCampaign: false,
    campaignBonus: null,
    campaignType: null,
    apyHistory: [],
    flags,
    critFlags,
    warnFlags,
    yieldType,
    incRatio,
    subScores,
    conf,
    maxDD: maxDD !== null ? maxDD : 0,
    maxDD30d,
    maxDD90d,
    maxDD365d,
    sharpe: sharpe !== null ? sharpe : 0,
    sortino,
    capRet: capRet !== null ? capRet : 0,
    avgHold: avgHold !== null ? avgHold : 0,
    top1,
    top5: top5 !== null ? top5 : 0,
    extScores: {
      Bluechip: false,
      Credora: false,
      "DeFi Safety": false,
      Exponential: false,
    },
    apyVsBenchmark,
    apyVsBench1d,
    apyVsBench7d,
    apyVsBench30d,
    benchAave,
    benchLido,
    tvlChange1d,
    tvlChange7d,
    tvlChange30d,
    netFlow1d,
    netFlow7d,
    netFlow30d,
    netDep30d,
    quickExitRate,
    holders90plus,
    avgDepDuration,
    activityRate: typeof activityRate === "number" ? activityRate : null,
    retention30d,
    capitalRetention,
    userRetention,
    withdrawalType: raw.R06 || "Instant",
    pendingWithdrawals: typeof raw.R07 === "number" ? raw.R07 : (raw.R07?.value ?? null),
    pendingWithdrawalsFlag: raw.R08 === true || raw.R08 === "critical" ? "critical" : raw.R08 === "warning" ? "warning" : undefined,
    pauseEvents: typeof raw.R03 === "number" ? raw.R03 : (raw.R03 && typeof raw.R03 === "object" ? (raw.R03["365d"] ?? raw.R03["90d"] ?? 0) : 0),
    depegEvents: raw.R02_depeg ? 1 : 0,
    incidentCount: typeof raw.R10 === "number" ? { "90d": raw.R10, "365d": raw.R10 } : (raw.R10 && typeof raw.R10 === "object" ? { "90d": raw.R10["90d"] ?? 0, "365d": raw.R10["365d"] ?? 0 } : { "90d": 0, "365d": 0 }),
    assetPrice: raw.R01 || null,
    vol24h: raw.vol_24h || null,
    fee: raw.fee != null ? (raw.fee > 1 ? raw.fee : raw.fee * 100) : null,
    timelock: raw.timelock || 0,
    maturity: raw.D02 || "Unknown",
    P03b: raw.P03b,
    P03c: raw.P03c,
    P04: raw.P04,
    P07: raw.P07,
    P09: raw.P09,
    T06b: raw.T06b,
    T10b: raw.T10b,
    T14: raw.T14,
    D03: raw.D03,
    D04: raw.D04,
    C01: raw.C01,
    C01_raw: raw.C01_raw,
    C04: raw.C04,
    C06: raw.C06,
    owner: raw.owner,
    guardian: raw.guardian,
    supply_queue_length: raw.supply_queue_length,
    withdraw_queue_length: raw.withdraw_queue_length,
    share_supply: raw.share_supply,
    nav: raw.nav,
    creation_date: raw.creation_date,
    timestamp: raw.timestamp,
    rewards: raw.rewards,
    flow_history: raw.flow_history,
    tvlSpark: Array.isArray(raw.tvl_spark) && raw.tvl_spark.length > 1 ? raw.tvl_spark : null,
    _raw: raw,
  };
}

export {
  scoreTVL, scoreTVLVelocity, scoreDepositors, scorePendingWithdrawals,
  scoreNetFlows7d, scoreDepositLatency, scoreSharpe, scoreSortino,
  scoreMaxDrawdown, scoreDrawdownDuration, scoreYieldComposition,
  scoreAPYvsBenchmark, scoreIncidents, scoreDepegRisk, scoreConcentration,
  scoreCapitalRetention, scoreAvgDepositDuration, scoreHolders90Plus,
  scoreNetDepositors, scoreNetFlowDirection, scoreQuickExitRate,
  scoreUserRetention, getConfidence, calcExternalRatingBonus,
  getTvlUsd, getAssetType,
};

export function useVaults() {
  const [vaults, setVaults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const HIDDEN_VAULT_NAMES = [
      "Hyperliquidity Provider",
      "HyperGrowth",
      "Growi HF",
      "Not In Employment Education or Training",
      "drkmttr",
      "Bitcoin Moving Average Long/Short",
      "Systemic Strategies",
      "Orbit Value Strategies",
      "Ultron",
    ];
    const isHidden = (v) =>
      (v.source && v.source.toLowerCase() === "hyperliquid") ||
      (v.vault_name &&
        HIDDEN_VAULT_NAMES.some((name) => v.vault_name.includes(name)));

    const cached = getCache(CACHE_KEY);
    if (cached) {
      setVaults(cached.filter((v) => !isHidden(v)).map(mapVault));
      setLoading(false);
      return;
    }

    fetch("/api/vaults")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setCache(CACHE_KEY, data);
        setVaults(data.filter((v) => !isHidden(v)).map(mapVault));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { vaults, loading, error };
}

export function useVaultDetail(vaultId) {
  const [vault, setVault] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!vaultId) return;
    const cacheKey = CACHE_DETAIL_PREFIX + vaultId;
    const cached = getCache(cacheKey);
    if (cached) {
      setVault(mapVault(cached));
      setLoading(false);
      return;
    }

    fetch(`/api/vaults/${encodeURIComponent(vaultId)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setCache(cacheKey, data);
        const mapped = mapVault(data);
        if (data.snapshots) {
          mapped.apyHistory = data.snapshots.map(
            (s) => (s.net_apy || 0) * 100
          );
          mapped.tvlHistory = data.snapshots.map(
            (s) => s.total_assets_usd || 0
          );
          mapped.snapshots = data.snapshots;
        }
        setVault(mapped);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [vaultId]);

  return { vault, loading, error };
}
