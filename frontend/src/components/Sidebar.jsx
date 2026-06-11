import {
  FiGrid,
  FiFolder,
  FiFilm,
  FiSettings,
  FiRefreshCw,
  FiLayers,
  FiDatabase
} from 'react-icons/fi';
import { PiRobotBold } from 'react-icons/pi';
import { useProjectData } from '../hooks/useProjectData';
import { useTheme } from '../context/ThemeContext';

const navItems = [
  { icon: FiGrid, label: 'Studio', active: true },
  { icon: FiFolder, label: 'Projects' },
  { icon: FiFilm, label: 'Productions' },
  { icon: PiRobotBold, label: 'Agents' },
  { icon: FiLayers, label: 'Templates' },
  { icon: FiDatabase, label: 'Assets' },
  { icon: FiSettings, label: 'Settings' },
];

export default function Sidebar() {
  const { hasProject, reset } = useProjectData();
  const { isDayMode: d } = useTheme();

  return (
    <aside className={`w-64 shrink-0 h-screen border-r flex flex-col justify-between overflow-y-auto select-none transition-colors duration-500 ${
      d ? 'bg-white border-black/[0.07]' : 'border-white/[0.04] bg-[#090911]/90'
    }`}>
      {/* Top Section */}
      <div className="flex flex-col gap-6 py-5">
        
        {/* Viewfinder DD Monogram Logo */}
        <div className="flex items-center gap-3 px-5 py-2 select-none relative group">
          {/* Viewfinder corner brackets around the logo itself */}
          <div className={`relative p-1.5 rounded-lg border transition-colors duration-500 ${
            d ? 'border-purple-200/50 bg-purple-50/60' : 'border-white/[0.06] bg-black/40'
          }`}>
            <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-accent/80" />
            <div className="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r border-accent/80" />
            <div className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b border-l border-accent/80" />
            <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-accent/80" />
            <img 
              src="/logo.svg" 
              alt="Director Desk Logo" 
              className="h-7 w-7 shrink-0 filter drop-shadow-[0_0_6px_rgba(139,92,246,0.35)] transition-transform duration-500 group-hover:scale-105" 
            />
          </div>
          <div className="flex flex-col">
            <span className={`text-[12px] font-black tracking-[0.2em] leading-none transition-colors duration-500 ${
              d ? 'text-gray-900' : 'text-white'
            }`}>
              DIRECTOR DESK
            </span>
            <span className="text-[8px] text-accent font-bold tracking-widest mt-1.5 uppercase leading-none">
              creative studio
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className={`h-px mx-4 transition-colors duration-500 ${d ? 'bg-black/[0.07]' : 'bg-white/[0.04]'}`} />

        {/* Navigation Items */}
        <nav className="space-y-1.5 px-3">
          {navItems.map((item) => (
            <button
              key={item.label}
              className={`flex w-full items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-[12px] font-medium transition-all duration-300 relative group ${
                item.active
                  ? d
                    ? 'bg-accent/10 text-accent border-l-2 border-accent shadow-[0_0_15px_rgba(139,92,246,0.08)]'
                    : 'bg-accent/10 text-white shadow-[0_0_15px_rgba(139,92,246,0.1)] border-l-2 border-accent'
                  : d
                    ? 'text-gray-500 hover:bg-black/[0.04] hover:text-gray-800'
                    : 'text-surface-400 hover:bg-white/[0.02] hover:text-surface-200'
              }`}
            >
              <item.icon
                size={15}
                strokeWidth={item.active ? 2.2 : 1.5}
                className={`shrink-0 ${
                  item.active
                    ? 'text-accent'
                    : d
                      ? 'text-gray-400 group-hover:text-gray-700 transition-colors'
                      : 'text-surface-400 group-hover:text-surface-200 transition-colors'
                }`}
              />
              <span className="transition-colors duration-200">{item.label}</span>
              {item.active && (
                <div className="absolute inset-0 bg-accent/5 rounded-xl pointer-events-none blur-sm" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="flex flex-col gap-3 p-4">
        {/* Reset Action */}
        {hasProject && (
          <button
            onClick={reset}
            className="flex w-full items-center gap-3 rounded-xl bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 px-3.5 py-2.5 text-[11px] text-red-400 font-semibold uppercase tracking-wider transition-all duration-200"
            title="Reset Production Workspace"
          >
            <FiRefreshCw size={13} className="shrink-0 animate-pulse text-red-400" />
            <span>Reset Session</span>
          </button>
        )}

        {/* Divider */}
        <div className={`h-px transition-colors duration-500 ${d ? 'bg-black/[0.07]' : 'bg-white/[0.04]'}`} />

        {/* User Info Card (Studio Pass Access Badge) */}
        <div className={`flex flex-col gap-2 rounded-2xl border p-3.5 shadow-lg relative overflow-hidden group transition-colors duration-500 ${
          d ? 'bg-gray-50/80 border-black/[0.07]' : 'bg-[#080810]/80 border-white/[0.05]'
        }`}>
          {/* Subtle grid pattern overlay */}
          <div className="absolute inset-0 bg-grid-lines opacity-[0.02] pointer-events-none" />
          
          <div className="flex items-center gap-3 relative z-10">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent/30 to-accent text-[11px] font-black text-white shadow-[0_0_10px_rgba(139,92,246,0.4)] border border-white/10">
              CD
            </div>
            <div className="min-w-0 flex-1">
              <p className={`truncate text-[11.5px] font-bold leading-tight transition-colors duration-500 ${d ? 'text-gray-800' : 'text-white'}`}>
                Creative Director
              </p>
              <p className="text-[8px] text-accent font-bold tracking-widest mt-1 uppercase">Studio Admin</p>
            </div>
          </div>
          
          {/* Badge footer info */}
          <div className={`flex items-center justify-between border-t pt-2 mt-1 text-[8px] font-mono select-none relative z-10 transition-colors duration-500 ${
            d ? 'border-black/[0.07] text-gray-400' : 'border-white/[0.05] text-surface-550'
          }`}>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              ONLINE // LICENSED
            </span>
            <span>DESK-ID // 089-CD</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
