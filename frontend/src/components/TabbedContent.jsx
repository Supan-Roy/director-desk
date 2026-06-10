import { useState } from 'react';
import { FiFileText, FiImage, FiClipboard } from 'react-icons/fi';
import { useProjectData } from '../hooks/useProjectData';

const tabs = [
  { id: 'script', label: 'Script', icon: FiFileText },
  { id: 'storyboard', label: 'Storyboard', icon: FiImage },
  { id: 'plan', label: 'Plan', icon: FiClipboard },
];

function ScriptTab({ script }) {
  if (!script) {
    return (
      <div className="flex min-h-[280px] items-center justify-center glass-panel rounded-xl">
        <p className="text-sm text-surface-600">Script will appear here after generation.</p>
      </div>
    );
  }

  // Parse screenplay elements
  const renderScript = (text) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={i} className="h-3" />;

      // Scene headings: INT./EXT.
      if (/^(INT\.?|EXT\.?|I\/E)[\.\s]/i.test(trimmed)) {
        return (
          <div key={i} className="scene-heading">
            {trimmed}
          </div>
        );
      }

      // Transitions: FADE IN, FADE OUT, CUT TO, etc.
      if (/^(FADE IN|FADE OUT|CUT TO|DISSOLVE TO|SMASH CUT)/i.test(trimmed)) {
        return (
          <div key={i} className="transition">
            {trimmed}
          </div>
        );
      }

      // Character names (centered, all caps, short)
      if (/^[A-Z][A-Z\s\(\)\.]{2,30}$/.test(trimmed) && trimmed.length < 35) {
        return (
          <div key={i} className="character">
            {trimmed}
          </div>
        );
      }

      // Parentheticals
      if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
        return (
          <div key={i} className="parenthetical">
            {trimmed}
          </div>
        );
      }

      // Regular action/dialogue
      return (
        <div key={i} className="action">
          {trimmed}
        </div>
      );
    });
  };

  return (
    <div className="glass-panel rounded-xl p-6 screenplay">
      {renderScript(script)}
    </div>
  );
}

function StoryboardTab({ storyboard }) {
  if (!storyboard || storyboard.length === 0) {
    return (
      <div className="flex min-h-[280px] items-center justify-center glass-panel rounded-xl">
        <p className="text-sm text-surface-600">Storyboard scenes will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {storyboard.map((scene) => (
        <div key={scene.scene} className="scene-card flex gap-4">
          {/* Scene number + thumbnail placeholder */}
          <div className="flex shrink-0 flex-col items-center gap-2">
            <div className="flex h-14 w-20 items-center justify-center rounded-lg bg-white/[0.03] ring-1 ring-white/[0.06]">
              <FiImage size={16} className="text-surface-600" />
            </div>
            <span className="text-[10px] font-semibold text-accent/60">
              #{scene.scene}
            </span>
          </div>

          {/* Scene details */}
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-sm font-medium text-surface-200">{scene.shot}</h4>
            </div>
            <p className="text-[12px] leading-relaxed text-surface-400">{scene.description}</p>
            <div className="flex flex-wrap gap-1.5">
              <span className="badge-shot">{scene.shot}</span>
              <span className="badge-mood">{scene.mood}</span>
            </div>
            <p className="text-[11px] text-surface-500">
              <span className="text-surface-600">Env:</span> {scene.environment}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProductionPlanTab({ plan }) {
  if (!plan) {
    return (
      <div className="flex min-h-[280px] items-center justify-center glass-panel rounded-xl">
        <p className="text-sm text-surface-600">Production plan will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-surface-200">{plan.title}</h4>
      {plan.phases.map((phase) => (
        <div key={phase.name} className="glass-panel rounded-xl p-4">
          <div className="mb-3 flex items-center justify-between">
            <h5 className="text-[13px] font-medium text-surface-200">{phase.name}</h5>
            <span
              className={`text-[11px] ${
                phase.status === 'complete'
                  ? 'text-emerald-400/80'
                  : 'text-surface-600'
              }`}
            >
              {phase.status === 'complete' ? '✓ Done' : 'Pending'}
            </span>
          </div>
          <ul className="space-y-2">
            {phase.items.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[12px] text-surface-400">
                <span
                  className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                    phase.status === 'complete'
                      ? 'bg-emerald-400/60'
                      : 'bg-surface-600'
                  }`}
                />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default function TabbedContent() {
  const [activeTab, setActiveTab] = useState('script');
  const { script, storyboard, productionPlan } = useProjectData();

  return (
    <section>
      {/* Section label */}
      <div className="mb-4 flex items-center gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-surface-500">
          Production Output
        </h3>
        <div className="h-px flex-1 bg-white/[0.04]" />
      </div>

      {/* Tab headers */}
      <div className="mb-4 flex gap-1 rounded-xl bg-white/[0.02] p-1 ring-1 ring-white/[0.04]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150 ${
              activeTab === tab.id
                ? 'tab-active'
                : 'text-surface-500 hover:text-surface-300'
            }`}
          >
            <tab.icon size={13} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="max-h-[520px] overflow-y-auto pr-1">
        {activeTab === 'script' && <ScriptTab script={script} />}
        {activeTab === 'storyboard' && <StoryboardTab storyboard={storyboard} />}
        {activeTab === 'plan' && <ProductionPlanTab plan={productionPlan} />}
      </div>
    </section>
  );
}
