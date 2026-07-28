import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useApp } from '../AppContext.jsx'

const socialBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  width: '100%',
  padding: 'clamp(12px, 2vh, 16px) 20px',
  backgroundColor: '#ffffff',
  border: 'none',
  borderRadius: 14,
  fontSize: 'clamp(14px, 1.8vh, 16px)',
  fontWeight: 600,
  color: '#000000',
  cursor: 'pointer',
  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  boxSizing: 'border-box'
}

const inputStyle = {
  width: '100%',
  padding: 'clamp(12px, 2vh, 16px) 18px',
  borderRadius: 14,
  border: '1px solid rgba(255,255,255,0.7)',
  backgroundColor: 'rgba(255, 255, 255, 0.45)',
  fontSize: 'clamp(13px, 1.8vh, 15px)',
  color: '#2d3748',
  outline: 'none',
  boxSizing: 'border-box'
}

export default function Signup() {
  const navigate = useNavigate()
  const { user } = useApp()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [infoMessage, setInfoMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (user) navigate('/home')
  }, [user, navigate])

  async function handleSignup(e) {
    e.preventDefault()
    if (!fullName || !email || !password || !confirmPassword) {
      setError('Please fill in all fields.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setError('')
    setInfoMessage('')
    setSubmitting(true)

    // NOTE: full_name is passed in options.data so the on_auth_user_created
    // database trigger (see migration_student_app.sql) can use it to create
    // the matching public.profiles row automatically.
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })

    setSubmitting(false)

    if (signUpError) {
      setError(signUpError.message)
      return
    }

    if (data?.session) {
      // Email confirmation is off — user is signed in immediately.
      navigate('/home')
    } else {
      // Email confirmation is required — no session yet.
      setInfoMessage('Account created! Check your email to confirm your account, then log in.')
    }
  }

  async function handleSocialSignup(provider) {
    const providerMap = { Google: 'google', Apple: 'apple', Microsoft: 'azure' }
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: providerMap[provider],
    })
    if (oauthError) setError(oauthError.message)
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh',
        width: '100vw',
        backgroundColor: '#E8E9FF',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        padding: 'clamp(16px, 3vh, 32px) clamp(20px, 5vw, 48px)',
        boxSizing: 'border-box'
      }}
    >
      {/* 1. TOP LOGO AREA */}
      <div
        style={{
          width: '100%',
          maxWidth: 600,
          margin: '0 auto',
          background: 'white',
          borderRadius: 20,
          padding: 'clamp(14px, 2.5vh, 24px) 0',
          textAlign: 'center',
          fontWeight: 800,
          fontSize: 'clamp(24px, 4vh, 36px)',
          letterSpacing: 2,
          color: '#000',
          boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          boxSizing: 'border-box',
          flexShrink: 0
        }}
      >
        LOGO
      </div>

      {/* 2. MAIN FULL-BLEED CONTENT AREA */}
      <div
        style={{
          width: '100%',
          maxWidth: 600,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          flexGrow: 1,
          paddingTop: 'clamp(16px, 3vh, 32px)',
          paddingBottom: 'clamp(16px, 3vh, 32px)',
          boxSizing: 'border-box'
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 'clamp(28px, 4.5vh, 42px)',
            fontWeight: 700,
            color: '#1E1B4B',
            letterSpacing: 0.5
          }}
        >
          Create Account
        </h1>
        <p
          style={{
            marginTop: 6,
            marginBottom: 'clamp(16px, 3vh, 32px)',
            fontSize: 'clamp(13px, 1.8vh, 16px)',
            color: '#1E1B4B',
            lineHeight: 1.4
          }}
        >
          Sign up to get started with your account.
        </p>

        {/* SOCIAL SIGNUP BUTTONS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(10px, 1.8vh, 16px)' }}>
          <button
            type="button"
            onClick={() => handleSocialSignup('Google')}
            style={socialBtnStyle}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" style={{ marginRight: 14, flexShrink: 0 }}>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            Continue with Google
          </button>

          <button
            type="button"
            onClick={() => handleSocialSignup('Apple')}
            style={socialBtnStyle}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#1E1B4B" style={{ marginRight: 14, flexShrink: 0 }}>
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.18c.67-.83 1.13-1.98.99-3.18-1.03.05-2.31.7-3.03 1.54-.64.75-1.2 1.93-1.04 3.09 1.16.09 2.37-.62 3.08-1.45z" />
            </svg>
            Continue with Apple
          </button>

          <button
            type="button"
            onClick={() => handleSocialSignup('Microsoft')}
            style={socialBtnStyle}
          >
            <svg width="22" height="22" viewBox="0 0 23 23" style={{ marginRight: 14, flexShrink: 0 }}>
              <path fill="#f35325" d="M1 1h10v10H1z" />
              <path fill="#81bc06" d="M12 1h10v10H12z" />
              <path fill="#05a6f0" d="M1 12h10v10H1z" />
              <path fill="#ffba08" d="M12 12h10v10H12z" />
            </svg>
            Continue with Microsoft
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: 'clamp(12px, 1.6vh, 14px)', color: '#1E1B4B', margin: 'clamp(14px, 2.5vh, 24px) 0' }}>
          or sign up with:
        </p>

        {/* INPUT FORM */}
        <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(10px, 1.8vh, 16px)' }}>
          <div>
            <input
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div>
            <input
              type="email"
              placeholder="Enter your email here..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ ...inputStyle, paddingRight: 44 }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                color: '#1E1B4B'
              }}
            >
              {showPassword ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              )}
            </button>
          </div>

          <div>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Re-type Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={inputStyle}
            />
          </div>

          {error && <p style={{ color: '#ffd1d1', fontSize: 13, margin: 0 }}>{error}</p>}
          {infoMessage && <p style={{ color: '#1E1B4B', fontSize: 13, margin: 0, fontWeight: 600 }}>{infoMessage}</p>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                backgroundColor: '#4F46E5',
                border: 'none',
                color: '#ffffff',
                borderRadius: 12,
                padding: 'clamp(10px, 1.8vh, 14px) 32px',
                fontSize: 'clamp(13px, 1.8vh, 15px)',
                fontWeight: 600,
                cursor: submitting ? 'default' : 'pointer',
                opacity: submitting ? 0.7 : 1
              }}
            >
              {submitting ? 'Creating…' : 'Sign Up'}
            </button>
          </div>
        </form>
      </div>

      {/* 3. BOTTOM FOOTER */}
      <div style={{ width: '100%', maxWidth: 600, margin: '0 auto', textAlign: 'center', flexShrink: 0 }}>
        <p style={{ margin: 0, fontSize: 'clamp(13px, 1.8vh, 15px)', color: '#4F46E5' }}>
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => navigate('/login')}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              color: '#4F46E5',
              textDecoration: 'underline',
              fontWeight: 700,
              fontSize: 'inherit',
              cursor: 'pointer'
            }}
          >
            Login
          </button>
        </p>
      </div>
    </div>
  )
}