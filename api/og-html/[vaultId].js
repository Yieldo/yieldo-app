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
    const ogImage = `${API_BASE}/v1/og/vault/${encodeURIComponent(vaultId)}.png${lockQuery ? `?${lockQuery}` : ""}`;
    // Include the lock params in the og:url too. Twitter / Telegram / Discord
    // cache OG scrapes per URL — if we returned a constant page URL with a
    // varying og:image, the social platform would still serve the first-ever
    // scrape of this vault to every viewer of every subsequent share. Letting
    // the og:url vary per share forces a fresh scrape each time.
    const pageUrl = `${proto}://${host}/vault/${encodeURIComponent(vaultId)}${lockQuery ? `?${lockQuery}` : ""}`;

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
