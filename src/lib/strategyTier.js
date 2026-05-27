// Strategy Tier classifier — mirrors the spec in yieldo-strategy-tier-spec.md.
//
// A vault's tier (T1 Direct / T2 Active / T3 Leveraged) is a pure function of
// its current on-chain allocation breakdown (`metrics.allocations`, sourced by
// the indexer from each protocol's API). We compute it client-side from the
// authoritative allocation data already in the API response — there is no
// backend tier field to defer to (yet), so this is the source of truth for
// display. If the indexer later stores a tier, prefer it the same way
// useVaultData prefers backend scores.
//
// Coverage: only ~74/100 vaults expose allocation data. Vaults with
// coverage "none" (Midas/Lagoon/Upshift/Lido/Morpho-V2/Accountable) return
// tier null → the UI shows "—" rather than guessing.

// Tier metadata (labels/desc/bar-count). Colors live in the UI layer so this
// stays render-agnostic; T1→3 bars, T2→2, T3→1 (more bars = safer).
export const TIER_META = {
  T1: {
    label: "Direct",
    fullLabel: "Direct Yield",
    bars: 3,
    desc: "Yield-bearing stables or blue-chip money-market lending. No leverage, no LP, no looping.",
  },
  T2: {
    label: "Active",
    fullLabel: "Active Strategy",
    bars: 2,
    desc: "LP positions, basis trades, RWA wrappers, Pendle PT, or yield-bearing collateral. No recursive leverage.",
  },
  T3: {
    label: "Leveraged",
    fullLabel: "Leveraged / Looped",
    bars: 1,
    desc: "Recursive borrowing, leveraged LPs, or supply into markets backed by looped collateral. Returns amplified by debt.",
  },
};

// Tokens that are themselves leveraged/looped exposures (the spec's
// LEVERAGED_ASSET_REGISTRY). Matched as substrings so PT wrappers
// (e.g. "PT-sUSDe-5MAR") resolve to their leveraged underlying.
const LEVERAGED_SUBSTR = [
  "susde",   // Ethena staked USDe — basis trade
  "usde",    // USDe + PT-USDe
  "weeth",   // ether.fi LRT
  "eeth",    // ether.fi LRT (eETH / PT-eETH)
  "ezeth",   // Renzo LRT
  "rseth",   // Kelp LRT
  "reusd",   // Resolv looped
  "rlp",     // recursive LP wrappers
];

// Yield-bearing but NOT leveraged collateral (the spec's T2 signal). These
// earn an underlying rate (savings rate / RWA) without recursive leverage.
const YIELD_BEARING_SUBSTR = [
  "susds", "usds",   // Sky savings
  "sdai",            // DAI savings
  "sfrax", "sfrxusd",
  "sdola",
  "scrvusd",
  "syrup",           // Maple syrupUSD
  "pt-usds", "pt-usdc",
];

const lc = (s) => (s || "").toLowerCase();
const hasAny = (s, list) => { const x = lc(s); return list.some((sub) => x.includes(sub)); };

const isLeveraged = (asset) => hasAny(asset, LEVERAGED_SUBSTR);
const isYieldBearing = (asset) => hasAny(asset, YIELD_BEARING_SUBSTR);
const isLoopedName = (name) => /\b(loop|looped|lever)/i.test(name || "");

// Map a position's mechanical `kind` to the Option-2 composition bucket.
// "lending" = supplied into a lending market or savings rate; "held" = idle
// cash on the vault; "other" = strategy/LP/PT/RWA/structured.
export function positionType(kind) {
  switch (kind) {
    case "lending_market":
    case "dsr":
      return "lending";
    case "cash":
      return "held";
    default: // protocol_position, rwa, native_staking, unknown
      return "other";
  }
}

const pct = (p) => Number(p?.supply_pct) || 0;

// Derive the tier + composition from an allocation payload.
//   alloc: { total_usd, positions:[...], coverage } | null
// Returns null when there's no usable allocation data.
export function deriveStrategyTier(alloc, asset = "") {
  const positions = alloc && Array.isArray(alloc.positions) ? alloc.positions : [];
  const coverage = alloc?.coverage || "none";
  if (!positions.length || coverage === "none") return null;

  let lendingPct = 0, heldPct = 0, otherPct = 0;
  let leveragedPct = 0, yieldBearingPct = 0, loopOtherPct = 0, strategyPct = 0;

  for (const p of positions) {
    const share = pct(p);
    const type = positionType(p.kind);
    if (type === "lending") {
      lendingPct += share;
      if (isLeveraged(p.collateral)) leveragedPct += share;
      else if (isYieldBearing(p.collateral)) yieldBearingPct += share;
    } else if (type === "held") {
      heldPct += share;
    } else {
      otherPct += share;
      strategyPct += share;
      if (isLoopedName(p.name) || isLeveraged(p.name)) loopOtherPct += share;
    }
  }
  // A looped strategy position is also leverage exposure.
  leveragedPct += loopOtherPct;

  // 5-rule classifier (first match wins). We can't see vault-held debt, so
  // RULE 1 (vault holds debt → T3) never fires for these curator vaults.
  let tier, rule;
  if (leveragedPct > 30 || loopOtherPct > 30 || (strategyPct > 50 && leveragedPct > 10)) {
    tier = "T3"; rule = "LEVERAGED_COLLATERAL";
  } else if (strategyPct >= 20 || yieldBearingPct >= 30 || leveragedPct > 10) {
    tier = "T2"; rule = "STRATEGY_MIDRANGE";
  } else {
    tier = "T1"; rule = "DIRECT_YIELD";
  }

  const composition = {
    lendingPct: Math.round(lendingPct),
    heldPct: Math.round(heldPct),
    otherPct: Math.round(otherPct),
    strategyPct: Math.round(strategyPct),
    leveragedPct: Math.round(leveragedPct),
    yieldBearingPct: Math.round(yieldBearingPct),
  };

  return {
    tier,
    rule,
    coverage,
    composition,
    positionCount: positions.filter((p) => positionType(p.kind) !== "held").length,
    oneLiner: buildOneLiner(tier, composition, positions, asset),
  };
}

// Top contributing position names of a given bucket, for the one-liner.
function topNames(positions, predicate, n = 2) {
  return positions
    .filter(predicate)
    .sort((a, b) => pct(b) - pct(a))
    .slice(0, n)
    .map((p) => p.name)
    .filter(Boolean);
}

function buildOneLiner(tier, comp, positions, asset) {
  const A = (asset || "the asset").toUpperCase();
  if (tier === "T1") {
    return `${comp.lendingPct || 100}% supplied into ${A} lending markets. Strategy exposure under 20%, no looped-collateral markets, no debt on the vault.`;
  }
  if (tier === "T2") {
    if (comp.strategyPct >= 20) {
      const names = topNames(positions, (p) => positionType(p.kind) === "other");
      const list = names.length ? ` (${names.join(", ")})` : "";
      return `${comp.strategyPct}% in active strategy positions${list}. Collateral is yield-bearing but not leveraged. No recursive debt on the vault.`;
    }
    return `${comp.yieldBearingPct}% supplied into markets with yield-bearing collateral (savings rates, RWA). Yield-bearing but not leveraged — no recursive debt.`;
  }
  // T3
  const lev = topNames(
    positions,
    (p) => (positionType(p.kind) === "lending" && isLeveraged(p.collateral)) || isLoopedName(p.name)
  );
  const list = lev.length ? ` (${lev.join(", ")})` : "";
  const headline = comp.leveragedPct >= comp.strategyPct ? comp.leveragedPct : comp.strategyPct;
  return `${headline}% in PT/strategy positions or markets backed by looped collateral${list}. Returns depend on looper solvency.`;
}
