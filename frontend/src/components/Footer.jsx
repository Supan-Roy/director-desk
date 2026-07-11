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
              d ? 'border-neutral-200 bg-neutral-100/60' : 'border-white/[0.06] bg-black/40'
            }`}>
              <img
                src="/logo.svg"
                alt="Director Desk Logo"
                draggable="false"
                className="h-6 w-6 shrink-0 select-none pointer-events-none"
              />
            </div>
            <div className="flex flex-col select-none">
              <span className="flex items-center gap-1 select-none leading-none">
                <span className={`text-[12px] font-black tracking-tight uppercase flex items-center ${
                  d 
                    ? 'text-transparent bg-clip-text bg-gradient-to-r from-neutral-950 to-neutral-750' 
                    : 'text-transparent bg-clip-text bg-gradient-to-b from-white via-neutral-100 to-neutral-400'
                }`}>
                  <span>Direct</span>
                  <svg className="inline-block h-[0.8em] w-[0.8em] shrink-0 self-center align-middle mx-[0.04em] mt-[-0.04em]" viewBox="0 0 100 100">
                    <defs>
                      <linearGradient id="director-o-gradient-footer" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={d ? "#0a0a0a" : "#ffffff"} />
                        <stop offset="50%" stopColor={d ? "#171717" : "#f5f5f5"} />
                        <stop offset="100%" stopColor={d ? "#404040" : "#a3a3a3"} />
                      </linearGradient>
                      <mask id="film-reel-mask-footer">
                        <circle cx="50" cy="50" r="50" fill="white" />
                        <circle cx="50" cy="50" r="9" fill="black" />
                        <circle cx="50" cy="23" r="11" fill="black" />
                        <circle cx="50" cy="77" r="11" fill="black" />
                        <circle cx="27" cy="37" r="11" fill="black" />
                        <circle cx="73" cy="37" r="11" fill="black" />
                        <circle cx="27" cy="63" r="11" fill="black" />
                        <circle cx="73" cy="63" r="11" fill="black" />
                      </mask>
                    </defs>
                    <circle cx="50" cy="50" r="46" fill="url(#director-o-gradient-footer)" mask="url(#film-reel-mask-footer)" />
                  </svg>
                  <span>r</span>
                </span>
                <span className={`text-[12px] font-light tracking-[0.1em] uppercase ${
                  d 
                    ? 'text-transparent bg-clip-text bg-gradient-to-r from-[#6d28d9] to-[#8b5cf6]' 
                    : 'text-transparent bg-clip-text bg-gradient-to-r from-accent via-[#a78bfa] to-white'
                }`}>
                  Desk
                </span>
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
