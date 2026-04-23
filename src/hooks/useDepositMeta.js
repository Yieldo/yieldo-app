// Single-fetch shared hook for the deposit-side vault metadata served by
// yieldo-api-v1's /v1/vaults endpoint (vault type, min_deposit, asset details,
// no_minimum flag, deposit_router address).
//
// One network call per page load (5-min in-memory cache + a module-level
// in-flight Promise dedupe so concurrent callers share the same request).
// Use this anywhere you need min_deposit / vault.type / etc. instead of
// re-fetching `/v1/vaults` per component.
import { useEffect, useState } from "react";

const API = import.meta.env.VITE_PARTNER_API || "https://api.yieldo.xyz";
const TTL_MS = 5 * 60 * 1000;

let _cache = null;        // { fetched_at, by_id: Map<vault_id, vault> }
let _inflight = null;     // Promise — dedupes concurrent callers

async function fetchAll() {
  if (_cache && Date.now() - _cache.fetched_at < TTL_MS) return _cache.by_id;
  if (_inflight) return _inflight;

  _inflight = (async () => {
    try {
      const res = await fetch(`${API}/v1/vaults`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const list = await res.json();
      const by_id = new Map(list.map(v => [v.vault_id, v]));
      _cache = { fetched_at: Date.now(), by_id };
      return by_id;
    } finally {
      _inflight = null;
    }
  })();
  return _inflight;
}

/** Returns the full Map<vault_id, vault> from /v1/vaults. */
export function useDepositMetaMap() {
  const [map, setMap] = useState(_cache?.by_id || null);
  useEffect(() => {
    let cancelled = false;
    fetchAll().then(m => { if (!cancelled) setMap(m); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  return map;
}

/** Returns the deposit-meta entry for one vault by id, or null while loading. */
export function useDepositMeta(vaultId) {
  const map = useDepositMetaMap();
  if (!vaultId || !map) return null;
  return map.get(vaultId) || null;
}

/** Imperative read for code paths that aren't hooks (e.g. event handlers). */
export async function getDepositMeta(vaultId) {
  const map = await fetchAll();
  return map.get(vaultId) || null;
}
