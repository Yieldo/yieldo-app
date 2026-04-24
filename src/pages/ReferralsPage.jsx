import { useState, useEffect, lazy, Suspense } from "react";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import InvestorShell from "../components/InvestorShell.jsx";

const BecomeCreatorModal = lazy(() => import("../components/BecomeCreatorModal.jsx"));

const API = import.meta.env.VITE_PARTNER_API || "https://api.yieldo.xyz";
const APP_URL = import.meta.env.VITE_APP_URL || "https://app.yieldo.xyz";

const C = {
  bg: "#f8f7fc", white: "#ffffff", surfaceAlt: "#faf9fe",
  border: "rgba(0,0,0,0.06)", border2: "rgba(0,0,0,0.1)",
  text: "#121212", text2: "rgba(0,0,0,0.65)", text3: "rgba(0,0,0,0.4)", text4: "rgba(0,0,0,0.22)",
  purple: "#7A1CCB", purpleDim: "rgba(122,28,203,0.06)",
  purpleGrad: "linear-gradient(100deg,#4B0CA6 0%,#7A1CCB 58%,#9E3BFF 114%)",
  purpleShadow: "0 0 18px rgba(80,14,170,0.13)",
  teal: "#2E9AB8", green: "#1a9d3f", greenDim: "rgba(26,157,63,0.07)",
  amber: "#b8960a",
};

function Card({ children, style = {} }) {
  return (
    <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.border}`,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.03)", ...style }}>{children}</div>
  );
}

export default function ReferralsPage() {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const [stats, setStats] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showBecome, setShowBecome] = useState(false);
  const [role, setRole] = useState(null);

  useEffect(() => {
    if (!address) return;
    fetch(`${API}/v1/users/referrals/${address}`)
      .then(r => r.ok ? r.json() : null)
      .then(setStats)
      .catch(() => {});
    fetch(`${API}/v1/users/role/${address}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setRole(d?.role || "user"))
      .catch(() => setRole("user"));
  }, [address]);

  if (!isConnected) {
    return (
      <InvestorShell>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      minHeight: 360, gap: 16, textAlign: "center" }}>
          <div style={{ fontSize: 48 }}>🔒</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Connect your wallet to see your referrals</div>
          <button onClick={openConnectModal}
            style={{ padding: "10px 22px", borderRadius: 8, border: "none", cursor: "pointer",
                     backgroundImage: C.purpleGrad, color: "#fff", fontSize: 14, fontWeight: 600,
                     boxShadow: C.purpleShadow, fontFamily: "'Inter',sans-serif" }}>
            Connect Wallet
          </button>
        </div>
      </InvestorShell>
    );
  }

  const TIER1 = stats?.tier1_threshold || 3;
  const TIER2 = stats?.tier2_threshold || 10;
  const depositing = stats?.depositing || 0;
  const clicks = stats?.clicks || 0;
  const signups = stats?.signups || 0;
  const points = stats?.points || 0;
  const tier = stats?.tier || 0;
  const tierUnlocked = tier >= 2;

  const refCode = stats?.ref_code
    ? `${APP_URL}/?ref=${stats.ref_code}`
    : "";
  const nextTarget = tier < 1 ? TIER1 : tier < 2 ? TIER2 : TIER2;
  const progress = Math.min((depositing / nextTarget) * 100, 100);
  const tierLabel = ["", "Active Referrer", "Top Referrer"][tier];
  const tierColor = ["", C.teal, C.amber][tier];

  const copy = () => {
    if (!refCode) return;
    navigator.clipboard.writeText(refCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <InvestorShell>
      <div style={{ maxWidth: 720 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Referrals</h1>
          {tier > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                           background: `${tierColor}18`, color: tierColor, border: `1px solid ${tierColor}30` }}>
              {tierLabel}
            </span>
          )}
          {role === "creator" && (
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                           background: "rgba(184,150,10,0.12)", color: C.amber, border: "1px solid rgba(184,150,10,0.25)" }}>
              Creator
            </span>
          )}
        </div>
        <p style={{ margin: "0 0 24px", fontSize: 14, color: C.text3 }}>
          Invite friends to Yieldo. Reach milestones to unlock Creator access.
        </p>

        {/* Referral link + stats */}
        <Card style={{ padding: 20, marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Your referral link</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
            <div style={{ flex: 1, padding: "10px 14px", background: C.surfaceAlt, borderRadius: 8,
                          border: `1px solid ${C.border2}`, fontSize: 13, fontFamily: "monospace",
                          color: refCode ? C.purple : C.text4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {refCode || "Loading your referral link…"}
            </div>
            <button onClick={copy} disabled={!refCode}
              style={{ padding: "10px 18px", borderRadius: 8, border: `1px solid ${C.border2}`,
                       background: C.white, color: refCode ? C.text2 : C.text4, fontSize: 13, fontWeight: 500,
                       cursor: refCode ? "pointer" : "default",
                       fontFamily: "'Inter',sans-serif" }}>
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
            <div style={{ textAlign: "center", padding: "12px 8px", background: C.surfaceAlt, borderRadius: 8 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.purple }}>{clicks}</div>
              <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>Clicks</div>
            </div>
            <div style={{ textAlign: "center", padding: "12px 8px", background: C.surfaceAlt, borderRadius: 8 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.purple }}>{signups}</div>
              <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>Sign-ups</div>
            </div>
            <div style={{ textAlign: "center", padding: "12px 8px", background: C.surfaceAlt, borderRadius: 8 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.green }}>{depositing}</div>
              <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>Depositing</div>
            </div>
            <div style={{ textAlign: "center", padding: "12px 8px", background: C.surfaceAlt, borderRadius: 8,
                          opacity: 0.45, position: "relative" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.text4 }}>—</div>
              <div style={{ fontSize: 11, color: C.text4, marginTop: 2 }}>Earned</div>
              <div style={{ position: "absolute", bottom: 4, left: 0, right: 0, textAlign: "center",
                            fontSize: 9, color: C.text4, letterSpacing: ".03em" }}>coming soon</div>
            </div>
          </div>
        </Card>

        {/* Tier progress */}
        <Card style={{ padding: 20, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {tier < 2
                ? `Progress to ${tier < 1 ? "Active Referrer" : "Top Referrer & Creator unlock"}`
                : "Top Referrer — Creator unlocked"}
            </div>
            <div style={{ fontSize: 12, color: C.text3 }}>
              <span style={{ fontWeight: 600, color: tier >= 2 ? C.amber : C.purple }}>{depositing}</span> / {nextTarget} depositing
            </div>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: C.border2, overflow: "hidden", marginBottom: 12 }}>
            <div style={{ height: "100%", width: `${progress}%`,
                          background: tier >= 2 ? `linear-gradient(90deg,${C.amber},#d4a017)` : C.purpleGrad,
                          borderRadius: 4, transition: "width .4s" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { target: TIER1, label: "Active Referrer", reward: "Referral stats dashboard + points tracking", icon: "📊", color: C.teal },
              { target: TIER2, label: "Top Referrer",    reward: "Creator invite — skip the waitlist entirely", icon: "🎯", color: C.amber },
              { target: null, label: "Elite", reward: "First access to future rewards programs", icon: "⚡", color: C.purple },
            ].map(({ target, label, reward, icon, color }) => {
              const done = target ? depositing >= target : false;
              return (
                <div key={label} style={{ display: "flex", gap: 12, alignItems: "center",
                        padding: "10px 12px", borderRadius: 8,
                        background: done ? "linear-gradient(100deg,rgba(26,157,63,0.04),transparent)" : C.surfaceAlt,
                        border: `1px solid ${done ? C.green + "30" : C.border}`,
                        opacity: !target && !done ? 0.55 : 1 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 7,
                                background: done ? C.greenDim : `${color}12`,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 13, flexShrink: 0 }}>
                    {done ? "✓" : icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: done ? C.green : C.text }}>{label}</span>
                      {target && <span style={{ fontSize: 10, color: C.text4 }}>{target} depositing referrals</span>}
                      {!target && <span style={{ fontSize: 10, color: C.text4 }}>threshold TBA</span>}
                    </div>
                    <div style={{ fontSize: 11, color: C.text3, marginTop: 1 }}>{reward}</div>
                  </div>
                  {done && <span style={{ fontSize: 11, fontWeight: 600, color: C.green, flexShrink: 0 }}>Unlocked</span>}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Yieldo Points — coming soon */}
        <Card style={{ padding: 20, marginBottom: 14, opacity: 0.5 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text3 }}>Yieldo Points</div>
            <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 4,
                           background: C.border, color: C.text4,
                           letterSpacing: ".04em", textTransform: "uppercase" }}>Coming soon</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: C.text4 }}>{points.toLocaleString()}</span>
            <span style={{ fontSize: 12, color: C.text4 }}>pts</span>
          </div>
          <div style={{ fontSize: 12, color: C.text4, lineHeight: 1.5 }}>
            Points track your contribution to Yieldo. Early contributors will be recognized when rewards are announced.
          </div>
        </Card>

        {/* Creator CTA */}
        {role !== "creator" && !tierUnlocked && (
          <div style={{ borderRadius: 14, border: "1px solid rgba(46,154,184,0.2)",
                        background: "linear-gradient(135deg,rgba(46,154,184,0.04),rgba(122,28,203,0.04))",
                        padding: 22 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                          letterSpacing: ".08em", color: C.teal, marginBottom: 6 }}>Creator Program</div>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>
              Turn your referrals into a business
            </div>
            <p style={{ margin: "0 0 14px", fontSize: 13, color: C.text2, lineHeight: 1.5 }}>
              Have an invite code? You can apply now. Or refer {Math.max(TIER2 - depositing, 0)} more depositing users to unlock your invite automatically.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
              {["Personal Creator page","Revenue share","Campaign bonuses","Analytics dashboard"].map(f => (
                <span key={f} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 20,
                                        background: "rgba(46,154,184,0.1)", color: C.teal, fontWeight: 500 }}>
                  ✓ {f}
                </span>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <button onClick={() => setShowBecome(true)}
                style={{ padding: "10px 18px", borderRadius: 8, border: "none", cursor: "pointer",
                         backgroundImage: C.purpleGrad, color: "#fff", fontSize: 13, fontWeight: 600,
                         boxShadow: C.purpleShadow, fontFamily: "'Inter',sans-serif" }}>
                Become a Creator →
              </button>
              <span style={{ fontSize: 13, color: C.text3 }}>
                Need a code — {Math.max(TIER2 - depositing, 0)} referrals away
              </span>
            </div>
          </div>
        )}

        {role !== "creator" && tierUnlocked && (
          <div style={{ borderRadius: 14, border: "1px solid rgba(184,150,10,0.3)",
                        background: "linear-gradient(135deg,rgba(184,150,10,0.06),rgba(184,150,10,0.02))",
                        padding: 22 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ width: 42, height: 42, borderRadius: 12,
                            background: "rgba(184,150,10,0.12)", display: "flex",
                            alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>🎯</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                              letterSpacing: ".08em", color: C.amber, marginBottom: 4 }}>
                  Creator invite unlocked
                </div>
                <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>
                  You've earned Creator access
                </div>
                <p style={{ margin: "0 0 16px", fontSize: 13, color: C.text2, lineHeight: 1.5 }}>
                  You referred {depositing} depositing users — your invite is ready. No code needed. Activate now and get your Founding Creator badge.
                </p>
                <button onClick={() => setShowBecome(true)}
                  style={{ padding: "10px 18px", borderRadius: 8, border: "none", cursor: "pointer",
                           backgroundImage: `linear-gradient(100deg,${C.amber},#d4a017)`,
                           color: "#fff", fontSize: 13, fontWeight: 600,
                           boxShadow: "0 0 18px rgba(184,150,10,0.25)",
                           fontFamily: "'Inter',sans-serif" }}>
                  Claim Creator Access →
                </button>
              </div>
            </div>
          </div>
        )}

        {role === "creator" && (
          <Card style={{ padding: 20 }}>
            <div style={{ fontSize: 13, color: C.text3, marginBottom: 8 }}>
              You're already a Creator.
            </div>
            <a href="/creator" style={{ fontSize: 13, color: C.purple, fontWeight: 600, textDecoration: "none" }}>
              Go to Creator dashboard →
            </a>
          </Card>
        )}
      </div>

      {showBecome && (
        <Suspense fallback={null}>
          <BecomeCreatorModal onClose={() => setShowBecome(false)} unlockedByTier={tierUnlocked} />
        </Suspense>
      )}
    </InvestorShell>
  );
}
