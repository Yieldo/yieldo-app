import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import InvestorShell from '../components/InvestorShell.jsx';

const API_BASE = import.meta.env.VITE_PARTNER_API || 'https://api.yieldo.xyz';

// ---------- Brand tokens ----------
const C = {
  purple: '#7A1CCB',
  purpleDeep: '#5A0D9C',
  purpleLight: '#9E3BFF',
  purpleBg: '#F4EFFC',
  purpleGrad: 'linear-gradient(135deg, #7A1CCB 0%, #9E3BFF 100%)',
  teal: '#00C6B5',
  tealBg: '#E6FAF8',
  ink: '#0F0B1A',
  body: '#3A3548',
  muted: '#6E677E',
  hint: '#A19DAB',
  border: 'rgba(15,11,26,.07)',
  borderLight: 'rgba(15,11,26,.04)',
  bg: '#FFFFFF',
  bgSoft: '#FAF8FC',
  highBg: '#FDF1F0',
  highBorder: 'rgba(214,59,44,.18)',
  highInk: '#9A2D24',
  highAccent: '#D63B2C',
  medBg: '#FFF7E8',
  medBorder: 'rgba(198,138,31,.22)',
  medInk: '#8A5A0C',
  medAccent: '#C68A1F',
  posInk: '#0F8C7A',
  negInk: '#C03B2C',
  shadow: '0 1px 3px rgba(15,11,26,.04), 0 4px 12px rgba(15,11,26,.04)',
  shadowHover: '0 1px 3px rgba(15,11,26,.06), 0 8px 24px rgba(15,11,26,.08)',
};

const FONT_MONO = `'JetBrains Mono', 'SF Mono', Menlo, monospace`;

const DIMENSION_FILTERS = ['All signals', 'Risk', 'Performance', 'Capital', 'Trust'];
const TIME_FILTERS = ['24h', '7d', '30d'];

// ---------- Subcomponents ----------

function SectionHeader({ dot, label, count, accent }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingLeft: 2 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: dot, display: 'inline-block', boxShadow: accent ? `0 0 0 4px ${accent}` : 'none' }} />
        <h2 style={{ fontSize: 12, fontWeight: 700, margin: 0, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted }}>{label}</h2>
      </div>
      <span style={{ fontSize: 11, color: C.hint, fontFamily: FONT_MONO }}>{count}</span>
    </div>
  );
}

function RuleIdBadge({ id }) {
  if (!id) return null;
  return (
    <span style={{ fontFamily: FONT_MONO, fontSize: 10, fontWeight: 500, color: C.muted, background: C.bgSoft, border: `1px solid ${C.borderLight}`, padding: '2px 7px', borderRadius: 4 }}>
      {id}
    </span>
  );
}

function MetricCell({ label, value, delta, deltaTone, isText }) {
  return (
    <div style={{ background: C.bgSoft, padding: '12px 14px', borderRadius: 8, border: `1px solid ${C.borderLight}` }}>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 5, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
        <span style={{ fontSize: isText ? 13 : 18, fontWeight: 700, color: C.ink, paddingTop: isText ? 2 : 0, letterSpacing: '-.01em' }}>{value}</span>
        {delta && (
          <span style={{ fontSize: 11, fontWeight: 600, color: deltaTone === 'neg' ? C.negInk : C.posInk }}>{delta}</span>
        )}
      </div>
    </div>
  );
}

function AffectedVaultsModal({ signal, onClose, onVaultClick }) {
  if (!signal) return null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,11,26,.55)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.bg, borderRadius: 14, maxWidth: 520, width: '100%', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(15,11,26,.25)' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.highInk, background: C.highBg, border: `1px solid ${C.highBorder}`, padding: '3px 9px', borderRadius: 4, letterSpacing: '.06em', textTransform: 'uppercase', display: 'inline-block', marginBottom: 8 }}>
              {signal.label || signal.tag} · {signal.id}
            </div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.ink, lineHeight: 1.3 }}>{signal.headline}</h3>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 22, color: C.muted, padding: 0, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '16px 24px' }}>
          <p style={{ fontSize: 13, color: C.body, margin: '0 0 16px', lineHeight: 1.5 }}>{signal.summary}</p>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
            Affected vaults ({signal.affected?.length || 0})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(signal.affected || []).map((v, i) => {
              const clickable = !!v.vaultId;
              const tone = (v.delta != null ? (v.delta < 0 ? C.negInk : C.posInk) : C.negInk);
              const inner = (
                <>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 2 }}>
                      {v.name}
                      {v.chain && <span style={{ color: C.muted, fontSize: 11, fontWeight: 400, marginLeft: 6 }}>({v.chain})</span>}
                    </div>
                    {v.asset && <div style={{ fontSize: 10, color: C.hint, fontFamily: FONT_MONO }}>{v.asset}</div>}
                  </div>
                  <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: tone, fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {v.from} → {v.to}{v.delta != null && <span style={{ marginLeft: 6, opacity: .7 }}>({v.delta > 0 ? '+' : ''}{v.delta})</span>}
                  </span>
                </>
              );
              return clickable ? (
                <a key={i} onClick={(e) => { e.preventDefault(); onVaultClick(v.vaultId); }} href={`/vault/${encodeURIComponent(v.vaultId)}`} target="_blank" rel="noopener noreferrer"
                   style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: C.bgSoft, border: `1px solid ${C.borderLight}`, borderRadius: 8, textDecoration: 'none', cursor: 'pointer' }}>
                  {inner}
                  <span style={{ color: C.muted, fontSize: 13 }}>→</span>
                </a>
              ) : (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: C.bgSoft, border: `1px solid ${C.borderLight}`, borderRadius: 8 }}>
                  {inner}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function HighSignalCard({ signal, onPrimary, onSecondary, onAffectedClick, onCardClick }) {
  const [hover, setHover] = useState(false);
  // Card is clickable when there's somewhere to go (single vault OR affected list).
  const cardClickable = !!(signal.vaultId || signal.affected?.length);

  // Stop propagation on inner buttons + links so clicking them doesn't ALSO
  // trigger the card-level click (would otherwise fire twice).
  const stop = (handler) => (e) => { e.stopPropagation(); handler?.(e); };

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={cardClickable ? onCardClick : undefined}
      role={cardClickable ? 'button' : undefined}
      tabIndex={cardClickable ? 0 : undefined}
      onKeyDown={cardClickable ? (e) => { if (e.key === 'Enter') onCardClick?.(); } : undefined}
      style={{
        background: C.bg,
        border: `1px solid ${hover ? 'rgba(214,59,44,.25)' : C.border}`,
        borderLeft: `3px solid ${C.highAccent}`,
        borderRadius: 12,
        padding: '22px 24px',
        marginBottom: 14,
        boxShadow: hover ? C.shadowHover : C.shadow,
        transition: 'all .18s ease',
        cursor: cardClickable ? 'pointer' : 'default',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: C.highInk, background: C.highBg, border: `1px solid ${C.highBorder}`, padding: '4px 10px', borderRadius: 4, letterSpacing: '.07em', textTransform: 'uppercase' }}>
          {signal.label || signal.tag}
        </span>
        <RuleIdBadge id={signal.id} />
        <span style={{ fontSize: 11, color: C.hint, marginLeft: 'auto', fontFamily: FONT_MONO }}>{signal.timeAgo}</span>
      </div>
      <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 10px', color: C.ink, letterSpacing: '-.015em', lineHeight: 1.32 }}>
        {signal.headline}
      </h3>
      <p style={{ fontSize: 13.5, color: C.body, margin: '0 0 18px', lineHeight: 1.55 }}>{signal.summary}</p>

      {signal.metrics && signal.metrics.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(signal.metrics.length, 4)}, 1fr)`, gap: 10, marginBottom: 18 }}>
          {signal.metrics.map((m, i) => <MetricCell key={i} {...m} />)}
        </div>
      )}

      {signal.affected && signal.affected.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
          {signal.affected.map((v, i) => {
            const clickable = !!v.vaultId;
            const inner = (
              <>
                <span style={{ color: C.ink, fontWeight: 500, display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  {v.name}
                  {v.chain && (
                    <span style={{ color: C.muted, fontSize: 11, fontWeight: 400 }}>({v.chain})</span>
                  )}
                  {v.asset && !v.name?.toUpperCase()?.includes(v.asset.toUpperCase()) && (
                    <span style={{ color: C.hint, fontSize: 11, fontWeight: 400, fontFamily: FONT_MONO }}>{v.asset}</span>
                  )}
                </span>
                <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: (v.delta != null ? (v.delta < 0 ? C.negInk : C.posInk) : C.negInk), fontWeight: 600 }}>{v.from} → {v.to}</span>
              </>
            );
            return clickable ? (
              <a
                key={i}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAffectedClick?.(v.vaultId); }}
                href={`/vault/${encodeURIComponent(v.vaultId)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: C.bgSoft, border: `1px solid ${C.borderLight}`, borderRadius: 7, fontSize: 13, textDecoration: 'none', cursor: 'pointer' }}
              >
                {inner}
              </a>
            ) : (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: C.bgSoft, border: `1px solid ${C.borderLight}`, borderRadius: 7, fontSize: 13 }}>
                {inner}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={stop(onPrimary)} style={{ padding: '9px 18px', fontSize: 13, backgroundImage: C.purpleGrad, color: 'white', border: 'none', borderRadius: 7, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(122,28,203,.25)' }}>
          {signal.primaryCta || 'View vault'} →
        </button>
        {signal.secondaryCta && (
          <button onClick={stop(onSecondary)} style={{ padding: '9px 18px', fontSize: 13, background: 'transparent', color: C.ink, border: `1px solid ${C.border}`, borderRadius: 7, fontWeight: 600, cursor: 'pointer' }}>
            {signal.secondaryCta}
          </button>
        )}
      </div>
    </div>
  );
}

function NotableSignalRow({ signal, isLast, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '16px 20px',
        borderBottom: isLast ? 'none' : `1px solid ${C.borderLight}`,
        display: 'flex', gap: 14, alignItems: 'flex-start',
        cursor: signal.vaultId ? 'pointer' : 'default',
        background: hover && signal.vaultId ? C.bgSoft : 'transparent',
        transition: 'background .12s',
      }}
    >
      <span style={{ fontSize: 10, fontWeight: 700, color: C.medInk, background: C.medBg, border: `1px solid ${C.medBorder}`, padding: '4px 9px', borderRadius: 4, letterSpacing: '.05em', flexShrink: 0, marginTop: 2, whiteSpace: 'nowrap' }}>
        {signal.tag}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: C.ink, letterSpacing: '-.005em' }}>{signal.title}</span>
          <RuleIdBadge id={signal.id} />
        </div>
        <div style={{ fontSize: 12.5, color: C.body, lineHeight: 1.5 }}>{signal.desc}</div>
      </div>
      <span style={{ fontSize: 11, color: C.hint, flexShrink: 0, fontFamily: FONT_MONO }}>{signal.timeAgo}</span>
    </div>
  );
}

function ActivityRow({ row, onClick }) {
  const [hover, setHover] = useState(false);
  const tone = row.tone === 'pos' ? C.posInk : row.tone === 'neg' ? C.negInk : C.hint;
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '12px 20px',
        display: 'grid',
        gridTemplateColumns: '92px 1fr 70px 60px',
        gap: 12, fontSize: 12, alignItems: 'center',
        borderBottom: `1px solid ${C.borderLight}`,
        cursor: row.vaultId ? 'pointer' : 'default',
        background: hover && row.vaultId ? C.bgSoft : 'transparent',
        transition: 'background .12s',
      }}
    >
      <span style={{ color: C.hint, fontSize: 11, fontFamily: FONT_MONO }}>{row.time}</span>
      <span style={{ color: C.ink, fontWeight: 500 }}>{row.desc}</span>
      <span style={{ color: tone, fontWeight: 600, fontFamily: FONT_MONO, fontSize: 12 }}>{row.delta}</span>
      <span style={{ color: C.muted, textAlign: 'right', fontFamily: FONT_MONO, fontSize: 12, fontWeight: 600 }}>{row.score ?? '—'}</span>
    </div>
  );
}

function FilterPill({ label, active, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '8px 16px', fontSize: 12.5, fontWeight: 600,
        border: active ? `1px solid ${C.purple}` : `1px solid ${C.border}`,
        background: active ? C.purpleBg : (hover ? C.bgSoft : 'transparent'),
        color: active ? C.purpleDeep : C.body,
        borderRadius: 18, cursor: 'pointer',
        transition: 'all .15s ease',
      }}
    >
      {label}
    </button>
  );
}

function StatCard({ label, value, hint }) {
  return (
    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 18px', flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: C.ink, letterSpacing: '-.02em' }}>{value}</div>
      {hint && <div style={{ fontSize: 11, color: C.hint, marginTop: 3, fontFamily: FONT_MONO }}>{hint}</div>}
    </div>
  );
}

// ---------- Main page ----------

export default function IntelPage() {
  const navigate = useNavigate();
  const [activeDimension, setActiveDimension] = useState('All signals');
  const [activeTime, setActiveTime] = useState('24h');
  const [showAllNotable, setShowAllNotable] = useState(false);
  const [showAllActivity, setShowAllActivity] = useState(false);

  const [feed, setFeed] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalSignal, setModalSignal] = useState(null); // for "View correlation" / "All affected"

  const fetchFeed = useCallback(async () => {
    setError(null);
    try {
      const params = new URLSearchParams({ since: activeTime });
      if (activeDimension !== 'All signals') params.set('dimension', activeDimension);
      const r = await fetch(`${API_BASE}/v1/intel/feed?${params}`);
      if (!r.ok) throw new Error(`API ${r.status}`);
      const data = await r.json();
      setFeed(data);
    } catch (e) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [activeDimension, activeTime]);

  useEffect(() => {
    setLoading(true);
    fetchFeed();
    const id = setInterval(fetchFeed, 60_000);
    return () => clearInterval(id);
  }, [fetchFeed]);

  const high = feed?.high || [];
  const notable = feed?.notable || [];
  const activity = feed?.activity || [];
  const totals = feed?.totals || {};
  const engine = feed?.engine || {};

  const visibleNotable = useMemo(() => (showAllNotable ? notable : notable.slice(0, 6)), [showAllNotable, notable]);
  const visibleActivity = useMemo(() => (showAllActivity ? activity : activity.slice(0, 8)), [showAllActivity, activity]);

  const todayLabel = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  // Open vault detail in a new tab so users don't lose their place on the
  // Intel feed (often scanning multiple signals).
  const goToVault = (vaultId) => {
    if (!vaultId) return;
    window.open(`/vault/${encodeURIComponent(vaultId)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <InvestorShell maxWidth={1280}>
      {/* Page header — gradient hero */}
      <div style={{
        background: `linear-gradient(135deg, ${C.purpleBg} 0%, #ffffff 60%)`,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: '28px 28px 24px',
        marginBottom: 20,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* decorative gradient orb */}
        <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(122,28,203,.10), transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, position: 'relative' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 11px', background: 'rgba(255,255,255,.7)', border: `1px solid ${C.border}`, borderRadius: 999, fontSize: 11, fontWeight: 600, color: C.purpleDeep, letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 14 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.teal, boxShadow: `0 0 0 3px ${C.tealBg}` }} />
              Live · Engine scanning {engine.vaults ?? '…'} vaults
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 6px', color: C.ink, letterSpacing: '-.025em', lineHeight: 1.1 }}>Intel</h1>
            <p style={{ fontSize: 14.5, color: C.body, margin: 0, maxWidth: 620, lineHeight: 1.5 }}>
              Live signals from the Yieldo scoring engine. Score moves, risk events, curator activity — surfaced the moment they happen.
            </p>
          </div>
          <div style={{ textAlign: 'right', fontSize: 11, color: C.hint, fontFamily: FONT_MONO, flexShrink: 0 }}>
            <div>{todayLabel}</div>
            <div>Refreshed {engine.lastCycleAgo || '…'}</div>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 22 }}>
          {DIMENSION_FILTERS.map((f) => (
            <FilterPill key={f} label={f} active={activeDimension === f} onClick={() => setActiveDimension(f)} />
          ))}
          <span style={{ width: 1, height: 22, background: C.border, margin: '0 8px' }} />
          {TIME_FILTERS.map((f) => (
            <FilterPill key={f} label={f} active={activeTime === f} onClick={() => setActiveTime(f)} />
          ))}
          <a href="https://docs.yieldo.xyz/Scoring/four-dimensions" target="_blank" rel="noopener noreferrer"
             style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: C.purpleDeep, textDecoration: 'none', padding: '5px 10px', borderRadius: 999, border: `1px solid ${C.border}`, background: 'rgba(255,255,255,.7)' }}>
            Score breakdown ↗
          </a>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatCard label="High signals" value={high.length} hint={`last ${activeTime}`} />
        <StatCard label="Notable" value={totals.notable ?? notable.length} hint={`last ${activeTime}`} />
        <StatCard label="Activity events" value={totals.activity ?? activity.length} hint={`last ${activeTime}`} />
        <StatCard label="Vaults monitored" value={engine.vaults ?? '—'} hint="across 7 chains" />
      </div>

      {error && (
        <div style={{ background: C.highBg, border: `1px solid ${C.highBorder}`, color: C.highInk, borderRadius: 10, padding: '14px 18px', fontSize: 13, marginBottom: 18 }}>
          Failed to load Intel feed: {error}
        </div>
      )}

      {loading && !feed && (
        <div style={{ background: C.bg, border: `1px dashed ${C.border}`, borderRadius: 12, padding: 40, textAlign: 'center', fontSize: 13, color: C.muted }}>
          Loading signals…
        </div>
      )}

      {feed && (
        <>
          {/* HIGH tier */}
          <SectionHeader dot={C.highAccent} accent="rgba(214,59,44,.12)" label="What matters today" count={`${high.length} · last ${activeTime}`} />
          {high.length === 0 ? (
            <div style={{ background: C.bg, border: `1px dashed ${C.border}`, borderRadius: 12, padding: 28, textAlign: 'center', fontSize: 13, color: C.muted, marginBottom: 28 }}>
              No high-importance signals in the last {activeTime}. Engine scanning {engine.vaults ?? 0} vaults · all clear.
            </div>
          ) : (
            <div style={{ marginBottom: 28 }}>
              {high.map((s) => (
                <HighSignalCard
                  key={s.signalId || s.id}
                  signal={s}
                  onPrimary={() => {
                    if (s.vaultId) goToVault(s.vaultId);
                    else if (s.affected?.length) setModalSignal(s);
                  }}
                  onSecondary={() => {
                    if (s.affected?.length && (s.secondaryCta?.toLowerCase().includes('affected') || s.secondaryCta?.toLowerCase().includes('correlation'))) {
                      setModalSignal(s);
                    } else if (s.vaultId) {
                      goToVault(s.vaultId);
                    }
                  }}
                  onAffectedClick={goToVault}
                  onCardClick={() => {
                    // Whole-card click goes to the vault (single-vault) or
                    // opens the affected list (multi-vault). Makes scanning
                    // faster — users don't need to hit the small CTA button.
                    if (s.vaultId) goToVault(s.vaultId);
                    else if (s.affected?.length) setModalSignal(s);
                  }}
                />
              ))}
            </div>
          )}

          {/* MEDIUM tier */}
          <SectionHeader dot={C.medAccent} accent="rgba(198,138,31,.14)" label="Notable signals" count={`${totals.notable ?? notable.length} · last ${activeTime}`} />
          {notable.length === 0 ? (
            <div style={{ background: C.bg, border: `1px dashed ${C.border}`, borderRadius: 12, padding: 22, textAlign: 'center', fontSize: 12, color: C.muted, marginBottom: 28 }}>
              No notable signals in this window.
            </div>
          ) : (
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', boxShadow: C.shadow, marginBottom: 28 }}>
              {visibleNotable.map((s, i) => (
                <NotableSignalRow
                  key={s.signalId || `${s.id}-${i}`}
                  signal={s}
                  isLast={i === visibleNotable.length - 1}
                  onClick={() => goToVault(s.vaultId)}
                />
              ))}
            </div>
          )}
          {notable.length > 6 && (
            <button onClick={() => setShowAllNotable(!showAllNotable)} style={{ marginBottom: 28, width: '100%', padding: 12, fontSize: 13, background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
              {showAllNotable ? 'Show less' : `Show ${notable.length - 6} more notable signals`}
            </button>
          )}

          {/* LOW tier — full width at the bottom (per design spec) */}
          <SectionHeader dot={C.hint} label="All activity" count={`${totals.activity ?? activity.length} · ${activeTime}`} />
          {activity.length === 0 ? (
            <div style={{ background: C.bg, border: `1px dashed ${C.border}`, borderRadius: 12, padding: 22, textAlign: 'center', fontSize: 12, color: C.muted }}>
              No score changes recorded.
            </div>
          ) : (
            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', boxShadow: C.shadow }}>
              <div style={{ padding: '11px 20px', display: 'grid', gridTemplateColumns: '120px 1fr 70px 60px', gap: 12, fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: C.hint, borderBottom: `1px solid ${C.borderLight}`, background: C.bgSoft }}>
                <span>Time</span>
                <span>Event</span>
                <span>Δ</span>
                <span style={{ textAlign: 'right' }}>Score</span>
              </div>
              {visibleActivity.map((row, i) => (
                <ActivityRow key={row.signalId || i} row={row} onClick={() => goToVault(row.vaultId)} />
              ))}
            </div>
          )}
          {activity.length > 8 && (
            <button onClick={() => setShowAllActivity(!showAllActivity)} style={{ marginTop: 10, width: '100%', padding: 12, fontSize: 13, background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
              {showAllActivity ? 'Show less' : `Show all ${totals.activity ?? activity.length} events`}
            </button>
          )}
        </>
      )}

      {/* Affected-vaults modal (for "View correlation" / "All affected vaults" CTAs) */}
      <AffectedVaultsModal
        signal={modalSignal}
        onClose={() => setModalSignal(null)}
        onVaultClick={(vid) => { setModalSignal(null); goToVault(vid); }}
      />
    </InvestorShell>
  );
}
