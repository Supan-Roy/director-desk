import { FiCheck, FiClock } from 'react-icons/fi';
import { useProjectData } from '../hooks/useProjectData';

export default function AgentActivityPanel() {
  const { agents } = useProjectData();

  if (agents.length === 0) {
    return (
      <section>
        <div className="mb-4 flex items-center gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-surface-500">
            Command Center
          </h3>
          <div className="h-px flex-1 bg-white/[0.04]" />
        </div>
        <p className="text-xs text-surface-600">No agents active yet.</p>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-4 flex items-center gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-surface-500">
          Command Center
        </h3>
        <div className="h-px flex-1 bg-white/[0.04]" />
      </div>
      <div className="space-y-1.5">
        {agents.map((agent) => {
          const isActive = agent.status === 'active';
          const isCompleted = agent.status === 'completed';

          return (
            <div
              key={agent.id}
              className={`group flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-all duration-150 ${
                isActive
                  ? 'bg-accent/[0.04] ring-1 ring-accent/10'
                  : isCompleted
                    ? 'bg-emerald-500/[0.03] ring-1 ring-emerald-500/[0.06]'
                    : 'bg-white/[0.01] hover:bg-white/[0.02]'
              }`}
            >
              {/* Icon */}
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm transition-all ${
                  isActive
                    ? 'bg-accent/10 ring-1 ring-accent/20 agent-glow'
                    : isCompleted
                      ? 'bg-emerald-500/[0.08] ring-1 ring-emerald-500/[0.12] agent-glow-green'
                      : 'bg-white/[0.02] ring-1 ring-white/[0.04]'
                }`}
              >
                {agent.icon}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[12px] font-medium text-surface-200">
                    {agent.name.replace(' Agent', '')}
                  </p>
                  <span
                    className={`status-badge ${
                      isCompleted
                        ? 'completed'
                        : isActive
                          ? 'active'
                          : 'waiting'
                    }`}
                  >
                    {isCompleted ? (
                      <FiCheck size={9} />
                    ) : (
                      <FiClock size={9} />
                    )}
                    {isCompleted ? 'Done' : isActive ? 'Active' : 'Standby'}
                  </span>
                </div>
                <p className="text-[10px] text-surface-600">
                  {agent.role}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
