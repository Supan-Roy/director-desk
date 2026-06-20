import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

export default function Footer() {
  const { isDayMode: d } = useTheme();
  const currentYear = new Date().getFullYear();

  return (
    <footer className={`mt-16 border-t py-12 px-6 md:px-8 transition-colors duration-500 rounded-lg select-text ${
      d ? 'border-neutral-200 bg-white text-neutral-600' : 'border-white/[0.04] text-surface-400'
    }`}>
      <div className="mx-auto max-w-[1400px] flex flex-col md:flex-row justify-between gap-10">
        
        {/* Left column: Branding & Copyright */}
        <div className="flex flex-col gap-4 max-w-sm">
          <div className="flex items-center gap-3 select-none">
            <div className={`p-1.5 rounded-lg border transition-colors ${
              d ? 'border-purple-200 bg-purple-50' : 'border-white/[0.06] bg-black/40'
            }`}>
              <img
                src="/logo.svg"
                alt="Director Desk Logo"
                className="h-6 w-6 shrink-0"
              />
            </div>
            <div className="flex flex-col select-none">
              <span className={`text-[12px] font-black tracking-[0.2em] leading-none ${
                d ? 'text-neutral-900' : 'text-white'
              }`}>
                DIRECTOR DESK
              </span>
              <span className="text-[8px] text-accent font-bold tracking-widest mt-1.5 uppercase leading-none">
                creative studio
              </span>
            </div>
          </div>
          <p className={`text-[11.5px] leading-relaxed mt-1 ${d ? 'text-neutral-600' : 'text-surface-500'}`}>
            Next-generation autonomous production workspace. Generate, refine, and orchestrate cinematic productions with agents.
          </p>
          <p className={`text-[10px] tracking-wide mt-2 ${d ? 'text-neutral-600' : 'text-surface-400'}`}>
            &copy; {currentYear} Director Desk. All rights reserved.
          </p>
        </div>

        {/* Right columns: Navigation Links */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 md:gap-16">
          {/* Column 1: Studio */}
          <div className="flex flex-col gap-3.5">
            <h4 className={`text-[10px] font-bold uppercase tracking-widest ${
              d ? 'text-neutral-900 font-black' : 'text-surface-200'
            }`}>
              Platform
            </h4>
            <ul className="space-y-2.5 text-[11.5px]">
              <li>
                <a href="/" className={`transition-colors duration-200 hover:text-accent`}>
                  Studio Dashboard
                </a>
              </li>
              <li>
                <a href="/" className={`transition-colors duration-200 hover:text-accent`}>
                  Agent Network
                </a>
              </li>
              <li>
                <a href="/" className={`transition-colors duration-200 hover:text-accent`}>
                  Preset Library
                </a>
              </li>
            </ul>
          </div>

          {/* Column 2: Resources */}
          <div className="flex flex-col gap-3.5">
            <h4 className={`text-[10px] font-bold uppercase tracking-widest ${
              d ? 'text-neutral-900 font-black' : 'text-surface-200'
            }`}>
              Resources
            </h4>
            <ul className="space-y-2.5 text-[11.5px]">
              <li>
                <a href="https://github.com" target="_blank" rel="noopener noreferrer" className={`transition-colors duration-200 hover:text-accent`}>
                  Documentation
                </a>
              </li>
              <li>
                <a href="/" className={`transition-colors duration-200 hover:text-accent`}>
                  Help Center
                </a>
              </li>
              <li>
                <a href="/" className={`transition-colors duration-200 hover:text-accent`}>
                  API Reference
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Legal */}
          <div className="flex flex-col gap-3.5">
            <h4 className={`text-[10px] font-bold uppercase tracking-widest ${
              d ? 'text-neutral-900 font-black' : 'text-surface-200'
            }`}>
              Legal
            </h4>
            <ul className="space-y-2.5 text-[11.5px]">
              <li>
                <Link to="/privacy" className={`transition-colors duration-200 hover:text-accent`}>
                  Privacy Policy
                </Link>
              </li>
              <li>
                <a href="/" className={`transition-colors duration-200 hover:text-accent`}>
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="/" className={`transition-colors duration-200 hover:text-accent`}>
                  License Agreement
                </a>
              </li>
            </ul>
          </div>
        </div>

      </div>
    </footer>
  );
}
