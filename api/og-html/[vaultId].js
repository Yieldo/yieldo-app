// Per-vault enriched HTML response.
//
// Why this exists:
//   The SPA at app.yieldo.xyz is a Vite single-page app. Every route returns
//   the same index.html, which carries a default Open Graph image. When
//   someone pastes a `/vault/{id}` link into X, Telegram, Discord, etc., the
//   bot scrapes the static HTML and sees the generic site preview — not the
//   vault's actual score. That's a wasted impression every time.
//
// What it does:
//   - Fetches the deployed index.html (so we keep the right Vite-hashed asset
//     paths after every build, with zero rebuild glue)
//   - Looks up the vault name/asset/chain in MongoDB
//   - Rewrites <title>, <meta description>, og:title/description/url/image,
//     and twitter:title/description/image to point at the FastAPI OG card
//     endpoint (api.yieldo.xyz/v1/og/vault/{id}.png)
//   - Returns the modified HTML with image-appropriate Cache-Control
//
// Real users hit this on first load only (subsequent SPA navigations are
// client-side); the second-and-onward navigations never touch this function.
// Bot scrapes always hit it.

import { MongoClient } from "mongodb";

const API_BASE = process.env.YIELDO_API_BASE || "https://api.yieldo.xyz";

// Agency click-attribution webhook. When set, real-user clicks on
// /vault/:id?src=x_reply&tweet_id=&template=&cohort= URLs are forwarded
// fire-and-forget so the agency's analytics DB picks them up. Empty env
// var = forwarding disabled (initial deploy state until Matt sends the
// Cloudflare Tunnel URL).
const AGENCY_CLICK_WEBHOOK_URL = process.env.AGENCY_CLICK_WEBHOOK_URL || "";
const AGENCY_CLICK_TOKEN = process.env.AGENCY_CLICK_TOKEN || process.env.YIELDO_INTERNAL_TOKEN || "";

// User-Agent patterns we never want to count as clicks — these are link
// preview crawlers (Slack, Discord, Twitter card bot, etc.). The agency
// asked us to filter on our side since we know our traffic shape better.
const BOT_UA_REGEX = /(Twitterbot|Slackbot|Discordbot|facebookexternalhit|LinkedInBot|TelegramBot|Googlebot|bingbot|YandexBot|DuckDuckBot|Applebot|PinterestBot|WhatsApp|Embedly|Pingdom|UptimeRobot|curl\/|wget\/|HTTPie|python-requests|axios\/|Go-http-client|node-fetch|undici|vercel-og-render|yieldo-og-render)/i;

function isBotUA(ua) {
  if (!ua) return true; // empty UA → assume bot
  return BOT_UA_REGEX.test(ua);
}

// Fire-and-forget agency POST. Never awaited (we don't block the SPA render
// on this), never throws upward (we silently swallow so a flaky webhook can't
// brick first-load on /vault/*).
function forwardClickToAgency({ vaultSlug, tweetId, template, cohort, userAgent, referer }) {
  if (!AGENCY_CLICK_WEBHOOK_URL) return;
  const body = JSON.stringify({
    vault_slug: vaultSlug,
    tweet_id: tweetId || null,
    template: template || null,
    cohort: cohort || null,
    user_agent: userAgent || null,
    referer: referer || null,
  });
  const headers = {
    "Content-Type": "application/json",
    "User-Agent": "yieldo-click-forward/1.0",
  };
  if (AGENCY_CLICK_TOKEN) headers["Authorization"] = `Bearer ${AGENCY_CLICK_TOKEN}`;
  // 1.5s timeout — agency endpoint should be 202 in <100ms per spec.
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 1500);
  fetch(AGENCY_CLICK_WEBHOOK_URL, {
    method: "POST",
    headers,
    body,
    signal: controller.signal,
  })
    .catch(() => { /* fire-and-forget, no retry */ })
    .finally(() => clearTimeout(t));
}

let cachedClient = null;
async function getDb() {
  if (cachedClient) return cachedClient.db("yieldo_v1");
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  cachedClient = client;
  return client.db("yieldo_v1");
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
  }[c]));
}

// Single-pass meta-tag rewrite: replace by full tag pattern so we don't
// accidentally mutate user-supplied content elsewhere in the HTML.
function rewriteMeta(html, { title, description, ogImage, pageUrl }) {
  const escTitle = escapeHtml(title);
  const escDesc = escapeHtml(description);
  const escImg = escapeHtml(ogImage);
  const escUrl = escapeHtml(pageUrl);
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${escTitle}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${escDesc}" />`)
    .replace(/<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${escTitle}" />`)
    .replace(/<meta property="og:description" content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${escDesc}" />`)
    .replace(/<meta property="og:image" content="[^"]*"\s*\/?>/, `<meta property="og:image" content="${escImg}" />`)
    .replace(/<meta property="og:url" content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${escUrl}" />`)
    .replace(/<meta name="twitter:title" content="[^"]*"\s*\/?>/, `<meta name="twitter:title" content="${escTitle}" />`)
    .replace(/<meta name="twitter:description" content="[^"]*"\s*\/?>/, `<meta name="twitter:description" content="${escDesc}" />`)
    .replace(/<meta name="twitter:image" content="[^"]*"\s*\/?>/, `<meta name="twitter:image" content="${escImg}" />`);
}

export default async function handler(req, res) {
  try {
    const { vaultId } = req.query;
    if (!vaultId) return res.status(400).send("Missing vaultId");

    // Agency click attribution — forward to the agency webhook iff:
    //   1. The URL carries the agency's tracking params (any of src /
    //      tweet_id / template / cohort present)
    //   2. The request looks like a real user (not a link-preview bot)
    //   3. The webhook URL is configured
    // Fired before HTML rendering so a slow agency endpoint doesn't delay
    // the SPA load — the call itself is fire-and-forget with a 1.5s
    // timeout so an unreachable webhook can't tie up the function either.
    const { src, tweet_id, template, cohort } = req.query;
    const hasAttribution = !!(src || tweet_id || template || cohort);
    if (hasAttribution) {
      const ua = req.headers["user-agent"] || "";
      if (!isBotUA(ua)) {
        forwardClickToAgency({
          vaultSlug: vaultId,
          tweetId: Array.isArray(tweet_id) ? tweet_id[0] : tweet_id,
          template: Array.isArray(template) ? template[0] : template,
          cohort: Array.isArray(cohort) ? cohort[0] : cohort,
          userAgent: ua,
          referer: req.headers["referer"] || null,
        });
      }
    }

    // Determine the canonical host. Prefer the request's host so this works
    // identically on preview deployments (e.g. yieldo-app-git-foo.vercel.app).
    const host = req.headers["x-forwarded-host"] || req.headers.host || "app.yieldo.xyz";
    const proto = req.headers["x-forwarded-proto"] || "https";

    // Pull the canonical index.html so we inherit the latest Vite-hashed asset
    // paths after every deploy. No build-time glue needed — this stays in sync
    // automatically. If this fetch fails (very rare), fall back to a no-meta
    // 502 rather than serving a half-broken page.
    const indexRes = await fetch(`${proto}://${host}/index.html`, {
      headers: { "User-Agent": "yieldo-og-render/1.0" },
    });
    if (!indexRes.ok) {
      return res.status(502).send("Failed to fetch index.html for meta injection");
    }
    let html = await indexRes.text();

    // Look up the vault for a nice title/description. If the DB fetch fails
    // we still return enriched HTML using the vault id as a fallback — the
    // OG image endpoint itself handles the "vault not in registry" case.
    let name = vaultId;
    let asset = null, chainName = null;
    try {
      const db = await getDb();
      const entry = await db.collection("vaults").findOne({ _id: vaultId });
      if (entry) {
        name = entry.name || vaultId;
        asset = (entry.asset || "").toUpperCase() || null;
        chainName = entry.chain_name || null;
      }
    } catch (e) {
      // Non-fatal: continue with vaultId-as-name.
    }

    const title = `${name} — Yieldo Score & Yield Details`;
    const descParts = [`${name} on Yieldo`];
    if (asset) descParts.push(`${asset} vault`);
    if (chainName) descParts.push(`on ${chainName}`);
    descParts.push("— live Yieldo Score with Capital, Performance, Risk, and Trust breakdown. Deposit cross-chain in one click.");
    const description = descParts.join(" ");

    // Pass through score-lock query params so the OG image renders with the
    // numbers that were current at SHARE time, not at SCRAPE time. Fixes the
    // X embed inconsistency where tweet body said "Score 80" but the image
    // showed a drifted 77. See app/routes/og.py for the API side.
    const SCORE_PARAMS = ["score", "capital", "performance", "risk", "trust", "apy"];
    const lockedParams = new URLSearchParams();
    for (const k of SCORE_PARAMS) {
      const v = req.query[k];
      if (v !== undefined && v !== null && v !== "") {
        lockedParams.set(k, String(v));
      }
    }
    const lockQuery = lockedParams.toString();
    // Plain (unlocked) URL shares: append a UTC-hour bucket to the image URL
    // so social platforms see a "new" image once an hour and re-fetch it,
    // instead of caching the very first scrape forever. Backend's
    // /v1/og/vault/{id}.png will then render against the latest score
    // snapshot at re-scrape time. For locked URLs (with explicit score
    // params) we never bucket — the share URL IS the source of truth and
    // must produce the exact same image every time it's scraped.
    let imageQuery = lockQuery;
    if (!imageQuery) {
      const now = new Date();
      const bucket =
        now.getUTCFullYear().toString() +
        String(now.getUTCMonth() + 1).padStart(2, "0") +
        String(now.getUTCDate()).padStart(2, "0") +
        String(now.getUTCHours()).padStart(2, "0");
      imageQuery = `t=${bucket}`;
    }
    const ogImage = `${API_BASE}/v1/og/vault/${encodeURIComponent(vaultId)}.png?${imageQuery}`;
    // og:url logic:
    //   - Locked share (params present): include those params so each
    //     share has a unique canonical URL and social platforms re-scrape
    //     for every distinct share, not just the first one they saw.
    //   - Plain share (no params): use the actual URL the user pasted as
    //     the canonical, with the hour bucket appended so platforms also
    //     re-scrape the HTML once an hour. Without this, Discord/Telegram
    //     would cache the very first preview indefinitely.
    const urlBucket = lockQuery ? lockQuery : imageQuery;
    const pageUrl = `${proto}://${host}/vault/${encodeURIComponent(vaultId)}${urlBucket ? `?${urlBucket}` : ""}`;

    html = rewriteMeta(html, { title, description, ogImage, pageUrl });

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    // Real users get a quick browser cache, edge cache absorbs the bulk of
    // bot scrapes, and SWR keeps the response hot across deploys. Tune down
    // if score changes need to propagate to social previews faster.
    res.setHeader(
      "Cache-Control",
      "public, max-age=60, s-maxage=600, stale-while-revalidate=86400"
    );
    return res.status(200).send(html);
  } catch (err) {
    console.error("og-html render failed", err);
    // Last-ditch: fall back to a redirect to the canonical SPA so users still
    // reach the page even if our injector broke. Bots will get a fresh chance.
    return res.status(500).send("OG render failed");
  }
}
