import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FiSettings, FiUser, FiSliders, FiDatabase, FiAlertTriangle, FiDownload, FiTrash2,
  FiCheck, FiArrowLeft, FiSun, FiMoon, FiMonitor, FiInfo, FiExternalLink, FiGlobe, FiLoader,
  FiFilm, FiTv, FiCalendar
} from 'react-icons/fi'
import Sidebar from '../components/Sidebar'
import { useTheme } from '../context/ThemeContext'
import { useProjectData } from '../hooks/useProjectData'
import { useAuth } from '../context/AuthContext'
import { apiBaseUrl } from '../services/apiClient'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { isDayMode: d, themeMode, setThemeMode } = useTheme()
  const { 
    fetchSavedProjects, 
    savedProjects = [], 
    removeSavedProject, 
    updateProjectDetails 
  } = useProjectData()
  const { user, requestDeletion, confirmDeletion } = useAuth()

  const [activeSubTab, setActiveSubTab] = useState('appearance') // appearance, account, privacy, about
  const [planMessage, setPlanMessage] = useState(null)
  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem('user_profile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.plan) parsed.plan = "Free Plan";
        return parsed;
      } catch(e) {}
    }
    return {
      firstName: "Creative",
      lastName: "Director",
      email: "director@director-desk.com",
      dob: "1990-01-01",
      photo: null,
      plan: "Free Plan"
    };
  });

  useEffect(() => {
    if (user) {
      const userKey = `user_profile_${user.email}`;
      const saved = localStorage.getItem(userKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setProfile({
            firstName: parsed.firstName || user.name,
            lastName: parsed.lastName || user.last_name || '',
            email: user.email,
            plan: parsed.plan || 'Free Plan',
            photo: parsed.photo || null,
            dob: parsed.dob || ''
          });
          return;
        } catch (e) {
          console.error(e);
        }
      }
      setProfile({
        firstName: user.name,
        lastName: user.last_name || '',
        email: user.email,
        plan: 'Free Plan',
        photo: null,
        dob: ''
      });
    } else {
      const saved = localStorage.getItem('user_profile');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setProfile({
            firstName: parsed.firstName || 'Guest',
            lastName: parsed.lastName || 'User',
            email: 'Sign in to save projects',
            plan: 'Free Session',
            photo: parsed.photo || null,
            dob: parsed.dob || ''
          });
          return;
        } catch (e) {
          console.error(e);
        }
      }
      setProfile({
        firstName: 'Guest',
        lastName: 'User',
        email: 'Sign in to save projects',
        plan: 'Free Session',
        photo: null,
        dob: ''
      });
    }
  }, [user]);

  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteProjectsModal, setShowDeleteProjectsModal] = useState(false)
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false)
  const [deleteProjectsConfirmText, setDeleteProjectsConfirmText] = useState('')
  const [deleteAccountConfirmText, setDeleteAccountConfirmText] = useState('')
  const [showDeleteRealAccountModal, setShowDeleteRealAccountModal] = useState(false)
  const [deleteReason, setDeleteReason] = useState('No longer need it')
  const [deleteAccountSuccess, setDeleteAccountSuccess] = useState(false)
  const [deleteOtpCode, setDeleteOtpCode] = useState('')

  const deleteProjectsRef = useRef(null)
  const deleteAccountRef = useRef(null)

  // Handle click outside for delete confirmations
  useEffect(() => {
    if (!showDeleteProjectsModal) return
    const handleClick = (e) => {
      if (deleteProjectsRef.current && !deleteProjectsRef.current.contains(e.target)) {
        setShowDeleteProjectsModal(false)
        setDeleteProjectsConfirmText('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showDeleteProjectsModal])

  useEffect(() => {
    if (!showDeleteAccountModal) return
    const handleClick = (e) => {
      if (deleteAccountRef.current && !deleteAccountRef.current.contains(e.target)) {
        setShowDeleteAccountModal(false)
        setDeleteAccountConfirmText('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showDeleteAccountModal])

  const handlePlanSelect = (planName) => {
    setPlanMessage("Coming Soon");
    const updated = { ...profile, plan: planName };
    setProfile(updated);
    if (user) {
      const userKey = `user_profile_${user.email}`;
      localStorage.setItem(userKey, JSON.stringify(updated));
    } else {
      localStorage.setItem('user_profile', JSON.stringify(updated));
    }
  };

  const handleExportData = async () => {
    try {
      setExporting(true)
      const res = await fetch(`${apiBaseUrl}/api/projects/export`)
      if (!res.ok) throw new Error("Failed to fetch projects data")
      const data = await res.json()
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `director_desk_export_${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      alert(`Export failed: ${err.message}`)
    } finally {
      setExporting(false)
    }
  }

  const handleDeleteAccountRequest = async (e) => {
    e.preventDefault()
    setDeleting(true)
    try {
      await requestDeletion(deleteReason)
      setDeleteAccountSuccess(true)
    } catch (err) {
      alert(err.message || 'Failed to request account deletion.')
    } finally {
      setDeleting(false)
    }
  }

  const handleConfirmDeleteAccount = async (e) => {
    e.preventDefault()
    if (!deleteOtpCode || deleteOtpCode.length !== 6) {
      alert("Please enter a valid 6-digit OTP code.")
      return
    }
    setDeleting(true)
    try {
      await confirmDeletion(deleteOtpCode)
    } catch (err) {
      alert(err.message || 'Verification of account deletion code failed.')
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteAllProjects = async () => {
    if (deleteProjectsConfirmText !== 'DELETE ALL') return
    try {
      setDeleting(true)
      const res = await fetch(`${apiBaseUrl}/api/projects`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error("Failed to delete projects")
      await fetchSavedProjects()
      setShowDeleteProjectsModal(false)
      setDeleteProjectsConfirmText('')
      alert("All projects deleted successfully.")
    } catch (err) {
      alert(`Delete failed: ${err.message}`)
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteAccountConfirmText !== 'WIPE ACCOUNT') return
    try {
      setDeleting(true)
      const res = await fetch(`${apiBaseUrl}/api/projects`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error("Failed to reset database")
      localStorage.clear()
      setDeleteAccountConfirmText('')
      window.location.href = '/'
    } catch (err) {
      alert(`Account reset failed: ${err.message}`)
    } finally {
      setDeleting(false)
    }
  }

  const subTabs = [
    { id: 'appearance', label: 'Appearance', icon: FiSliders },
    { id: 'account', label: 'Account Profile', icon: FiUser },
    { id: 'privacy', label: 'Data & Privacy', icon: FiDatabase },
    { id: 'about', label: 'System Info', icon: FiInfo }
  ]

  return (
    <div className={`flex h-screen overflow-hidden font-display transition-colors duration-500 relative ${d ? 'bg-white' : 'bg-[#06060b]'}`}>
      
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
            onClick={() => navigate('/')}
            className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg px-2.5 py-1.5 transition-all duration-200 ${d ? 'text-gray-500 hover:text-gray-900 hover:bg-black/[0.05]' : 'text-surface-550 hover:text-white hover:bg-white/[0.05]'}`}
          >
            <FiArrowLeft size={12} />
            <span>Studio</span>
          </button>

          <div className="flex items-center gap-2">
            <FiSettings size={13} className="text-accent" />
            <h1 className={`text-[12px] font-bold uppercase tracking-widest ${d ? 'text-gray-900' : 'text-white'}`}>
              Settings
            </h1>
          </div>
        </header>

        {/* Scrollable Center Panel */}
        <div className="flex-1 overflow-y-auto min-h-0 flex flex-col items-center px-6 py-8 relative z-10">
          <div className="w-full max-w-2xl space-y-6">
            
            {/* Hero Header */}
            <div className="space-y-1 text-left border-b border-white/[0.04] pb-5 relative select-none">
              <h2 className={`text-xl font-bold uppercase tracking-wider ${d ? 'text-gray-900' : 'text-white'}`}>
                Studio Settings
              </h2>
              <p className={`text-xs ${d ? 'text-gray-500' : 'text-surface-400'}`}>
                Configure workspace preferences, accounts, data backups, and environment info.
              </p>
            </div>

            {/* Horizontal Segmented Switcher Navigation */}
            <div className={`p-1 rounded-xl flex items-center gap-1 border transition-colors duration-500 ${
              d ? 'bg-white/70 border-black/[0.06] shadow-xs' : 'bg-black/35 border-white/[0.04]'
            }`}>
              {subTabs.map((tab) => {
                const isActive = activeSubTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveSubTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10.5px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                      isActive
                        ? d
                          ? 'bg-accent/15 text-accent border border-accent/15 font-extrabold'
                          : 'bg-accent/15 text-white border border-accent/20 shadow-[0_2px_10px_rgba(139,92,246,0.15)] font-extrabold'
                        : d
                          ? 'text-gray-500 hover:bg-black/[0.03] hover:text-gray-800'
                          : 'text-surface-400 hover:bg-white/[0.02] hover:text-surface-200'
                    }`}
                  >
                    <tab.icon size={12} className={isActive ? 'text-accent' : 'opacity-65'} />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Content Card */}
            <div className={`glass-panel p-6 rounded-2xl border transition-all duration-300 relative ${
              d ? 'bg-white/40 border-black/[0.06]' : 'bg-[#080810]/45 border-white/[0.04]'
            }`}>
              
              {/* APPEARANCE SECTION */}
              {activeSubTab === 'appearance' && (
                <div className="space-y-5">
                  <div className="space-y-1 text-left">
                    <h3 className={`text-xs font-bold uppercase tracking-wider ${d ? 'text-gray-900' : 'text-white'}`}>
                      Theme Configurations
                    </h3>
                    <p className="text-[11px] text-surface-500">Configure how the workspace theme preference maps to your device.</p>
                  </div>

                  {/* Minimalist Theme Selection Row */}
                  <div className={`p-1 rounded-lg flex items-center gap-1 border transition-colors duration-200 max-w-md ${
                    d ? 'bg-white border-black/[0.06]' : 'bg-[#0c0c16]/30 border-white/[0.04]'
                  }`}>
                    {[
                      { id: 'light', label: 'Light', icon: FiSun },
                      { id: 'dark', label: 'Dark', icon: FiMoon },
                      { id: 'system', label: 'System', icon: FiMonitor }
                    ].map((mode) => {
                      const isSelected = themeMode === mode.id
                      return (
                        <button
                          key={mode.id}
                          onClick={() => setThemeMode(mode.id)}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-[10.5px] font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                            isSelected
                              ? d
                                ? 'bg-black/[0.05] text-gray-900 font-extrabold'
                                : 'bg-white/[0.07] text-white font-extrabold'
                              : d
                                ? 'text-gray-500 hover:text-gray-800 hover:bg-black/[0.02]'
                                : 'text-surface-400 hover:text-white hover:bg-white/[0.02]'
                          }`}
                        >
                          <mode.icon size={11} className={isSelected ? 'text-accent' : 'opacity-65'} />
                          <span>{mode.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ACCOUNT SECTION */}
              {activeSubTab === 'account' && (
                <div className="space-y-6">
                  
                  {/* Account Profile Card */}
                  <div className={`p-5 rounded-xl border flex flex-col sm:flex-row items-center gap-5 relative ${
                    d ? 'bg-[#faf9f6]/95 border-neutral-200' : 'bg-[#090910]/95 border-white/[0.04]'
                  }`}>
                    <div className="shrink-0 select-none">
                      {profile.photo ? (
                        <img src={profile.photo} className="h-14 w-14 rounded-xl object-cover border border-white/10 shadow-lg" alt="Avatar" />
                      ) : (
                        <div className="h-14 w-14 rounded-xl bg-gradient-to-tr from-accent to-purple-600 flex items-center justify-center text-white text-base font-black border border-white/10 shadow-lg uppercase">
                          {((profile.firstName || '').charAt(0) + (profile.lastName || '').charAt(0)).toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 w-full text-left space-y-2">
                      <div className="flex items-center justify-between border-b border-current border-opacity-10 pb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-accent">Active Profile</span>
                        <span className="text-[8px] uppercase tracking-wider font-bold py-0.5 px-2 bg-neutral-500/10 border border-neutral-500/20 rounded">
                          Studio Owner
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] leading-relaxed">
                        <div>
                          <span className="opacity-50">Name:</span>{' '}
                          <span className={`font-bold ${d ? 'text-gray-900' : 'text-neutral-200'}`}>
                            {`${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Not Set'}
                          </span>
                        </div>
                        <div>
                          <span className="opacity-50">Date of Birth:</span>{' '}
                          <span className="font-semibold">{profile.dob || 'Not Set'}</span>
                        </div>
                        <div>
                          <span className="opacity-50">Email:</span>{' '}
                          <span className={`font-bold ${d ? 'text-gray-900' : 'text-neutral-200'}`}>{profile.email || 'Not Set'}</span>
                        </div>
                        <div>
                          <span className="opacity-50">Subscription Plan:</span>{' '}
                          <span className="font-bold text-accent">{profile.plan || 'Free Plan'}</span>
                        </div>
                        <div>
                          <span className="opacity-50">Security:</span>{' '}
                          <span className="font-semibold">Local Storage encryption</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2 text-left">
                    <h3 className={`text-[10px] font-bold uppercase tracking-wider ${d ? 'text-gray-500' : 'text-surface-500'}`}>
                      Subscription Plans
                    </h3>

                    {planMessage && (
                      <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-500 text-[10.5px] font-semibold leading-relaxed flex items-center gap-2">
                        <FiAlertTriangle className="shrink-0 animate-pulse text-amber-400" size={13} />
                        <span>{planMessage}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Free Plan */}
                      <div className={`p-4 rounded-xl border flex flex-col justify-between relative ${
                        (profile.plan === 'Free Plan' || profile.plan === 'Free Session')
                          ? 'border-accent bg-accent/5'
                          : d ? 'bg-white border-neutral-200 shadow-xs' : 'bg-[#090910]/95 border-white/[0.04]'
                      }`}>
                        <div>
                          <div className="flex justify-between items-start">
                            <span className={`text-[10.5px] font-bold uppercase tracking-wider ${d ? 'text-gray-900' : 'text-white'}`}>Free Plan</span>
                            {(profile.plan === 'Free Plan' || profile.plan === 'Free Session') && (
                              <span className="text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent text-white leading-none">
                                Active
                              </span>
                            )}
                          </div>
                          <p className={`text-lg font-bold mt-1 ${d ? 'text-gray-900' : 'text-white'}`}>$0<span className="text-[10px] font-normal text-surface-500">/mo</span></p>
                          <ul className="mt-3 space-y-1.5 text-[9.5px] text-surface-400 font-semibold">
                            <li className="flex items-center gap-1.5">
                              <FiCheck className="text-accent shrink-0" size={10} />
                              <span>1,000 monthly credits</span>
                            </li>
                            <li className="flex items-center gap-1.5">
                              <FiCheck className="text-accent shrink-0" size={10} />
                              <span>1 active workspace</span>
                            </li>
                            <li className="flex items-center gap-1.5">
                              <FiCheck className="text-accent shrink-0" size={10} />
                              <span>Standard render speed</span>
                            </li>
                          </ul>
                        </div>
                        {(profile.plan === 'Free Plan' || profile.plan === 'Free Session') ? (
                          <button
                            disabled
                            className="w-full mt-4 py-2 rounded-lg bg-white/5 border border-white/5 text-surface-500 text-[9.5px] font-bold uppercase tracking-wider cursor-not-allowed text-center animate-fade-in"
                          >
                            Current Plan
                          </button>
                        ) : (
                          <button
                            onClick={() => handlePlanSelect('Free Plan')}
                            className="w-full mt-4 py-2 rounded-lg bg-accent text-white hover:bg-accent/90 text-[9.5px] font-bold uppercase tracking-wider cursor-pointer text-center transition-all animate-fade-in"
                          >
                            Switch to Free Plan
                          </button>
                        )}
                      </div>

                      {/* Pro Plan */}
                      <div className={`p-4 rounded-xl border flex flex-col justify-between relative ${
                        profile.plan === 'Pro Plan'
                          ? 'border-accent bg-accent/5'
                          : d ? 'bg-white border-neutral-200 hover:border-neutral-350 shadow-xs' : 'bg-[#090910]/95 border-white/[0.04] hover:border-white/[0.08]'
                      }`}>
                        <div>
                          <div className="flex justify-between items-start">
                            <span className={`text-[10.5px] font-bold uppercase tracking-wider ${d ? 'text-gray-900' : 'text-white'}`}>Pro Plan</span>
                            {profile.plan === 'Pro Plan' && (
                              <span className="text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent text-white leading-none">
                                Active
                              </span>
                            )}
                          </div>
                          <p className={`text-lg font-bold mt-1 ${d ? 'text-gray-900' : 'text-white'}`}>$29<span className="text-[10px] font-normal text-surface-500">/mo</span></p>
                          <ul className="mt-3 space-y-1.5 text-[9.5px] text-surface-400 font-semibold">
                            <li className="flex items-center gap-1.5">
                              <FiCheck className="text-emerald-400 shrink-0" size={10} />
                              <span>10,000 monthly credits</span>
                            </li>
                            <li className="flex items-center gap-1.5">
                              <FiCheck className="text-emerald-400 shrink-0" size={10} />
                              <span>Unlimited workspaces</span>
                            </li>
                            <li className="flex items-center gap-1.5">
                              <FiCheck className="text-emerald-400 shrink-0" size={10} />
                              <span>Priority render queue</span>
                            </li>
                            <li className="flex items-center gap-1.5">
                              <FiCheck className="text-emerald-400 shrink-0" size={10} />
                              <span>Master grade audio</span>
                            </li>
                          </ul>
                        </div>
                        {profile.plan === 'Pro Plan' ? (
                          <button
                            disabled
                            className="w-full mt-4 py-2 rounded-lg bg-white/5 border border-white/5 text-surface-500 text-[9.5px] font-bold uppercase tracking-wider cursor-not-allowed text-center animate-fade-in"
                          >
                            Current Plan
                          </button>
                        ) : (
                          <button
                            onClick={() => handlePlanSelect('Pro Plan')}
                            className="w-full mt-4 py-2 rounded-lg bg-accent text-white hover:bg-accent/90 text-[9.5px] font-bold uppercase tracking-wider cursor-pointer text-center transition-all animate-fade-in"
                          >
                            Switch to Pro Plan
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Studio Statistics Section */}
                  <div className="space-y-2 pt-2 text-left">
                    <h3 className={`text-[10px] font-bold uppercase tracking-wider ${d ? 'text-gray-500' : 'text-surface-500'}`}>
                      Studio Statistics
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: 'Productions Created', value: savedProjects.length + 3, icon: FiFilm },
                        { label: 'Projects Saved', value: savedProjects.length, icon: FiTv },
                        { label: 'Generated Assets', value: 48, icon: FiDatabase },
                        { label: 'Member Since', value: 'June 2026', icon: FiCalendar }
                      ].map((stat, i) => (
                        <div 
                          key={i} 
                          className={`p-3 rounded-xl border flex flex-col justify-between h-[76px] relative overflow-hidden ${
                            d ? 'bg-white border-neutral-200/80 shadow-xs' : 'bg-black/20 border-white/[0.04]'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <span className="text-[8.5px] font-bold uppercase tracking-wider opacity-50 max-w-[80%] leading-tight">
                              {stat.label}
                            </span>
                            <stat.icon size={11} className="opacity-45 text-accent" />
                          </div>
                          <div className={`text-sm font-bold leading-none tracking-tight ${d ? 'text-gray-900' : 'text-white'}`}>
                            {stat.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* DATA & PRIVACY SECTION */}
              {activeSubTab === 'privacy' && (
                <div className="space-y-5">
                  <div className="space-y-1 text-left">
                    <h3 className={`text-xs font-bold uppercase tracking-wider ${d ? 'text-gray-900' : 'text-white'}`}>
                      Data & Privacy
                    </h3>
                    <p className="text-[11px] text-surface-500">Download backups or permanently purge local databases.</p>
                  </div>

                  {/* Export Backup */}
                  <div className={`p-4 rounded-xl border flex justify-between items-center text-left ${
                    d ? 'border-black/[0.06] bg-white/40' : 'border-white/[0.04] bg-[#0c0c16]/30'
                  }`}>
                    <div className="space-y-0.5 pr-4 flex-1">
                      <p className={`text-[11.5px] font-bold uppercase tracking-wider ${d ? 'text-gray-800' : 'text-neutral-200'}`}>
                        Export Workspace Backups
                      </p>
                      <p className="text-[10px] text-surface-555 leading-normal">
                        Package all generated scripts, storyboard frames, and reviews into a single backup JSON structure.
                      </p>
                    </div>
                    <button
                      onClick={handleExportData}
                      disabled={exporting}
                      className="btn-accent shrink-0 flex items-center gap-1.5 px-3 py-2 text-[9px] transition-all disabled:opacity-50 shadow-none"
                    >
                      {exporting ? <FiLoader size={11} className="animate-spin" /> : <FiDownload size={11} />}
                      <span>Export Data</span>
                    </button>
                  </div>

                  {/* Archived Productions */}
                  <div className={`p-4 rounded-xl border space-y-3 text-left ${
                    d ? 'border-black/[0.06] bg-white/40' : 'border-white/[0.04] bg-[#0c0c16]/30'
                  }`}>
                    <div className="space-y-0.5">
                      <p className={`text-[11.5px] font-bold uppercase tracking-wider ${d ? 'text-gray-800' : 'text-neutral-200'}`}>
                        Archived Productions ({(savedProjects || []).filter(p => p.is_archived).length})
                      </p>
                      <p className="text-[10px] text-surface-500 leading-normal">
                        Manage your archived productions. Restoring them will place them back in the sidebar workspace.
                      </p>
                    </div>

                    {(savedProjects || []).filter(p => p.is_archived).length === 0 ? (
                      <p className={`text-[10px] italic ${d ? 'text-gray-400' : 'text-surface-600'}`}>
                        No archived productions.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto mt-2">
                        {(savedProjects || []).filter(p => p.is_archived).map((project) => (
                          <div 
                            key={project.id}
                            className={`flex items-center justify-between p-2 rounded-lg border text-[10.5px] ${
                              d ? 'bg-white border-neutral-100' : 'bg-black/25 border-surface-700'
                            }`}
                          >
                            <div className="min-w-0 flex-1 pr-3">
                              <span className="font-semibold truncate block text-[11px] leading-tight">
                                {project.title}
                              </span>
                              <span className={`text-[8.5px] font-mono ${d ? 'text-gray-400' : 'text-surface-500'}`}>
                                {project.production_type || 'Unknown Format'} · {new Date(project.updated_at).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={async () => {
                                  await updateProjectDetails(project.id, { is_archived: false });
                                }}
                                className="px-2.5 py-1 rounded bg-accent/10 hover:bg-accent text-accent hover:text-white-force transition-all duration-150 text-[9px] font-bold uppercase tracking-wider cursor-pointer"
                              >
                                Restore
                              </button>
                              <button
                                onClick={async () => {
                                  if (window.confirm(`Are you sure you want to permanently delete "${project.title}"?`)) {
                                    setDeleting(true);
                                    await removeSavedProject(project.id);
                                    setDeleting(false);
                                  }
                                }}
                                className={`p-1.5 rounded transition-all duration-150 cursor-pointer ${
                                  d 
                                    ? 'hover:bg-red-50 text-gray-400 hover:text-red-500' 
                                    : 'hover:bg-red-500/10 text-surface-600 hover:text-red-400'
                                }`}
                                title="Delete permanently"
                              >
                                <FiTrash2 size={11} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Danger Zone */}
                  <div className="border border-red-500/15 bg-red-500/[0.01] rounded-xl p-4 space-y-3 relative overflow-hidden">
                    <div className="flex items-center gap-2 text-red-500 border-b border-red-500/10 pb-1.5 text-left">
                      <FiAlertTriangle size={13} />
                      <h4 className="text-[10px] font-bold uppercase tracking-wider">Danger Zone</h4>
                    </div>

                    {/* Delete Projects */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
                      <div className="space-y-0.5">
                        <p className={`text-[11px] font-bold text-red-500 uppercase tracking-wider`}>Delete All Saved Projects</p>
                        <p className="text-[9.5px] text-surface-500 leading-normal">
                          Wipe all project files from the local database. This is irreversible.
                        </p>
                      </div>
                      <button
                        onClick={() => { setDeleteProjectsConfirmText(''); setShowDeleteProjectsModal(true); }}
                        disabled={deleting}
                        className="sm:shrink-0 flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white-force border border-red-500/20 transition-all text-[9px] font-bold uppercase tracking-widest cursor-pointer disabled:opacity-40"
                      >
                        <FiTrash2 size={10} />
                        <span>Delete All</span>
                      </button>
                    </div>

                    {/* Wipe Account */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left pt-3 border-t border-red-500/10">
                      <div className="space-y-0.5">
                        <p className={`text-[11px] font-bold text-red-500 uppercase tracking-wider`}>Reset Settings & Storage</p>
                        <p className="text-[9.5px] text-surface-500 leading-normal">
                          Wipe all database logs, reset system themes, and clear local memory.
                        </p>
                      </div>
                      <button
                        onClick={() => { setDeleteAccountConfirmText(''); setShowDeleteAccountModal(true); }}
                        disabled={deleting}
                        className="sm:shrink-0 flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-650 hover:bg-red-500 text-white-force transition-all text-[9px] font-bold uppercase tracking-widest cursor-pointer disabled:opacity-40"
                      >
                        <FiAlertTriangle size={10} />
                        <span>Wipe Workspace</span>
                      </button>
                    </div>

                    {/* Delete Account */}
                    {user && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left pt-3 border-t border-red-500/10 animate-fade-in">
                        <div className="space-y-0.5">
                          <p className="text-[11px] font-bold text-red-500 uppercase tracking-wider">Delete Profile & Account</p>
                          <p className="text-[9.5px] text-surface-500 leading-normal">
                            Permanently delete your profile and all associated data. A deletion link will be dispatched to your email.
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setDeleteReason('No longer need it');
                            setDeleteAccountSuccess(false);
                            setShowDeleteRealAccountModal(true);
                          }}
                          disabled={deleting}
                          className="sm:shrink-0 flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-all text-[9px] font-bold uppercase tracking-widest cursor-pointer disabled:opacity-40"
                        >
                          <FiTrash2 size={10} />
                          <span>Delete Account</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SYSTEM INFO SECTION */}
              {activeSubTab === 'about' && (
                <div className="space-y-4">
                  <div className="space-y-1 text-left">
                    <h3 className={`text-xs font-bold uppercase tracking-wider ${d ? 'text-gray-900' : 'text-white'}`}>
                      System Specifications
                    </h3>
                    <p className="text-[11px] text-surface-500">Core software versions and environment configurations.</p>
                  </div>

                  {/* Technical Specifications Grid */}
                  <div className={`p-4 rounded-xl border space-y-2.5 font-mono text-[9.5px] text-left ${
                    d ? 'border-black/[0.06] bg-white/40 text-gray-700' : 'border-white/[0.04] bg-[#0c0c16]/40 text-surface-400'
                  }`}>
                    <div className="flex justify-between border-b border-white/[0.03] pb-1.5">
                      <span>// VERSION</span>
                      <span className={`font-bold ${d ? 'text-gray-900' : 'text-white'}`}>v1.0.0</span>
                    </div>
                    <div className="flex justify-between border-b border-white/[0.03] pb-1.5">
                      <span>// BUILD_TAG</span>
                      <span className={`font-bold ${d ? 'text-gray-900' : 'text-white'}`}>#089-CD</span>
                    </div>
                    <div className="flex justify-between border-b border-white/[0.03] pb-1.5">
                      <span>// COMPILATION_ENVIRONMENT</span>
                      <span className={`font-bold capitalize ${d ? 'text-gray-900' : 'text-white'}`}>
                        {import.meta.env.MODE || 'development'}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-white/[0.03] pb-1.5">
                      <span>// RENDER_BACKEND</span>
                      <span className={`font-bold ${d ? 'text-gray-900' : 'text-white'}`}>FFmpeg / WebGL</span>
                    </div>
                    <div className="flex justify-between pt-0.5">
                      <span>// LICENSING</span>
                      <span>© 2026 Director Desk Inc.</span>
                    </div>
                  </div>

                  {/* External Links */}
                  <div className="space-y-2 pt-1 text-left">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-surface-500 font-mono">// Interfaces</p>
                    <div className="grid grid-cols-3 gap-2.5">
                      {[
                        { label: 'Documentation', href: '/docs', icon: FiGlobe },
                        { label: 'GitHub Source', href: 'https://github.com/Supan-Roy/director-desk', icon: FiExternalLink },
                        { label: 'Privacy Policy', href: '/privacy', icon: FiGlobe }
                      ].map((link, idx) => {
                        const isExternal = link.href.startsWith('http')
                        if (isExternal) {
                          return (
                            <a
                              key={idx}
                              href={link.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex items-center justify-between p-2.5 rounded-lg border text-[10px] font-bold transition-all duration-200 ${
                                d
                                  ? 'border-black/[0.07] bg-white/40 hover:bg-white text-gray-700 hover:text-accent'
                                  : 'border-white/[0.04] bg-[#0c0c16]/40 hover:bg-[#0c0c16]/80 text-surface-300 hover:text-accent'
                              }`}
                            >
                              <span className="truncate">{link.label}</span>
                              <link.icon size={11} className="opacity-60 shrink-0" />
                            </a>
                          )
                        } else {
                          return (
                            <button
                              key={idx}
                              onClick={() => navigate(link.href)}
                              className={`flex items-center justify-between p-2.5 rounded-lg border text-[10px] font-bold transition-all duration-200 text-left w-full cursor-pointer ${
                                d
                                  ? 'border-black/[0.07] bg-white/40 hover:bg-white text-gray-700 hover:text-accent'
                                  : 'border-white/[0.04] bg-[#0c0c16]/40 hover:bg-[#0c0c16]/80 text-surface-300 hover:text-accent'
                              }`}
                            >
                              <span className="truncate">{link.label}</span>
                              <link.icon size={11} className="opacity-60 shrink-0" />
                            </button>
                          )
                        }
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CONFIRM DELETE PROJECTS MODAL */}
      {showDeleteProjectsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
          <div 
            onClick={() => { setShowDeleteProjectsModal(false); setDeleteProjectsConfirmText(''); }}
            className="absolute inset-0 bg-black/75 backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
          />
          <div 
            ref={deleteProjectsRef}
            className={`relative z-10 w-full max-w-sm rounded-2xl border p-6 shadow-2xl transition-all duration-300 scale-100 flex flex-col gap-4 animate-scale-in ${
              d 
                ? 'bg-[#fcfbfa] border-neutral-200 text-neutral-800' 
                : 'bg-[#0b0b14]/95 border-white/[0.08] text-white shadow-black/80'
            }`}
          >
            <div className="flex items-center gap-3 text-red-500">
              <FiTrash2 size={20} className="shrink-0" />
              <h3 className="text-sm font-bold uppercase tracking-wider">Delete All Projects</h3>
            </div>
            
            <p className={`text-[12px] leading-relaxed ${d ? 'text-gray-600' : 'text-surface-400'}`}>
              Are you sure you want to permanently delete <strong className={d ? 'text-gray-900' : 'text-white'}>all saved projects</strong>? This will clear all screenplays, storyboards, and plans. This action cannot be undone.
            </p>

            <div className="flex flex-col gap-1.5 mt-2">
              <label className={`text-[10px] font-bold uppercase tracking-wider ${d ? 'text-gray-500' : 'text-surface-500'}`}>
                To confirm, type <span className="font-mono text-red-500 font-black">DELETE ALL</span> below:
              </label>
              <input
                type="text"
                value={deleteProjectsConfirmText}
                onChange={(e) => setDeleteProjectsConfirmText(e.target.value)}
                placeholder="DELETE ALL"
                className={`px-3 py-2 rounded-xl text-[12px] font-semibold border focus:outline-hidden transition-all ${
                  d
                    ? 'bg-white border-neutral-200 text-neutral-800 focus:border-red-500'
                    : 'bg-black/30 border-white/10 text-white focus:border-red-500'
                }`}
              />
            </div>
            
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => { setShowDeleteProjectsModal(false); setDeleteProjectsConfirmText(''); }}
                className={`flex-1 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider border transition-colors cursor-pointer text-center ${
                  d 
                    ? 'border-gray-200 hover:bg-gray-50 text-gray-500' 
                    : 'border-white/10 hover:bg-white/5 text-neutral-300'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAllProjects}
                disabled={deleting || deleteProjectsConfirmText !== 'DELETE ALL'}
                className="flex-1 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider bg-red-600 hover:bg-red-500 text-white shadow-lg cursor-pointer transition-colors text-center disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE ACCOUNT MODAL */}
      {showDeleteAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
          <div 
            onClick={() => { setShowDeleteAccountModal(false); setDeleteAccountConfirmText(''); }}
            className="absolute inset-0 bg-black/75 backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
          />
          <div 
            ref={deleteAccountRef}
            className={`relative z-10 w-full max-w-sm rounded-2xl border p-6 shadow-2xl transition-all duration-300 scale-100 flex flex-col gap-4 animate-scale-in ${
              d 
                ? 'bg-[#fcfbfa] border-neutral-200 text-neutral-800' 
                : 'bg-[#0b0b14]/95 border-white/[0.08] text-white shadow-black/80'
            }`}
          >
            <div className="flex items-center gap-3 text-red-600">
              <FiAlertTriangle size={20} className="shrink-0 animate-bounce" />
              <h3 className="text-sm font-bold uppercase tracking-wider">Reset Settings & Storage</h3>
            </div>
            
            <p className={`text-[12px] leading-relaxed ${d ? 'text-gray-600' : 'text-surface-400'}`}>
              Are you sure you want to permanently delete your configurations and wipe all settings? This will clear all database entries and reset storage. This action is irreversible.
            </p>

            <div className="flex flex-col gap-1.5 mt-2">
              <label className={`text-[10px] font-bold uppercase tracking-wider ${d ? 'text-gray-500' : 'text-surface-500'}`}>
                To confirm, type <span className="font-mono text-red-500 font-black">WIPE ACCOUNT</span> below:
              </label>
              <input
                type="text"
                value={deleteAccountConfirmText}
                onChange={(e) => setDeleteAccountConfirmText(e.target.value)}
                placeholder="WIPE ACCOUNT"
                className={`px-3 py-2 rounded-xl text-[12px] font-semibold border focus:outline-hidden transition-all ${
                  d
                    ? 'bg-white border-neutral-200 text-neutral-800 focus:border-red-500'
                    : 'bg-black/30 border-white/10 text-white focus:border-red-500'
                }`}
              />
            </div>
            
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => { setShowDeleteAccountModal(false); setDeleteAccountConfirmText(''); }}
                className={`flex-1 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider border transition-colors cursor-pointer text-center ${
                  d 
                    ? 'border-gray-200 hover:bg-gray-50 text-gray-500' 
                    : 'border-white/10 hover:bg-white/5 text-neutral-300'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || deleteAccountConfirmText !== 'WIPE ACCOUNT'}
                className="flex-1 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider bg-red-600 hover:bg-red-500 text-white shadow-lg cursor-pointer transition-colors text-center disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleting ? 'Wiping...' : 'Confirm Wipe'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* REAL DELETE ACCOUNT VERIFICATION MODAL */}
      {showDeleteRealAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
          <div 
            onClick={() => setShowDeleteRealAccountModal(false)}
            className="absolute inset-0 bg-black/75 backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
          />
          <div 
            className={`relative z-10 w-full max-w-sm rounded-2xl border p-6 shadow-2xl transition-all duration-300 scale-100 flex flex-col gap-4 animate-scale-in ${
              d 
                ? 'bg-[#fcfbfa] border-neutral-200 text-neutral-800' 
                : 'bg-[#0b0b14]/95 border-white/[0.08] text-white shadow-black/80'
            }`}
          >
            <div className="flex items-center gap-3 text-red-600">
              <FiAlertTriangle size={20} className="shrink-0" />
              <h3 className="text-sm font-bold uppercase tracking-wider">Delete Account</h3>
            </div>
            
            {!deleteAccountSuccess ? (
              <form onSubmit={handleDeleteAccountRequest} className="space-y-4">
                <p className={`text-[12px] leading-relaxed ${d ? 'text-gray-600' : 'text-surface-400'}`}>
                  Permanently deleting your account will erase all your projects and generated assets. A verification link will be sent to your email.
                </p>

                <div className="flex flex-col gap-1.5 text-left">
                  <label className={`text-[10px] font-bold uppercase tracking-wider ${d ? 'text-gray-500' : 'text-surface-500'}`}>
                    Why are you leaving?
                  </label>
                  <select
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    className={`w-full text-xs rounded-lg px-3 py-1.5 border focus:outline-none ${
                      d 
                        ? 'bg-white border-neutral-200 text-neutral-800 focus:border-black' 
                        : 'bg-[#030305] border-white/10 text-white focus:border-white'
                    }`}
                  >
                    <option value="No longer need it">No longer need it</option>
                    <option value="Too complex / difficult to use">Too complex / difficult to use</option>
                    <option value="Privacy or security concerns">Privacy or security concerns</option>
                    <option value="Found a better alternative">Found a better alternative</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowDeleteRealAccountModal(false)}
                    className={`flex-1 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider border transition-colors cursor-pointer text-center ${
                      d 
                        ? 'border-gray-250 hover:bg-gray-150 text-gray-500' 
                        : 'border-white/[0.08] hover:bg-white/[0.04] text-neutral-300'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={deleting}
                    className="flex-1 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider bg-red-650 hover:bg-red-500 text-white cursor-pointer transition-colors text-center disabled:opacity-40"
                  >
                    {deleting ? 'Requesting...' : 'Request Deletion'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleConfirmDeleteAccount} className="space-y-4">
                <div className="text-emerald-500 text-xs font-bold uppercase tracking-wider">✓ OTP Code Sent</div>
                <p className={`text-[11px] leading-relaxed text-left ${d ? 'text-gray-600' : 'text-surface-400'}`}>
                  An account deletion code has been emailed to you. Enter the 6-digit OTP code below to confirm final deletion.
                </p>
                
                <div className="flex flex-col gap-1.5 text-left">
                  <label className={`text-[10px] font-bold uppercase tracking-wider ${d ? 'text-gray-500' : 'text-surface-500'}`}>
                    Verification OTP
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={deleteOtpCode}
                    onChange={(e) => setDeleteOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    required
                    disabled={deleting}
                    className={`w-full text-center tracking-[0.5em] font-mono text-sm rounded-lg py-2 border focus:outline-none ${
                      d 
                        ? 'bg-white border-neutral-250 text-neutral-800 focus:border-black' 
                        : 'bg-[#030305] border-white/10 text-white focus:border-white'
                    }`}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteAccountSuccess(false)
                      setDeleteOtpCode('')
                    }}
                    className={`flex-1 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider border transition-colors cursor-pointer text-center ${
                      d 
                        ? 'border-gray-250 hover:bg-gray-150 text-gray-500' 
                        : 'border-white/[0.08] hover:bg-white/[0.04] text-neutral-300'
                    }`}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={deleting || deleteOtpCode.length !== 6}
                    className="flex-1 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider bg-red-600 hover:bg-red-500 text-white cursor-pointer transition-colors text-center disabled:opacity-40"
                  >
                    {deleting ? 'Confirming...' : 'Wipe Account'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
