import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  FiChevronLeft,
  FiTrash2,
  FiClock,
  FiMoreHorizontal,
  FiShare2,
  FiArchive,
  FiEdit2,
  FiUser,
  FiMail,
  FiCalendar,
  FiCamera,
  FiX,
  FiCheck,
} from 'react-icons/fi';
import { PiRobotBold } from 'react-icons/pi';
import { useProjectData } from '../hooks/useProjectData';
import { useTheme } from '../context/ThemeContext';
import { encodeId, decodeId } from '../utils/hashids';
import ProjectIcon from './ProjectIcon';

// ── Custom SVGs ─────────────────────────────────────────────────────────────

function PinIcon({ size = 12, className, filled = false }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ transform: "rotate(45deg)", display: 'inline-block' }}
    >
      <line x1="12" y1="17" x2="12" y2="22" />
      <path d="M5 17h14v-1.76a2 2 0 0 0-.44-1.24l-2.78-3.5A2 2 0 0 1 15 9.24V5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v4.24c0 .43-.14.86-.4 1.22l-2.8 3.5a2 2 0 0 0-.44 1.24z" />
    </svg>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function SidebarIcon({ size = 16, className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.0"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="3" y="3" width="18" height="18" rx="2.5" ry="2.5" />
      <line x1="9" y1="3" x2="9" y2="21" />
    </svg>
  );
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

const getInitials = (firstName, lastName) => {
  const f = typeof firstName === 'string' ? firstName.trim().charAt(0) : '';
  const l = typeof lastName === 'string' ? lastName.trim().charAt(0) : '';
  return (f + l).toUpperCase() || 'U';
};

function getUserProfile() {
  const saved = localStorage.getItem('user_profile');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (!parsed.plan) {
        parsed.plan = "Free Plan";
      }
      return parsed;
    } catch (e) {
      console.error(e);
    }
  }
  return {
    firstName: "Creative",
    lastName: "Director",
    email: "director@director-desk.com",
    dob: "1990-01-01",
    photo: null,
    plan: "Free Plan"
  };
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
    updateProjectDetails,
  } = useProjectData();
  const { isDayMode: d } = useTheme();

  const activeProjectId = (() => {
    const match = location.pathname.match(/^\/projects\/([a-z0-9]+)(?:\/production)?$/);
    return match ? decodeId(match[1]) : null;
  })();

  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('sidebar-collapsed') === 'true');
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [projectToDelete, setProjectToDelete] = useState(null);

  const [activeMenuId, setActiveMenuId] = useState(null);
  const [menuTriggerRect, setMenuTriggerRect] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  // Profile states
  const [profile, setProfile] = useState(getUserProfile);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [formFirstName, setFormFirstName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formDob, setFormDob] = useState('');
  const [formPhoto, setFormPhoto] = useState(null);
  const [formPlan, setFormPlan] = useState('Free Plan');
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isProfileOpen) {
      setFormFirstName(profile.firstName || '');
      setFormLastName(profile.lastName || '');
      setFormEmail(profile.email || '');
      setFormDob(profile.dob || '');
      setFormPhoto(profile.photo || null);
      setFormPlan(profile.plan || 'Free Plan');
    }
  }, [isProfileOpen, profile]);

  // Sync profile edits from external sources
  useEffect(() => {
    const handleProfileUpdate = () => {
      setProfile(getUserProfile());
    };
    window.addEventListener('user_profile_updated', handleProfileUpdate);
    return () => window.removeEventListener('user_profile_updated', handleProfileUpdate);
  }, []);

  const handleSaveProfile = () => {
    const updated = {
      firstName: formFirstName,
      lastName: formLastName,
      email: formEmail,
      dob: formDob,
      photo: formPhoto,
      plan: formPlan
    };
    localStorage.setItem('user_profile', JSON.stringify(updated));
    setProfile(updated);
    setIsProfileOpen(false);
    window.dispatchEvent(new Event('user_profile_updated'));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormPhoto(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoRemove = (e) => {
    e.stopPropagation();
    setFormPhoto(null);
  };

  const handleTriggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const getMenuStyles = () => {
    if (!menuTriggerRect) return {};
    const { bottom, right, top } = menuTriggerRect;
    const spaceBelow = window.innerHeight - bottom;
    const dropdownHeight = 220; // conservative estimate for w-40 menu height
    const showAbove = spaceBelow < dropdownHeight && top > dropdownHeight;

    return {
      position: 'fixed',
      top: showAbove ? `${top - 4}px` : `${bottom + 4}px`,
      transform: showAbove ? 'translateY(-100%)' : 'none',
      left: `${right - 160}px`,
      width: '160px',
      zIndex: 9999,
    };
  };

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (
        activeMenuId &&
        !e.target.closest('.project-menu-container') &&
        !e.target.closest('.project-dropdown-portal')
      ) {
        setActiveMenuId(null);
        setMenuTriggerRect(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [activeMenuId]);

  useEffect(() => {
    const handleScrollOrResize = () => {
      if (activeMenuId) {
        setActiveMenuId(null);
        setMenuTriggerRect(null);
      }
    };
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [activeMenuId]);

  const pinnedProjects = (savedProjects || []).filter(p => p.is_pinned && !p.is_archived);
  const recentProjects = (savedProjects || []).filter(p => !p.is_pinned && !p.is_archived);

  const handleDelete = (e, project) => {
    e.stopPropagation();
    setProjectToDelete(project);
  };

  const confirmDelete = async () => {
    if (!projectToDelete) return;
    const id = projectToDelete.id;
    setProjectToDelete(null);
    setDeletingId(id);
    await removeSavedProject(id);
    setDeletingId(null);
    if (activeProjectId === id) navigate('/');
  };

  const renderProjectRow = (project) => {
    const isActive = activeProjectId === project.id;
    const isRenaming = renamingId === project.id;

    return (
      <div
        key={project.id}
        onClick={() => {
          if (!isRenaming) {
            const targetUrl = project.approved
              ? `/projects/${encodeId(project.id)}/production`
              : `/projects/${encodeId(project.id)}`;
            navigate(targetUrl);
          }
        }}
        title={project.title}
        className={`group relative w-full flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-all duration-200 cursor-pointer ${
          isActive
            ? d
              ? 'bg-accent/10 border border-accent/25'
              : 'bg-surface-800 border border-surface-700 text-white'
            : d
              ? 'hover:bg-black/[0.04] border border-transparent hover:border-black/[0.06]'
              : 'hover:bg-surface-800/40 border border-transparent hover:border-surface-700'
        }`}
      >
        {/* Type icon */}
        <ProjectIcon
          type={project.production_type}
          size="sm"
          dayMode={d}
          active={isActive}
        />

        {/* Text block */}
        <div className="flex-1 min-w-0">
          {isRenaming ? (
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === 'Enter') {
                  e.stopPropagation();
                  if (renameValue.trim() && renameValue.trim() !== project.title) {
                    await updateProjectDetails(project.id, { title: renameValue.trim() });
                  }
                  setRenamingId(null);
                } else if (e.key === 'Escape') {
                  e.stopPropagation();
                  setRenamingId(null);
                }
              }}
              onBlur={async () => {
                if (renameValue.trim() && renameValue.trim() !== project.title) {
                  await updateProjectDetails(project.id, { title: renameValue.trim() });
                }
                setRenamingId(null);
              }}
              autoFocus
              onClick={(e) => e.stopPropagation()}
              className={`w-full bg-transparent border-b focus:outline-none text-[11.5px] font-semibold py-0.5 ${
                d ? 'text-gray-900 border-gray-300' : 'text-white border-surface-600'
              }`}
            />
          ) : (
            <div className="flex items-center gap-1.5 min-w-0">
              <p className={`text-[11.5px] font-semibold leading-tight truncate transition-colors duration-200 ${
                isActive
                  ? 'text-accent font-bold'
                  : d
                    ? 'text-gray-700 group-hover:text-gray-900'
                    : 'text-surface-200 group-hover:text-white'
              }`}>
                {project.title}
              </p>
              {project.is_pinned && (
                <PinIcon size={10} className="shrink-0 text-accent/60" filled />
              )}
            </div>
          )}
          <div className={`flex items-center gap-1 mt-1 text-[9px] font-mono transition-colors duration-200 ${
            d ? 'text-gray-400' : 'text-surface-600'
          }`}>
            <FiClock size={8} />
            <span>{shortDate(project.updated_at)}</span>
            {project.production_type && (
              <>
                <span className="opacity-40">·</span>
                <span className="truncate">{project.production_type}</span>
              </>
            )}
          </div>
        </div>

        {/* 3-Dot Popover Menu */}
        {!isRenaming && (
          <div className="relative shrink-0 project-menu-container">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (activeMenuId === project.id) {
                  setActiveMenuId(null);
                  setMenuTriggerRect(null);
                } else {
                  setActiveMenuId(project.id);
                  setMenuTriggerRect(e.currentTarget.getBoundingClientRect());
                }
              }}
              title="Project actions"
              className={`opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-150 rounded-md p-1 -mr-1 -mt-0.5 cursor-pointer ${
                d
                  ? 'hover:bg-neutral-100 text-gray-400 hover:text-gray-700'
                  : 'hover:bg-surface-700 text-surface-400 hover:text-white'
              } ${activeMenuId === project.id ? 'opacity-100 bg-surface-700' : ''}`}
            >
              <FiMoreHorizontal size={13} />
            </button>

            {activeMenuId === project.id && createPortal(
              <div
                onClick={(e) => e.stopPropagation()}
                className={`project-dropdown-portal rounded-lg border p-1 shadow-xl flex flex-col gap-0.5 transition-all select-none ${
                  d
                    ? 'bg-white border-neutral-200 text-neutral-800'
                    : 'bg-surface-900 border-surface-750 text-surface-200'
                }`}
                style={getMenuStyles()}
              >
                <button
                  onClick={() => {
                    const shareLink = `${window.location.origin}/projects/${encodeId(project.id)}`;
                    navigator.clipboard.writeText(shareLink);
                    setCopiedId(project.id);
                    setTimeout(() => setCopiedId(null), 2000);
                  }}
                  className={`w-full flex items-center px-2 py-1.5 rounded text-[10.5px] font-semibold transition-colors cursor-pointer text-left ${
                    d ? 'hover:bg-neutral-50' : 'hover:bg-surface-800 hover:text-white'
                  }`}
                >
                  <FiShare2 size={12} className={`mr-2 ${copiedId === project.id ? 'text-emerald-500' : 'text-purple-400'}`} />
                  <span>{copiedId === project.id ? 'Link Copied!' : 'Share'}</span>
                </button>

                <button
                  onClick={() => {
                    setRenamingId(project.id);
                    setRenameValue(project.title);
                    setActiveMenuId(null);
                    setMenuTriggerRect(null);
                  }}
                  className={`w-full flex items-center px-2 py-1.5 rounded text-[10.5px] font-semibold transition-colors cursor-pointer text-left ${
                    d ? 'hover:bg-neutral-50' : 'hover:bg-surface-800 hover:text-white'
                  }`}
                >
                  <FiEdit2 size={12} className="mr-2 text-blue-400" />
                  <span>Rename</span>
                </button>

                <button
                  onClick={async () => {
                    setActiveMenuId(null);
                    setMenuTriggerRect(null);
                    await updateProjectDetails(project.id, { is_pinned: !project.is_pinned });
                  }}
                  className={`w-full flex items-center px-2 py-1.5 rounded text-[10.5px] font-semibold transition-colors cursor-pointer text-left ${
                    d ? 'hover:bg-neutral-50' : 'hover:bg-surface-800 hover:text-white'
                  }`}
                >
                  <PinIcon size={12} className={`mr-2 ${project.is_pinned ? 'text-yellow-500' : 'text-purple-400'}`} filled={project.is_pinned} />
                  <span>{project.is_pinned ? 'Unpin' : 'Pin'}</span>
                </button>

                <button
                  onClick={async () => {
                    setActiveMenuId(null);
                    setMenuTriggerRect(null);
                    await updateProjectDetails(project.id, { is_archived: true });
                  }}
                  className={`w-full flex items-center px-2 py-1.5 rounded text-[10.5px] font-semibold transition-colors cursor-pointer text-left ${
                    d ? 'hover:bg-neutral-50' : 'hover:bg-surface-800 hover:text-white'
                  }`}
                >
                  <FiArchive size={12} className="mr-2 text-emerald-400" />
                  <span>Archive</span>
                </button>

                <div className={`h-px my-1 ${d ? 'bg-neutral-100' : 'bg-surface-800'}`} />

                <button
                  onClick={(e) => {
                    setActiveMenuId(null);
                    setMenuTriggerRect(null);
                    handleDelete(e, project);
                  }}
                  className={`w-full flex items-center px-2 py-1.5 rounded text-[10.5px] font-semibold text-red-500 transition-colors cursor-pointer text-left ${
                    d ? 'hover:bg-red-50/50' : 'hover:bg-red-950/20 hover:text-red-400'
                  }`}
                >
                  <FiTrash2 size={12} className="mr-2" />
                  <span>Delete</span>
                </button>
              </div>,
              document.body
            )}
          </div>
        )}

        {/* Active indicator bar */}
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-accent rounded-r-full" />
        )}
      </div>
    );
  };

  return (
    <aside className={`shrink-0 h-screen border-r flex flex-col select-none transition-all duration-300 ${
      isCollapsed ? 'w-20 items-center' : 'w-64'
    } ${
      d ? 'bg-white border-black/[0.07]' : 'border-surface-700 bg-surface-950'
    }`}>

      {/* ── Logo (fixed, never scrolls away) ── */}
      <div className={`flex shrink-0 select-none relative group transition-all duration-300 ${
        isCollapsed ? 'flex-col items-center gap-3 px-3 py-4' : 'flex-row items-center justify-between px-5 py-4 w-full'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`relative p-1.5 rounded-lg border transition-colors duration-500 ${
            d ? 'border-purple-200/50 bg-purple-50/60' : 'border-surface-600 bg-surface-950'
          }`}>
            <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-accent/80" />
            <div className="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r border-accent/80" />
            <div className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b border-l border-accent/80" />
            <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-accent/80" />
            <img
              src="/logo.svg"
              alt="Director Desk Logo"
              className="h-7 w-7 shrink-0 transition-transform duration-500 group-hover:scale-105"
            />
          </div>
          {!isCollapsed && (
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
          )}
        </div>

        {/* Collapse / Expand Toggle Button */}
        <button
          onClick={() => {
            const nextState = !isCollapsed;
            setIsCollapsed(nextState);
            localStorage.setItem('sidebar-collapsed', String(nextState));
          }}
          className={`p-2 rounded-lg transition-colors cursor-pointer flex items-center justify-center ${
            d
              ? 'text-gray-500 hover:bg-black/5 hover:text-gray-800'
              : 'text-surface-400 hover:bg-white/10 hover:text-white'
          }`}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <SidebarIcon size={16} />
        </button>
      </div>

      {/* Divider */}
      <div className={`h-px shrink-0 transition-all duration-300 ${isCollapsed ? 'w-12 mx-auto' : 'mx-4 w-[calc(100%-2rem)]'} ${d ? 'bg-black/[0.07]' : 'bg-white/[0.04]'}`} />

      {/* ── Scrollable middle: nav + projects ── */}
      <div className={`flex-1 overflow-y-auto min-h-0 py-3 flex flex-col gap-3 w-full ${isCollapsed ? 'items-center' : ''}`}>

        {/* Nav items */}
        <nav className={`space-y-1 w-full ${isCollapsed ? 'px-2 flex flex-col items-center' : 'px-3'}`}>
          {[
            { icon: FiGrid,      label: 'Studio',      path: '/' },
            { icon: FiFilm,      label: 'Studio Editor', path: '/editor' },
            { icon: PiRobotBold, label: 'Agents' },
            { icon: FiLayers,    label: 'Templates' },
            { icon: FiDatabase,  label: 'Assets' },
            { icon: FiSettings,  label: 'Settings',    path: '/settings' },
          ].map((item) => {
            const isActive = item.path ? location.pathname === item.path : false;
            return (
              <button
                key={item.label}
                onClick={() => item.path && navigate(item.path)}
                title={isCollapsed ? item.label : undefined}
                className={`flex items-center rounded-lg transition-all duration-300 relative group ${
                  isCollapsed ? 'justify-center w-12 h-12 p-0' : 'w-full gap-3.5 px-3.5 py-2.5 text-[12px] font-medium'
                } ${
                  isActive
                    ? d
                      ? 'bg-accent/10 text-accent border-l-2 border-accent'
                      : 'bg-surface-800 text-white border-l-2 border-accent'
                    : d
                      ? 'text-gray-500 hover:bg-black/[0.04] hover:text-gray-800'
                      : 'text-surface-400 hover:bg-white/[0.02] hover:text-surface-200'
                }`}
              >
                <item.icon
                  size={isCollapsed ? 18 : 15}
                  strokeWidth={isActive ? 2.2 : 1.5}
                  className={`shrink-0 ${
                    isActive
                      ? 'text-accent'
                      : d
                        ? 'text-gray-400 group-hover:text-gray-700 transition-colors'
                        : 'text-surface-400 group-hover:text-surface-200 transition-colors'
                  }`}
                />
                {!isCollapsed && <span className="transition-colors duration-200">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Divider */}
        <div className={`h-px shrink-0 transition-all duration-300 ${isCollapsed ? 'w-12 mx-auto' : 'mx-4 w-[calc(100%-2rem)]'} ${d ? 'bg-black/[0.07]' : 'bg-white/[0.04]'}`} />

        {/* ── Projects Section — always visible ── */}
        <div className={`w-full ${isCollapsed ? 'px-2 flex flex-col items-center' : 'px-3'}`}>

          {isCollapsed ? (
            <button
              onClick={() => {
                setIsCollapsed(false);
                localStorage.setItem('sidebar-collapsed', 'false');
              }}
              title="Show Saved Projects"
              className={`relative flex items-center justify-center w-12 h-12 rounded-lg transition-all duration-200 border border-transparent ${
                d
                  ? 'text-gray-500 hover:text-gray-800 hover:bg-black/[0.04]'
                  : 'text-surface-400 hover:text-surface-200 hover:bg-white/[0.02]'
              }`}
            >
              <FiFolder size={18} />
              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[1rem] h-4 px-1 rounded-full text-[8px] font-black bg-accent text-white">
                {savedProjects.length}
              </span>
            </button>
          ) : (
            <>
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
                  <span className={`inline-flex items-center justify-center min-w-[1rem] h-4 px-1 rounded-full text-[9px] font-black ${
                    d ? 'bg-accent/15 text-accent' : 'bg-accent/20 text-accent'
                  }`}>
                    {savedProjects.length}
                  </span>
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
                  ) : (savedProjects || []).filter(p => !p.is_archived).length === 0 ? (
                    <div className={`px-3 py-4 text-center text-[10px] transition-colors duration-500 ${
                      d ? 'text-gray-400' : 'text-surface-600'
                    }`}>
                      <div className="flex justify-center mb-2">
                        <ProjectIcon type="film" size="md" dayMode={d} className="opacity-50" />
                      </div>
                      <p className="font-medium">No saved productions yet</p>
                      <p className="opacity-70 mt-0.5">Generate one to get started</p>
                    </div>
                  ) : (
                    <>
                      {/* Pinned section */}
                      {pinnedProjects.length > 0 && (
                        <div className="space-y-0.5 mb-3.5">
                          <p className={`px-3 py-1 text-[9px] font-bold uppercase tracking-[0.15em] font-mono leading-none ${
                            d ? 'text-neutral-400' : 'text-surface-500'
                          }`}>
                            Pinned
                          </p>
                          {pinnedProjects.map((project) => renderProjectRow(project))}
                        </div>
                      )}

                      {/* Recents section */}
                      <div className="space-y-0.5">
                        {pinnedProjects.length > 0 && (
                          <p className={`px-3 py-1 text-[9px] font-bold uppercase tracking-[0.15em] font-mono leading-none mb-1 ${
                            d ? 'text-neutral-400' : 'text-surface-500'
                          }`}>
                            Recents
                          </p>
                        )}
                        {recentProjects.map((project) => renderProjectRow(project))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Bottom Section (fixed at bottom) ── */}
      <div className={`flex flex-col gap-3 p-4 shrink-0 w-full ${isCollapsed ? 'items-center' : ''}`}>
        {/* Reset Action */}
        {hasProject && (
          isCollapsed ? (
            <button
              onClick={reset}
              className="w-12 h-12 rounded-lg bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 flex items-center justify-center text-red-400 transition-all cursor-pointer"
              title="Reset Session"
            >
              <FiRefreshCw size={15} className="shrink-0 animate-pulse text-red-400" />
            </button>
          ) : (
            <button
              onClick={reset}
              className="flex w-full items-center gap-3 rounded-lg bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 px-3.5 py-2.5 text-[11px] text-red-400 font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer"
              title="Reset Production Workspace"
            >
              <FiRefreshCw size={13} className="shrink-0 animate-pulse text-red-400" />
              <span>Reset Session</span>
            </button>
          )
        )}

        {/* Divider */}
        <div className={`h-px shrink-0 transition-all duration-300 ${isCollapsed ? 'w-12 mx-auto' : 'mx-4 w-[calc(100%-2rem)]'} ${d ? 'bg-black/[0.07]' : 'bg-white/[0.04]'}`} />

        {/* User Info Card */}
        <div 
          onClick={() => setIsProfileOpen(true)}
          className={`flex rounded-lg border relative overflow-hidden group transition-all duration-300 cursor-pointer select-none ${
            isCollapsed ? 'p-1.5 justify-center w-10 h-10 items-center' : 'gap-2.5 p-3 w-full items-center'
          } ${
            d 
              ? 'bg-gray-50/80 border-black/[0.07] hover:bg-neutral-100 hover:border-accent/15' 
              : 'bg-surface-900 border-surface-700 hover:bg-surface-800/80 hover:border-accent/15'
          }`}
          title="Open User Profile Control Room"
        >
          <div className="absolute inset-0 bg-grid-lines opacity-[0.02] pointer-events-none" />
          <div className={`flex items-center gap-3 relative z-10 ${isCollapsed ? 'justify-center' : 'w-full'}`}>
            {profile.photo ? (
              <img src={profile.photo} className="h-8 w-8 rounded-full object-cover border border-accent/25 shrink-0 animate-fade-in" alt="Avatar" />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-700 text-[10px] font-black text-white border border-surface-600 uppercase">
                {getInitials(profile.firstName, profile.lastName)}
              </div>
            )}
            {!isCollapsed && (
              <div className="min-w-0 flex-1 text-left">
                {`${profile.firstName || ''} ${profile.lastName || ''}`.trim() ? (
                  <p className={`truncate text-[11.5px] font-extrabold leading-tight transition-colors duration-500 ${d ? 'text-gray-800' : 'text-white'}`}>
                    {`${profile.firstName || ''} ${profile.lastName || ''}`.trim()}
                  </p>
                ) : null}
                <p className="truncate text-[9.5px] font-extrabold text-accent mt-0.5 leading-none">
                  {profile.plan || 'Free Plan'}
                </p>
                {profile.email && (
                  <p className="truncate text-[9px] text-surface-500 mt-1 leading-none">{profile.email}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
 
      {/* Profile Modal */}
      {isProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
          {/* Backdrop */}
          <div 
            onClick={() => setIsProfileOpen(false)}
            className="absolute inset-0 bg-black/80 transition-opacity duration-300 animate-fade-in"
          />
          
          {/* Modal Content */}
          <div className={`relative z-55 w-full max-w-md rounded-2xl border p-6 transition-all duration-300 scale-100 flex flex-col gap-5 animate-scale-in max-h-[90vh] overflow-y-auto ${
            d 
              ? 'bg-[#fcfbfa] border-neutral-200 text-neutral-800' 
              : 'bg-[#0a0a0e] border-white/[0.06] text-white shadow-2xl shadow-black'
          }`}>
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-3 border-white/[0.04]">
              <div className="flex items-center gap-2">
                <FiUser size={16} className="text-accent" />
                <h3 className="text-xs font-black uppercase tracking-wider">User Profile Console</h3>
              </div>
              <button 
                onClick={() => setIsProfileOpen(false)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${d ? 'hover:bg-neutral-100' : 'hover:bg-white/[0.04]'}`}
              >
                <FiX size={14} />
              </button>
            </div>

            {/* Profile Content Details */}
            <div className="grid grid-cols-1 sm:grid-cols-[100px_1fr] gap-5 items-start">
              {/* Photo Upload Area */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative group/avatar cursor-pointer" onClick={handleTriggerFileInput}>
                  {formPhoto ? (
                    <img src={formPhoto} className="h-16 w-16 rounded-full object-cover border-2 border-accent/40 shadow-lg" alt="Preview" />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-700 text-lg font-black text-white border-2 border-surface-600 shadow-lg uppercase select-none">
                      {getInitials(formFirstName, formLastName)}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-150">
                    <FiCamera size={16} className="text-white" />
                  </div>
                </div>
                <div className="flex flex-col gap-1 w-full">
                  <button
                    type="button"
                    onClick={handleTriggerFileInput}
                    className={`w-full py-1.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider transition-colors cursor-pointer ${
                      d ? 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700' : 'bg-white/[0.03] hover:bg-white/[0.06] text-surface-300'
                    }`}
                  >
                    Upload
                  </button>
                  {formPhoto && (
                    <button
                      type="button"
                      onClick={handlePhotoRemove}
                      className="w-full py-1.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider bg-red-500/10 hover:bg-red-500/15 text-red-400 transition-colors cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              {/* Form Input fields */}
              <div className="space-y-3.5">
                {/* Names */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1 text-left">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-surface-500">First Name</label>
                    <input
                      type="text"
                      value={formFirstName}
                      onChange={(e) => setFormFirstName(e.target.value)}
                      placeholder="Creative"
                      className={`w-full text-xs rounded-lg px-3 py-1.5 border focus:outline-none focus:border-accent ${
                        d 
                          ? 'bg-white border-neutral-200 text-neutral-800' 
                          : 'bg-black/35 border-white/[0.06] text-white focus:ring-1 focus:ring-accent'
                      }`}
                    />
                  </div>
                  <div className="space-y-1 text-left">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-surface-500">Last Name</label>
                    <input
                      type="text"
                      value={formLastName}
                      onChange={(e) => setFormLastName(e.target.value)}
                      placeholder="Director"
                      className={`w-full text-xs rounded-lg px-3 py-1.5 border focus:outline-none focus:border-accent ${
                        d 
                          ? 'bg-white border-neutral-200 text-neutral-800' 
                          : 'bg-black/35 border-white/[0.06] text-white focus:ring-1 focus:ring-accent'
                      }`}
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div className="space-y-1 text-left">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-surface-500">Email Address</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="director@director-desk.com"
                    className={`w-full text-xs rounded-lg px-3 py-1.5 border focus:outline-none focus:border-accent ${
                      d 
                        ? 'bg-white border-neutral-200 text-neutral-800' 
                        : 'bg-black/35 border-white/[0.06] text-white focus:ring-1 focus:ring-accent'
                    }`}
                  />
                </div>

                {/* Date of Birth */}
                <div className="space-y-1 text-left">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-surface-500">Date of Birth</label>
                  <input
                    type="date"
                    value={formDob}
                    onChange={(e) => setFormDob(e.target.value)}
                    className={`w-full text-xs rounded-lg px-3 py-1.5 border focus:outline-none focus:border-accent ${
                      d 
                        ? 'bg-white border-neutral-200 text-neutral-800' 
                        : 'bg-black/35 border-white/[0.06] text-white focus:ring-1 focus:ring-accent'
                    }`}
                  />
                </div>

                {/* Subscription Plan */}
                <div className="space-y-1 text-left">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-surface-500">Subscription Plan</label>
                  <select
                    value={formPlan}
                    onChange={(e) => setFormPlan(e.target.value)}
                    className={`w-full text-xs rounded-lg px-3 py-1.5 border focus:outline-none focus:border-accent ${
                      d 
                        ? 'bg-white border-neutral-200 text-neutral-800' 
                        : 'bg-black/35 border-white/[0.06] text-white focus:ring-1 focus:ring-accent'
                    }`}
                  >
                    <option value="Free Plan" className={d ? 'text-neutral-800' : 'bg-surface-900 text-white'}>Free Plan</option>
                    <option value="Pro Plan" className={d ? 'text-neutral-800' : 'bg-surface-900 text-white'}>Pro Plan</option>
                    <option value="Max Plan" className={d ? 'text-neutral-800' : 'bg-surface-900 text-white'}>Max Plan</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Archived Productions section */}
            <div className="border-t border-white/[0.04] pt-4 text-left">
              <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-surface-400 mb-2.5 flex items-center gap-1.5 select-none">
                <FiArchive size={12} className="text-accent" />
                <span>Restore Archived Productions</span>
              </h4>
              
              {(() => {
                const archivedList = (savedProjects || []).filter(p => p.is_archived);
                if (archivedList.length === 0) {
                  return (
                    <p className={`text-[11px] font-mono italic opacity-55 ${d ? 'text-gray-500' : 'text-surface-500'}`}>
                      No archived productions in registry.
                    </p>
                  );
                }
                return (
                  <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                    {archivedList.map((project) => (
                      <div 
                        key={project.id} 
                        className={`flex items-center justify-between p-2.5 rounded-lg border text-xs transition-all ${
                          d 
                            ? 'bg-neutral-50 border-neutral-200' 
                            : 'bg-[#0f0f15]/80 border-white/[0.04] hover:border-white/[0.08]'
                        }`}
                      >
                        <div className="min-w-0 flex-1 mr-4 select-text">
                          <p className={`font-bold truncate ${d ? 'text-gray-900' : 'text-neutral-200'}`}>{project.title}</p>
                          <p className="text-[9px] text-surface-500 mt-0.5 font-mono">{project.production_type || 'Short Film'}</p>
                        </div>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            await updateProjectDetails(project.id, { is_archived: false });
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-accent/15 hover:bg-accent/25 text-accent transition-all cursor-pointer select-none"
                        >
                          <FiRefreshCw size={9} />
                          <span>Restore</span>
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2.5 border-t border-white/[0.04] pt-4 select-none">
              <button
                type="button"
                onClick={() => setIsProfileOpen(false)}
                className={`flex-1 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider border transition-colors cursor-pointer text-center ${
                  d 
                    ? 'border-gray-250 hover:bg-gray-150 text-gray-500' 
                    : 'border-white/[0.08] hover:bg-white/[0.04] text-neutral-350'
                }`}
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleSaveProfile}
                className="flex-1 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider bg-accent hover:bg-accent/90 text-white cursor-pointer transition-all flex items-center justify-center gap-1.5"
              >
                <FiCheck size={12} />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {projectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
          {/* Backdrop */}
          <div 
            onClick={() => setProjectToDelete(null)}
            className="absolute inset-0 bg-black/80 transition-opacity duration-300 animate-fade-in"
          />
          
          {/* Modal Content */}
          <div className={`relative z-55 w-full max-w-sm rounded-lg border p-6 transition-all duration-300 scale-100 flex flex-col gap-4 animate-scale-in ${
            d 
              ? 'bg-[#fcfbfa] border-neutral-200 text-neutral-800' 
              : 'bg-surface-900 border-surface-600 text-white shadow-none'
          }`}>
            <div className="flex items-center gap-3 text-red-500">
              <FiTrash2 size={20} className="shrink-0" />
              <h3 className="text-sm font-bold uppercase tracking-wider">Delete Production</h3>
            </div>
            
            <p className={`text-[12px] leading-relaxed ${d ? 'text-gray-600' : 'text-surface-400'}`}>
              Are you sure you want to delete <strong className={d ? 'text-gray-900' : 'text-white'}>"{projectToDelete.title}"</strong>? This action cannot be undone.
            </p>
            
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setProjectToDelete(null)}
                className={`flex-1 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider border transition-colors cursor-pointer text-center ${
                  d 
                    ? 'border-gray-200 hover:bg-gray-50 text-gray-500' 
                    : 'border-surface-700 hover:bg-surface-800 text-neutral-300'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-red-600 hover:bg-red-500 text-white cursor-pointer transition-colors text-center shadow-none"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
