import Sidebar from '../components/Sidebar';
import HeroSection from '../components/HeroSection';
import CreativeModes from '../components/CreativeModes';
import WorkflowTimeline from '../components/WorkflowTimeline';
import TabbedContent from '../components/TabbedContent';
import AgentActivityPanel from '../components/AgentActivityPanel';
import CreditUsageCard from '../components/CreditUsageCard';
import EmptyState from '../components/EmptyState';
import { useProjectData } from '../hooks/useProjectData';

export default function Dashboard() {
  const { hasProject, loading } = useProjectData();

  return (
    <div className="flex min-h-screen bg-cinematic">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex flex-1 flex-col">
        {/* Header bar */}
        <header className="flex items-center justify-between border-b border-white/[0.04] px-8 py-3">
          <p className="text-xs text-surface-500">
            Director Desk <span className="text-surface-700">/</span> <span className="text-surface-300">Studio</span>
          </p>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
            <span className="text-[11px] text-surface-500 tracking-wide">Agents ready</span>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1400px] px-8 py-8">
            {/* Hero prompt — always visible, centered */}
            <HeroSection />

            {hasProject ? (
              <div className="mt-10 space-y-8">
                {/* Creative mode selector */}
                <CreativeModes />

                {/* Pipeline */}
                <WorkflowTimeline />

                {/* Main content area: 2-col layout */}
                <div className="flex gap-6">
                  {/* Left: script/storyboard/plan */}
                  <div className="min-w-0 flex-1">
                    <TabbedContent />
                  </div>

                  {/* Right: command center */}
                  <div className="w-72 shrink-0 space-y-6">
                    <AgentActivityPanel />
                    <CreditUsageCard />
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-12">
                <EmptyState />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
