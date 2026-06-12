import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FiGrid,
  FiFolder,
  FiFilm,
  FiSettings,
  FiRefreshCw,
  FiLayers,
  FiDatabase,
  FiChevronDown,
  FiChevronRight,
  FiTrash2,
  FiClock,
} from 'react-icons/fi';
import { PiRobotBold } from 'react-icons/pi';
import { useProjectData } from '../hooks/useProjectData';
import { useTheme } from '../context/ThemeContext';

// ── Helpers ────────────────────────────────────────────────────────────────

function typeIcon(productionType) {
  const t = (productionType || '').toLowerCase();
  if (t.includes('podcast')) return '🎙';
  if (t.includes('documentary')) return '📺';
  if (t.includes('drama') || t.includes('theatre')) return '🎭';
  if (t.includes('audio')) return '🎵';
  if (t.includes('commercial') || t.includes('ad')) return '📡';
  if (t.includes('series') || t.includes('episode')) return '📺';
  return '🎬';
}

function shortDate(isoStr) {
  if (!isoStr) return '';
  const normalized =
    isoStr.endsWith('Z') || isoStr.includes('+') || isoStr.includes('-', 10)
      ? isoStr
      : isoStr + 'Z';
  const d = new Date(normalized);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1)  return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24)   return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7)    return `${diffD}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ── Skeleton loader ────────────────────────────────────────────────────────

function ProjectSkeleton({ d }) {
  return (
    <div className="space-y-1.5 px-1">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={`h-8 rounded-lg animate-pulse ${d ? 'bg-black/[0.05]' : 'bg-white/[0.04]'}`}
        />
      ))}
    </div>
  );
}

// ── Main Sidebar ───────────────────────────────────────────────────────────

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    hasProject,
    reset,
    savedProjects,
    projectsLoading,
    removeSavedProject,
  } = useProjectData();
  const { isDayMode: d } = useTheme();

  const [projectsOpen, setProjectsOpen] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const activeProjectId = (() => {
    const match = location.pathname.match(/^\/projects\/(\d+)$/);
    return match ? Number(match[1]) : null;
  })();

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    setDeletingId(id);
    await removeSavedProject(id);
    setDeletingId(null);
    if (activeProjectId === id) navigate('/');
  };

  return (
    <aside className={`w-64 shrink-0 h-screen border-r flex flex-col select-none transition-colors duration-500 ${
      d ? 'bg-white border-black/[0.07]' : 'border-white/[0.04] bg-[#090911]/90'
    }`}>

      {/* ── Logo (fixed, never scrolls away) ── */}
      <div className="flex items-center gap-3 px-5 py-4 shrink-0 select-none relative group">
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
      <div className={`h-px mx-4 shrink-0 transition-colors duration-500 ${d ? 'bg-black/[0.07]' : 'bg-white/[0.04]'}`} />

      {/* ── Scrollable middle: nav + projects ── */}
      <div className="flex-1 overflow-y-auto min-h-0 py-3 flex flex-col gap-3">

        {/* Nav items */}
        <nav className="space-y-1 px-3">
          {[
            { icon: FiGrid,      label: 'Studio',      path: '/' },
            { icon: FiFilm,      label: 'Productions' },
            { icon: PiRobotBold, label: 'Agents' },
            { icon: FiLayers,    label: 'Templates' },
            { icon: FiDatabase,  label: 'Assets' },
            { icon: FiSettings,  label: 'Settings' },
          ].map((item) => {
            const isActive = item.path ? location.pathname === item.path : false;
            return (
              <button
                key={item.label}
                onClick={() => item.path && navigate(item.path)}
                className={`flex w-full items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-[12px] font-medium transition-all duration-300 relative group ${
                  isActive
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
                  strokeWidth={isActive ? 2.2 : 1.5}
                  className={`shrink-0 ${
                    isActive
                      ? 'text-accent'
                      : d
                        ? 'text-gray-400 group-hover:text-gray-700 transition-colors'
                        : 'text-surface-400 group-hover:text-surface-200 transition-colors'
                  }`}
                />
                <span className="transition-colors duration-200">{item.label}</span>
                {isActive && (
                  <div className="absolute inset-0 bg-accent/5 rounded-xl pointer-events-none blur-sm" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Divider */}
        <div className={`h-px mx-4 transition-colors duration-500 ${d ? 'bg-black/[0.07]' : 'bg-white/[0.04]'}`} />

        {/* ── Projects Section — always visible ── */}
        <div className="px-3">

          {/* Section header / toggle — always rendered */}
          <button
            onClick={() => setProjectsOpen((o) => !o)}
            className={`flex w-full items-center justify-between px-2 py-1.5 mb-2 rounded-lg text-[10px] font-bold tracking-widest uppercase transition-colors duration-200 ${
              d
                ? 'text-gray-500 hover:text-gray-800'
                : 'text-surface-400 hover:text-surface-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <FiFolder size={11} />
              <span>Projects</span>
              {savedProjects.length > 0 && (
                <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-black ${
                  d ? 'bg-accent/15 text-accent' : 'bg-accent/20 text-accent'
                }`}>
                  {savedProjects.length}
                </span>
              )}
            </div>
            {projectsOpen
              ? <FiChevronDown size={11} />
              : <FiChevronRight size={11} />}
          </button>

          {/* Project list */}
          {projectsOpen && (
            <div className="space-y-0.5">
              {projectsLoading ? (
                <ProjectSkeleton d={d} />
              ) : savedProjects.length === 0 ? (
                <div className={`px-3 py-4 text-center text-[10px] transition-colors duration-500 ${
                  d ? 'text-gray-400' : 'text-surface-600'
                }`}>
                  <div className="text-2xl mb-1.5 opacity-40">🎬</div>
                  <p className="font-medium">No saved productions yet</p>
                  <p className="opacity-70 mt-0.5">Generate one to get started</p>
                </div>
              ) : (
                savedProjects.map((project) => {
                  const isActive = activeProjectId === project.id;
                  return (
                    <button
                      key={project.id}
                      onClick={() => navigate(`/projects/${project.id}`)}
                      title={project.title}
                      className={`group relative w-full flex items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition-all duration-200 ${
                        isActive
                          ? d
                            ? 'bg-accent/10 border border-accent/25 shadow-[0_0_12px_rgba(139,92,246,0.08)]'
                            : 'bg-accent/10 border border-accent/20 shadow-[0_0_12px_rgba(139,92,246,0.12)]'
                          : d
                            ? 'hover:bg-black/[0.04] border border-transparent hover:border-black/[0.06]'
                            : 'hover:bg-white/[0.03] border border-transparent hover:border-white/[0.06]'
                      }`}
                    >
                      {/* Type emoji */}
                      <span className="text-base leading-none shrink-0 mt-0.5">
                        {typeIcon(project.production_type)}
                      </span>

                      {/* Text block */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-[11.5px] font-semibold leading-tight truncate transition-colors duration-200 ${
                          isActive
                            ? 'text-accent'
                            : d
                              ? 'text-gray-700 group-hover:text-gray-900'
                              : 'text-surface-200 group-hover:text-white'
                        }`}>
                          {project.title}
                        </p>
                        <div className={`flex items-center gap-1 mt-1 text-[9px] font-mono transition-colors duration-200 ${
                          d ? 'text-gray-400' : 'text-surface-600'
                        }`}>
                          <FiClock size={8} />
                          <span>{shortDate(project.created_at)}</span>
                          {project.production_type && (
                            <>
                              <span className="opacity-40">·</span>
                              <span className="truncate">{project.production_type}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Delete button — visible on hover */}
                      <button
                        onClick={(e) => handleDelete(e, project.id)}
                        disabled={deletingId === project.id}
                        title="Delete project"
                        className={`shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-150 rounded-md p-1 -mr-1 -mt-0.5 ${
                          d
                            ? 'hover:bg-red-50 text-gray-300 hover:text-red-500'
                            : 'hover:bg-red-500/10 text-surface-600 hover:text-red-400'
                        } ${deletingId === project.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <FiTrash2 size={11} />
                      </button>

                      {/* Active indicator bar */}
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-accent rounded-r-full" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Section (fixed at bottom) ── */}
      <div className="flex flex-col gap-3 p-4 shrink-0">
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

        {/* User Info Card */}
        <div className={`flex flex-col gap-2 rounded-2xl border p-3.5 shadow-lg relative overflow-hidden group transition-colors duration-500 ${
          d ? 'bg-gray-50/80 border-black/[0.07]' : 'bg-[#080810]/80 border-white/[0.05]'
        }`}>
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
