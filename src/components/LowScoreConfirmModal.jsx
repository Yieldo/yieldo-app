// Friction step shown when a user clicks Deposit on a vault whose Yieldo
// Score falls below the danger threshold. Forces explicit acknowledgement
// instead of opening the deposit modal directly — see VaultDetailPage and
// VaultPage for the gating logic. Kept colocated as a single component so
// both entry points (detail page + list grid/table) render identical copy.
//
// Threshold is set to 40 to match the "below recommended" band: a score
// in [0,40) means at least one sub-score is poor enough that an uninformed
// deposit is a foot-gun (thin liquidity, recent drawdowns, unverified
// contracts, concentrated holders, etc.).

const RED = "#d93636";
const RED_BG = "#FFF0F0";
const AMBER = "#d97706";
const TEXT = "#121212";
const TEXT2 = "rgba(0,0,0,.65)";
const TEXT3 = "rgba(0,0,0,.4)";
const TEXT4 = "rgba(0,0,0,.25)";
const BORDER = "rgba(0,0,0,.06)";
const SURFACE = "#faf9fe";
const WHITE = "#fff";

export const LOW_SCORE_THRESHOLD = 40;

export function isLowScoreVault(vault) {
  return !!vault && typeof vault.yieldoScore === "number" && vault.yieldoScore < LOW_SCORE_THRESHOLD;
}

export default function LowScoreConfirmModal({ vault, onCancel, onConfirm, isMobile = false }) {
  if (!vault) return null;
  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 10000, padding: 16,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: WHITE, borderRadius: 12,
          padding: isMobile ? 20 : 28,
          width: 460, maxWidth: "100%",
          boxShadow: "0 20px 60px rgba(0,0,0,.25)",
          border: `1px solid ${RED}33`,
          fontFamily: "'Inter',sans-serif",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%", background: RED_BG,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: TEXT }}>This vault has a low Yieldo Score</div>
            <div style={{ fontSize: 12, color: TEXT3 }}>
              Score {vault.yieldoScore}/100 — below our recommended threshold of {LOW_SCORE_THRESHOLD}
            </div>
          </div>
        </div>
        <div style={{ fontSize: 13, color: TEXT2, lineHeight: 1.55, marginBottom: 14 }}>
          <strong>{vault.name}</strong> has scored poorly across one or more of Capital, Performance, Risk, or Trust. This may indicate thin liquidity, recent drawdowns, unverified contracts, or concentrated holders. <strong>You could lose part or all of your deposit.</strong>
        </div>
        {vault.subScores && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 14 }}>
            {[
              { k: "Capital",     val: vault.subScores.capital },
              { k: "Performance", val: vault.subScores.performance },
              { k: "Risk",        val: vault.subScores.risk },
              { k: "Trust",       val: vault.subScores.trust },
            ].map(d => {
              const danger = typeof d.val === "number" && d.val < 40;
              const warn = typeof d.val === "number" && d.val < 60;
              return (
                <div key={d.k} style={{
                  padding: "8px 6px", borderRadius: 6,
                  background: danger ? RED_BG : SURFACE,
                  border: `1px solid ${danger ? RED + "33" : BORDER}`,
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: TEXT4, textTransform: "uppercase", letterSpacing: ".04em" }}>{d.k}</div>
                  <div style={{
                    fontSize: 16, fontWeight: 700,
                    color: danger ? RED : warn ? AMBER : TEXT,
                  }}>
                    {typeof d.val === "number" ? d.val : "—"}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div style={{
          fontSize: 11.5, color: TEXT3, marginBottom: 16,
          padding: "8px 10px", borderRadius: 6, background: SURFACE, lineHeight: 1.45,
        }}>
          Yieldo provides intelligence and routing, not custody — we don't control this vault or your funds. Deposits are non-reversible from the vault side.
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button
            onClick={onCancel}
            style={{
              fontFamily: "'Inter',sans-serif", fontSize: 13, fontWeight: 500,
              border: "1px solid rgba(0,0,0,.1)", borderRadius: 6, cursor: "pointer",
              padding: "6px 14px", background: WHITE, color: TEXT2,
              boxShadow: "0 1px 3px rgba(0,0,0,.04)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              fontFamily: "'Inter',sans-serif", fontSize: 13, fontWeight: 600,
              border: "none", borderRadius: 6, cursor: "pointer",
              padding: "6px 14px", background: RED, color: WHITE,
            }}
          >
            I understand, deposit anyway
          </button>
        </div>
      </div>
    </div>
  );
}
