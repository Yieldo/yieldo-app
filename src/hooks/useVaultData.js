import { useState, useEffect } from "react";

const CACHE_KEY = "yieldo_vaults_cache";
const CACHE_DETAIL_PREFIX = "yieldo_vault_detail_";
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

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
    // storage full - clear old caches
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
  999: "Hyperliquid",
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
  if (["wbtc", "cbbtc", "lbtc"].includes(a)) return "btc";
  return "other";
}

function deriveFlags(v) {
  const flags = [];
  if (v.R02_depeg)
    flags.push({ id: "F03", severity: "critical", label: "Severe Depeg" });
  if (v.C03)
    flags.push({ id: "F04", severity: "critical", label: "TVL Crash" });
  if (v.C05)
    flags.push({ id: "F09", severity: "critical", label: "Capital Flight" });
  if (v.P02)
    flags.push({ id: "F15", severity: "warning", label: "Negative APY" });
  if (v.P11 === true || v.P11 === "critical")
    flags.push({
      id: "F07",
      severity: "critical",
      label: "High Incentive Dep.",
    });
  else if (v.P11 === "warning")
    flags.push({ id: "F17", severity: "warning", label: "High Incentive" });
  if (v.P03b)
    flags.push({
      id: "F10",
      severity: "warning",
      label: "Below Benchmark APY",
    });
  if (v.T02 === "critical")
    flags.push({
      id: "F19",
      severity: "critical",
      label: "Retention Declining",
    });
  else if (v.T02 === "warning")
    flags.push({
      id: "F19",
      severity: "warning",
      label: "Retention Declining",
    });
  if (v.T05_short_hold === true || v.T05_short_hold === "critical")
    flags.push({ id: "F20", severity: "critical", label: "Short Holding" });
  else if (v.T05_short_hold === "warning")
    flags.push({ id: "F20", severity: "warning", label: "Short Holding" });
  if (v.C08_low_dep)
    flags.push({
      id: "F08",
      severity: "warning",
      label: "Low Depositors (<10)",
    });
  if (v.R05)
    flags.push({ id: "F05", severity: "critical", label: "Emergency Event" });
  if (v.D02 === "New Vault")
    flags.push({ id: "F23", severity: "info", label: "New Vault" });
  else if (v.D02 === "Establishing")
    flags.push({ id: "F24", severity: "info", label: "Early Vault" });
  if (v.R06 === "Async")
    flags.push({
      id: "F25",
      severity: "info",
      label: "Async Withdrawals",
    });
  if (v.P12 === "Incentivized Yield")
    flags.push({
      id: "F22",
      severity: "info",
      label: "Incentivized Yield",
    });
  return flags;
}

function inferRisk(v) {
  let score = 0;
  if (v.R02_depeg) score += 3;
  if (v.C03) score += 3;
  if (v.R05) score += 3;
  if (v.P02) score += 1;
  if (v.C08_low_dep) score += 1;
  if (v.T02 === "critical") score += 2;
  else if (v.T02 === "warning") score += 1;
  const depCount = v.C07 || 0;
  const age = v.D01 || 0;
  if (age < 30) score += 1;
  if (depCount < 50) score += 1;
  if (score >= 4) return "High";
  if (score >= 2) return "Medium";
  return "Low";
}

function mapVault(raw) {
  const apy = (raw.P01 || 0) * 100;
  const monthlyApy = raw.monthly_apy ? raw.monthly_apy * 100 : apy;
  const weeklyApy = raw.weekly_apy ? raw.weekly_apy * 100 : apy;
  const allTimeApy = raw.all_time_apy ? raw.all_time_apy * 100 : apy;
  const tvl = raw.C01_USD || 0;
  const depositors = raw.C07 || 0;
  const age = raw.D01 || 0;
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
  const maxDD =
    raw.P08 === "Insufficient Data"
      ? null
      : typeof raw.P08 === "number"
        ? raw.P08
        : null;
  const sortino =
    raw.P06 === "Insufficient Data"
      ? null
      : typeof raw.P06 === "number"
        ? raw.P06
        : null;

  const apyVsBenchmark =
    typeof raw.P03 === "number" ? raw.P03 : null;

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

  const activityObj = raw.T03 || {};
  const activityRate =
    typeof activityObj === "object" ? activityObj["30d"] : activityObj;

  const avgHold = typeof raw.T04 === "number" ? Math.round(raw.T04) : null;
  const quickExitRate = typeof raw.T06 === "number" ? raw.T06 : null;
  const holders90plus = typeof raw.T07 === "number" ? raw.T07 : null;
  const avgDepDuration = typeof raw.T09 === "number" ? raw.T09 : null;
  const netDep30d = typeof raw.T10 === "number" ? raw.T10 : null;

  const top1 =
    typeof raw.R09_top1 === "number"
      ? Math.round(raw.R09_top1 * 100)
      : null;
  const top5 =
    typeof raw.R09_top5 === "number"
      ? Math.round(raw.R09_top5 * 100)
      : null;

  const flags = deriveFlags(raw);
  const critFlags = flags.filter((f) => f.severity === "critical").length;
  const warnFlags = flags.filter((f) => f.severity === "warning").length;

  // Derive a rough score from available metrics
  let yieldoScore = 50;
  if (risk === "Low") yieldoScore += 15;
  else if (risk === "High") yieldoScore -= 15;
  if (capRet !== null) yieldoScore += Math.max(0, (capRet - 50) / 5);
  if (age >= 90) yieldoScore += 5;
  if (critFlags > 0) yieldoScore -= critFlags * 10;
  if (warnFlags > 0) yieldoScore -= warnFlags * 3;
  if (depositors > 100) yieldoScore += 5;
  if (yieldType === "real") yieldoScore += 5;
  yieldoScore = Math.max(5, Math.min(99, Math.round(yieldoScore)));

  const conf = age < 14 ? 0.5 : age < 30 ? 0.65 : age < 60 ? 0.8 : age < 90 ? 0.9 : 1;
  const subScores = {
    capital: Math.max(10, Math.min(100, Math.round(yieldoScore + (depositors > 100 ? 5 : -10) + (tvl > 1e6 ? 5 : -5)))),
    performance: Math.max(10, Math.min(100, Math.round(yieldoScore + (apy > 5 ? 5 : -5) + (sharpe !== null && sharpe > 1 ? 10 : 0)))),
    risk: Math.max(10, Math.min(100, Math.round(yieldoScore + (risk === "Low" ? 15 : risk === "High" ? -20 : 0) - critFlags * 5))),
    trust: Math.max(10, Math.min(100, Math.round(yieldoScore + (capRet !== null && capRet > 70 ? 10 : 0) + (avgHold !== null && avgHold > 30 ? 5 : 0)))),
  };

  const curator = raw.curator || null;
  const curatorName = raw.curator_name || curator || "Unknown";

  const c02 = raw.C02 || {};
  const tvlChange7d =
    typeof c02 === "object" && typeof c02["7d"] === "number" ? c02["7d"] : null;
  const tvlChange30d =
    typeof c02 === "object" && typeof c02["30d"] === "number"
      ? c02["30d"]
      : null;

  return {
    id: raw.vault_id,
    vault_address: raw.vault_address,
    name: raw.vault_name,
    asset,
    assetLower,
    assetType,
    platform: "Morpho",
    curator: curatorName,
    chain,
    chain_id: raw.chain_id,
    strategy: "Lending",
    risk,
    riskC: riskColors[risk],
    apy,
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
    benchAave,
    benchLido,
    tvlChange7d,
    tvlChange30d,
    netDep30d,
    quickExitRate,
    holders90plus,
    avgDepDuration,
    activityRate: typeof activityRate === "number" ? activityRate : null,
    retention30d,
    withdrawalType: raw.R06 || "Instant",
    pauseEvents: raw.R03 || 0,
    depegEvents: raw.R02_depeg ? 1 : 0,
    incidentCount: raw.R10 || 0,
    assetPrice: raw.R01 || null,
    vol24h: raw.vol_24h || null,
    fee: raw.fee || null,
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
    // raw data for detail page
    _raw: raw,
  };
}

export function useVaults() {
  const [vaults, setVaults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const cached = getCache(CACHE_KEY);
    if (cached) {
      setVaults(cached.map(mapVault));
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
        setVaults(data.map(mapVault));
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
        // attach snapshot history
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
