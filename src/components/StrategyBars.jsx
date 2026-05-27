// Strategy tier visual primitives — Variant A (ascending signal bars).
// More bars = safer mechanics: T1→3 green, T2→2 amber, T3→1 red.
// Colors intentionally match the Risk chip palette (same color = same
// severity language), though Strategy (mechanical complexity) and Risk
// (computed score) are different dimensions and won't always agree.
import { useState } from "react";
import { TIER_META } from "../lib/strategyTier.js";

const TIER_COLOR = { T1: "#1a9d3f", T2: "#d97706", T3: "#d93636" };
const UNFILLED = "rgba(0,0,0,0.1)";

export function StrategyBars({ tier, size = "md" }) {
  const meta = TIER_META[tier];
  if (!meta) return null;
  const filled = meta.bars;
  const color = TIER_COLOR[tier];
  const dims = size === "sm"
    ? { w: 3, h: [6, 9, 12], gap: 2 }
    : size === "lg"
    ? { w: 5, h: [10, 15, 20], gap: 3 }
    : { w: 4, h: [7, 11, 14], gap: 2.5 };
  return (
    <div style={{ display: "inline-flex", alignItems: "flex-end", gap: dims.gap, height: dims.h[2] }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ width: dims.w, height: dims.h[i], borderRadius: 1, background: i < filled ? color : UNFILLED }} />
      ))}
    </div>
  );
}

// Chip wrapping bars + label. `prominent` = larger, colored border (header use).
export function StrategyChip({ tier, prominent = false }) {
  const meta = TIER_META[tier];
  if (!meta) return null;
  const color = TIER_COLOR[tier];
  if (prominent) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 10px 5px 9px", borderRadius: 6, background: `${color}14`, border: `1px solid ${color}40` }}>
        <StrategyBars tier={tier} size="md" />
        <span style={{ fontSize: 12, fontWeight: 600, color, letterSpacing: ".01em" }}>{tier} · {meta.fullLabel}</span>
      </span>
    );
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 8px 3px 7px", borderRadius: 4, background: `${color}14` }}>
      <StrategyBars tier={tier} size="sm" />
      <span style={{ fontSize: 11, fontWeight: 600, color }}>{tier} {meta.label}</span>
    </span>
  );
}

// Table-cell variant: bars with an on-hover tooltip (tier code + definition).
// Falls back to a native title for reliability inside scroll containers.
export function StrategyTierCell({ tier, size = "md" }) {
  const [hover, setHover] = useState(false);
  const meta = TIER_META[tier];
  if (!meta) return <span style={{ color: "rgba(0,0,0,0.25)", fontSize: 12 }}>—</span>;
  const color = TIER_COLOR[tier];
  return (
    <span
      style={{ display: "inline-flex", cursor: "help", position: "relative" }}
      title={`${tier} · ${meta.fullLabel} — ${meta.desc}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <StrategyBars tier={tier} size={size} />
      {hover && (
        <span style={{
          position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)",
          background: "#121212", color: "#fff", padding: "8px 12px", borderRadius: 6, fontSize: 11,
          width: 220, textAlign: "left", zIndex: 50, boxShadow: "0 4px 12px rgba(0,0,0,0.18)", pointerEvents: "none",
        }}>
          <span style={{ display: "block", fontWeight: 700, color, marginBottom: 4 }}>{tier} · {meta.fullLabel}</span>
          <span style={{ display: "block", lineHeight: 1.5, opacity: 0.9 }}>{meta.desc}</span>
        </span>
      )}
    </span>
  );
}

export { TIER_COLOR };
