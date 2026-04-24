// Fetches real success-rate stats from /v1/vaults/:id/stats. Optional source
// chain + token filter so the UI can show route-specific reliability when the
// user is selecting which bridge to use.
//
// Returns:
//   { loading, stats: {
//       total, completed, success_rate (0-1 or null if no data),
//       by_bridge: [{ bridge, total, completed, rate }]
//   } | null }

import { useState, useEffect } from "react";

const API = import.meta.env.VITE_PARTNER_API || "https://api.yieldo.xyz";
const cache = new Map(); // key -> { ts, data }
const TTL = 60_000; // 1 min

function key(vaultId, fromChainId, fromToken, days) {
  return `${vaultId}|${fromChainId || ""}|${(fromToken || "").toLowerCase()}|${days}`;
}

export function useVaultStats(vaultId, { fromChainId, fromToken, days = 30 } = {}) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!vaultId) return;
    const k = key(vaultId, fromChainId, fromToken, days);
    const c = cache.get(k);
    if (c && Date.now() - c.ts < TTL) { setStats(c.data); return; }
    const params = new URLSearchParams({ days: String(days) });
    if (fromChainId) params.set("from_chain_id", String(fromChainId));
    if (fromToken)   params.set("from_token", fromToken);
    setLoading(true);
    fetch(`${API}/v1/vaults/${encodeURIComponent(vaultId)}/stats?${params.toString()}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { cache.set(k, { ts: Date.now(), data: d }); setStats(d); } })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [vaultId, fromChainId, fromToken, days]);
  return { stats, loading };
}

/** Format a 0-1 rate as "98%" or null if not enough data. */
export function formatRate(rate, total, minSample = 3) {
  if (rate == null || total < minSample) return null;
  const pct = Math.round(rate * 100);
  return `${pct}%`;
}

/** Pick the right color for a success-rate badge. */
export function rateColor(rate) {
  if (rate == null) return "text3";
  if (rate >= 0.95) return "green";
  if (rate >= 0.8)  return "amber";
  return "red";
}
