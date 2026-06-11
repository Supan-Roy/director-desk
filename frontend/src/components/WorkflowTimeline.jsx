import { useState, useEffect, useRef } from 'react';
import { FiCheck, FiTerminal, FiPlay, FiCpu } from 'react-icons/fi';
import { useProjectData } from '../hooks/useProjectData';

const pipelineSteps = [
  { id: 'idea', label: 'Idea', sublabel: 'Your vision', icon: '💡', type: 'idea' },
  { id: 'writer', label: 'Writer', sublabel: 'Script', icon: '✍️', type: 'agent' },
  { id: 'storyboard', label: 'Storyboard', sublabel: 'Visual plan', icon: '🎨', type: 'agent' },
  { id: 'critic', label: 'Critic', sublabel: 'Review', icon: '🔍', type: 'agent' },
  { id: 'editor', label: 'Editor', sublabel: 'Final cut', icon: '🎬', type: 'agent' },
  { id: 'final', label: 'Production', sublabel: 'Ready', icon: '🎬', type: 'final' },
];

const getMockLogsForProject = (title) => {
  if (title?.includes('Neo-Tokyo')) {
    return [
      { time: '11:45:02', agent: 'Writer', text: 'Initializing cyberpunk screenplay deck...' },
      { time: '11:45:05', agent: 'Writer', text: 'Scripting Scene 1: INT. DETECTIVE DECK - NIGHT. Dialogue added for Kaelen.' },
      { time: '11:45:08', agent: 'Storyboard', text: 'Parsing shot list keys: Establishing Shot, Medium Close Up, Detail Insert.' },
      { time: '11:45:11', agent: 'Storyboard', text: 'Rendering cyberpunk preset textures, neon reflections mapped.' },
      { time: '11:45:14', agent: 'Critic', text: 'Fidelity review completed. Quality index: 9.8/10. Composition approved.' },
      { time: '11:45:16', agent: 'Editor', text: 'Assembling tracks. Audio synth: Retro synth pad ambient layers.' },
      { time: '11:45:18', agent: 'System', text: 'Neo-Tokyo 2099 production ready. Workspace loaded successfully.' },
    ];
  }
  if (title?.includes('Quiet Camera')) {
    return [
      { time: '11:49:12', agent: 'Writer', text: 'Drafting nostalgic drama script. Scene: INT. APARTMENT - MORNING.' },
      { time: '11:49:15', agent: 'Writer', text: 'Dialogue mapped for Elena. Action: Window morning light shadow cast.' },
      { time: '11:49:18', agent: 'Storyboard', text: 'Framing: Establishing sunlit studio, Close Up of old camera lens.' },
      { time: '11:49:21', agent: 'Storyboard', text: 'Calibrating vintage look presets: warm golden, soft grain overlay.' },
      { time: '11:49:24', agent: 'System', text: 'Pre-production complete. Standing by for HDR simulator.' },
    ];
  }
  if (title?.includes('Apollo')) {
    return [
      { time: '11:51:00', agent: 'Writer', text: 'Setting script: EXT. LUNAR SURFACE - VACUUM.' },
      { time: '11:51:03', agent: 'Writer', text: 'Dialogue mapped for Commander Miller. Signal beacons generated.' },
      { time: '11:51:06', agent: 'Storyboard', text: 'Scene 1: Lunar horizon camera panning. Scene 2: Wrist HUD indicator rendering.' },
      { time: '11:51:09', agent: 'Critic', text: 'Audio fidelity audit: Houston radio distortion filter checked.' },
      { time: '11:51:12', agent: 'Editor', text: 'Post-production assembly complete. Color grade: Warm 1970s film tint.' },
      { time: '11:51:15', agent: 'System', text: 'Apollo 11 mission logs compiled. Session archived.' },
    ];
  }
  return [
    { time: '12:00:01', agent: 'Writer', text: 'Structuring story concept based on prompt.' },
    { time: '12:00:03', agent: 'Writer', text: 'Writing scenes and character dialogue blocks.' },
    { time: '12:00:05', agent: 'Storyboard', text: 'Creating camera directions and scene environment specs.' },
    { time: '12:00:08', agent: 'Critic', text: 'Reviewing pacing, narrative structure, and thematic style.' },
    { time: '12:00:10', agent: 'System', text: 'Production compiled successfully.' },
  ];
};

export default function WorkflowTimeline() {
  const { agents, hasProject, title, loading } = useProjectData();
  const [activeLogIdx, setActiveLogIdx] = useState(-1);
  const terminalEndRef = useRef(null);

  const projectLogs = getMockLogsForProject(title);

  // Dynamic log streamer for visual impact
  useEffect(() => {
    if (loading) {
      setActiveLogIdx(-1);
      const interval = setInterval(() => {
        setActiveLogIdx(prev => {
          if (prev < projectLogs.length - 1) {
            return prev + 1;
          } else {
            clearInterval(interval);
            return prev;
          }
        });
      }, 800);
      return () => clearInterval(interval);
    } else if (hasProject) {
      setActiveLogIdx(projectLogs.length - 1);
    }
  }, [loading, hasProject, title]);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeLogIdx]);

  if (!hasProject && !loading) return null;

  // Map agent statuses to pipeline steps
  const agentStatusMap = {};
  agents.forEach((a) => {
    agentStatusMap[a.id] = a.status;
  });

  const getStepStatus = (step) => {
    if (loading) {
      // During active generation, progress through agents based on log index
      const stepsList = ['idea', 'writer', 'storyboard', 'critic', 'editor', 'final'];
      const currentStepIdx = Math.min(Math.floor(activeLogIdx / 1.2), stepsList.length - 1);
      const stepIdx = stepsList.indexOf(step.id);
      if (stepIdx < currentStepIdx) return 'completed';
      if (stepIdx === currentStepIdx) return 'active';
      return 'waiting';
    }

    if (step.id === 'idea') return 'completed';
    if (step.id === 'final') {
      const allDone = agents.every((a) => a.status === 'completed');
      return allDone ? 'completed' : 'waiting';
    }
    return agentStatusMap[step.id] || 'waiting';
  };

  const visibleLogs = activeLogIdx >= 0 ? projectLogs.slice(0, activeLogIdx + 1) : [];

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
