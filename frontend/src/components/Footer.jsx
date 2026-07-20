import { Link } from 'react-router-dom';
import { FiGithub, FiExternalLink } from 'react-icons/fi';
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
                    ? 'text-neutral-950 font-black' 
                    : 'text-transparent bg-clip-text bg-gradient-to-b from-white via-neutral-100 to-neutral-400'
                }`}>
                  <span>Direct</span>
                  <svg className="inline-block h-[0.8em] w-[0.8em] shrink-0 self-center align-middle mx-[0.04em] mt-[-0.04em]" viewBox="0 0 100 100">
                    <defs>
                      <linearGradient id="director-o-gradient-footer" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={d ? "#0a0a0a" : "#ffffff"} />
                        <stop offset="50%" stopColor={d ? "#0a0a0a" : "#f5f5f5"} />
                        <stop offset="100%" stopColor={d ? "#0a0a0a" : "#a3a3a3"} />
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
                    ? 'text-transparent bg-clip-text bg-gradient-to-r from-[#6d28d9] via-[#7c3aed] to-[#5b21b6]' 
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

          {/* GitHub project link */}
          <a
            href="https://github.com/Supan-Roy/director-desk"
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 text-[11px] font-bold tracking-wider transition-colors duration-200 hover:text-accent ${
              d ? 'text-neutral-500' : 'text-surface-500'
            }`}
          >
            <FiGithub size={14} />
            <span>GitHub</span>
            <FiExternalLink size={10} className="opacity-50" />
          </a>

          <p className={`text-[10px] tracking-wide mt-1 ${d ? 'text-neutral-600' : 'text-surface-400'}`}>
            &copy; {currentYear} Director Desk. All rights reserved.
          </p>
        </div>

        {/* Right columns: Navigation Links */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 md:gap-12">
          {/* Column 1: Platform */}
          <div className="flex flex-col gap-3.5">
            <h4 className={`text-[10px] font-bold uppercase tracking-widest ${
              d ? 'text-neutral-900 font-black' : 'text-surface-200'
            }`}>
              Platform
            </h4>
            <ul className="space-y-2.5 text-[11.5px]">
              <li>
                <Link to="/" className={`transition-colors duration-200 hover:text-accent`}>
                  Studio Dashboard
                </Link>
              </li>
              <li>
                <Link to="/agents" className={`transition-colors duration-200 hover:text-accent`}>
                  Agent Network
                </Link>
              </li>
              <li>
                <Link to="/templates" className={`transition-colors duration-200 hover:text-accent`}>
                  Preset Library
                </Link>
              </li>
              <li>
                <Link to="/assets" className={`transition-colors duration-200 hover:text-accent`}>
                  Asset Manager
                </Link>
              </li>
              <li>
                <Link to="/settings" className={`transition-colors duration-200 hover:text-accent`}>
                  Settings
                </Link>
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
                <a href="https://github.com/Supan-Roy/director-desk/blob/main/DOCUMENTATION.md" target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1 transition-colors duration-200 hover:text-accent`}>
                  Documentation
                  <FiExternalLink size={10} className="opacity-50" />
                </a>
              </li>
              <li>
                <a href="https://github.com/Supan-Roy/director-desk/issues" target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1 transition-colors duration-200 hover:text-accent`}>
                  Help Center
                  <FiExternalLink size={10} className="opacity-50" />
                </a>
              </li>
              <li>
                <a href="https://github.com/Supan-Roy/director-desk/blob/main/README.md" target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1 transition-colors duration-200 hover:text-accent`}>
                  API Reference
                  <FiExternalLink size={10} className="opacity-50" />
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
                <a href="https://github.com/Supan-Roy/director-desk/blob/main/TERMS.md" target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1 transition-colors duration-200 hover:text-accent`}>
                  Terms of Service
                  <FiExternalLink size={10} className="opacity-50" />
                </a>
              </li>
              <li>
                <a href="https://github.com/Supan-Roy/director-desk/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1 transition-colors duration-200 hover:text-accent`}>
                  License Agreement
                  <FiExternalLink size={10} className="opacity-50" />
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: About */}
          <div className="flex flex-col gap-3.5">
            <h4 className={`text-[10px] font-bold uppercase tracking-widest ${
              d ? 'text-neutral-900 font-black' : 'text-surface-200'
            }`}>
              Developed by
            </h4>
            <ul className="space-y-2.5 text-[11.5px]">
              <li>
                <span className={`font-semibold ${d ? 'text-gray-800' : 'text-surface-200'}`}>Supan Roy</span>
              </li>
              <li>
                <a href="mailto:contact@supanroy.com" className={`inline-flex items-center gap-1 transition-colors duration-200 hover:text-accent`}>
                  contact@supanroy.com
                </a>
              </li>
              <li>
                <a href="https://github.com/Supan-Roy" target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1 transition-colors duration-200 hover:text-accent`}>
                  <FiGithub size={12} />
                  Supan-Roy
                </a>
              </li>
              <li>
                <a href="https://linkedin.com/in/supanroy" target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1 transition-colors duration-200 hover:text-accent`}>
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  supanroy
                </a>
              </li>
            </ul>
          </div>
        </div>

      </div>
    </footer>
  );
}
