import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../context/AuthContext'
import { useProjectData } from '../context/ProjectDataContext'
import { FiX, FiMail, FiLock, FiUser, FiArrowRight, FiShield, FiEye, FiEyeOff } from 'react-icons/fi'
import { FcGoogle } from 'react-icons/fc'
import { apiBaseUrl } from '../services/apiClient'

export default function AuthModal() {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with backdrop blur */}
      <div 
        onClick={step === 'email' ? closeLoginModal : undefined}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity duration-300"
      />

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border bg-[#0a0a0f] border-surface-700 p-6 text-white shadow-2xl shadow-black animate-scale-in">
        {/* Close Button */}
        <button 
          onClick={closeLoginModal}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-surface-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
        >
          <FiX size={14} />
        </button>

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex items-center gap-1 mb-1.5 select-none leading-none">
            <span className="text-[18px] font-black tracking-tight uppercase flex items-center text-transparent bg-clip-text bg-gradient-to-b from-white via-neutral-100 to-neutral-400">
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
            <span className="text-[18px] font-light tracking-[0.1em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-accent via-[#a78bfa] to-white ml-0.5">
              Desk
            </span>
          </div>
          <span className="text-[9.5px] font-bold tracking-widest uppercase text-surface-400 leading-none">
            Production Registry
        {/* Title */}
        <div className="flex flex-col items-center gap-2 mb-6 select-none">
          <div className="w-10 h-10 rounded-xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <FiShield size={20} />
          </div>
          <h2 className="text-sm font-extrabold uppercase tracking-[0.25em] text-white">
            Studio Authentication
          </h2>
          <p className="text-[10px] text-surface-500 font-medium">
            Access your secure director workspace
          </p>
        </div>

        {/* Errors / Success notifications */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-[10.5px] text-red-400 font-semibold leading-relaxed">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[10.5px] text-emerald-400 font-semibold leading-relaxed">
            {successMsg}
          </div>
        )}

        {/* Step 1: Check Email */}
        {step === 'email' && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[10px] font-bold uppercase tracking-wider text-surface-500">
                Email Address
              </label>
              <div className="relative">
                <FiMail className="absolute left-3 top-3 text-surface-500" size={14} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="director@director-desk.com"
                  required
                  disabled={loading}
                  className="w-full bg-[#030305] border border-surface-700 focus:border-white focus:outline-none rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-surface-600 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent-dim text-white font-extrabold uppercase tracking-wider text-[10px] py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              {loading ? 'Checking...' : 'Continue'}
              <FiArrowRight size={12} />
            </button>

            {/* Google Sign In Separator */}
            <div className="relative flex py-2 items-center select-none">
              <div className="flex-grow border-t border-white/[0.04]"></div>
              <span className="flex-shrink mx-4 text-[9px] uppercase tracking-widest text-surface-600 font-bold">or</span>
              <div className="flex-grow border-t border-white/[0.04]"></div>
            </div>

            {/* Google Login Trigger */}
            <button
              type="button"
              onClick={() => {
                if (window.google?.accounts?.id) {
                  window.google.accounts.id.prompt()
                } else {
                  setError('Google Sign-In is initializing. Please try again in a few seconds.')
                }
              }}
              disabled={loading}
              className="w-full bg-[#0c0c16]/30 hover:bg-[#0c0c16]/70 border border-white/[0.04] text-white font-extrabold uppercase tracking-wider text-[10px] py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <FcGoogle size={14} />
              <span>Continue with Google</span>
            </button>
          </form>
        )}

        {/* Step 2a: Login */}
        {step === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[10px] font-bold uppercase tracking-wider text-surface-500">
                Email Address
              </label>
              <div className="relative">
                <FiMail className="absolute left-3 top-3 text-surface-500" size={14} />
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full bg-[#0c0c16]/30 border border-white/[0.04] rounded-lg pl-9 pr-3 py-2 text-xs text-surface-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[10px] font-bold uppercase tracking-wider text-surface-500">
                Password
              </label>
              <div className="relative">
                <FiLock className="absolute left-3 top-3 text-surface-500" size={14} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  className="w-full bg-[#030305] border border-surface-700 focus:border-white focus:outline-none rounded-lg pl-9 pr-10 py-2 text-xs text-white placeholder-surface-600 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-surface-500 hover:text-white cursor-pointer"
                >
                  {showPassword ? <FiEyeOff size={12} /> : <FiEye size={12} />}
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
                className="flex-1 bg-accent hover:bg-accent-dim text-white font-extrabold uppercase tracking-wider text-[10px] py-2.5 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </div>
          </form>
        )}

        {/* Step 2b: Register */}
        {step === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3">
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[10px] font-bold uppercase tracking-wider text-surface-500">
                Email Address
              </label>
              <div className="relative">
                <FiMail className="absolute left-3 top-3 text-surface-500" size={14} />
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full bg-[#0c0c16]/30 border border-white/[0.04] rounded-lg pl-9 pr-3 py-2 text-xs text-surface-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[10px] font-bold uppercase tracking-wider text-surface-500">
                  First Name
                </label>
                <div className="relative">
                  <FiUser className="absolute left-3 top-3 text-surface-500" size={14} />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Elena"
                    required
                    disabled={loading}
                    className="w-full bg-[#030305] border border-surface-700 focus:border-white focus:outline-none rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-surface-600 transition-colors"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[10px] font-bold uppercase tracking-wider text-surface-500">
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Rostova"
                  disabled={loading}
                  className="w-full bg-[#030305] border border-surface-700 focus:border-white focus:outline-none rounded-lg px-3 py-2 text-xs text-white placeholder-surface-600 transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[10px] font-bold uppercase tracking-wider text-surface-500">
                Password
              </label>
              <div className="relative">
                <FiLock className="absolute left-3 top-3 text-surface-500" size={14} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                  disabled={loading}
                  className="w-full bg-[#030305] border border-surface-700 focus:border-white focus:outline-none rounded-lg pl-9 pr-10 py-2 text-xs text-white placeholder-surface-600 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-surface-500 hover:text-white cursor-pointer"
                >
                  {showPassword ? <FiEyeOff size={12} /> : <FiEye size={12} />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[10px] font-bold uppercase tracking-wider text-surface-500">
                Confirm Password
              </label>
              <div className="relative">
                <FiLock className="absolute left-3 top-3 text-surface-500" size={14} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  required
                  disabled={loading}
                  className="w-full bg-[#030305] border border-surface-700 focus:border-white focus:outline-none rounded-lg pl-9 pr-10 py-2 text-xs text-white placeholder-surface-600 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3.5 text-surface-500 hover:text-white cursor-pointer"
                >
                  {showConfirmPassword ? <FiEyeOff size={12} /> : <FiEye size={12} />}
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
                className="flex-1 bg-accent hover:bg-accent-dim text-white font-extrabold uppercase tracking-wider text-[10px] py-2.5 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
              >
                {loading ? 'Creating Account...' : 'Sign Up'}
              </button>
            </div>
          </form>
        )}

        {/* Step 3: OTP Verification */}
        {step === 'otp' && (
          <form onSubmit={handleOTPSubmit} className="space-y-4">
            <p className="text-[11px] text-surface-400 text-left leading-normal">
              Enter the 6-digit OTP verification code dispatched to <span className="text-white font-bold">{email}</span> to verify your email.
            </p>

            <div className="flex flex-col gap-2">
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                required
                disabled={loading}
                className="w-full text-center tracking-[0.75em] font-mono bg-[#030305] border border-surface-700 focus:border-white focus:outline-none rounded-lg py-3 text-lg text-white"
              />
              <button
                type="button"
                onClick={async () => {
                  setLoading(true);
                  try {
                    await resendOTP(email);
                    setSuccessMsg('A new OTP code has been sent.');
                  } catch (err) {
                    setError(err.message);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="text-[9px] text-surface-500 hover:text-white uppercase tracking-widest font-bold underline decoration-surface-700 underline-offset-4"
              >
                Resend Code
              </button>
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
                className="flex-1 bg-purple-700 hover:bg-purple-650 text-white font-extrabold uppercase tracking-wider text-[10px] py-2.5 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
              >
                {loading ? 'Verifying...' : 'Verify & Sign In'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  )
}
