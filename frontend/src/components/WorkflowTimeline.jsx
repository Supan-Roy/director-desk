import { FiCheck } from 'react-icons/fi';
import { useProjectData } from '../hooks/useProjectData';

const pipelineSteps = [
  { id: 'idea', label: 'Idea', sublabel: 'Your vision', icon: '💡', type: 'idea' },
  { id: 'writer', label: 'Writer', sublabel: 'Script', icon: '✍️', type: 'agent' },
  { id: 'storyboard', label: 'Storyboard', sublabel: 'Visual plan', icon: '🎨', type: 'agent' },
  { id: 'planner', label: 'Planner', sublabel: 'Production plan', icon: '📋', type: 'agent' },
  { id: 'critic', label: 'Critic', sublabel: 'Review', icon: '🔍', type: 'agent' },
  { id: 'final', label: 'Production', sublabel: 'Ready', icon: '🎬', type: 'final' },
];

export default function WorkflowTimeline() {
  const { agents, hasProject, loading } = useProjectData();

  if (!hasProject && !loading) return null;

  // Map agent statuses to pipeline steps
  const agentStatusMap = {};
  agents.forEach((a) => {
    agentStatusMap[a.id] = a.status;
  });

  const getStepStatus = (step) => {
    if (step.id === 'idea') return 'completed';
    if (step.id === 'final') {
      const allDone = agents.every((a) => a.status === 'completed');
      return allDone && agents.length > 0 ? 'completed' : 'waiting';
    }
    return agentStatusMap[step.id] || 'waiting';
  };

  return (
    <section className="space-y-6">
      {/* Label */}
      <div className="flex items-center gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          Agent Pipeline Console
        </h3>
        <div className="h-px flex-1 bg-white/[0.04]" />
      </div>

      {/* Pipeline Schematic Grid */}
      <div className="glass-panel rounded-2xl px-6 py-5 border border-white/[0.04] bg-surface-950/20 backdrop-blur-md">
        <div className="flex items-center justify-between overflow-x-auto gap-4">
          {pipelineSteps.map((step, index) => {
            const status = getStepStatus(step);
            const isLast = index === pipelineSteps.length - 1;

            return (
              <div key={step.id} className="flex items-center">
                {/* Step node */}
                <div className={`pipeline-node ${status}`}>
                  <div className="pipeline-node-icon relative z-10 shadow-lg">
                    {status === 'completed' ? (
                      <FiCheck size={16} />
                    ) : (
                      <span className="text-sm">{step.icon}</span>
                    )}
                  </div>
                  <div className="text-center mt-2">
                    <p
                      className={`text-[11px] font-bold tracking-wider uppercase ${
                        status === 'completed' || status === 'active'
                          ? 'text-white'
                          : 'text-surface-500'
                      }`}
                    >
                      {step.label}
                    </p>
                    <p className="text-[9px] text-surface-600 font-mono mt-0.5">{step.sublabel}</p>
                  </div>
                </div>

                {/* Connector */}
                {!isLast && (
                  <div className={`pipeline-connector ${status} mx-2`}>
                    <div className="pipeline-connector-line w-8" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
