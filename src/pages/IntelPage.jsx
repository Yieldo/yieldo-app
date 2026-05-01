import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_PARTNER_API || 'https://api.yieldo.xyz';

// ---------- Brand tokens (Gradient Horizon) ----------
const BRAND = {
  purple: '#4B0CA6',
  purpleDeep: '#3C0A85',
  purpleLight: '#9E3BFF',
  purpleBg: '#F4EFFC',
  teal: '#00C6B5',
  tealBg: '#E6FAF8',
  tealDeep: '#008A7E',
  ink: '#0F0B1A',
  body: '#3A3548',
  muted: '#6E677E',
  hint: '#A19DAB',
  border: '#E6E2EE',
  borderLight: '#F1EEF5',
  bg: '#FFFFFF',
  bgSoft: '#FAF8FC',
  highBg: '#FDF1F0',
  highBorder: '#F5C9C5',
  highInk: '#9A2D24',
  highAccent: '#D63B2C',
  medBg: '#FFF7E8',
  medBorder: '#F0DDB0',
  medInk: '#8A5A0C',
  medAccent: '#C68A1F',
  posInk: '#0F8C7A',
  negInk: '#C03B2C',
};

const FONT_STACK = `'Calibri', 'Segoe UI', system-ui, -apple-system, sans-serif`;
const FONT_MONO = `'SF Mono', 'JetBrains Mono', 'Menlo', monospace`;

const DIMENSION_FILTERS = ['All signals', 'Risk', 'Performance', 'Capital', 'Trust'];
const TIME_FILTERS = ['24h', '7d', '30d'];

// ---------- Subcomponents ----------

function SectionHeader({ dot, label, count }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot, display: 'inline-block' }} />
        <h2 style={{ fontSize: 12, fontWeight: 600, margin: 0, letterSpacing: '0.08em', textTransform: 'uppercase', color: BRAND.muted }}>
          {label}
        </h2>
      </div>
      <span style={{ fontSize: 11, color: BRAND.hint, fontFamily: FONT_MONO, letterSpacing: '0.02em' }}>{count}</span>
    </div>
  );
}

function RuleIdBadge({ id }) {
  if (!id) return null;
  return (
    <span style={{ fontFamily: FONT_MONO, fontSize: 10, fontWeight: 500, color: BRAND.muted, background: BRAND.bgSoft, border: `1px solid ${BRAND.borderLight}`, padding: '2px 6px', borderRadius: 3, letterSpacing: '0.02em' }}>
      {id}
    </span>
  );
}

function MetricCell({ label, value, delta, deltaTone, isText }) {
  return (
    <div style={{ background: BRAND.bgSoft, padding: '10px 12px', borderRadius: 6, border: `1px solid ${BRAND.borderLight}` }}>
      <div style={{ fontSize: 11, color: BRAND.muted, marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: isText ? 13 : 16, fontWeight: 600, color: BRAND.ink, paddingTop: isText ? 2 : 0 }}>{value}</span>
        {delta && (
          <span style={{ fontSize: 11, fontWeight: 500, color: deltaTone === 'neg' ? BRAND.negInk : BRAND.posInk }}>
            {delta}
          </span>
        )}
      </div>
    </div>
  );
}

function HighSignalCard({ signal, onPrimary, onSecondary }) {
  return (
    <div style={{ background: BRAND.bg, border: `1px solid ${BRAND.border}`, borderLeft: `3px solid ${BRAND.highAccent}`, borderRadius: 10, padding: '20px 22px', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: BRAND.highInk, background: BRAND.highBg, border: `1px solid ${BRAND.highBorder}`, padding: '3px 9px', borderRadius: 3, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {signal.label || signal.tag}
        </span>
        <RuleIdBadge id={signal.id} />
        <span style={{ fontSize: 11, color: BRAND.hint, marginLeft: 'auto' }}>{signal.timeAgo}</span>
      </div>
      <h3 style={{ fontSize: 17, fontWeight: 600, margin: '0 0 8px', color: BRAND.ink, letterSpacing: '-0.005em', lineHeight: 1.35 }}>
        {signal.headline}
      </h3>
      <p style={{ fontSize: 13, color: BRAND.body, margin: '0 0 16px', lineHeight: 1.55 }}>{signal.summary}</p>

      {signal.metrics && signal.metrics.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(signal.metrics.length, 4)}, 1fr)`, gap: 10, marginBottom: 16 }}>
          {signal.metrics.map((m, i) => <MetricCell key={i} {...m} />)}
        </div>
      )}

      {signal.affected && signal.affected.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          {signal.affected.map((v, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 13px', background: BRAND.bgSoft, border: `1px solid ${BRAND.borderLight}`, borderRadius: 6, fontSize: 13 }}>
              <span style={{ color: BRAND.ink, fontWeight: 500 }}>{v.name}</span>
              <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: BRAND.negInk, fontWeight: 500 }}>
                {v.from} → {v.to}
              </span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onPrimary} style={{ padding: '8px 16px', fontSize: 13, background: BRAND.purple, color: 'white', border: 'none', borderRadius: 6, fontWeight: 500, cursor: 'pointer', fontFamily: FONT_STACK }}>
          {signal.primaryCta || 'View vault'} →
        </button>
        {signal.secondaryCta && (
          <button onClick={onSecondary} style={{ padding: '8px 16px', fontSize: 13, background: 'transparent', color: BRAND.ink, border: `1px solid ${BRAND.border}`, borderRadius: 6, fontWeight: 500, cursor: 'pointer', fontFamily: FONT_STACK }}>
            {signal.secondaryCta}
          </button>
        )}
      </div>
    </div>
  );
}

function NotableSignalRow({ signal, isLast, onClick }) {
  return (
    <div onClick={onClick} style={{ padding: '15px 18px', borderBottom: isLast ? 'none' : `1px solid ${BRAND.borderLight}`, display: 'flex', gap: 14, alignItems: 'flex-start', cursor: signal.vaultId ? 'pointer' : 'default' }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: BRAND.medInk, background: BRAND.medBg, border: `1px solid ${BRAND.medBorder}`, padding: '3px 8px', borderRadius: 3, letterSpacing: '0.04em', flexShrink: 0, marginTop: 2, whiteSpace: 'nowrap' }}>
        {signal.tag}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: BRAND.ink }}>{signal.title}</span>
          <RuleIdBadge id={signal.id} />
        </div>
        <div style={{ fontSize: 12, color: BRAND.body, lineHeight: 1.5 }}>{signal.desc}</div>
      </div>
      <span style={{ fontSize: 11, color: BRAND.hint, flexShrink: 0, fontFamily: FONT_MONO }}>{signal.timeAgo}</span>
    </div>
  );
}

function ActivityRow({ row, onClick }) {
  const tone = row.tone === 'pos' ? BRAND.posInk : row.tone === 'neg' ? BRAND.negInk : BRAND.hint;
  return (
    <div onClick={onClick} style={{ padding: '11px 18px', display: 'grid', gridTemplateColumns: '90px 1fr 60px 60px', gap: 12, fontSize: 12, alignItems: 'center', borderBottom: `1px solid ${BRAND.borderLight}`, cursor: row.vaultId ? 'pointer' : 'default' }}>
      <span style={{ color: BRAND.hint, fontSize: 11, fontFamily: FONT_MONO }}>{row.time}</span>
      <span style={{ color: BRAND.ink }}>{row.desc}</span>
      <span style={{ color: tone, fontWeight: 500, fontFamily: FONT_MONO, fontSize: 12 }}>{row.delta}</span>
      <span style={{ color: BRAND.muted, textAlign: 'right', fontFamily: FONT_MONO, fontSize: 12 }}>{row.score ?? '—'}</span>
    </div>
  );
}

function FilterPill({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{ padding: '7px 14px', fontSize: 12, fontWeight: 500, border: active ? `1px solid ${BRAND.purple}` : `1px solid ${BRAND.border}`, background: active ? BRAND.purpleBg : 'transparent', color: active ? BRAND.purpleDeep : BRAND.body, borderRadius: 16, cursor: 'pointer', fontFamily: FONT_STACK, transition: 'all 0.15s ease' }}>
      {label}
    </button>
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
    const id = setInterval(fetchFeed, 60_000); // refresh every 60s
    return () => clearInterval(id);
  }, [fetchFeed]);

  const high = feed?.high || [];
  const notable = feed?.notable || [];
  const activity = feed?.activity || [];
  const totals = feed?.totals || {};
  const engine = feed?.engine || {};

  const visibleNotable = useMemo(() => (showAllNotable ? notable : notable.slice(0, 5)), [showAllNotable, notable]);
  const visibleActivity = useMemo(() => (showAllActivity ? activity : activity.slice(0, 5)), [showAllActivity, activity]);

  const todayLabel = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const goToVault = (vaultId) => {
    if (vaultId) navigate(`/vault/${encodeURIComponent(vaultId)}`);
  };

  return (
    <div style={{ fontFamily: FONT_STACK, background: BRAND.bgSoft, minHeight: '100vh', color: BRAND.ink, padding: '24px 16px 60px' }}>
      <div style={{ maxWidth: 920, margin: '0 auto', background: BRAND.bg, border: `1px solid ${BRAND.border}`, borderRadius: 12, overflow: 'hidden' }}>
        {/* Top nav */}
        <div style={{ background: BRAND.bg, borderBottom: `1px solid ${BRAND.border}`, padding: '14px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: `linear-gradient(135deg, ${BRAND.purple} 0%, ${BRAND.purpleLight} 100%)` }} />
            <span style={{ fontWeight: 600, fontSize: 15, color: BRAND.ink }}>Yieldo</span>
            <span style={{ fontSize: 13, color: BRAND.hint }}>/ intel</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 12, color: BRAND.muted }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: BRAND.teal, display: 'inline-block', boxShadow: `0 0 0 3px ${BRAND.tealBg}` }} />
              Engine live · scanning {engine.vaults ?? '…'} vaults
            </span>
            <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: BRAND.hint }}>
              Updated {engine.lastCycleAgo || '…'}
            </span>
          </div>
        </div>

        {/* Page header */}
        <div style={{ background: BRAND.bg, padding: '28px 22px 22px', borderBottom: `1px solid ${BRAND.border}` }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
            <h1 style={{ fontSize: 26, fontWeight: 600, margin: 0, letterSpacing: '-0.02em', color: BRAND.ink }}>Intel</h1>
            <span style={{ fontSize: 12, color: BRAND.hint, fontFamily: FONT_MONO }}>{todayLabel}</span>
          </div>
          <p style={{ fontSize: 14, color: BRAND.body, margin: '0 0 18px', maxWidth: 560, lineHeight: 1.55 }}>
            Live signals from the scoring engine. Vault score changes, risk events, curator activity.
          </p>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {DIMENSION_FILTERS.map((f) => (
              <FilterPill key={f} label={f} active={activeDimension === f} onClick={() => setActiveDimension(f)} />
            ))}
            <span style={{ width: 1, height: 18, background: BRAND.border, margin: '0 6px' }} />
            {TIME_FILTERS.map((f) => (
              <FilterPill key={f} label={f} active={activeTime === f} onClick={() => setActiveTime(f)} />
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 22px 22px' }}>
          {error && (
            <div style={{ background: BRAND.highBg, border: `1px solid ${BRAND.highBorder}`, color: BRAND.highInk, borderRadius: 8, padding: '12px 16px', fontSize: 13, marginBottom: 16 }}>
              Failed to load Intel feed: {error}
            </div>
          )}

          {loading && !feed && (
            <div style={{ background: BRAND.bg, border: `1px dashed ${BRAND.border}`, borderRadius: 10, padding: 32, textAlign: 'center', fontSize: 13, color: BRAND.muted }}>
              Loading signals…
            </div>
          )}

          {feed && (
            <>
              {/* HIGH tier */}
              <SectionHeader dot={BRAND.highAccent} label="What matters today" count={`${high.length} signals · last ${activeTime}`} />
              {high.length === 0 ? (
                <div style={{ background: BRAND.bg, border: `1px dashed ${BRAND.border}`, borderRadius: 10, padding: 24, textAlign: 'center', fontSize: 13, color: BRAND.muted }}>
                  No high-importance signals in the last {activeTime}. Engine scanning {engine.vaults ?? 0} vaults.
                </div>
              ) : (
                high.map((s) => (
                  <HighSignalCard
                    key={s.signalId || s.id}
                    signal={s}
                    onPrimary={() => goToVault(s.vaultId)}
                    onSecondary={() => goToVault(s.vaultId)}
                  />
                ))
              )}

              {/* MEDIUM tier */}
              <div style={{ marginTop: 32 }}>
                <SectionHeader dot={BRAND.medAccent} label="Notable signals" count={`${totals.notable ?? notable.length} in last ${activeTime}`} />
                {notable.length === 0 ? (
                  <div style={{ background: BRAND.bg, border: `1px dashed ${BRAND.border}`, borderRadius: 10, padding: 18, textAlign: 'center', fontSize: 12, color: BRAND.muted }}>
                    No notable signals in this window.
                  </div>
                ) : (
                  <div style={{ background: BRAND.bg, border: `1px solid ${BRAND.border}`, borderRadius: 10, overflow: 'hidden' }}>
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
                {notable.length > 5 && (
                  <button onClick={() => setShowAllNotable(!showAllNotable)} style={{ marginTop: 10, width: '100%', padding: 11, fontSize: 13, background: 'transparent', color: BRAND.muted, border: `1px solid ${BRAND.border}`, borderRadius: 6, cursor: 'pointer', fontFamily: FONT_STACK, fontWeight: 500 }}>
                    {showAllNotable ? 'Show less' : `Show ${notable.length - 5} more signals`}
                  </button>
                )}
              </div>

              {/* LOW tier */}
              <div style={{ marginTop: 32 }}>
                <SectionHeader dot={BRAND.hint} label="All activity" count={`${totals.activity ?? activity.length} changes · ${activeTime}`} />
                {activity.length === 0 ? (
                  <div style={{ background: BRAND.bg, border: `1px dashed ${BRAND.border}`, borderRadius: 10, padding: 18, textAlign: 'center', fontSize: 12, color: BRAND.muted }}>
                    No score changes recorded in this window.
                  </div>
                ) : (
                  <div style={{ background: BRAND.bg, border: `1px solid ${BRAND.border}`, borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ padding: '10px 18px', display: 'grid', gridTemplateColumns: '90px 1fr 60px 60px', gap: 12, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: BRAND.hint, borderBottom: `1px solid ${BRAND.borderLight}`, background: BRAND.bgSoft }}>
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
                {activity.length > 5 && (
                  <button onClick={() => setShowAllActivity(!showAllActivity)} style={{ marginTop: 10, width: '100%', padding: 11, fontSize: 13, background: 'transparent', color: BRAND.muted, border: `1px solid ${BRAND.border}`, borderRadius: 6, cursor: 'pointer', fontFamily: FONT_STACK, fontWeight: 500 }}>
                    {showAllActivity ? 'Show less' : `Show all ${totals.activity ?? activity.length} changes`}
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ background: BRAND.bgSoft, padding: '18px 22px', borderTop: `1px solid ${BRAND.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: BRAND.muted, flexWrap: 'wrap', gap: 12 }}>
          <span>Powered by Yieldo scoring engine · v2.1</span>
          <div style={{ display: 'flex', gap: 18 }}>
            <a href="https://docs.yieldo.xyz" target="_blank" rel="noreferrer" style={{ color: BRAND.muted, textDecoration: 'none', fontWeight: 500 }}>Methodology</a>
            <a href={`${API_BASE}/v1/intel/rules`} target="_blank" rel="noreferrer" style={{ color: BRAND.muted, textDecoration: 'none', fontWeight: 500 }}>Alert rules</a>
            <a href={`${API_BASE}/docs`} target="_blank" rel="noreferrer" style={{ color: BRAND.muted, textDecoration: 'none', fontWeight: 500 }}>API</a>
          </div>
        </div>
      </div>
    </div>
  );
}
