import { FiCheck, FiCircle } from 'react-icons/fi';
import { useProjectData } from '../hooks/useProjectData';

const pipelineSteps = [
  { id: 'idea', label: 'Idea', sublabel: 'Your vision', icon: '💡', type: 'idea' },
  { id: 'writer', label: 'Writer', sublabel: 'Script', icon: '✍️', type: 'agent' },
  { id: 'storyboard', label: 'Storyboard', sublabel: 'Visual plan', icon: '🎨', type: 'agent' },
  { id: 'critic', label: 'Critic', sublabel: 'Review', icon: '🔍', type: 'agent' },
  { id: 'editor', label: 'Editor', sublabel: 'Final cut', icon: '🎬', type: 'agent' },
  { id: 'final', label: 'Production', sublabel: 'Ready', icon: '🎬', type: 'final' },
];

export default function WorkflowTimeline() {
  const { agents, hasProject } = useProjectData();

  if (!hasProject) return null;

  // Map agent statuses to pipeline steps
  const agentStatusMap = {};
  agents.forEach((a) => {
    agentStatusMap[a.id] = a.status;
  });

  const getStepStatus = (step) => {
    if (step.id === 'idea') return 'completed';
    if (step.id === 'final') {
      // Final is complete when all agents are done
      const allDone = agents.every((a) => a.status === 'completed');
      return allDone ? 'completed' : 'waiting';
    }
    return agentStatusMap[step.id] || 'waiting';
  };

  return (
    <section>
      <div className="mb-4 flex items-center gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-surface-500">
          Production Pipeline
        </h3>
        <div className="h-px flex-1 bg-white/[0.04]" />
      </div>

      <div className="glass-panel rounded-2xl px-6 py-5">
        <div className="flex items-center justify-between overflow-x-auto">
          {pipelineSteps.map((step, index) => {
            const status = getStepStatus(step);
            const isLast = index === pipelineSteps.length - 1;

            return (
              <div key={step.id} className="flex items-center">
                {/* Step node */}
                <div className={`pipeline-node ${status}`}>
                  <div className="pipeline-node-icon">
                    {status === 'completed' ? (
                      <FiCheck size={16} />
                    ) : (
                      <span>{step.icon}</span>
                    )}
                  </div>
                  <div className="text-center">
                    <p
                      className={`text-[11px] font-medium tracking-wide ${
                        status === 'completed' || status === 'active'
                          ? 'text-white'
                          : 'text-surface-500'
                      }`}
                    >
                      {step.label}
                    </p>
                    <p className="text-[10px] text-surface-600">{step.sublabel}</p>
                  </div>
                </div>

                {/* Connector */}
                {!isLast && (
                  <div className={`pipeline-connector ${status}`}>
                    <div className="pipeline-connector-line" />
                    <FiCircle size={3} className="text-surface-700" />
                    <div className="pipeline-connector-line" />
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
