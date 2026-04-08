import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useVaults } from "../hooks/useVaultData.js";
import { AssetIcon, ScoreRing, Badge as VaultBadge, fmtTvl } from "../components/VaultExplorer.jsx";

const KOL_API = import.meta.env.VITE_PARTNER_API || "https://api.yieldo.xyz";
const APP_URL = import.meta.env.VITE_APP_URL || "https://app.yieldo.xyz";

const C = {
  bg: "#f8f7fc", white: "#ffffff",
  border: "rgba(0,0,0,0.06)", border2: "rgba(0,0,0,0.1)",
  text: "#121212", text2: "rgba(0,0,0,0.65)", text3: "rgba(0,0,0,0.4)", text4: "rgba(0,0,0,0.25)",
  purple: "#7A1CCB", purpleDim: "rgba(122,28,203,0.06)",
  purpleGrad: "linear-gradient(100deg, #4B0CA6 0%, #7A1CCB 58%, #9E3BFF 114%)",
  purpleShadow: "0 0 17px rgba(80,14,170,0.12)",
  teal: "#2E9AB8", tealDim: "rgba(69,199,242,0.08)",
  green: "#1a9d3f", greenDim: "rgba(26,157,63,0.07)",
  orange: "#d97706", orangeDim: "rgba(217,119,6,0.07)",
};

const CHAINS = { 1: "Ethereum", 8453: "Base", 42161: "Arbitrum", 10: "Optimism", 999: "Hyperliquid", 747474: "Katana", 143: "Monad" };

function fmtApy(n) {
  if (!n && n !== 0) return "—";
  return (n * 100).toFixed(2) + "%";
}

function Card({ children, style: sx = {} }) {
  return <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.03)", ...sx }}>{children}</div>;
}

function Badge({ children, color = C.purple, bg }) {
  return <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 4, background: bg || `${color}12`, color, whiteSpace: "nowrap" }}>{children}</span>;
}

export default function KolLandingPage() {
  const { handle } = useParams();
  const [kol, setKol] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const { vaults } = useVaults();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`${KOL_API}/v1/kols/public/${handle}`)
      .then(r => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then(data => { if (data) setKol(data); })
      .catch(() => setNotFound(true));
  }, [handle]);

  const referralLink = `${APP_URL}?ref=${handle}`;
  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (notFound) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Inter',sans-serif", gap: 16 }}>
        <div style={{ fontSize: 48 }}>🔍</div>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>KOL not found</h2>
        <p style={{ margin: 0, fontSize: 14, color: C.text3 }}>No KOL with handle @{handle} exists.</p>
        <Link to="/vault" style={{ textDecoration: "none" }}>
          <button style={{ padding: "10px 22px", borderRadius: 8, backgroundImage: C.purpleGrad, border: "none", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
            Explore Vaults
          </button>
        </Link>
      </div>
    );
  }

  if (!kol) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter',sans-serif", fontSize: 14, color: C.text3 }}>
        Loading...
      </div>
    );
  }

  const pickedVaults = vaults.filter(v => kol.enrolled_vaults?.includes(v.id || `${v.chain_id}:${v.address?.toLowerCase()}`));

  return (
    <div style={{ fontFamily: "'Inter',sans-serif", background: C.bg, minHeight: "100vh", color: C.text }}>
      {/* Header */}
      <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link to="/vault" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: C.text }}>
          <img src="/yieldo-new.png" alt="Yieldo" style={{ width: 28, height: 28, borderRadius: 6, objectFit: "contain" }} />
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: ".05em" }}>YIELDO</span>
        </Link>
        <Link to="/vault">
          <button style={{ padding: "8px 16px", borderRadius: 8, backgroundImage: C.purpleGrad, border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
            Explore Vaults
          </button>
        </Link>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px" }}>
        {/* KOL Profile */}
        <Card style={{ padding: 28, marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
            <div style={{ width: 72, height: 72, borderRadius: 18, backgroundImage: C.purpleGrad, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: "#fff", fontWeight: 700, flexShrink: 0 }}>
              {kol.name?.charAt(0)?.toUpperCase() || "K"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{kol.name}</h1>
                <Badge color={C.orange} bg={C.orangeDim}>KOL</Badge>
              </div>
              <div style={{ fontSize: 13, color: C.text3, marginBottom: kol.bio ? 10 : 0 }}>@{kol.handle}</div>
              {kol.bio && <p style={{ margin: "0 0 10px", fontSize: 14, color: C.text2, lineHeight: 1.6 }}>{kol.bio}</p>}
              {kol.twitter && (
                <a href={`https://twitter.com/${kol.twitter}`} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: C.purple, textDecoration: "none", fontWeight: 500 }}>
                  <span>𝕏</span> @{kol.twitter}
                </a>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
              <button
                onClick={copyLink}
                style={{ padding: "10px 20px", borderRadius: 8, backgroundImage: C.purpleGrad, border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif", boxShadow: C.purpleShadow }}
              >
                {copied ? "Copied!" : "Copy Referral Link"}
              </button>
              <a href={referralLink} style={{ textDecoration: "none" }}>
                <button style={{ width: "100%", padding: "8px 16px", borderRadius: 8, background: C.purpleDim, border: `1px solid ${C.purple}30`, color: C.purple, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
                  Deposit via {kol.name}
                </button>
              </a>
            </div>
          </div>
        </Card>

        {/* Vault Picks */}
        <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Vault Picks</h2>
          <Badge>{pickedVaults.length} vaults</Badge>
        </div>

        {pickedVaults.length === 0 ? (
          <Card style={{ padding: 48, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🏦</div>
            <p style={{ margin: 0, fontSize: 14, color: C.text3 }}>
              {kol.name} hasn't selected any vault picks yet.
            </p>
          </Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {pickedVaults.map(v => {
              const vaultId = v.id || `${v.chain_id}:${v.address?.toLowerCase()}`;
              return (
                <Link key={vaultId} to={`/vault/${encodeURIComponent(vaultId)}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <Card style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer", transition: "box-shadow .15s" }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(122,28,203,0.08)"}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.03)"}
                  >
                    <AssetIcon asset={v.asset} size={36} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.name}</div>
                      <div style={{ fontSize: 12, color: C.text3 }}>{CHAINS[v.chain_id] || `Chain ${v.chain_id}`} · {v.protocol}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: C.green }}>{fmtApy(v.apy)}</div>
                      <div style={{ fontSize: 11, color: C.text3 }}>APY</div>
                    </div>
                    <div style={{ textAlign: "right", minWidth: 80 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{fmtTvl(v.tvl)}</div>
                      <div style={{ fontSize: 11, color: C.text3 }}>TVL</div>
                    </div>
                    {v.score && <ScoreRing score={v.score} size={36} />}
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        {/* CTA */}
        <Card style={{ padding: 24, marginTop: 24, textAlign: "center" }}>
          <p style={{ margin: "0 0 14px", fontSize: 14, color: C.text3 }}>
            Deposit through {kol.name}'s referral link to support them — you pay the same protocol fee either way.
          </p>
          <a href={referralLink}>
            <button style={{ padding: "12px 28px", borderRadius: 10, backgroundImage: C.purpleGrad, border: "none", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter',sans-serif", boxShadow: C.purpleShadow }}>
              Explore & Deposit via @{kol.handle}
            </button>
          </a>
        </Card>
      </div>
    </div>
  );
}
