import { lazy } from "react";

// React.lazy wrapper that survives the "stale chunk after deploy" failure.
// When a new build ships, the old hashed chunk filenames 404 and Vercel's SPA
// rewrite serves index.html (MIME text/html) in their place, so the dynamic
// import throws ("Failed to fetch dynamically imported module" / MIME error)
// for any tab that was open across the deploy. We reload the page ONCE to pull
// the fresh index.html + current chunk names. A sessionStorage timestamp guards
// against an infinite reload loop: a second failure within 10s re-throws so a
// genuinely broken import surfaces to the error boundary instead of looping.
export function lazyWithReload(factory) {
  return lazy(() =>
    factory().catch((err) => {
      const KEY = "yieldo_chunk_reload_at";
      const last = Number(sessionStorage.getItem(KEY) || 0);
      if (Date.now() - last > 10000) {
        sessionStorage.setItem(KEY, String(Date.now()));
        window.location.reload();
        return new Promise(() => {}); // suspend until the reload takes over
      }
      throw err;
    })
  );
}
