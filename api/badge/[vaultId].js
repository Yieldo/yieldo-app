// Embeddable Yieldo score badge — public, cacheable, drop-in.
//
// Usage:
//   <img src="https://app.yieldo.xyz/api/badge/<vault_id>.svg" alt="Yieldo Score" width="220">
//   <iframe src="https://app.yieldo.xyz/api/badge/<vault_id>.svg" width="220" height="68" frameborder="0"></iframe>
//
// vault_id is the chain-prefixed address, e.g. "1:0xbeef01735c132ada46aa9aa4c54623caa92a64cb"
//
// Query params:
//   ?theme=dark      -> dark variant (default light)
//   ?style=compact   -> 220×68 compact (default)
//   ?style=detailed  -> 320×120 with sub-scores
//
// Score algorithm: simplified composite (TVL + APY + risk + trust signals) — NOT
// identical to the full in-app score yet. Numbers are within ~5pts of the React
// computation. Consolidating to a single source-of-truth scoring module is on
// the roadmap; this endpoint will pick that up automatically when it lands.

import { applyVaultOverrides } from "../_vault-overrides.js";
import { MongoClient } from "mongodb";

let cachedClient = null;
async function getDb() {
  if (cachedClient) return cachedClient.db("yieldo_v1");
  cachedClient = await new MongoClient(process.env.MONGO_URI).connect();
  return cachedClient.db("yieldo_v1");
}

// Range helpers — clamp + linear interpolate to a 0-100 score
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const linear = (v, vMin, vMax, sMin = 0, sMax = 100) => {
  if (v <= vMin) return sMin;
  if (v >= vMax) return sMax;
  return sMin + ((v - vMin) / (vMax - vMin)) * (sMax - sMin);
};

function computeScore(raw) {
  // Simplified version of the React-app scoring. Same 4 dimensions,
  // same weights (Capital 0.20, Perf 0.20, Risk 0.35, Trust 0.25), but
  // computes each dimension from a small subset of metrics.
  const tvl = (raw.C01 || (raw.snapshots?.[raw.snapshots.length - 1]?.total_assets_usd) || 0);
  const dep = raw.C07 || 0;
  const apy = typeof raw.P01 === "number" ? raw.P01 : 0;
  const sharpe = typeof raw.P05 === "number" ? raw.P05 : null;

  // Capital: log-scaled TVL + depositor count
  const tvlScore = tvl > 0 ? clamp(linear(Math.log10(tvl), 4, 9, 30, 100), 0, 100) : 0;
  const depScore = dep > 0 ? clamp(linear(Math.log10(dep), 0, 4, 30, 100), 0, 100) : 0;
  const capScore = tvlScore * 0.6 + depScore * 0.4;

  // Performance: APY + Sharpe-ish
  const apyScore = clamp(linear(apy, 0, 15, 30, 100), 0, 100);
  const sharpeScore = sharpe == null ? 50 : clamp(linear(sharpe, 0, 2.5, 30, 100), 0, 100);
  const perfScore = apyScore * 0.6 + sharpeScore * 0.4;

  // Risk: invert depeg/incidents/concentration into a "safety" score (high = safe)
  const r10 = raw.R10;
  const incidents = typeof r10 === "number" ? r10 : (r10 && typeof r10 === "object" ? (r10["90d"] ?? 0) : 0);
  const top5raw = typeof raw.R09_top5 === "number" ? raw.R09_top5 : 0;
  const top5pct = top5raw > 1 ? top5raw : top5raw * 100;
  const depeg = raw.R03 > 0 || raw.R04;
  let riskScore = 90;
  if (incidents > 0) riskScore -= Math.min(40, incidents * 12);
  if (top5pct > 50) riskScore -= 15;
  if (depeg) riskScore -= 30;
  if (raw.R05) riskScore -= 50;
  riskScore = clamp(riskScore, 0, 100);

  // Trust: holders-90+ ratio + retention
  const t01 = raw.T01;
  const ret30d = t01 && typeof t01 === "object" ? t01["30d"] : (typeof t01 === "number" ? t01 : null);
  const holders90 = typeof raw.T07 === "number" ? raw.T07 : 0;
  const holderRatio = dep > 0 ? holders90 / dep : 0;
  const retScore = ret30d == null ? 50 : clamp(linear(ret30d, 0, 1, 30, 100), 0, 100);
  const holdScore = clamp(linear(holderRatio, 0, 0.5, 30, 100), 0, 100);
  const trustScore = retScore * 0.6 + holdScore * 0.4;

  const composite = capScore * 0.20 + perfScore * 0.20 + riskScore * 0.35 + trustScore * 0.25;
  return {
    score: clamp(Math.round(composite), 0, 100),
    sub: {
      capital: Math.round(capScore),
      performance: Math.round(perfScore),
      risk: Math.round(riskScore),
      trust: Math.round(trustScore),
    },
  };
}

function tierColor(score) {
  if (score >= 80) return { fg: "#16a34a", bg: "#dcfce7" }; // green
  if (score >= 60) return { fg: "#ca8a04", bg: "#fef3c7" }; // gold
  if (score >= 40) return { fg: "#d97706", bg: "#fed7aa" }; // amber
  return { fg: "#dc2626", bg: "#fee2e2" };                  // red
}

function escapeXml(s) {
  return String(s || "").replace(/[<>&"']/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c]));
}

function renderCompact({ score, vaultName, theme }) {
  const dark = theme === "dark";
  const bg = dark ? "#111827" : "#ffffff";
  const text = dark ? "#f3f4f6" : "#111827";
  const muted = dark ? "#9ca3af" : "#6b7280";
  const border = dark ? "#374151" : "#e5e7eb";
  const t = tierColor(score);
  const name = escapeXml(vaultName.length > 22 ? vaultName.slice(0, 21) + "…" : vaultName);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="68" viewBox="0 0 220 68" role="img" aria-label="Rated ${score} by Yieldo">
  <style>.t{font:600 11px -apple-system,Segoe UI,Roboto,sans-serif;letter-spacing:.04em}.n{font:600 12px -apple-system,Segoe UI,Roboto,sans-serif}.s{font:800 30px -apple-system,Segoe UI,Roboto,sans-serif;font-feature-settings:"tnum"}</style>
  <rect x="0.5" y="0.5" width="219" height="67" rx="8" fill="${bg}" stroke="${border}"/>
  <g transform="translate(12,14)">
    <rect width="22" height="22" rx="5" fill="#7A1CCB"/>
    <text x="11" y="16" text-anchor="middle" fill="#fff" font-family="-apple-system,Segoe UI,sans-serif" font-size="14" font-weight="800">Y</text>
  </g>
  <text x="42" y="22" class="t" fill="${muted}">RATED BY YIELDO</text>
  <text x="42" y="42" class="n" fill="${text}">${name}</text>
  <g transform="translate(146,8)">
    <rect width="62" height="52" rx="6" fill="${t.bg}"/>
    <text x="31" y="34" class="s" text-anchor="middle" fill="${t.fg}">${score}</text>
    <text x="31" y="48" font-family="-apple-system,Segoe UI,sans-serif" font-size="9" font-weight="700" text-anchor="middle" fill="${t.fg}" opacity=".7">/100</text>
  </g>
</svg>`;
}

function renderDetailed({ score, sub, vaultName, theme }) {
  const dark = theme === "dark";
  const bg = dark ? "#111827" : "#ffffff";
  const text = dark ? "#f3f4f6" : "#111827";
  const muted = dark ? "#9ca3af" : "#6b7280";
  const border = dark ? "#374151" : "#e5e7eb";
  const t = tierColor(score);
  const name = escapeXml(vaultName.length > 30 ? vaultName.slice(0, 29) + "…" : vaultName);
  const dim = (label, val, color) => `
    <g>
      <text font-family="-apple-system,Segoe UI,sans-serif" font-size="9" font-weight="600" fill="${muted}" letter-spacing=".06em">${label.toUpperCase()}</text>
      <text dy="13" font-family="-apple-system,Segoe UI,sans-serif" font-size="13" font-weight="700" fill="${color}">${val}</text>
    </g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="120" viewBox="0 0 320 120" role="img" aria-label="Rated ${score} by Yieldo">
  <rect x="0.5" y="0.5" width="319" height="119" rx="10" fill="${bg}" stroke="${border}"/>
  <g transform="translate(16,16)">
    <rect width="26" height="26" rx="6" fill="#7A1CCB"/>
    <text x="13" y="19" text-anchor="middle" fill="#fff" font-family="-apple-system,Segoe UI,sans-serif" font-size="16" font-weight="800">Y</text>
  </g>
  <text x="50" y="26" font-family="-apple-system,Segoe UI,sans-serif" font-size="11" font-weight="600" fill="${muted}" letter-spacing=".04em">RATED BY YIELDO</text>
  <text x="50" y="44" font-family="-apple-system,Segoe UI,sans-serif" font-size="13" font-weight="700" fill="${text}">${name}</text>
  <g transform="translate(220,14)">
    <rect width="84" height="54" rx="8" fill="${t.bg}"/>
    <text x="42" y="38" font-family="-apple-system,Segoe UI,sans-serif" font-size="32" font-weight="800" text-anchor="middle" fill="${t.fg}" font-feature-settings="tnum">${score}</text>
    <text x="42" y="50" font-family="-apple-system,Segoe UI,sans-serif" font-size="9" font-weight="700" text-anchor="middle" fill="${t.fg}" opacity=".7">/100</text>
  </g>
  <g transform="translate(16,80)">${dim("Capital", sub.capital, "#6366f1")}</g>
  <g transform="translate(86,80)">${dim("Perf",    sub.performance, "#0ea5e9")}</g>
  <g transform="translate(150,80)">${dim("Risk",   sub.risk,        "#f59e0b")}</g>
  <g transform="translate(214,80)">${dim("Trust",  sub.trust,       "#ca8a04")}</g>
</svg>`;
}

export default async function handler(req, res) {
  try {
    let { vaultId } = req.query;
    if (!vaultId) return res.status(400).send("vault_id required");
    // Strip optional .svg suffix so callers can reference /api/badge/<id>.svg
    if (vaultId.endsWith(".svg")) vaultId = vaultId.slice(0, -4);

    const db = await getDb();
    const entry = await db.collection("vaults").findOne({ _id: vaultId });
    if (!entry) return res.status(404).send("Vault not found");

    // Build a "row" similar to /api/vaults shape so we can apply overrides
    // and reuse the same metric extraction.
    const metrics = entry.metrics || {};
    const row = {
      vault_id: entry._id,
      vault_name: entry.name || (entry._id || "").slice(0, 12) + "...",
      asset: entry.asset || "usdc",
      chain_id: entry.chain_id || 1,
      snapshots: [],
    };
    for (const [k, v] of Object.entries(metrics)) {
      row[k] = (v && typeof v === "object" && "value" in v) ? v.value : v;
    }
    applyVaultOverrides(row);
    if (row.unsupported || row.paused) {
      // Show the badge anyway but with a 0/N-A score is misleading. For now
      // still compute — curators with paused vaults probably don't want a
      // badge displayed yet. This stays sane (will return whatever metrics
      // give us).
    }

    const theme = req.query.theme === "dark" ? "dark" : "light";
    const style = req.query.style === "detailed" ? "detailed" : "compact";
    const { score, sub } = computeScore(row);
    const svg = style === "detailed"
      ? renderDetailed({ score, sub, vaultName: row.vault_name, theme })
      : renderCompact({ score, vaultName: row.vault_name, theme });

    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    // Cache for 5 minutes at the edge, allow stale-while-revalidate for an hour.
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
    // Allow embedding from any origin
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).send(svg);
  } catch (err) {
    console.error("Badge error:", err);
    res.status(500).send("Internal error");
  }
}
