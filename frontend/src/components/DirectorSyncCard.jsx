import { useState, useEffect, useRef } from 'react';
import { propagateSync } from '../services/apiClient';

// ── Type icon map ──────────────────────────────────────────────────────────────
const TYPE_ICONS = {
  character:   '🎭',
  voice:       '🎙️',
  environment: '🏔️',
  scene:       '🎬',
  storyboard:  '📋',
  poster:      '🖼️',
  trailer:     '🎞️',
};

const TYPE_LABELS = {
  character:   'Characters',
  voice:       'Voices',
  environment: 'Environments',
  scene:       'Scenes',
  storyboard:  'Storyboards',
  poster:      'Posters',
  trailer:     'Trailers',
};

/**
 * DirectorSyncCard
 *
 * A floating dark-glass card that auto-appears after any asset is saved.
 * Shows what changed, what is affected, estimated cost, and a Sync button.
 *
 * Props:
 *   projectId    {number}   - The current project ID
 *   impactData   {object}   - Result from analyzeImpact() API call
 *   onDismiss    {function} - Called when card is dismissed or sync completed
 *   onSynced     {function} - Called after successful propagation
 */
export default function DirectorSyncCard({ projectId, impactData, onDismiss, onSynced }) {
  const [visible, setVisible] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const timerRef = useRef(null);

  // Entrance animation on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Auto-dismiss after 45 seconds if not interacted with
  useEffect(() => {
    timerRef.current = setTimeout(() => {
      if (!syncing && !synced) handleDismiss();
    }, 45000);
    return () => clearTimeout(timerRef.current);
  }, [syncing, synced]);

  if (!impactData) return null;

  const { changed_label, affected_nodes = [], total_credits, time_formatted } = impactData;

  // Group affected nodes by type
  const byType = {};
  for (const node of affected_nodes) {
    byType[node.type] = (byType[node.type] || 0) + 1;
  }

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => onDismiss?.(), 400);
  };

  const handleSync = async () => {
    setSyncing(true);
    clearTimeout(timerRef.current);
    try {
      await propagateSync(projectId);
      setSynced(true);
      onSynced?.();
      setTimeout(handleDismiss, 2200);
    } catch (err) {
      console.error('Director Sync propagate failed:', err);
      setSyncing(false);
    }
  };

  return (
    <div
      className="director-sync-card"
      style={{
        position: 'fixed',
        bottom: 28,
        right: 28,
        zIndex: 9999,
        width: 340,
        borderRadius: 20,
        background: 'linear-gradient(135deg, rgba(10,8,20,0.97) 0%, rgba(18,12,35,0.98) 100%)',
        border: '1px solid rgba(167,139,250,0.28)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(167,139,250,0.06), inset 0 1px 0 rgba(255,255,255,0.06)',
        backdropFilter: 'blur(24px)',
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.96)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1), opacity 0.35s ease',
        overflow: 'hidden',
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
    >
      {/* Top accent bar */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: 2,
        background: 'linear-gradient(90deg, #7c3aed, #a78bfa, #06b6d4)',
        borderRadius: '20px 20px 0 0',
      }} />

      {/* Ambient glow behind icon */}
      <div style={{
        position: 'absolute',
        top: -30, left: -20,
        width: 140, height: 140,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ padding: '20px 20px 16px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Icon */}
            <div style={{
              width: 38, height: 38,
              borderRadius: 10,
              background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(6,182,212,0.2))',
              border: '1px solid rgba(167,139,250,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 17, flexShrink: 0,
            }}>
              🎬
            </div>
            <div>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.15em',
                textTransform: 'uppercase', color: 'rgba(167,139,250,0.9)',
                lineHeight: 1, marginBottom: 3,
              }}>
                Director Sync™
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: '#f1f0fa', lineHeight: 1.3 }}>
                {synced
                  ? 'Production Synchronized'
                  : `${changed_label} has changed`}
              </div>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.35)', fontSize: 18, lineHeight: 1,
              padding: '0 2px', marginTop: -2, transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>

        {/* Synced success state */}
        {synced ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px',
            borderRadius: 12,
            background: 'rgba(16,185,129,0.12)',
            border: '1px solid rgba(16,185,129,0.25)',
          }}>
            <span style={{ fontSize: 20 }}>✅</span>
            <span style={{ color: '#6ee7b7', fontSize: 13, fontWeight: 500 }}>
              All downstream assets are now in sync.
            </span>
          </div>
        ) : (
          <>
            {/* Affected summary chips */}
            {affected_nodes.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{
                  fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)',
                  letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8,
                }}>
                  Director Desk found
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {Object.entries(byType).map(([type, count]) => (
                    <div
                      key={type}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '4px 10px',
                        borderRadius: 20,
                        background: 'rgba(167,139,250,0.1)',
                        border: '1px solid rgba(167,139,250,0.18)',
                        fontSize: 12, color: '#c4b5fd', fontWeight: 500,
                      }}
                    >
                      <span>{TYPE_ICONS[type] || '📌'}</span>
                      <span>{count} {TYPE_LABELS[type] || type}</span>
                    </div>
                  ))}
                </div>

                {/* Expandable detail list */}
                {affected_nodes.length > 0 && (
                  <button
                    onClick={() => setExpanded(v => !v)}
                    style={{
                      marginTop: 8,
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 11.5, color: 'rgba(167,139,250,0.7)',
                      padding: 0, display: 'flex', alignItems: 'center', gap: 4,
                      transition: 'color 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#a78bfa'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(167,139,250,0.7)'}
                  >
                    <span>{expanded ? '▲' : '▼'}</span>
                    {expanded ? 'Hide detail' : `View ${affected_nodes.length} affected assets`}
                  </button>
                )}

                {expanded && (
                  <div style={{
                    marginTop: 8,
                    maxHeight: 120,
                    overflowY: 'auto',
                    borderRadius: 10,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    padding: '6px 10px',
                  }}>
                    {affected_nodes.map((node, i) => (
                      <div
                        key={node.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '4px 0',
                          borderBottom: i < affected_nodes.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                        }}
                      >
                        <span style={{ fontSize: 13 }}>{TYPE_ICONS[node.type] || '📌'}</span>
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', flex: 1 }}>
                          {node.label}
                        </span>
                        <span style={{ fontSize: 10.5, color: 'rgba(167,139,250,0.6)' }}>
                          {node.estimated_credits}cr
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Cost estimate */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              marginBottom: 14,
            }}>
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
                  Estimated Cost
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#f1f0fa', lineHeight: 1 }}>
                  {total_credits}
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginLeft: 4 }}>credits</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
                  Est. Time
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#f1f0fa', lineHeight: 1 }}>
                  {time_formatted}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                id="director-sync-propagate-btn"
                onClick={handleSync}
                disabled={syncing}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: 12,
                  border: 'none',
                  cursor: syncing ? 'not-allowed' : 'pointer',
                  background: syncing
                    ? 'rgba(124,58,237,0.4)'
                    : 'linear-gradient(135deg, #7c3aed, #5b21b6)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 13,
                  letterSpacing: '0.02em',
                  boxShadow: syncing ? 'none' : '0 4px 16px rgba(124,58,237,0.35)',
                  transition: 'all 0.2s ease',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
                onMouseEnter={e => {
                  if (!syncing) e.currentTarget.style.background = 'linear-gradient(135deg, #8b5cf6, #6d28d9)';
                }}
                onMouseLeave={e => {
                  if (!syncing) e.currentTarget.style.background = 'linear-gradient(135deg, #7c3aed, #5b21b6)';
                }}
              >
                {syncing ? (
                  <>
                    <span className="sync-spinner" style={{
                      display: 'inline-block', width: 13, height: 13,
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff',
                      borderRadius: '50%',
                      animation: 'spin 0.7s linear infinite',
                    }} />
                    Syncing…
                  </>
                ) : (
                  <>⚡ Sync Production</>
                )}
              </button>
              <button
                id="director-sync-dismiss-btn"
                onClick={handleDismiss}
                style={{
                  padding: '10px 16px',
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'rgba(255,255,255,0.6)',
                  fontWeight: 600,
                  fontSize: 13,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.09)';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                }}
              >
                Later
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .director-sync-card *::-webkit-scrollbar { width: 4px; }
        .director-sync-card *::-webkit-scrollbar-track { background: transparent; }
        .director-sync-card *::-webkit-scrollbar-thumb { background: rgba(167,139,250,0.3); border-radius: 4px; }
      `}</style>
    </div>
  );
}
