import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { apiClient } from '../services/apiClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authModalCallback, setAuthModalCallback] = useState(null)

  // ── Fetch Current User Session ──────────────────────────────────────────
  const fetchMe = useCallback(async () => {
    setLoading(true)
    try {
      const response = await apiClient.get('/api/auth/me')
      setUser(response.data)
    } catch (err) {
      console.error('Failed to restore authentication session:', err)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  // Restore session on mount
  useEffect(() => {
    fetchMe()
  }, [fetchMe])

  // ── Check if email exists ───────────────────────────────────────────────
  const checkEmail = async (email) => {
    try {
      const response = await apiClient.post('/api/auth/check-email', { email })
      return response.data // { exists, is_google_only }
    } catch (err) {
      throw new Error(err.message || 'Failed to verify email address.')
    }
  }

  // ── Login with email and password ───────────────────────────────────────
  const loginEmail = async (email, password) => {
    try {
      const response = await apiClient.post('/api/auth/login-email', { email, password })
      if (response.data.status === 'success') {
        setUser(response.data.user)
        setAuthModalOpen(false)
        if (authModalCallback) {
          authModalCallback(response.data.user)
          setAuthModalCallback(null)
        }
        return response.data.user
      }
      throw new Error('Authentication failed.')
    } catch (err) {
      throw new Error(err.message || 'Invalid email or password.')
    }
  }

  // ── Register email and password (sends OTP) ────────────────────────────
  const registerEmail = async (email, name, lastName, password, confirmPassword) => {
    try {
      const response = await apiClient.post('/api/auth/register-email', {
        email,
        name,
        last_name: lastName || null,
        password,
        confirm_password: confirmPassword
      })
      return response.data
    } catch (err) {
      throw new Error(err.message || 'Registration failed.')
    }
  }

  // ── Verify OTP code ─────────────────────────────────────────────────────
  const verifyOTP = async (email, otpCode) => {
    try {
      const response = await apiClient.post('/api/auth/verify-otp', { email, otp_code: otpCode })
      if (response.data.status === 'success') {
        setUser(response.data.user)
        setAuthModalOpen(false)
        if (authModalCallback) {
          authModalCallback(response.data.user)
          setAuthModalCallback(null)
        }
        return response.data.user
      }
      throw new Error('OTP verification failed.')
    } catch (err) {
      throw new Error(err.message || 'Invalid or expired OTP code.')
    }
  }

  // ── Resend OTP code ─────────────────────────────────────────────────────
  const resendOTP = async (email) => {
    try {
      const response = await apiClient.post('/api/auth/resend-otp', { email })
      return response.data
    } catch (err) {
      throw new Error(err.message || 'Failed to resend OTP code.')
    }
  }

  // ── Update Profile (stored in database) ──────────────────────────────────
  const updateProfile = async (name, lastName, dob, photo) => {
    try {
      const response = await apiClient.put('/api/auth/profile', {
        name,
        last_name: lastName || null,
        dob: dob || null,
        photo: photo || null
      })
      if (response.data.status === 'success') {
        setUser(response.data.user)
        return response.data.user
      }
      throw new Error('Failed to update profile.')
    } catch (err) {
      throw new Error(err.message || 'Failed to update profile.')
    }
  }

  // ── Google OAuth Login ──────────────────────────────────────────────────
  const googleLogin = async (credential) => {
    try {
      const response = await apiClient.post('/api/auth/google', { credential })
      if (response.data.status === 'success') {
        setUser(response.data.user)
        setAuthModalOpen(false)
        if (authModalCallback) {
          authModalCallback(response.data.user)
          setAuthModalCallback(null)
        }
        return response.data.user
      }
      throw new Error('Google authentication failed.')
    } catch (err) {
      throw new Error(err.message || 'Google Sign-In failed.')
    }
  }

  // ── Logout ──────────────────────────────────────────────────────────────
  const logout = async () => {
    try {
      await apiClient.post('/api/auth/logout')
      setUser(null)
      // Hard refresh page / reset project context to prevent residual state leak
      window.location.href = '/'
    } catch (err) {
      console.error('Failed to log out:', err)
    }
  }

  // ── Request Deletion ────────────────────────────────────────────────────
  const requestDeletion = async (reason) => {
    try {
      const response = await apiClient.post('/settings/delete-account/request', { reason })
      return response.data
    } catch (err) {
      throw new Error(err.message || 'Failed to dispatch account deletion link.')
    }
  }

  // ── Modal Actions ───────────────────────────────────────────────────────
  const openLoginModal = useCallback((callback = null) => {
    setAuthModalOpen(true)
    setAuthModalCallback(() => callback)
  }, [])

  const closeLoginModal = useCallback(() => {
    setAuthModalOpen(false)
    setAuthModalCallback(null)
  }, [])

  const value = {
    user,
    loading,
    authModalOpen,
    openLoginModal,
    closeLoginModal,
    checkEmail,
    loginEmail,
    registerEmail,
    verifyOTP,
    resendOTP,
    updateProfile,
    googleLogin,
    logout,
    requestDeletion
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
