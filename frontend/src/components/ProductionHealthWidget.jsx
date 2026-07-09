import { useState, useEffect, useCallback } from 'react';
import { getSyncStatus, propagateSync } from '../services/apiClient';

const CATEGORY_ICONS = {
  characters:   '🎭',
  voices:       '🎙️',
  environments: '🏔️',
  scenes:       '🎬',
  storyboard:   '📋',
  poster:       '🖼️',
  trailer:      '🎞️',
};

const CATEGORY_LABELS = {
  characters:   'Characters',
  voices:       'Voices',
  environments: 'Environments',
  scenes:       'Scenes',
  storyboard:   'Storyboard',
  poster:       'Poster',
  trailer:      'Trailer',
};

function formatRelativeTime(isoStr) {
  if (!isoStr) return null;
  try {
    const diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch {
    return null;
  }
}

/**
 * ProductionHealthWidget
 *
 * A compact production sync health panel to embed in the Dashboard.
 * Shows per-category sync status and overall health + one-click sync.
 *
 * Props:
 *   projectId  {number} - The current project numeric ID
 */
export default function ProductionHealthWidget({ projectId }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);

  const fetchStatus = useCallback(async () => {
    if (!projectId) return;
    try {
      const data = await getSyncStatus(projectId);
      setStatus(data);
    } catch (err) {
      console.warn('ProductionHealthWidget: Failed to fetch sync status', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchStatus();
    // Poll every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await propagateSync(projectId);
      setLastSynced(new Date().toISOString());
      await fetchStatus();
    } catch (err) {
      console.error('ProductionHealthWidget sync failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  if (!projectId || loading) {
    return (
      <div style={widgetStyle}>
        <div style={headerRowStyle}>
          <span style={labelStyle}>Production Health</span>
        </div>
        <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, padding: '8px 0' }}>
          Loading sync status…
        </div>
      </div>
    );
  }

  const cats = status?.categories || {};
  const overall = status?.overall || 'synced';
  const staleCount = status?.stale_count || 0;
  const isOutOfSync = overall === 'out_of_sync';

  const displayedCategories = Object.entries(cats).filter(
    ([key]) => ['characters', 'voices', 'environments', 'scenes'].includes(key)
  );

  return (
    <div style={widgetStyle} id="production-health-widget">
      {/* Top accent */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: isOutOfSync
          ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
          : 'linear-gradient(90deg, #10b981, #06b6d4)',
        borderRadius: '14px 14px 0 0',
      }} />

      {/* Header */}
      <div style={headerRowStyle}>
        <span style={labelStyle}>Production Health</span>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '3px 10px',
          borderRadius: 20,
          background: isOutOfSync
            ? 'rgba(245,158,11,0.12)'
            : 'rgba(16,185,129,0.12)',
          border: `1px solid ${isOutOfSync ? 'rgba(245,158,11,0.25)' : 'rgba(16,185,129,0.25)'}`,
        }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: isOutOfSync ? '#f59e0b' : '#10b981',
            boxShadow: `0 0 6px ${isOutOfSync ? '#f59e0b' : '#10b981'}`,
            animation: isOutOfSync ? 'pulseAmber 2s ease-in-out infinite' : 'none',
          }} />
          <span style={{
            fontSize: 11, fontWeight: 700,
            color: isOutOfSync ? '#fcd34d' : '#6ee7b7',
            letterSpacing: '0.05em',
          }}>
            {isOutOfSync ? `Out of Sync · ${staleCount} changed` : 'Fully Synchronized'}
          </span>
        </div>
      </div>

      {/* Category pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14, marginTop: 4 }}>
        {displayedCategories.map(([key, val]) => {
          const isStale = val === 'out_of_sync';
          return (
            <div
              key={key}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '3px 10px',
                borderRadius: 20,
                background: isStale ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.07)',
                border: `1px solid ${isStale ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.18)'}`,
                fontSize: 11.5,
                color: isStale ? '#fcd34d' : '#6ee7b7',
                fontWeight: 500,
              }}
            >
              <span style={{ fontSize: 12 }}>{CATEGORY_ICONS[key] || '●'}</span>
              <span>{CATEGORY_LABELS[key]}</span>
              <span style={{ fontSize: 10, opacity: 0.7 }}>{isStale ? '⚠' : '✓'}</span>
            </div>
          );
        })}
      </div>

      {/* Footer: last sync + button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
          Last Sync{' '}
          <span style={{ color: 'rgba(255,255,255,0.5)' }}>
            {formatRelativeTime(lastSynced || status?.last_checked) || '—'}
          </span>
        </div>

        {isOutOfSync && (
          <button
            id="production-health-sync-btn"
            onClick={handleSync}
            disabled={syncing}
            style={{
              padding: '6px 14px',
              borderRadius: 10,
              border: 'none',
              cursor: syncing ? 'not-allowed' : 'pointer',
              background: syncing
                ? 'rgba(124,58,237,0.3)'
                : 'linear-gradient(135deg, #7c3aed, #5b21b6)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: '0.02em',
              boxShadow: syncing ? 'none' : '0 3px 12px rgba(124,58,237,0.3)',
              transition: 'all 0.2s ease',
              display: 'flex', alignItems: 'center', gap: 5,
              whiteSpace: 'nowrap',
            }}
          >
            {syncing ? (
              <>
                <span style={{
                  display: 'inline-block', width: 11, height: 11,
                  border: '1.5px solid rgba(255,255,255,0.3)',
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
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulseAmber {
          0%, 100% { opacity: 1; box-shadow: 0 0 6px #f59e0b; }
          50% { opacity: 0.6; box-shadow: 0 0 12px #f59e0b; }
        }
      `}</style>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const widgetStyle = {
  position: 'relative',
  borderRadius: 14,
  background: 'rgba(10,8,20,0.85)',
  border: '1px solid rgba(255,255,255,0.07)',
  boxShadow: '0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
  backdropFilter: 'blur(16px)',
  padding: '16px 16px 14px',
  overflow: 'hidden',
  fontFamily: "'Inter', -apple-system, sans-serif",
};

const headerRowStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 12,
};

const labelStyle = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.4)',
};
