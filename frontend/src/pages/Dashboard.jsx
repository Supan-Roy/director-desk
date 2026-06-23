import { useState, useRef, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import HeroSection from '../components/HeroSection';
import CreativeModes from '../components/CreativeModes';
import FeaturedProductions from '../components/FeaturedProductions';
import TabbedContent from '../components/TabbedContent';
import AgentActivityPanel from '../components/AgentActivityPanel';
import CreditUsageCard from '../components/CreditUsageCard';
import { useProjectData } from '../hooks/useProjectData';
import { useTheme } from '../context/ThemeContext';
import Footer from '../components/Footer';

// Canvas-based drifting dust spec particles in spotlight beams
function DustParticles() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resizeCanvas = () => {
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const particles = [];
    const particleCount = 20;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 1.2 + 0.4,
        dx: (Math.random() - 0.5) * 0.12,
        dy: (Math.random() - 0.5) * 0.12,
        alpha: Math.random() * 0.4 + 0.1,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.dx;
        p.y += p.dy;

        // Wrap around boundaries
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(167, 139, 250, ${p.alpha})`; // lavender tone
        ctx.fill();
      });
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-10 opacity-30" />;
}

export default function Dashboard() {
  const { hasProject, loading } = useProjectData();
  const { isDayMode } = useTheme();
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
      className={`flex h-screen text-surface-200 select-none overflow-hidden font-display relative transition-colors duration-500 ${isDayMode ? 'bg-white' : 'bg-[#06060b]'}`}
    >
      {/* Background radial lens glows */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-br from-[#040409] via-[#06060b] to-[#080812]" />
      <div className="absolute inset-0 z-0 pointer-events-none bg-cinematic lens-flare-radial opacity-95" />

      {/* Cinematic Vignette for readability */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-radial from-transparent via-black/30 to-black/80 opacity-90" />

      {/* Film Grain SVG Overlay */}
      <svg className="hidden">
        <filter id="film-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.035 0" />
        </filter>
      </svg>
      <div className="absolute inset-0 pointer-events-none z-10 opacity-100" style={{ filter: 'url(#film-noise)' }} />

      {/* Volumetric ambient lights (drifting slowly) */}
      <div className="absolute top-[10%] left-[20%] w-[500px] h-[500px] rounded-full bg-purple-600/10 blur-[130px] pointer-events-none mix-blend-screen animate-drift-light-1" />
      <div className="absolute bottom-[20%] right-[15%] w-[600px] h-[600px] rounded-full bg-blue-600/8 blur-[150px] pointer-events-none mix-blend-screen animate-drift-light-2" />

      {/* Cinematic Viewfinder elements overlay (almost invisible, grid and crosshair target) */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-[0.03] select-none">
        

        {/* Viewfinder corner brackets for the page canvas */}
        <div className="absolute top-12 left-12 w-6 h-6 border-t border-l border-white" />
        <div className="absolute top-12 right-12 w-6 h-6 border-t border-r border-white" />
        <div className="absolute bottom-12 left-12 w-6 h-6 border-b border-l border-white" />
        <div className="absolute bottom-12 right-12 w-6 h-6 border-b border-r border-white" />

        {/* Technical timeline markers / ticks along the top and bottom edge */}
        <div className="absolute top-4 left-24 right-24 h-2 border-b border-dashed border-white/40 flex justify-between text-[6px] font-mono text-white/40">
          <span>00:00:00:00</span>
          <span>00:02:15:00</span>
          <span>00:04:30:00</span>
          <span>00:06:45:00</span>
          <span>00:09:00:00</span>
        </div>

        {/* Grid lines background */}
        <div className="absolute inset-0 bg-grid-lines" />
      </div>

      {/* Permanent Studio Sidebar */}
      <div className="relative z-30 shrink-0 h-screen">
        <Sidebar />
      </div>

      {/* Main Studio Viewport */}
      <div className="flex-1 flex flex-col min-w-0 pr-8 pl-8 md:pl-12 transition-all duration-300 relative z-20 overflow-y-auto">
        {/* Minimal Header */}
        <header className="flex items-center justify-between border-b py-2 shrink-0 transition-colors duration-500 border-white/[0.03] [data-theme='day']_&:border-black/[0.06]">
          <p className="text-[10px] font-extrabold tracking-[0.25em] uppercase header-breadcrumb">
            <span className="text-surface-300">Production Studio</span>
          </p>


        </header>

        {/* Studio Workspace Canvas */}
        <main className="flex-1 py-4">
          <div className="mx-auto max-w-[1400px] space-y-6 pb-8">
            
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

            {(hasProject || loading) && (
              <div className="space-y-8">
                {/* Production Workspace: Screenplays, Storyboard slides, & timeline details */}
                {(hasProject || loading) && (
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
        <Footer />
      </div>
    </div>
  );
}
