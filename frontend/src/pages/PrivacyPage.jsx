import { useNavigate } from 'react-router-dom'
import { FiArrowLeft, FiShield } from 'react-icons/fi'
import Sidebar from '../components/Sidebar'
import { useTheme } from '../context/ThemeContext'

export default function PrivacyPage() {
  const navigate = useNavigate()
  const { isDayMode: d } = useTheme()

  return (
    <div className={`flex h-screen overflow-hidden font-display transition-colors duration-500 relative ${d ? 'bg-[#f0ede8]' : 'bg-[#06060b]'}`}>
      
      {/* Background ambient glows */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-br from-[#040409] via-[#06060b] to-[#080812]" />
      <div className="absolute top-[10%] left-[20%] w-[500px] h-[500px] rounded-full bg-purple-600/10 blur-[130px] pointer-events-none mix-blend-screen animate-drift-light-1" />
      <div className="absolute bottom-[20%] right-[15%] w-[600px] h-[600px] rounded-full bg-blue-600/8 blur-[150px] pointer-events-none mix-blend-screen animate-drift-light-2" />

      {/* Sidebar Navigation */}
      <div className="relative z-30">
        <Sidebar />
      </div>

      {/* Main Workspace */}
      <div className="relative z-20 flex flex-1 min-w-0 flex-col overflow-hidden">
        
        {/* Header Navbar */}
        <header className={`flex items-center gap-4 px-6 py-3 border-b shrink-0 transition-colors duration-500 ${d ? 'border-black/[0.07] bg-white/60 backdrop-blur-sm' : 'border-white/[0.04] bg-black/30 backdrop-blur-sm'}`}>
          <button
            onClick={() => navigate('/settings')}
            className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg px-2.5 py-1.5 transition-all duration-200 ${d ? 'text-gray-500 hover:text-gray-900 hover:bg-black/[0.05]' : 'text-surface-550 hover:text-white hover:bg-white/[0.05]'}`}
          >
            <FiArrowLeft size={12} />
            <span>Settings</span>
          </button>

          <div className="flex items-center gap-2">
            <FiShield size={13} className="text-accent" />
            <h1 className={`text-[12px] font-bold uppercase tracking-widest ${d ? 'text-gray-900' : 'text-white'}`}>
              Privacy Policy
            </h1>
          </div>
        </header>

        {/* Scrollable Center Panel */}
        <div className="flex-1 overflow-y-auto min-h-0 flex flex-col items-center px-6 py-8 relative z-10">
          <div className="w-full max-w-2xl space-y-6">
            
            {/* Hero Header */}
            <div className="space-y-1 text-left border-b border-white/[0.04] pb-5 relative select-none">
              <h2 className={`text-xl font-bold uppercase tracking-wider ${d ? 'text-gray-900' : 'text-white'}`}>
                Privacy Policy
              </h2>
              <p className={`text-xs ${d ? 'text-gray-500' : 'text-surface-400'}`}>
                Last updated: June 19, 2026. Review how data is processed in Director Desk.
              </p>
            </div>

            {/* Content Card */}
            <div className={`glass-panel p-8 rounded-2xl border transition-all duration-300 relative text-left space-y-6 text-xs leading-relaxed ${
              d ? 'bg-white/40 border-black/[0.06] text-gray-700' : 'bg-[#080810]/45 border-white/[0.04] text-surface-300'
            }`}>
              <div className="space-y-2">
                <h3 className={`text-sm font-bold ${d ? 'text-gray-900' : 'text-white'}`}>1. Offline-First Local Storage</h3>
                <p>
                  Director Desk is a local, offline-first application. All project assets, script files, screenplay drafts, storyboard scenes, and configuration templates are stored locally on your device using an SQLite database and browser `localStorage`.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className={`text-sm font-bold ${d ? 'text-gray-900' : 'text-white'}`}>2. Data Collection</h3>
                <p>
                  We do not collect, transmit, or sell any personal information or account credentials. There are no remote tracking pixels, third-party analytics trackers, or centralized data collectors active on this application.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className={`text-sm font-bold ${d ? 'text-gray-900' : 'text-white'}`}>3. Local Backups & Data Export</h3>
                <p>
                  You are in complete control of your data. You can download a complete backup of all projects, storyboards, and scripts as a single JSON file from the Settings page. You can purge all database entries or wipe local configurations at any time.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className={`text-sm font-bold ${d ? 'text-gray-900' : 'text-white'}`}>4. Model Processing & External Interfaces</h3>
                <p>
                  Any generation is processed using standard local model endpoints or custom APIs configured in your environment. These queries comply with your specific model API provider's privacy guidelines.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className={`text-sm font-bold ${d ? 'text-gray-900' : 'text-white'}`}>5. Changes to This Policy</h3>
                <p>
                  Since the application runs locally, updates to this privacy policy will be bundled directly into core code releases. Your data remains secure on your device regardless of application updates.
                </p>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  )
}
