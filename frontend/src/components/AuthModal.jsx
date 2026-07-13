import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../context/AuthContext'
import { useProjectData } from '../context/ProjectDataContext'
import { FiX, FiMail, FiLock, FiUser, FiArrowRight, FiShield, FiEye, FiEyeOff } from 'react-icons/fi'
import { FcGoogle } from 'react-icons/fc'
import { apiBaseUrl } from '../services/apiClient'
import { useTheme } from '../context/ThemeContext'

export default function AuthModal() {
  const { isDayMode } = useTheme()
  const d = isDayMode
  const {
    authModalOpen,
    closeLoginModal,
    checkEmail,
    loginEmail,
    registerEmail,
    verifyOTP,
    resendOTP,
    googleLogin,
    user
  } = useAuth()

  const { hasProject, fetchSavedProjects } = useProjectData()

  const [step, setStep] = useState('email') // email, login, register, otp
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [lastName, setLastName] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const googleBtnRef = useRef(null)

  const stories = [
    {
      title: 'Mechatronic Transformer',
      desc: 'Neon, rain, future cityscapes',
      video: '/videos/robot_transform.mp4',
      accent: '#8b5cf6'
    },
    {
      title: 'Documentary Realism',
      desc: 'Real stories, real people, organic lighting',
      video: '/videos/documentary_realism.mp4',
      accent: '#f59e0b'
    },
    {
      title: 'Sci-Fi Metropolis',
      desc: 'Skyscrapers, flying vehicles, future urbanism',
      video: '/videos/sci-fi_city.mp4',
      accent: '#10b981'
    },
    {
      title: 'Cinematic Noir',
      desc: 'Mystery, shadows, classic monochrome drama',
      video: '/videos/cinematic_noir.mp4',
      accent: '#ffffff'
    },
    {
      title: 'Space Odyssey',
      desc: 'Cosmic, epic, planetary exploration',
      video: '/videos/space_odyssey.mp4',
      accent: '#5b6cf6'
    }
  ]

  const [activeStory, setActiveStory] = useState(0)
  const [progress, setProgress] = useState(0)

  // Native video sync handlers for Instagram story-style progression
  const handleTimeUpdate = (e) => {
    const video = e.target
    const maxDuration = 5 // 5s cap
    const current = video.currentTime
    setProgress((Math.min(current, maxDuration) / maxDuration) * 100)
    if (current >= maxDuration) {
      setProgress(0)
      setActiveStory((prev) => (prev + 1) % stories.length)
    }
  }

  const handleVideoEnded = () => {
    setProgress(0)
    setActiveStory((prev) => (prev + 1) % stories.length)
  }

  // Reset progress and active story when modal opens/closes
  useEffect(() => {
    if (!authModalOpen) {
      setActiveStory(0)
      setProgress(0)
    }
  }, [authModalOpen])

  // Reset visibility states when changing auth steps
  useEffect(() => {
    setShowPassword(false)
    setShowConfirmPassword(false)
  }, [step])

  // Clear state when modal toggles
  useEffect(() => {
    if (!authModalOpen) {
      setStep('email')
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setName('')
      setLastName('')
      setOtpCode('')
      setShowPassword(false)
      setShowConfirmPassword(false)
      setError('')
      setSuccessMsg('')
    }
  }, [authModalOpen])

  // Inject Google GIS script dynamically
  useEffect(() => {
    if (!authModalOpen) return

    const clientID = import.meta.env.VITE_GOOGLE_CLIENT_ID

    // Callback when Google credential returns
    const handleCredentialResponse = async (response) => {
      setLoading(true)
      setError('')
      try {
        await googleLogin(response.credential)
        // Auto-save current active session project after successful login
        if (hasProject) {
          await fetch(`${apiBaseUrl}/api/projects/save-current`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          })
          await fetchSavedProjects()
        }
      } catch (err) {
        setError(err.message || 'Google Sign-In failed.')
      } finally {
        setLoading(false)
      }
    }

    if (clientID && window.google) {
      try {
        window.google.accounts.id.initialize({
          client_id: clientID,
          callback: handleCredentialResponse
        })
        if (googleBtnRef.current) {
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'dark',
            size: 'large',
            width: 320,
            text: 'continue_with'
          })
        }
      } catch (err) {
        console.error('Google GIS initialization failed:', err)
      }
    }
  }, [authModalOpen, googleLogin, hasProject, fetchSavedProjects])

  if (!authModalOpen) return null

  // ── Step 1: Submit Email ────────────────────────────────────────────────
  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await checkEmail(email)
      if (data.exists) {
        if (data.is_google_only) {
          setError('This email is registered via Google. Please sign in using the "Continue with Google" button.')
        } else {
          setStep('login')
        }
      } else {
        setStep('register')
      }
    } catch (err) {
      setError(err.message || 'Verification failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2a: Submit Login ───────────────────────────────────────────────
  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    if (!password) {
      setError('Password is required.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await loginEmail(email, password)
      // Auto-save current active session project after successful login
      if (hasProject) {
        try {
          await fetch(`${apiBaseUrl}/api/projects/save-current`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          })
          await fetchSavedProjects()
        } catch (saveErr) {
          console.error('Auto-saving in-memory workspace failed:', saveErr)
        }
      }
    } catch (err) {
      const errMsg = err.message || 'Invalid credentials.'
      setError(errMsg)
      if (errMsg.toLowerCase().includes('not verified')) {
        setStep('otp')
        setSuccessMsg(errMsg)
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2b: Submit Registration ────────────────────────────────────────
  const handleRegisterSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Name is required.')
      return
    }
    if (password.length < 6 || password.length > 32) {
      setError('Password must be between 6 and 32 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await registerEmail(email, name, lastName, password, confirmPassword)
      setStep('otp')
      setSuccessMsg('A 6-digit verification code was sent to your email.')
    } catch (err) {
      setError(err.message || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  // ── Step 3: Submit OTP ──────────────────────────────────────────────────
  const handleOTPSubmit = async (e) => {
    e.preventDefault()
    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter a valid 6-digit OTP code.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await verifyOTP(email, otpCode)
      // Auto-save current active session project after successful login
      if (hasProject) {
        try {
          await fetch(`${apiBaseUrl}/api/projects/save-current`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          })
          await fetchSavedProjects()
        } catch (saveErr) {
          console.error('Auto-saving in-memory workspace failed:', saveErr)
        }
      }
    } catch (err) {
      setError(err.message || 'Verification failed.')
    } finally {
      setLoading(false)
    }
  }

  // Simulates Google OAuth Sign-In for local development/review ease
  const handleMockGoogleLogin = async () => {
    setLoading(true)
    setError('')
    try {
      // Send a mock token string representing Google login
      await googleLogin('mock_google_id_token_cred')
      // Auto-save current active session project
      if (hasProject) {
        await fetch(`${apiBaseUrl}/api/projects/save-current`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
        await fetchSavedProjects()
      }
    } catch (err) {
      setError(err.message || 'Mock Google login failed.')
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with backdrop blur */}
      <div 
        onClick={step === 'email' ? closeLoginModal : undefined}
        className="absolute inset-0 bg-black/85 backdrop-blur-md transition-opacity duration-300"
      />

      {/* Modal Container */}
      <div className={`relative z-10 w-full max-w-4xl h-[560px] rounded-2xl border backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-scale-in overflow-hidden flex flex-col md:flex-row transition-all duration-500 ${
        d 
          ? 'bg-[#f8f9fa]/95 border-black/[0.06] text-neutral-800' 
          : 'bg-[#0b0c10]/95 border-white/[0.06] text-white'
      }`}>
        
        {/* Left Column: Cinematic Story Preview (Hidden on Mobile) */}
        <div className="hidden md:flex md:w-[45%] h-full relative overflow-hidden bg-black flex-col justify-between p-7 border-r border-white/[0.04]">
          {/* Story Progress Indicators (Top) */}
          <div className="absolute top-4 left-4 right-4 z-20 flex gap-1.5">
            {stories.map((story, idx) => (
              <div key={idx} className="h-0.5 flex-1 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-100 ease-linear"
                  style={{
                    width: idx === activeStory ? `${progress}%` : idx < activeStory ? '100%' : '0%'
                  }}
                />
              </div>
            ))}
          </div>

          {/* Background Video */}
          <video
            key={activeStory}
            src={stories[activeStory].video}
            autoPlay
            muted
            playsInline
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleVideoEnded}
            className="absolute inset-0 w-full h-full object-cover opacity-80"
          />

          {/* Vignette Gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/50 z-10" />

          {/* Bottom Info Overlay */}
          <div className="relative z-20 mt-auto text-left space-y-2 select-none">
            <span 
              className="text-[9px] font-extrabold tracking-widest uppercase px-2.5 py-1 rounded bg-white/10 backdrop-blur-sm border border-white/10"
              style={{ color: stories[activeStory].accent }}
            >
              Preset Preview
            </span>
            <h4 className="text-[17px] font-black text-white">{stories[activeStory].title}</h4>
            <p className="text-[11px] text-neutral-300 font-medium leading-relaxed">{stories[activeStory].desc}</p>
          </div>
        </div>

        {/* Right Column: Forms */}
        <div className={`flex-1 h-full p-8 flex flex-col justify-center relative overflow-y-auto transition-colors duration-500 ${
          d ? 'bg-white' : 'bg-[#0e0f14]'
        }`}>
          {/* Subtle design radial gradient accents inside forms to remove flat look */}
          <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] rounded-full bg-purple-500/[0.03] blur-[100px] pointer-events-none" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] rounded-full bg-cyan-500/[0.03] blur-[100px] pointer-events-none" />
          {/* Close Button */}
          <button 
            onClick={closeLoginModal}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-surface-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer z-30"
          >
            <FiX size={14} />
          </button>

          {/* Brand Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="flex items-center gap-1 mb-1.5 select-none leading-none">
              <span className="text-[25px] font-black tracking-tight uppercase flex items-center text-transparent bg-clip-text bg-gradient-to-b from-white via-neutral-100 to-neutral-400">
                Direct
                <svg className="inline-block h-[0.85em] w-[0.85em] shrink-0 self-center align-middle mx-[0.04em] mt-[-0.04em]" viewBox="0 0 100 100">
                  <defs>
                    <linearGradient id="director-o-gradient-modal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffffff" />
                      <stop offset="50%" stopColor="#f5f5f5" />
                      <stop offset="100%" stopColor="#a3a3a3" />
                    </linearGradient>
                    <mask id="film-reel-mask-modal">
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
                  <circle cx="50" cy="50" r="46" fill="url(#director-o-gradient-modal)" mask="url(#film-reel-mask-modal)" />
                </svg>
                r
              </span>
              <span className="text-[25px] font-light tracking-[0.1em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-accent via-[#a78bfa] to-white ml-0.5">
                Desk
              </span>
            </div>
            <span className="text-[11px] font-bold tracking-widest uppercase text-surface-400 leading-none">
              Production Registry
            </span>
          </div>

          {/* Notification Errors */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] rounded-lg px-3.5 py-2 mb-4 leading-relaxed text-left flex gap-2 items-start animate-fade-in">
              <FiShield className="shrink-0 mt-0.5" size={13} />
              <span>{error}</span>
            </div>
          )}

          {/* Notification Success */}
          {successMsg && (
            <div className="bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[11px] rounded-lg px-3.5 py-2 mb-4 leading-relaxed text-left animate-fade-in">
              {successMsg}
            </div>
          )}

          {/* ── STEP 1: EMAIL INPUT ── */}
          {step === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="text-left space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-wider text-surface-500">Email Address</label>
                <div className="relative">
                  <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" size={13} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    disabled={loading}
                    className={`w-full focus:outline-none rounded-lg pl-9 pr-4 py-2 text-xs transition-all duration-300 border ${
                      d 
                        ? 'bg-neutral-100/80 border-neutral-200 focus:bg-white focus:border-black text-black' 
                        : 'bg-white/[0.02] border-white/[0.08] focus:bg-white/[0.05] focus:border-white text-white'
                    }`}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full font-extrabold uppercase tracking-wider text-xs py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  d 
                    ? 'bg-black text-white hover:bg-neutral-850 border border-black/10' 
                    : 'bg-white text-black hover:bg-neutral-200 border border-white/10'
                }`}
              >
                <span>{loading ? 'Processing...' : 'Continue'}</span>
                <FiArrowRight size={12} />
              </button>

              {/* Google Authentication Integration */}
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-white/[0.04]"></div>
                <span className="flex-shrink mx-3 text-[9px] text-surface-500 uppercase tracking-widest font-black">OR</span>
                <div className="flex-grow border-t border-white/[0.04]"></div>
              </div>

              {import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
                <div className="flex justify-center" ref={googleBtnRef} id="google-signin-btn" />
              ) : (
                <button
                  type="button"
                  onClick={handleMockGoogleLogin}
                  disabled={loading}
                  className="w-full bg-white text-neutral-900 hover:bg-neutral-100 font-extrabold uppercase tracking-wider text-[10px] py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer border border-neutral-200"
                >
                  <FcGoogle size={14} />
                  <span>Continue with Google</span>
                </button>
              )}
            </form>
          )}

          {/* ── STEP 2a: LOGIN PASSWORD ── */}
          {step === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="text-left space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-wider text-surface-400">Log In As</label>
                <div className="text-xs font-semibold text-surface-300 bg-white/[0.02] border border-white/[0.04] px-3 py-2 rounded-lg truncate">
                  {email}
                </div>
              </div>

              <div className="text-left space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-wider text-surface-500">Password</label>
                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" size={13} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={loading}
                    className={`w-full focus:outline-none rounded-lg pl-9 pr-9 py-2 text-xs transition-all duration-300 border ${
                      d 
                        ? 'bg-neutral-100/80 border-neutral-200 focus:bg-white focus:border-black text-black' 
                        : 'bg-white/[0.02] border-white/[0.08] focus:bg-white/[0.05] focus:border-white text-white'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {showPassword ? <FiEyeOff size={13} /> : <FiEye size={13} />}
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="w-1/3 bg-white/[0.03] hover:bg-white/[0.06] text-surface-300 font-extrabold uppercase tracking-wider text-[9px] py-2.5 rounded-lg transition-colors cursor-pointer border border-white/[0.04]"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`flex-1 font-extrabold uppercase tracking-wider text-xs py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    d 
                      ? 'bg-black text-white hover:bg-neutral-850 border border-black/10' 
                      : 'bg-white text-black hover:bg-neutral-200 border border-white/10'
                  }`}
                >
                  <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
                  <FiArrowRight size={12} />
                </button>
              </div>
            </form>
          )}

          {/* ── STEP 2b: REGISTER ACCOUNT ── */}
          {step === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div className="text-left space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-wider text-surface-400">Register Email</label>
                <div className="text-xs font-semibold text-surface-300 bg-white/[0.02] border border-white/[0.04] px-3 py-2 rounded-lg truncate">
                  {email}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="text-left space-y-1">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-surface-500">First Name</label>
                  <div className="relative">
                    <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" size={13} />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John"
                      required
                      disabled={loading}
                      className={`w-full focus:outline-none rounded-lg pl-9 pr-3 py-2 text-xs transition-all duration-300 border ${
                        d 
                          ? 'bg-neutral-100/80 border-neutral-200 focus:bg-white focus:border-black text-black' 
                          : 'bg-white/[0.02] border-white/[0.08] focus:bg-white/[0.05] focus:border-white text-white'
                      }`}
                    />
                  </div>
                </div>
                <div className="text-left space-y-1">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-surface-500">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    disabled={loading}
                    className={`w-full focus:outline-none rounded-lg px-3 py-2 text-xs transition-all duration-300 border ${
                      d 
                        ? 'bg-neutral-100/80 border-neutral-200 focus:bg-white focus:border-black text-black' 
                        : 'bg-white/[0.02] border-white/[0.08] focus:bg-white/[0.05] focus:border-white text-white'
                    }`}
                  />
                </div>
              </div>

              <div className="text-left space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-wider text-surface-500">Password</label>
                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" size={13} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    required
                    disabled={loading}
                    className={`w-full focus:outline-none rounded-lg pl-9 pr-9 py-2 text-xs transition-all duration-300 border ${
                      d 
                        ? 'bg-neutral-100/80 border-neutral-200 focus:bg-white focus:border-black text-black' 
                        : 'bg-white/[0.02] border-white/[0.08] focus:bg-white/[0.05] focus:border-white text-white'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {showPassword ? <FiEyeOff size={13} /> : <FiEye size={13} />}
                  </button>
                </div>
              </div>

              <div className="text-left space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-wider text-surface-500">Confirm Password</label>
                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" size={13} />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    required
                    disabled={loading}
                    className={`w-full focus:outline-none rounded-lg pl-9 pr-9 py-2 text-xs transition-all duration-300 border ${
                      d 
                        ? 'bg-neutral-100/80 border-neutral-200 focus:bg-white focus:border-black text-black' 
                        : 'bg-white/[0.02] border-white/[0.08] focus:bg-white/[0.05] focus:border-white text-white'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {showConfirmPassword ? <FiEyeOff size={13} /> : <FiEye size={13} />}
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="w-1/3 bg-white/[0.03] hover:bg-white/[0.06] text-surface-300 font-extrabold uppercase tracking-wider text-[9px] py-2.5 rounded-lg transition-colors cursor-pointer border border-white/[0.04]"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`flex-1 font-extrabold uppercase tracking-wider text-xs py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    d 
                      ? 'bg-black text-white hover:bg-neutral-850 border border-black/10' 
                      : 'bg-white text-black hover:bg-neutral-200 border border-white/10'
                  }`}
                >
                  <span>{loading ? 'Creating...' : 'Register'}</span>
                  <FiArrowRight size={12} />
                </button>
              </div>
            </form>
          )}

          {/* ── STEP 3: OTP VERIFICATION ── */}
          {step === 'otp' && (
            <form onSubmit={handleOTPSubmit} className="space-y-4">
              <div className="text-left space-y-2">
                <p className="text-[11px] leading-relaxed text-surface-400">
                  Please enter the 6-digit OTP code dispatched to <strong className="text-white">{email}</strong>.
                </p>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  required
                  disabled={loading}
                  className={`w-full text-center tracking-[0.75em] font-mono focus:outline-none rounded-lg py-3 text-lg transition-all duration-300 border ${
                    d 
                      ? 'bg-neutral-100/80 border-neutral-200 focus:bg-white focus:border-black text-black' 
                      : 'bg-white/[0.02] border-white/[0.08] focus:bg-white/[0.05] focus:border-white text-white'
                  }`}
                />
                <div className="flex justify-between items-center pt-0.5 select-none">
                  <span className="text-[9.5px] text-surface-500">Didn't receive code?</span>
                  <button
                    type="button"
                    onClick={async () => {
                      setLoading(true);
                      setError('');
                      setSuccessMsg('');
                      try {
                        await resendOTP(email);
                        setSuccessMsg('A new OTP verification code has been sent successfully.');
                      } catch (err) {
                        setError(err.message || 'Failed to resend verification code.');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    className="text-[9.5px] text-purple-400 hover:text-purple-300 font-extrabold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Resend Code
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="w-1/3 bg-white/[0.03] hover:bg-white/[0.06] text-surface-300 font-extrabold uppercase tracking-wider text-[9px] py-2.5 rounded-lg transition-colors cursor-pointer border border-white/[0.04]"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`flex-1 font-extrabold uppercase tracking-wider text-xs py-2.5 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                    d 
                      ? 'bg-black text-white hover:bg-neutral-850 border border-black/10' 
                      : 'bg-white text-black hover:bg-neutral-200 border border-white/10'
                  }`}
                >
                  {loading ? 'Verifying...' : 'Verify & Sign In'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
