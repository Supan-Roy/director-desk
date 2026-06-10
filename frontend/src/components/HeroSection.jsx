import { useState } from 'react';
import { FiSend, FiLoader } from 'react-icons/fi';
import { useProjectData } from '../hooks/useProjectData';

export default function HeroSection() {
  const [prompt, setPrompt] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const { generate, loading } = useProjectData();

  const handleSubmit = async () => {
    if (!prompt.trim() || loading) return;
    setErrorMsg('');
    try {
      await generate(prompt);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  return (
    <section className="relative mx-auto max-w-3xl text-center">
      {/* Subtle ambient glow behind hero */}
      <div className="pointer-events-none absolute -top-20 left-1/2 h-64 w-96 -translate-x-1/2 rounded-full bg-accent/[0.03] blur-3xl" />

      {/* Title */}
      <h2 className="relative text-3xl font-semibold tracking-tight text-white sm:text-[2.25rem]">
        What are we creating today?
      </h2>
      <p className="mt-2 text-sm text-surface-500">
        Describe your vision — our AI agents will collaborate to bring it to life.
      </p>

      {/* Prompt input */}
      <div className="relative mt-6">
        <div className="glass-panel-strong rounded-2xl p-2 shadow-elevated">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit();
              }}
              placeholder="A short film about a photographer who discovers her camera can capture memories..."
              className="input-cinematic rounded-xl border-0 bg-transparent px-4 py-3 text-base"
              disabled={loading}
            />
            <button
              onClick={handleSubmit}
              disabled={!prompt.trim() || loading}
              className="btn-primary shrink-0 rounded-xl px-4 py-3"
            >
              {loading ? (
                <FiLoader size={16} className="animate-spin" />
              ) : (
                <FiSend size={16} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Quick suggestions */}
      {!prompt && !errorMsg && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => setPrompt(s)}
              className="rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-[12px] text-surface-400 transition-all hover:border-white/[0.1] hover:bg-white/[0.04] hover:text-surface-200"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Error display */}
      {errorMsg && (
        <div className="mt-4 rounded-xl border border-red-500/10 bg-red-500/[0.04] px-4 py-3 text-left">
          <p className="text-[12px] font-medium text-red-400">Generation failed</p>
          <p className="mt-1 text-[12px] text-red-300/70">{errorMsg}</p>
        </div>
      )}
    </section>
  );
}

const suggestions = [
  'A sci-fi short about first contact',
  'A documentary about AI art',
  'A horror trailer set in an abandoned hospital',
  'A podcast episode about creativity',
];
