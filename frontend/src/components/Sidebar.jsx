import {
  FiGrid,
  FiFolder,
  FiFilm,
  FiSettings,
} from 'react-icons/fi';
import { PiRobotBold } from 'react-icons/pi';

const navItems = [
  { icon: FiGrid, label: 'Studio', active: true },
  { icon: FiFolder, label: 'Projects' },
  { icon: FiFilm, label: 'Productions' },
  { icon: PiRobotBold, label: 'Agents' },
];

export default function Sidebar() {
  return (
    <aside className="flex w-56 flex-col border-r border-white/[0.04] bg-surface-950/80 backdrop-blur-xl">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-accent/20 to-accent/10 ring-1 ring-accent/20">
          <FiFilm size={14} className="text-accent" />
        </div>
        <div>
          <h1 className="text-[13px] font-semibold tracking-wide text-white">Director Desk</h1>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-white/[0.04]" />

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {navItems.map((item) => (
          <button
            key={item.label}
            className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-all duration-150 ${
              item.active
                ? 'bg-white/[0.04] text-white'
                : 'text-surface-400 hover:bg-white/[0.03] hover:text-surface-200'
            }`}
          >
            <item.icon size={15} strokeWidth={item.active ? 2 : 1.5} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Bottom: User Profile */}
      <div className="border-t border-white/[0.04] px-4 py-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-surface-600 to-surface-700 text-[11px] font-medium text-surface-200">
            DD
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium text-surface-200">Creative Director</p>
            <p className="text-[10px] text-surface-500">Studio Plan</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
