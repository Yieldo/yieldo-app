// Allocation card for the vault detail page. Ships the spec's Option 2
// (lightweight, on-chain composition + raw markets) — Option 1 (the 4-bucket
// editorial composition) waits on a maintained asset registry that doesn't
// exist yet, so the decision logic always resolves to Option 2 for now.
import { useState } from "react";
import { C } from "./VaultExplorer.jsx";
import { StrategyBars, TIER_COLOR } from "./StrategyBars.jsx";
import { TIER_META, positionType } from "../lib/strategyTier.js";

// Flip to true once a maintained asset registry tags ≥90% of a vault's
// positions into Direct-Yield / Money-Market / Strategy / Leverage buckets.
const ASSET_REGISTRY_EXISTS = false;

const ONCHAIN = {
  lending: { label: "Lending", color: "#6B7280", desc: "Supplied into lending markets" },
  other: { label: "Other positions", color: "#4B5563", desc: "LPs, PT/YT, wrappers, structured" },
  held: { label: "Held", color: "#9CA3AF", desc: "Direct token balance on vault" },
};

const fmtUsd = (n) => n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(2)}k` : `${(n || 0).toFixed(0)}`;

export default function AllocationCard({ vault }) {
  const [expanded, setExpanded] = useState(false);
  const alloc = vault?.allocation;
  const strat = vault?.strategy;
  const asset = (vault?.asset || "").toUpperCase();
  const tier = strat?.tier;

  // No allocation data (Midas/Lagoon/Upshift/Lido/Morpho-V2/Accountable, or a
  // fetch error) — be explicit rather than rendering an empty card.
  if (!alloc || !Array.isArray(alloc.positions) || alloc.positions.length === 0) {
    return (
      <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, padding: "18px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Allocation</h2>
        </div>
        <div style={{ fontSize: 13, color: C.text3 }}>
          Position-level allocation isn't published by this protocol, so we can't show a market breakdown.
        </div>
      </div>
    );
  }

  const total = Number(alloc.total_usd) || 0;
  // Display $ from share × total — some sources store a placeholder supply_usd
  // (Aave/Spark single-reserve vaults) with the real figure carried by total_usd.
  const usdOf = (p) => {
    const share = Number(p.supply_pct);
    if (total > 0 && Number.isFinite(share)) return (share / 100) * total;
    return Number(p.supply_usd) || 0;
  };

  const markets = alloc.positions
    .map((p) => ({
      name: p.name || "Position",
      type: positionType(p.kind),
      lltv: p.lltv != null ? Number(p.lltv) : null,
      util: p.utilization != null ? Number(p.utilization) : null,
      cap: p.supply_cap != null ? Number(p.supply_cap) : null,
      usd: usdOf(p),
      share: Number(p.supply_pct) || 0,
    }))
    .sort((a, b) => b.usd - a.usd);

  const comp = strat?.composition || { lendingPct: 0, otherPct: 0, heldPct: 0 };
  const usdByType = { lending: 0, other: 0, held: 0 };
  for (const m of markets) usdByType[m.type] += m.usd;

  const positionCount = markets.filter((m) => m.type !== "held").length;
  const partial = alloc.coverage === "partial";

  // Short collapsed-header description from composition.
  const oneLineDesc = (() => {
    const parts = [];
    if (comp.lendingPct > 50) parts.push(`primarily lends ${asset}`);
    else if (comp.lendingPct > 20) parts.push(`lends ${asset}`);
    if (comp.otherPct > 20) parts.push("holds strategy positions");
    if (comp.heldPct > 10) parts.push(`${comp.heldPct}% idle`);
    return parts.join(" · ") || `${markets.length} on-chain ${markets.length === 1 ? "position" : "positions"}`;
  })();

  const tierColor = tier ? TIER_COLOR[tier] : C.text3;

  return (
    <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }}>
      {/* Collapsed header (click to toggle) */}
      <button
        onClick={() => setExpanded((x) => !x)}
        style={{ width: "100%", padding: "18px 22px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, fontFamily: "inherit" }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 5, flexWrap: "wrap" }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Allocation</h2>
            <span style={{ fontSize: 12, color: C.text3 }}>{positionCount} positions · {asset}</span>
            {partial && <span style={{ fontSize: 10, fontWeight: 600, color: C.amber, background: C.amberBg, padding: "1px 7px", borderRadius: 4 }}>APPROX. WEIGHTS</span>}
          </div>
          <div style={{ fontSize: 13, color: C.text2 }}>{oneLineDesc}</div>
        </div>
        <span style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.border2}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.text2, flexShrink: 0, transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .2s", fontSize: 12 }}>▼</span>
      </button>

      {expanded && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: "18px 22px", background: C.surfaceAlt }}>
          {/* Why this is T1/T2/T3 */}
          {tier && (
            <div style={{ marginBottom: 18, padding: "12px 14px", borderRadius: 8, background: `${tierColor}10`, border: `1px solid ${tierColor}22`, display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span style={{ paddingTop: 2 }}><StrategyBars tier={tier} size="lg" /></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: tierColor, marginBottom: 3 }}>Why this is {tier} · {TIER_META[tier].fullLabel}</div>
                <div style={{ fontSize: 12, color: C.text2, lineHeight: 1.6 }}>{strat.oneLiner}</div>
              </div>
            </div>
          )}

          {/* Composition — Lending / Other / Held */}
          <div style={{ fontSize: 11, fontWeight: 600, color: C.text3, letterSpacing: ".08em", marginBottom: 10 }}>COMPOSITION</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 8 }}>
            {[
              { key: "lending", pct: comp.lendingPct },
              { key: "other", pct: comp.otherPct },
              { key: "held", pct: comp.heldPct },
            ].map((g) => {
              const meta = ONCHAIN[g.key];
              const usd = usdByType[g.key];
              return (
                <div key={g.key} style={{ padding: "13px 15px", background: C.white, border: `1px solid ${C.border}`, borderRadius: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: meta.color }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: C.text2, letterSpacing: ".02em" }}>{meta.label.toUpperCase()}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 20, fontWeight: 700, color: C.text }}>{g.pct}%</span>
                    <span style={{ fontSize: 12, color: C.text3 }}>{usd > 0 ? fmtUsd(usd) : "—"}</span>
                  </div>
                  <div style={{ fontSize: 11, color: C.text3, lineHeight: 1.4 }}>{meta.desc}</div>
                </div>
              );
            })}
          </div>
          <div style={{ marginBottom: 18, fontSize: 11, color: C.text3, lineHeight: 1.5 }}>
            Categories derived from on-chain position types. "Other" includes LPs, Pendle PT/YT, and structured wrappers — not classified beyond their position type.
          </div>

          {/* Markets table */}
          <div style={{ fontSize: 11, fontWeight: 600, color: C.text3, letterSpacing: ".08em", marginBottom: 10 }}>MARKETS</div>
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 560 }}>
              <thead>
                <tr style={{ background: C.surfaceAlt }}>
                  <th style={TH}>MARKET</th>
                  <th style={{ ...TH, textAlign: "center" }}>TYPE</th>
                  <th style={{ ...TH, textAlign: "right" }}>LLTV</th>
                  <th style={{ ...TH, textAlign: "right" }}>ALLOCATION</th>
                  <th style={{ ...TH, textAlign: "right" }}>SHARE</th>
                  <th style={{ ...TH, textAlign: "right" }}>UTIL.</th>
                  <th style={{ ...TH, textAlign: "right", paddingRight: 16 }}>CAP</th>
                </tr>
              </thead>
              <tbody>
                {markets.map((m, i) => {
                  const isHeld = m.type === "held";
                  const dot = ONCHAIN[m.type].color;
                  return (
                    <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                      <td style={TD}><span style={{ fontWeight: 600, color: isHeld ? C.text3 : C.text }}>{m.name}</span></td>
                      <td style={{ ...TD, textAlign: "center" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 8px", borderRadius: 4, background: "rgba(0,0,0,0.05)" }}>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: dot }} />
                          <span style={{ fontSize: 11, fontWeight: 600, color: C.text2, textTransform: "capitalize" }}>{m.type}</span>
                        </span>
                      </td>
                      <td style={{ ...TD, textAlign: "right", color: C.text2, fontVariantNumeric: "tabular-nums" }}>{m.lltv != null ? `${m.lltv}%` : "—"}</td>
                      <td style={{ ...TD, textAlign: "right", fontWeight: 600, color: isHeld ? C.text3 : C.text }}>{fmtUsd(m.usd)}</td>
                      <td style={{ ...TD, textAlign: "right", color: C.text2 }}>{m.share.toFixed(1)}%</td>
                      <td style={{ ...TD, textAlign: "right", color: isHeld ? C.text4 : C.text2 }}>{m.util != null ? `${m.util.toFixed(1)}%` : "—"}</td>
                      <td style={{ ...TD, textAlign: "right", paddingRight: 16, color: isHeld ? C.text4 : C.text2 }}>{m.cap ? fmtUsd(m.cap) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: C.text3, lineHeight: 1.5 }}>
            {partial
              ? "Markets the vault can allocate to (sourced from the protocol API). Per-market weights are approximate — equal-weighted where the protocol doesn't expose exact splits."
              : "All values sourced from each protocol's API. Position type derived mechanically from contract patterns (lending supply, raw token balance, or other position contracts)."}
          </div>
        </div>
      )}
    </div>
  );
}

const TH = { textAlign: "left", padding: "11px 16px", fontSize: 11, fontWeight: 600, color: "rgba(0,0,0,0.4)", letterSpacing: ".05em", whiteSpace: "nowrap" };
const TD = { padding: "12px 16px", verticalAlign: "middle", whiteSpace: "nowrap" };

export { ASSET_REGISTRY_EXISTS };
