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
import { computeYieldoScore } from "../../src/lib/scoring.js";
import { MongoClient } from "mongodb";

let cachedClient = null;
async function getDb() {
  if (cachedClient) return cachedClient.db("yieldo_v1");
  cachedClient = await new MongoClient(process.env.MONGO_URI).connect();
  return cachedClient.db("yieldo_v1");
}

// Score now comes from src/lib/scoring.js — exact same logic the React app
// uses, so the embed always matches what's shown on the vault page.

function tierColor(score) {
  if (score >= 80) return { fg: "#16a34a", bg: "#dcfce7" }; // green
  if (score >= 60) return { fg: "#ca8a04", bg: "#fef3c7" }; // gold
  if (score >= 40) return { fg: "#d97706", bg: "#fed7aa" }; // amber
  return { fg: "#dc2626", bg: "#fee2e2" };                  // red
}

function escapeXml(s) {
  return String(s || "").replace(/[<>&"']/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c]));
}

// Clean Yieldo mark — gradient ring (open at top-right) + rising arrow.
// Minimal, recognizable, scales cleanly. 28x28 viewBox.
function yieldoLogoMark(scale = 1, gradId = "yg") {
  return `<g transform="scale(${scale})">
    <defs>
      <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#7A1CCB"/>
        <stop offset="100%" stop-color="#3F8CFF"/>
      </linearGradient>
    </defs>
    <!-- Open ring (~285°), gap at top-right -->
    <path d="M19 4.8 A11 11 0 1 0 23.2 19"
          stroke="url(#${gradId})" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <!-- Rising arrow from bottom-left up through ring -->
    <path d="M9 19 L14 14 L17 16 L23 9"
          stroke="url(#${gradId})" stroke-width="2.4" fill="none"
          stroke-linecap="round" stroke-linejoin="round"/>
    <!-- Arrow head -->
    <path d="M19 9 L23 9 L23 13"
          stroke="url(#${gradId})" stroke-width="2.4" fill="none"
          stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;
}

function renderCompact({ score, vaultName, theme }) {
  const dark = theme === "dark";
  const bg = dark ? "#0f172a" : "#ffffff";
  const cardBg = dark ? "#1e293b" : "#fafafb";
  const text = dark ? "#f3f4f6" : "#0f172a";
  const muted = dark ? "#94a3b8" : "#64748b";
  const border = dark ? "#334155" : "#e2e8f0";
  const t = tierColor(score);
  const name = escapeXml(vaultName.length > 24 ? vaultName.slice(0, 23) + "…" : vaultName);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="76" viewBox="0 0 260 76" role="img" aria-label="Rated ${score} by Yieldo">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bg}"/>
      <stop offset="100%" stop-color="${cardBg}"/>
    </linearGradient>
    <linearGradient id="scoreBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${t.bg}"/>
      <stop offset="100%" stop-color="${t.bg}" stop-opacity="0.6"/>
    </linearGradient>
  </defs>
  <rect x="0.5" y="0.5" width="259" height="75" rx="10" fill="url(#bgGrad)" stroke="${border}"/>
  <g transform="translate(14,22)">${yieldoLogoMark(1.15, "ygc")}</g>
  <text x="58" y="28" font-family="-apple-system,Segoe UI,Roboto,sans-serif" font-size="9.5" font-weight="700" fill="${muted}" letter-spacing=".09em">RATED BY YIELDO</text>
  <text x="58" y="50" font-family="-apple-system,Segoe UI,Roboto,sans-serif" font-size="13" font-weight="600" fill="${text}">${name}</text>
  <g transform="translate(186,12)">
    <rect width="62" height="52" rx="8" fill="url(#scoreBg)"/>
    <text x="31" y="35" font-family="-apple-system,Segoe UI,Roboto,sans-serif" font-size="28" font-weight="800" text-anchor="middle" fill="${t.fg}" font-feature-settings="tnum">${score}</text>
    <text x="31" y="47" font-family="-apple-system,Segoe UI,Roboto,sans-serif" font-size="8.5" font-weight="700" text-anchor="middle" fill="${t.fg}" opacity=".65" letter-spacing=".08em">/ 100</text>
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
  <g transform="translate(14,14)">${yieldoLogoMark(1.25, "ygd")}</g>
  <text x="56" y="26" font-family="-apple-system,Segoe UI,sans-serif" font-size="11" font-weight="600" fill="${muted}" letter-spacing=".04em">RATED BY YIELDO</text>
  <text x="56" y="44" font-family="-apple-system,Segoe UI,sans-serif" font-size="13" font-weight="700" fill="${text}">${name}</text>
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
    // Same scoring function the React app uses — embeds and the vault page
    // will always show the same number. age = D01 (days since creation) if
    // present, else assume mature so confidence multiplier doesn't dampen.
    const age = typeof row.D01 === "number" ? row.D01 : 365;
    const { score, sub } = computeYieldoScore(row, age);
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
