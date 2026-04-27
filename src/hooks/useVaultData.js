import { useState, useEffect } from "react";
// Scoring lives in a shared module so the same logic powers both the React
// app and the server-rendered embed badge (api/badge/[vaultId].js).
import {
  getAssetType, getTvlUsd, getTrustBoost,
  scoreTVL, scoreTVLVelocity, scoreDepositors, scorePendingWithdrawals,
  scoreNetFlows7d, scoreDepositLatency,
  scoreSharpe, scoreWinRate, scoreWorstWeek, scoreAlphaConsistency,
  scoreMaxDrawdown, scoreDrawdownDuration, scoreYieldComposition,
  scoreAPYvsBenchmark, scoreSortino,
  scoreIncidents, scoreDepegRisk, scoreWithdrawalLatency, scoreTimelock,
  scoreConcentration,
  scoreHoldRatio, scoreCapitalRetention, scoreAvgDepositDuration,
  scoreHolders90Plus, scoreNetDepositors, scoreNetFlowDirection,
  scoreQuickExitRate, scoreUserRetention,
  calcCapitalScore, calcPerformanceScore, calcRiskScore, calcTrustScore,
  getConfidence, calcExternalRatingBonus, deriveFlags,
} from "../lib/scoring.js";

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
  eurcv: "💵",
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
  // Concentration not included in risk label — shown as separate flags only
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
  const winRate =
    raw.P06 === "Insufficient Data"
      ? null
      : typeof raw.P06 === "number"
        ? raw.P06
        : null;
  const worstWeek =
    raw.P07 === "Insufficient Data"
      ? null
      : typeof raw.P07 === "number"
        ? raw.P07
        : null;
  const alphaConsistency =
    raw.P13 === "Insufficient Data"
      ? null
      : typeof raw.P13 === "number"
        ? raw.P13
        : null;
  const perfDetail = raw.perf_detail || null;

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

  const tvlUsd = getTvlUsd(raw);
  const depositorCount = raw.C07 || 0;

  const capScore = calcCapitalScore(raw);
  const perfScore = calcPerformanceScore(raw);
  const riskScore = calcRiskScore(raw);
  const trustRaw = calcTrustScore(raw);
  const trustBoost = getTrustBoost(tvlUsd, depositorCount);
  const trustScore = Math.min(100, trustRaw * trustBoost);

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
    paused: !!raw.paused,
    paused_reason: raw.paused_reason || null,
    unsupported: !!raw.unsupported,
    unsupported_reason: raw.unsupported_reason || null,
    apy1d,
    apy7d,
    apy30d,
    monthlyApy,
    weeklyApy,
    allTimeApy,
    yieldoScore,
    trustBoost,
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
    winRate,
    worstWeek,
    alphaConsistency,
    perfDetail,
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
    T11: typeof raw.T11 === "number" ? raw.T11 : null,
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
  scoreWinRate, scoreWorstWeek, scoreAlphaConsistency,
  scoreMaxDrawdown, scoreDrawdownDuration, scoreYieldComposition,
  scoreAPYvsBenchmark, scoreIncidents, scoreDepegRisk, scoreConcentration,
  scoreWithdrawalLatency, scoreTimelock, scoreHoldRatio, scoreCapitalRetention,
  scoreAvgDepositDuration, scoreHolders90Plus, scoreNetDepositors, scoreNetFlowDirection,
  scoreQuickExitRate, scoreUserRetention, getConfidence,
  calcExternalRatingBonus, getTrustBoost, getTvlUsd, getAssetType,
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
          mapped.apyDates = data.snapshots.map(
            (s) => s.date || ""
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
