// Attribution tracking — captures share-URL params on app mount and posts
// them to the API so we can build the wallet ↔ click ↔ deposit funnel.
//
// Flow (Eddy spec):
//   1. User clicks a tweet's link: /vault/:id?src=x_reply&tweet_id=...&template=...&cohort=...
//   2. This hook runs once on first mount, POSTs to /v1/track/click
//   3. API writes a click_event row and returns/sets a 7-day click cookie
//   4. We mirror the click_id into localStorage in case third-party cookies
//      are blocked or the subdomain crosses change later
//   5. On SIWE login, useUserAuth posts /v1/track/attribute with the
//      click_id so the wallet gets linked to the click
//   6. Status resolver classifies the eventual deposit as attributed if a
//      wallet_attribution row exists within 7 days
//
// We deliberately keep this lightweight — single fetch, no retries, no
// queueing. If the network blip happens at exactly the wrong moment we lose
// the attribution for that visitor; that's fine. The win comes from being
// right on 99% of visits, not from being right on every visit at any cost.

import { useEffect } from "react";

const API = import.meta.env.VITE_PARTNER_API || "https://api.yieldo.xyz";
const STORAGE_KEY = "yieldo_click_id";

// Param names we read from the URL. Eddy's spec specifies all of these.
const TRACKED_PARAMS = ["src", "tweet_id", "template", "cohort"];

export function useTrackingParams() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    let params;
    try {
      params = new URLSearchParams(window.location.search);
    } catch {
      return;
    }
    // Bail if none of the tracking params are present — most page loads
    // (direct nav, internal SPA route changes) don't need to fire a click.
    const hasAny = TRACKED_PARAMS.some(p => params.has(p));
    if (!hasAny) return;

    // Derive the vault_slug from the path if we're on /vault/:id, so the
    // backend can group clicks by vault without the frontend needing to know
    // the URL grammar.
    let vaultSlug = null;
    const m = window.location.pathname.match(/^\/vault\/([^/?#]+)/);
    if (m) vaultSlug = decodeURIComponent(m[1]);

    const body = {
      src:        params.get("src")        || null,
      tweet_id:   params.get("tweet_id")   || null,
      template:   params.get("template")   || null,
      cohort:     params.get("cohort")     || null,
      vault_slug: vaultSlug,
    };

    fetch(`${API}/v1/track/click`, {
      method: "POST",
      credentials: "include", // critical so the API can set the click cookie
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.click_id) {
          try { localStorage.setItem(STORAGE_KEY, data.click_id); } catch {}
        }
      })
      .catch(() => {
        // Best-effort. Don't block the page on an analytics failure.
      });
    // Run once on app boot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

// Public helper for useUserAuth to grab the click_id at SIWE-login time.
// Reads localStorage as the source of truth; the server-set cookie is a
// parallel mechanism and the API accepts either.
export function getStoredClickId() {
  try { return localStorage.getItem(STORAGE_KEY) || null; } catch { return null; }
}
