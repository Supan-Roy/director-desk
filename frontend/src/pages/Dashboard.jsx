import { useState, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import HeroSection from '../components/HeroSection';
import CreativeModes from '../components/CreativeModes';
import FeaturedProductions from '../components/FeaturedProductions';
import WorkflowTimeline from '../components/WorkflowTimeline';
import TabbedContent from '../components/TabbedContent';
import AgentActivityPanel from '../components/AgentActivityPanel';
import CreditUsageCard from '../components/CreditUsageCard';
import { useProjectData } from '../hooks/useProjectData';

export default function Dashboard() {
  const { hasProject, loading } = useProjectData();
  const containerRef = useRef(null);

  // Shared state for the prompt input controls
  const [prompt, setPrompt] = useState('');
  const [aspect, setAspect] = useState('16-9');
  const [style, setStyle] = useState('none');
  const [camera, setCamera] = useState('static');

  // Track mouse coordinates for interactive background lens flare
  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    containerRef.current.style.setProperty('--mouse-x', `${x}px`);
    containerRef.current.style.setProperty('--mouse-y', `${y}px`);
  };

  const handleSelectTemplate = (tmpl) => {
    setPrompt(tmpl.prompt);
    setAspect(tmpl.aspect);
    setStyle(tmpl.id);
    setCamera(tmpl.camera);
    
    // Smooth scroll to the top prompt box
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="flex min-h-screen bg-cinematic lens-flare-radial text-surface-200 select-none overflow-x-hidden font-display relative"
    >
      {/* Sleek Floating Sidebar Dock */}
      <Sidebar />

      {/* Main Studio Viewport */}
      <div className="flex flex-1 flex-col pl-24 md:pl-64 pr-8 md:pr-12 transition-all duration-300">
        {/* Minimal Header */}
        <header className="flex items-center justify-between border-b border-white/[0.03] py-4">
          <p className="text-[11px] font-bold tracking-[0.25em] text-surface-500 uppercase">
            Director Desk <span className="text-surface-700">/</span> <span className="text-surface-300">Production Studio</span>
          </p>
          <div className="flex items-center gap-2 rounded-full bg-emerald-500/5 border border-emerald-500/10 px-3 py-1">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-semibold text-emerald-400/90 uppercase tracking-wider">
              Studio Engines Active
            </span>
          </div>
        </header>

        {/* Studio Workspace Canvas */}
        <main className="flex-1 py-8">
          <div className="mx-auto max-w-[1400px] space-y-12">
            
            {/* Hero Studio Block */}
            <HeroSection 
              prompt={prompt}
              setPrompt={setPrompt}
              aspect={aspect}
              setAspect={setAspect}
              style={style}
              setStyle={setStyle}
              camera={camera}
              setCamera={setCamera}
            />

            {/* Inactive Mode (Before generation begins) */}
            {!hasProject && !loading && (
              <div className="space-y-12 animate-fade-in">
                {/* Creative Templates section */}
                <CreativeModes onSelectTemplate={handleSelectTemplate} />

                {/* Featured Productions section */}
                <FeaturedProductions />
              </div>
            )}

            {/* Active Mode (During/After generation is initiated) */}
            {(hasProject || loading) && (
              <div className="space-y-8">
                {/* Agent schematic flow & scrolling log panel */}
                <WorkflowTimeline />

                {/* Production Workspace: Screenplays, Storyboard slides, & timeline details */}
                {hasProject && (
                  <div className="workspace-reveal flex flex-col lg:flex-row gap-8 mt-10">
                    {/* Screenplay & Storyboards tabbed panels */}
                    <div className="min-w-0 flex-1">
                      <TabbedContent />
                    </div>

                    {/* Technical Command Panels */}
                    <div className="w-full lg:w-80 shrink-0 space-y-6">
                      <AgentActivityPanel />
                      <CreditUsageCard />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
