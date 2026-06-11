import { useState, useEffect } from 'react';
import {
  FiGrid,
  FiFolder,
  FiFilm,
  FiSettings,
  FiRefreshCw
} from 'react-icons/fi';
import { PiRobotBold } from 'react-icons/pi';
import { useProjectData } from '../hooks/useProjectData';

const navItems = [
  { icon: FiGrid, label: 'Studio', active: true },
  { icon: FiFolder, label: 'Projects' },
  { icon: FiFilm, label: 'Productions' },
  { icon: PiRobotBold, label: 'Agents' },
];

export default function Sidebar() {
  const { hasProject, reset } = useProjectData();
  const [hovered, setHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect screen size to handle default responsive expansion
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const showExpanded = !isMobile || hovered;

  return (
    <aside 
      className={`fixed left-4 top-1/2 z-50 h-[85vh] -translate-y-1/2 rounded-2xl border border-white/[0.05] bg-surface-950/40 backdrop-blur-2xl shadow-2xl transition-all duration-300 ease-out flex flex-col justify-between overflow-hidden ${
        showExpanded ? 'w-52' : 'w-16'
      }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Top Section */}
      <div className="flex flex-col gap-6 py-5">
        {/* Logo */}
        <div className={`flex items-center gap-3 transition-all duration-200 ${showExpanded ? 'pl-5 pr-4' : 'justify-center px-0'}`}>
          <img src="/logo.svg" alt="Director Desk Logo" className="h-7 w-7 shrink-0 shadow-[0_0_10px_rgba(139,92,246,0.25)] rounded-lg" />
          {showExpanded && (
            <span className="text-[12px] font-extrabold tracking-[0.18em] text-white">
              DIRECTOR DESK
            </span>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-white/[0.04] mx-3" />

        {/* Navigation Items */}
        <nav className={`flex flex-col gap-1.5 transition-all duration-200 ${showExpanded ? 'px-2.5' : 'items-center px-1'}`}>
          {navItems.map((item) => (
            <button
              key={item.label}
              className={`flex items-center transition-all duration-200 group ${
                showExpanded 
                  ? 'w-full px-3 py-2.5 gap-3.5 rounded-xl text-[13px]' 
                  : 'h-10 w-10 justify-center rounded-xl'
              } ${
                item.active
                  ? 'bg-white/[0.05] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
                  : 'text-surface-400 hover:bg-white/[0.02] hover:text-surface-200'
              }`}
            >
              <item.icon size={16} strokeWidth={item.active ? 2 : 1.5} className="shrink-0" />
              {showExpanded && (
                <span className="transition-opacity duration-200 whitespace-nowrap">
                  {item.label}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="flex flex-col gap-3 p-3">
        {/* Reset Action */}
        {hasProject && (
          <button
            onClick={reset}
            className={`flex items-center bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 text-red-400 transition-all duration-200 ${
              showExpanded 
                ? 'w-full px-3 py-2.5 gap-3.5 rounded-xl text-[13px]' 
                : 'h-10 w-10 justify-center rounded-xl'
            }`}
            title="Reset Production Workspace"
          >
            <FiRefreshCw size={14} className="shrink-0 animate-pulse" />
            {showExpanded && (
              <span className="font-medium">
                Reset Session
              </span>
            )}
          </button>
        )}

        {/* Divider */}
        <div className="h-px bg-white/[0.04]" />

        {/* User Info */}
        <div className={`flex items-center rounded-xl bg-white/[0.02] ring-1 ring-white/[0.04] transition-all duration-200 ${
          showExpanded ? 'p-1.5 gap-3' : 'h-10 w-10 justify-center p-0'
        }`}>
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-surface-600 to-surface-700 text-[11px] font-medium text-surface-200">
            DD
          </div>
          {showExpanded && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium text-surface-200 leading-none">Creative Director</p>
              <p className="text-[9px] text-surface-500 mt-0.5 leading-none">Studio Plan</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
