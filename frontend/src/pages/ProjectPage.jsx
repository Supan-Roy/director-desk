import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { marked } from 'marked';
import {
  FiArrowLeft, FiEdit3, FiSend, FiX, FiFileText,
  FiImage, FiClipboard, FiLoader, FiClock, FiFilm, FiCheck
} from 'react-icons/fi';
import { PiSparkle } from 'react-icons/pi';
import { getProjectById, apiBaseUrl, updateProjectScript } from '../services/apiClient';
import Sidebar from '../components/Sidebar';
import { useTheme } from '../context/ThemeContext';
import { useProjectData } from '../hooks/useProjectData';
import { decodeProjectRouteId } from '../utils/hashids';

// ── Reusable script renderer (copied from TabbedContent) ──────────────────
function ScriptView({ script, onSave }) {
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
    if (onSave) {
      onSave(text);
    }
    setIsEditing(false);
  };

  if (!script && !isEditing) return (
    <div className="flex min-h-[260px] items-center justify-center text-surface-600 text-sm">
      No script available.
    </div>
  );

  const lines = text.split('\n');
  return (
    <div className="space-y-4">
      {/* Edit/Copy Action Bar */}
      <div className="flex justify-end gap-2 border-b border-white/[0.04] pb-3 mb-4">
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
        <div className="prose prose-invert max-w-none screenplay-prose">
          {lines.map((line, i) => {
            const t = line.trim();
            if (!t) return <div key={i} className="h-3" />;
            if (t.startsWith('# ')) return <h1 key={i} className="text-3xl font-extrabold tracking-[0.18em] text-white text-center uppercase my-10 font-display" dangerouslySetInnerHTML={{ __html: marked.parseInline(t.slice(2)) }} />;
            if (t.startsWith('## ')) return <h2 key={i} className="text-xl font-bold tracking-[0.1em] text-surface-100 uppercase mt-8 mb-3 font-display" dangerouslySetInnerHTML={{ __html: marked.parseInline(t.slice(3)) }} />;
            if (t.startsWith('### ')) return <h3 key={i} className="text-base font-semibold text-surface-200 mt-6 mb-3" dangerouslySetInnerHTML={{ __html: marked.parseInline(t.slice(4)) }} />;
            if (t.startsWith('>')) return (
              <div key={i} className="my-5 flex justify-center">
                <blockquote className="max-w-[70%] border-l-2 border-accent bg-accent/[0.02] px-6 py-3 rounded-r-xl text-center italic text-xs text-surface-200 leading-relaxed font-mono" dangerouslySetInnerHTML={{ __html: marked.parseInline(t.slice(1).trim()) }} />
              </div>
            );
            if (/^(SCENE\s+\d+|INT\.|EXT\.)/i.test(t)) return (
              <div key={i} className="my-6 border-b border-white/[0.06] pb-2">
                <h3 className="text-xs font-bold tracking-[0.2em] text-accent uppercase font-mono" dangerouslySetInnerHTML={{ __html: marked.parseInline(t) }} />
              </div>
            );
            if (t.startsWith('(') && t.endsWith(')')) return <p key={i} className="text-center italic text-xs text-surface-500 my-1 font-mono" dangerouslySetInnerHTML={{ __html: marked.parseInline(t) }} />;
            if (/^[A-Z][A-Z\s.]{1,20}$/.test(t) && t.length > 1) return <p key={i} className="text-center font-bold tracking-widest text-xs text-surface-100 uppercase mt-5 mb-1 font-mono" dangerouslySetInnerHTML={{ __html: marked.parseInline(t) }} />;
            return <p key={i} className="text-sm text-surface-400 leading-relaxed my-2 font-mono" dangerouslySetInnerHTML={{ __html: marked.parseInline(t) }} />;
          })}
        </div>
      )}
    </div>
  );
}

function StoryboardView({ storyboard, productionType }) {
  const isAudio = productionType === 'Podcast' || productionType === 'Audio Story';
  if (!storyboard || storyboard.length === 0) return (
    <div className="flex min-h-[260px] items-center justify-center text-surface-600 text-sm">
      {isAudio ? 'Not applicable for audio productions.' : 'No storyboard available.'}
    </div>
  );
  return (
    <div className="space-y-3">
      {storyboard.map((scene, idx) => (
        <div key={scene.scene ?? idx} className="scene-card flex gap-4">
          <div className="flex shrink-0 flex-col items-center gap-2">
            <div className="flex h-14 w-20 items-center justify-center rounded-lg bg-white/[0.03] ring-1 ring-white/[0.06]">
              <FiImage size={16} className="text-surface-600" />
            </div>
            <span className="text-[10px] font-semibold text-accent/60">#{scene.scene ?? idx + 1}</span>
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <h4 className="text-sm font-medium text-surface-200">{scene.shot}</h4>
            <p className="text-[12px] leading-relaxed text-surface-400">{scene.description}</p>
            <div className="flex flex-wrap gap-1.5">
              <span className="badge-shot">{scene.shot}</span>
              <span className="badge-mood">{scene.mood}</span>
            </div>
            <p className="text-[11px] text-surface-500"><span className="text-surface-600">Env:</span> {scene.environment}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function PlanView({ plan }) {
  if (!plan) return (
    <div className="flex min-h-[260px] items-center justify-center text-surface-600 text-sm">
      No production plan available.
    </div>
  );
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-surface-200">{plan.title}</h4>
      {(plan.phases || []).map((phase) => (
        <div key={phase.name} className="glass-panel rounded-xl p-4">
          <div className="mb-3 flex items-center justify-between">
            <h5 className="text-[13px] font-medium text-surface-200">{phase.name}</h5>
            <span className={`text-[11px] ${phase.status === 'complete' ? 'text-emerald-400/80' : 'text-surface-600'}`}>
              {phase.status === 'complete' ? '✓ Done' : 'Pending'}
            </span>
          </div>
          <ul className="space-y-2">
            {(phase.items || []).map((item, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[12px] text-surface-400">
                <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${phase.status === 'complete' ? 'bg-emerald-400/60' : 'bg-surface-600'}`} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ── Modify Chat Panel ─────────────────────────────────────────────────────
function ModifyChatPanel({ project, onClose, onProjectUpdated }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `I'm reviewing **${project.title}**. What would you like to modify? You can ask me to rewrite scenes, change the tone, adjust the storyboard, or rework the production plan.`,
    }
  ]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamedScript, setStreamedScript] = useState('');
  const bottomRef = useRef(null);
  const { isDayMode: d } = useTheme();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamedScript]);

  const handleSend = async () => {
    if (!input.trim() || streaming) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setStreaming(true);
    setStreamedScript('');

    try {
      const systemContext = `You are modifying an existing production called "${project.title}" (${project.production_type}).

Current Script:
${project.script || 'N/A'}

The user wants to modify it. Apply their request and return ONLY the updated script, formatted the same way as the original. Do not include any preamble or explanation — just the revised script.`;

      const response = await fetch(`${apiBaseUrl}/api/generate/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `${systemContext}\n\nUser modification request: ${userMsg}`,
          mode: 'studio',
          production_type: project.production_type || 'Short Film',
          files: [],
        }),
      });

      if (!response.ok) throw new Error('Modification stream failed');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let fullScript = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            try {
              const evt = JSON.parse(trimmed.slice(6));
              if (evt.type === 'script_chunk') {
                fullScript += evt.data;
                setStreamedScript(fullScript);
              } else if (evt.type === 'complete') {
                onProjectUpdated({ ...project, script: fullScript });
                setMessages(prev => [...prev, {
                  role: 'assistant',
                  content: '✅ Script updated! The changes are reflected in the Script tab above.',
                }]);
                setStreamedScript('');
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ Modification failed: ${err.message}` }]);
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className={`flex flex-col h-full border-l transition-colors duration-500 ${d ? 'bg-white border-black/[0.07]' : 'bg-[#08080f] border-white/[0.05]'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b transition-colors duration-500 ${d ? 'border-black/[0.07]' : 'border-white/[0.05]'}`}>
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent/15">
            <FiEdit3 size={11} className="text-accent" />
          </div>
          <span className={`text-[11px] font-bold tracking-widest uppercase ${d ? 'text-gray-700' : 'text-surface-300'}`}>
            Modify Production
          </span>
        </div>
        <button
          onClick={onClose}
          className={`p-1.5 rounded-lg transition-colors ${d ? 'hover:bg-black/[0.06] text-gray-400' : 'hover:bg-white/[0.06] text-surface-500'}`}
        >
          <FiX size={13} />
        </button>
      </div>

      {/* Live streaming preview */}
      {streamedScript && (
        <div className="mx-3 mt-3 rounded-xl border border-accent/20 bg-accent/[0.03] p-3 max-h-40 overflow-y-auto">
          <p className="text-[9px] font-bold uppercase tracking-widest text-accent mb-1.5">Rewriting script...</p>
          <p className="text-[10px] font-mono text-surface-400 whitespace-pre-wrap leading-relaxed">{streamedScript.slice(-400)}</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[12px] leading-relaxed ${
              msg.role === 'user'
                ? 'bg-accent text-white rounded-br-md'
                : d
                  ? 'bg-gray-100 text-gray-700 rounded-bl-md'
                  : 'bg-white/[0.05] text-surface-300 rounded-bl-md'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {streaming && !streamedScript && (
          <div className="flex justify-start">
            <div className={`rounded-2xl rounded-bl-md px-3.5 py-2.5 text-[12px] ${d ? 'bg-gray-100 text-gray-500' : 'bg-white/[0.05] text-surface-500'}`}>
              <span className="flex items-center gap-1.5">
                <FiLoader size={10} className="animate-spin" /> Analyzing production...
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className={`px-3 pb-3 pt-2 border-t transition-colors duration-500 ${d ? 'border-black/[0.07]' : 'border-white/[0.05]'}`}>
        <div className={`flex items-end gap-2 rounded-xl border p-2 transition-colors duration-300 ${
          d ? 'bg-gray-50 border-black/[0.08]' : 'bg-white/[0.03] border-white/[0.08]'
        }`}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="e.g. Make scene 2 more dramatic, add tension..."
            disabled={streaming}
            rows={2}
            className={`flex-1 bg-transparent border-0 outline-none resize-none text-[12px] leading-relaxed placeholder-neutral-500 focus:ring-0 font-mono ${d ? 'text-gray-800' : 'text-white'}`}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || streaming}
            className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg bg-accent hover:bg-accent/90 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {streaming ? <FiLoader size={11} className="animate-spin" /> : <FiSend size={11} />}
          </button>
        </div>
        <p className={`text-[9px] mt-1.5 px-1 ${d ? 'text-gray-400' : 'text-surface-600'}`}>
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

// ── Main Project Page ─────────────────────────────────────────────────────
const TABS = [
  { id: 'script',     label: 'Script',     icon: FiFileText },
  { id: 'storyboard', label: 'Storyboard', icon: FiImage },
  { id: 'plan',       label: 'Plan',       icon: FiClipboard },
];

function typeIcon(pt) {
  const t = (pt || '').toLowerCase();
  if (t.includes('podcast')) return '🎙';
  if (t.includes('documentary')) return '📺';
  if (t.includes('drama') || t.includes('theatre')) return '🎭';
  if (t.includes('audio')) return '🎵';
  return '🎬';
}

function fmtDate(isoStr) {
  if (!isoStr) return '';
  const normalized = isoStr.endsWith('Z') || isoStr.includes('+') ? isoStr : isoStr + 'Z';
  return new Date(normalized).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function ProjectPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isDayMode: d } = useTheme();
  const { fetchSavedProjects } = useProjectData();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('script');
  const [modifyOpen, setModifyOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const numericId = decodeProjectRouteId(id);
    getProjectById(numericId)
      .then(data => { if (!cancelled) { setProject(data); setLoading(false); } })
      .catch(err => { if (!cancelled) { setError(err.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [id]);

  const handleProjectUpdated = useCallback((updated) => {
    setProject(updated);
    fetchSavedProjects();
  }, [fetchSavedProjects]);

  const handleSaveScript = async (newScriptText) => {
    try {
      const numericId = decodeProjectRouteId(id);
      const updated = await updateProjectScript(numericId, newScriptText);
      setProject(updated);
      fetchSavedProjects();
    } catch (err) {
      console.error('Failed to save script:', err);
      alert('Failed to save script: ' + err.message);
    }
  };

  return (
    <div className={`flex h-screen overflow-hidden font-display transition-colors duration-500 ${d ? 'bg-[#f0ede8]' : 'bg-[#06060b]'}`}>
      {/* Background glows */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-br from-[#040409] via-[#06060b] to-[#080812]" />
      <div className="absolute top-[10%] left-[20%] w-[500px] h-[500px] rounded-full bg-purple-600/10 blur-[130px] pointer-events-none mix-blend-screen animate-drift-light-1" />
      <div className="absolute bottom-[20%] right-[15%] w-[600px] h-[600px] rounded-full bg-blue-600/8 blur-[150px] pointer-events-none mix-blend-screen animate-drift-light-2" />

      {/* Sidebar */}
      <div className="relative z-30">
        <Sidebar />
      </div>

      {/* Main content area */}
      <div className="relative z-20 flex flex-1 min-w-0 flex-col overflow-hidden">

        {/* Top bar */}
        <header className={`flex items-center gap-4 px-6 py-3 border-b shrink-0 transition-colors duration-500 ${d ? 'border-black/[0.07] bg-white/60 backdrop-blur-sm' : 'border-white/[0.04] bg-black/30 backdrop-blur-sm'}`}>
          <button
            onClick={() => navigate('/')}
            className={`flex items-center gap-1.5 text-[11px] font-semibold rounded-lg px-2.5 py-1.5 transition-all duration-200 ${d ? 'text-gray-500 hover:text-gray-900 hover:bg-black/[0.05]' : 'text-surface-500 hover:text-white hover:bg-white/[0.05]'}`}
          >
            <FiArrowLeft size={13} />
            <span>Studio</span>
          </button>

          {project && (
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-base leading-none">{typeIcon(project.production_type)}</span>
              <div className="min-w-0">
                <h1 className={`text-[13px] font-bold truncate transition-colors duration-500 ${d ? 'text-gray-900' : 'text-white'}`}>
                  {project.title}
                </h1>
                <div className={`flex items-center gap-1.5 text-[9px] font-mono mt-0.5 ${d ? 'text-gray-400' : 'text-surface-600'}`}>
                  <FiFilm size={8} />
                  <span>{project.production_type}</span>
                  <span className="opacity-40">·</span>
                  <FiClock size={8} />
                  <span>{fmtDate(project.updated_at)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            {/* Modify button */}
            <button
              onClick={() => setModifyOpen(o => !o)}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wider transition-all duration-200 border ${
                modifyOpen
                  ? 'bg-accent text-white border-accent shadow-[0_0_16px_rgba(139,92,246,0.3)]'
                  : d
                    ? 'border-accent/30 text-accent hover:bg-accent/10 bg-accent/5'
                    : 'border-accent/25 text-accent hover:bg-accent/10 bg-accent/5'
              }`}
            >
              <FiEdit3 size={12} />
              <span>{modifyOpen ? 'Close Editor' : 'Modify'}</span>
            </button>
          </div>
        </header>

        {/* Content row */}
        <div className="flex flex-1 min-h-0">
          {/* Project content */}
          <div className="flex-1 min-w-0 overflow-y-auto px-6 py-5">
            {loading && (
              <div className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <FiLoader size={24} className="text-accent animate-spin" />
                  <p className={`text-sm ${d ? 'text-gray-500' : 'text-surface-500'}`}>Loading production...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <p className="text-red-400 font-semibold mb-2">Failed to load project</p>
                  <p className="text-surface-600 text-sm">{error}</p>
                  <button onClick={() => navigate('/')} className="mt-4 text-accent text-sm hover:underline">
                    ← Back to Studio
                  </button>
                </div>
              </div>
            )}

            {!loading && !error && project && (
              <div className="max-w-4xl mx-auto space-y-5 pb-10">
                {/* Tab bar */}
                <div className="flex gap-1 rounded-xl bg-white/[0.02] p-1 ring-1 ring-white/[0.04]">
                  {TABS.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150 ${
                        activeTab === tab.id ? 'tab-active' : 'text-surface-500 hover:text-surface-300'
                      }`}
                    >
                      <tab.icon size={13} />
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <div className="glass-panel rounded-xl p-6 bg-surface-950/45 border border-white/[0.03]">
                  {activeTab === 'script' && <ScriptView script={project.script} onSave={handleSaveScript} />}
                  {activeTab === 'storyboard' && <StoryboardView storyboard={project.storyboard} productionType={project.production_type} />}
                  {activeTab === 'plan' && <PlanView plan={project.production_plan} />}
                </div>

                {/* Prompt used */}
                {project.prompt && (
                  <details className={`rounded-xl border p-4 text-[11px] font-mono transition-colors duration-500 ${d ? 'border-black/[0.07] text-gray-500' : 'border-white/[0.05] text-surface-600'}`}>
                    <summary className="cursor-pointer font-semibold tracking-wider uppercase text-[9px] text-accent/60 select-none">
                      Original Prompt
                    </summary>
                    <p className="mt-3 leading-relaxed whitespace-pre-wrap">{project.prompt}</p>
                  </details>
                )}
              </div>
            )}
          </div>

          {/* Modify panel — slides in from the right */}
          {modifyOpen && project && (
            <div className="w-[380px] shrink-0 relative z-10 h-full overflow-hidden">
              <ModifyChatPanel
                project={project}
                onClose={() => setModifyOpen(false)}
                onProjectUpdated={handleProjectUpdated}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
