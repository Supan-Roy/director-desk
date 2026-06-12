import { useState } from 'react';
import { marked } from 'marked';
import { FiFileText, FiImage, FiClipboard, FiEdit3, FiCheck } from 'react-icons/fi';
import { useProjectData } from '../hooks/useProjectData';
import { useEffect } from 'react';

const tabs = [
  { id: 'script', label: 'Script', icon: FiFileText },
  { id: 'storyboard', label: 'Storyboard', icon: FiImage },
  { id: 'plan', label: 'Plan', icon: FiClipboard },
];

function ScriptTab({ script }) {
  const { updateScript } = useProjectData();
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(script || '');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setText(script || '');
  }, [script]);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    updateScript(text);
    setIsEditing(false);
  };

  if (!script && !isEditing) {
    return (
      <div className="flex min-h-[280px] items-center justify-center glass-panel rounded-xl">
        <p className="text-sm text-surface-600">Script will appear here after generation.</p>
      </div>
    );
  }

  // Parse lines and render custom screenplay components with inline markdown compiled
  const renderScriptLines = (textVal) => {
    const lines = textVal.split('\n');
    return lines.map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={i} className="h-4" />;

      // 1. Trailer Titles / Headings
      if (trimmed.startsWith('# ')) {
        const html = marked.parseInline(trimmed.substring(2));
        return (
          <h1 
            key={i}
            className="text-3xl md:text-4xl font-extrabold tracking-[0.18em] text-white text-center uppercase my-12 font-display select-text"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      }
      if (trimmed.startsWith('## ')) {
        const html = marked.parseInline(trimmed.substring(3));
        return (
          <h2 
            key={i}
            className="text-xl md:text-2xl font-bold tracking-[0.12em] text-surface-100 uppercase mt-10 mb-4 font-display select-text"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      }
      if (trimmed.startsWith('### ')) {
        const html = marked.parseInline(trimmed.substring(4));
        return (
          <h3 
            key={i}
            className="text-lg font-semibold text-surface-200 mt-8 mb-4 select-text"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      }

      // 2. Spoken Dialogue Quote Blocks (starts with >)
      if (trimmed.startsWith('>')) {
        const rawText = trimmed.substring(1).trim();
        const html = marked.parseInline(rawText);
        return (
          <div key={i} className="my-6 flex justify-center select-text">
            <blockquote 
              className="max-w-[70%] border-l-2 border-accent bg-accent/[0.02] px-6 py-4 rounded-r-xl text-center italic text-xs text-surface-200 leading-relaxed font-mono"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        );
      }

      // 3. Scene Headings (e.g. SCENE 1: or INT. or EXT.)
      const isSceneHeading = /^(SCENE\s+\d+|INT\.|EXT\.)/i.test(trimmed);
      if (isSceneHeading) {
        const html = marked.parseInline(trimmed);
        return (
          <div key={i} className="my-8 border-b border-white/[0.06] pb-2 select-text">
            <h3 
              className="text-xs font-bold tracking-[0.2em] text-accent uppercase font-mono"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        );
      }

      // 4. Actor Parentheticals
      if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
        const html = marked.parseInline(trimmed);
        return (
          <p 
            key={i}
            className="text-center italic text-xs text-surface-500 my-1 font-mono select-text"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      }

      // 5. Character Names
      const isCharacterName = /^[A-Z][A-Z\s\.]{1,20}$/.test(trimmed) && trimmed.length > 1;
      if (isCharacterName) {
        const html = marked.parseInline(trimmed);
        return (
          <p 
            key={i}
            className="text-center font-bold tracking-widest text-xs text-surface-100 uppercase mt-6 mb-1 font-mono select-text"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      }

      // 6. Action Lines / Regular Paragraphs
      const html = marked.parseInline(trimmed);
      return (
        <p 
          key={i}
          className="text-sm text-surface-400 leading-relaxed my-3 font-mono select-text"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    });
  };

  return (
    <div className="glass-panel rounded-xl p-8 bg-surface-950/45 border border-white/[0.03] screenplay-prose flex flex-col gap-4">
      {/* Edit/Copy Action Bar */}
      <div className="flex justify-end gap-2 border-b border-white/[0.04] pb-3 mb-2">
        {isEditing ? (
          <button
            onClick={handleSave}
            title="Save script"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider bg-accent text-white hover:bg-accent/90 transition-all"
          >
            <FiCheck size={12} />
            <span>Save</span>
          </button>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            title="Edit script manually"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider bg-white/[0.03] border border-white/[0.08] text-surface-300 hover:bg-white/[0.08] hover:text-white transition-all"
          >
            <FiEdit3 size={12} />
            <span>Edit</span>
          </button>
        )}
        <button
          onClick={handleCopy}
          title="Copy full script"
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider bg-white/[0.03] border border-white/[0.08] text-surface-300 hover:bg-white/[0.08] hover:text-white transition-all"
        >
          {copied ? <FiCheck size={12} className="text-emerald-400" /> : <FiClipboard size={12} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      {isEditing ? (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={18}
          className="w-full bg-black/40 border border-white/[0.08] rounded-xl p-4 text-xs font-mono leading-relaxed text-surface-300 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-y"
        />
      ) : (
        <div className="prose prose-invert max-w-none select-text">
          {renderScriptLines(text)}
        </div>
      )}
    </div>
  );
}

function StoryboardTab({ storyboard, productionType }) {
  const isAudio = productionType === 'Podcast' || productionType === 'Audio Story';
  if (!storyboard || storyboard.length === 0) {
    return (
      <div className="flex min-h-[280px] items-center justify-center glass-panel rounded-xl">
        <p className="text-sm text-surface-600">
          {isAudio 
            ? "Not applicable for audio-only productions (Podcasts, Audio Stories)." 
            : "Storyboard scenes will appear here."}
        </p>
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
  const { script, storyboard, productionPlan, productionType } = useProjectData();

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
        {activeTab === 'storyboard' && <StoryboardTab storyboard={storyboard} productionType={productionType} />}
        {activeTab === 'plan' && <ProductionPlanTab plan={productionPlan} />}
      </div>
    </section>
  );
}
