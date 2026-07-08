import { useState, useEffect, useCallback } from 'react'
import { FiAlertTriangle } from 'react-icons/fi'

const QUOTA_EVENT = 'director-desk:quota-exhausted'
const DISPLAY_DURATION = 8000

export function triggerQuotaOverlay() {
  window.dispatchEvent(new CustomEvent(QUOTA_EVENT))
}

export default function QuotaOverlay() {
  const [visible, setVisible] = useState(false)

  const show = useCallback(() => {
    setVisible(true)
    setTimeout(() => setVisible(false), DISPLAY_DURATION)
  }, [])

  useEffect(() => {
    window.addEventListener(QUOTA_EVENT, show)
    return () => window.removeEventListener(QUOTA_EVENT, show)
  }, [show])

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center"
      style={{
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
    >
      <div
        className="flex flex-col items-center gap-5 px-8 py-10 max-w-sm mx-4 text-center"
        style={{
          background: '#0B0B0B',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '12px',
          animation: 'quotaFadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
      >
        <div
          className="flex items-center justify-center w-14 h-14 rounded-full"
          style={{
            background: 'rgba(251, 191, 36, 0.1)',
            border: '1px solid rgba(251, 191, 36, 0.2)',
          }}
        >
          <FiAlertTriangle size={26} className="text-amber-400" />
        </div>

        <div className="flex flex-col gap-2">
          <p
            className="text-[13px] font-semibold tracking-wide"
            style={{ color: '#e2e3e5' }}
          >
            API Quota Exhausted
          </p>
          <p
            className="text-[12px] leading-relaxed"
            style={{ color: '#a1a1aa' }}
          >
            The system is running out of API quota. Please wait for the quota to refresh before continuing.
          </p>
        </div>

        <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.06)' }}>
          <div
            className="h-full rounded-full"
            style={{
              background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
              animation: 'quotaShrink 8s linear forwards',
            }}
          />
        </div>

        <style>{`
          @keyframes quotaFadeIn {
            from { opacity: 0; transform: translateY(24px) scale(0.96); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes quotaShrink {
            from { width: 100%; }
            to { width: 0%; }
          }
        `}</style>
      </div>
    </div>
  )
}
