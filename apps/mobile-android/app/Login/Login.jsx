import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useApp } from '../AppContext.jsx'

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

export default function Login() {
  const navigate = useNavigate()
  const { user } = useApp()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) navigate('/home')
  }, [user, navigate])

  async function handleLogin(e) {
    e.preventDefault()
    if (!email || !password) {
      setError('Please enter your email and password.')
      return
    }
    setError('')
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setError(signInError.message)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh', // Dynamic viewport height prevents iOS bar issues
        width: '100vw',
        backgroundColor: '#E8E9FF', // Background color extended to full page
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
          flexGrow: 1, // Expands to take all remaining vertical space
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
          Login
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
          Sign into your account by entering your information below.
        </p>

        {/* INPUT FORM */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(10px, 1.8vh, 16px)' }}>
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

          {error && <p style={{ color: '#ffd1d1', fontSize: 13, margin: 0 }}>{error}</p>}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <button
            type="button"
            onClick={() => {/* handle forgot password */}}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              color: '#4F46E5',
              fontSize: 'clamp(13px, 1.6vh, 14px)',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none'
              }}
              >
                Forgot Password?
                </button>

            <button
              type="submit"
              style={{
                backgroundColor: '#4F46E5',
                border: 'none',
                color: '#ffffff',
                borderRadius: 12,
                padding: 'clamp(10px, 1.8vh, 14px) 32px',
                fontSize: 'clamp(13px, 1.8vh, 15px)',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Login
            </button>
          </div>
        </form>
      </div>

      {/* 3. BOTTOM FOOTER */}
      <div style={{ width: '100%', maxWidth: 600, margin: '0 auto', textAlign: 'center', flexShrink: 0 }}>
        <p style={{ margin: 0, fontSize: 'clamp(13px, 1.8vh, 15px)', color: '#4F46E5' }}>
          Don’t have an account?{' '}
          <button
            type="button"
            onClick={() => navigate('/createaccount')}
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
            Create Account
          </button>
        </p>
      </div>
    </div>
  )
}