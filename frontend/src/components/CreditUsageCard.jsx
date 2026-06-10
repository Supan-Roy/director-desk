import { FiZap } from 'react-icons/fi';

// Default credit values — will be replaced by backend integration later
const defaultCreditUsage = {
  remaining: 1000,
  total: 1000,
  estimatedCost: 0,
};

export default function CreditUsageCard() {
  const { remaining, total, estimatedCost } = defaultCreditUsage;
  const pct = Math.round((remaining / total) * 100);

  return (
    <section>
      <div className="mb-4 flex items-center gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-surface-500">
          Studio Credits
        </h3>
        <div className="h-px flex-1 bg-white/[0.04]" />
      </div>
      <div className="glass-panel rounded-xl p-4">
        {/* Main credit display */}
        <div className="mb-4">
          <div className="flex items-end gap-1.5">
            <p className="text-2xl font-semibold tracking-tight text-white">
              {remaining.toLocaleString()}
            </p>
            <p className="mb-0.5 text-xs text-surface-600">
              / {total.toLocaleString()}
            </p>
          </div>
          <p className="text-[11px] text-surface-500">Credits remaining</p>
        </div>

        {/* Progress bar */}
        <div className="mb-3 h-1 overflow-hidden rounded-full bg-white/[0.04]">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              pct > 50
                ? 'bg-accent/60'
                : pct > 20
                  ? 'bg-amber-500/60'
                  : 'bg-red-500/60'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Estimated cost */}
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-surface-500">Session cost</span>
          <span className="font-medium text-surface-300">{estimatedCost} credits</span>
        </div>

        {/* Generation type */}
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-white/[0.02] px-3 py-2">
          <FiZap size={11} className="text-emerald-400/70" />
          <span className="text-[11px] text-surface-400">Text generation</span>
          <span className="ml-auto text-[11px] font-medium text-emerald-400/70">Low cost</span>
        </div>
      </div>
    </section>
  );
}
