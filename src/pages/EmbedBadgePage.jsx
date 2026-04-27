import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDepositMetaMap } from "../hooks/useDepositMeta.js";

const C = {
  bg: "#f8f7fc", surface: "#fff", border: "rgba(0,0,0,.07)", border2: "rgba(0,0,0,.12)",
  text: "#0f172a", text2: "#334155", text3: "#64748b", text4: "#94a3b8",
  purple: "#7A1CCB", purpleDim: "rgba(122,28,203,.08)",
  green: "#16a34a", greenDim: "rgba(22,163,74,.08)",
};

const BADGE_HOST = "https://app.yieldo.xyz";

function badgeUrl(vaultId, opts = {}) {
  const url = new URL(`${BADGE_HOST}/api/badge/${vaultId}.svg`);
  if (opts.theme) url.searchParams.set("theme", opts.theme);
  if (opts.style) url.searchParams.set("style", opts.style);
  return url.toString();
}

function CopyBlock({ label, code }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.text3, letterSpacing: ".04em", textTransform: "uppercase" }}>{label}</span>
        <button
          onClick={() => { navigator.clipboard.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1400); }); }}
          style={{ marginLeft: "auto", padding: "4px 10px", fontSize: 11, fontWeight: 600, background: copied ? C.greenDim : C.purpleDim, color: copied ? C.green : C.purple, border: "none", borderRadius: 5, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre style={{ background: "#0f172a", color: "#e2e8f0", padding: "10px 12px", borderRadius: 6, fontSize: 11, fontFamily: "'JetBrains Mono',Menlo,monospace", margin: 0, overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{code}</pre>
    </div>
  );
}

export default function EmbedBadgePage() {
  const map = useDepositMetaMap();
  const vaults = useMemo(() => (map ? Array.from(map.values()).filter(v => !v.unsupported) : []), [map]);
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState("light");
  const [style, setStyle] = useState("compact");
  // Pre-select if a ?v=<vault_id> query param is present (deep-linked from
  // a vault detail page).
  const initial = (() => { try { return new URLSearchParams(window.location.search).get("v"); } catch { return null; } })();
  const [selectedId, setSelectedId] = useState(initial);

  const filtered = useMemo(() => {
    if (!query.trim()) return vaults.slice(0, 30);
    const q = query.trim().toLowerCase();
    return vaults.filter(v =>
      (v.name || "").toLowerCase().includes(q) ||
      (v.vault_id || "").toLowerCase().includes(q) ||
      (v.address || "").toLowerCase().includes(q)
    ).slice(0, 30);
  }, [vaults, query]);

  const selected = useMemo(() => vaults.find(v => v.vault_id === selectedId) || null, [vaults, selectedId]);

  useEffect(() => {
    if (!selected && filtered.length === 1) setSelectedId(filtered[0].vault_id);
  }, [filtered, selected]);

  const url = selected ? badgeUrl(selected.vault_id, { theme, style }) : null;
  const vaultPageUrl = selected ? `${BADGE_HOST}/vault/${encodeURIComponent(selected.vault_id)}` : null;

  const dims = style === "detailed" ? { w: 320, h: 120 } : { w: 220, h: 68 };

  const snippetImg = url ? `<img src="${url}" alt="Rated by Yieldo" width="${dims.w}" height="${dims.h}">` : "";
  const snippetClickable = url ? `<a href="${vaultPageUrl}" target="_blank" rel="noopener noreferrer">\n  <img src="${url}" alt="Rated by Yieldo" width="${dims.w}" height="${dims.h}">\n</a>` : "";
  const snippetIframe = url ? `<iframe src="${url}" width="${dims.w}" height="${dims.h}" frameborder="0" scrolling="no" title="Yieldo Score"></iframe>` : "";
  const snippetMd = url ? `[![Yieldo Score](${url})](${vaultPageUrl})` : "";

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "'Inter',sans-serif", color: C.text }}>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ marginBottom: 20 }}>
          <Link to="/vault" style={{ fontSize: 13, color: C.purple, textDecoration: "none" }}>← Back to vaults</Link>
        </div>

        <h1 style={{ fontSize: 32, fontWeight: 700, margin: "0 0 6px" }}>Embed your score</h1>
        <p style={{ color: C.text3, margin: "0 0 28px", maxWidth: 640 }}>
          Pick your vault and copy the snippet — the badge auto-updates whenever your score changes (5-min cache at our edge). Public, no auth, works in any HTML/Markdown context.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }} className="embed-grid">
          {/* LEFT — picker */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, letterSpacing: ".04em", textTransform: "uppercase", marginBottom: 8 }}>1. Pick a vault</div>
            <input
              type="text" placeholder="Search by name or address…" value={query}
              onChange={e => setQuery(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", fontSize: 13, fontFamily: "'Inter',sans-serif", border: `1px solid ${C.border2}`, borderRadius: 6, background: "#fff", color: C.text, outline: "none", boxSizing: "border-box" }}
            />
            <div style={{ marginTop: 10, maxHeight: 320, overflowY: "auto", border: `1px solid ${C.border}`, borderRadius: 6 }}>
              {!map && <div style={{ padding: 18, fontSize: 12, color: C.text4, textAlign: "center" }}>Loading vaults…</div>}
              {map && filtered.length === 0 && <div style={{ padding: 18, fontSize: 12, color: C.text4, textAlign: "center" }}>No matches</div>}
              {filtered.map(v => (
                <button key={v.vault_id} onClick={() => setSelectedId(v.vault_id)}
                  style={{
                    display: "block", width: "100%", textAlign: "left", padding: "9px 12px",
                    background: v.vault_id === selectedId ? C.purpleDim : "transparent",
                    border: "none", borderBottom: `1px solid ${C.border}`, cursor: "pointer",
                    fontFamily: "'Inter',sans-serif", color: C.text, fontSize: 13,
                  }}>
                  <div style={{ fontWeight: 600 }}>{v.name}</div>
                  <div style={{ fontSize: 10, color: C.text4, fontFamily: "monospace", marginTop: 2 }}>{v.vault_id}</div>
                </button>
              ))}
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, letterSpacing: ".04em", textTransform: "uppercase", marginTop: 18, marginBottom: 8 }}>2. Style</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              {[["compact", "Compact 220×68"], ["detailed", "Detailed 320×120"]].map(([id, label]) => (
                <button key={id} onClick={() => setStyle(id)}
                  style={{ padding: "8px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, fontFamily: "'Inter',sans-serif",
                           border: `1px solid ${style === id ? C.purple : C.border2}`,
                           background: style === id ? C.purpleDim : "#fff", color: style === id ? C.purple : C.text2, cursor: "pointer", flex: 1 }}>
                  {label}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {[["light", "Light"], ["dark", "Dark"]].map(([id, label]) => (
                <button key={id} onClick={() => setTheme(id)}
                  style={{ padding: "8px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, fontFamily: "'Inter',sans-serif",
                           border: `1px solid ${theme === id ? C.purple : C.border2}`,
                           background: theme === id ? C.purpleDim : "#fff", color: theme === id ? C.purple : C.text2, cursor: "pointer", flex: 1 }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT — preview + snippets */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, letterSpacing: ".04em", textTransform: "uppercase", marginBottom: 8 }}>Preview</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: theme === "dark" ? "#0f172a" : "#f1f5f9", borderRadius: 8, minHeight: 140, marginBottom: 18 }}>
              {url ? <img src={url} alt="Preview" width={dims.w} height={dims.h} style={{ display: "block" }} /> : <span style={{ color: C.text4, fontSize: 12 }}>Pick a vault to preview</span>}
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, letterSpacing: ".04em", textTransform: "uppercase", marginBottom: 10 }}>3. Copy &amp; paste</div>
            {selected ? (
              <>
                <CopyBlock label="HTML — clickable (recommended)" code={snippetClickable} />
                <CopyBlock label="HTML — image" code={snippetImg} />
                <CopyBlock label="iframe" code={snippetIframe} />
                <CopyBlock label="Markdown / GitHub README" code={snippetMd} />
              </>
            ) : (
              <div style={{ fontSize: 12, color: C.text4, padding: "20px 0", textAlign: "center" }}>Pick a vault on the left to generate snippets.</div>
            )}
          </div>
        </div>

      </div>
      <style>{`@media (max-width: 720px) { .embed-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}
