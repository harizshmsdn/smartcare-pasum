import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  function handleLogin(e) {
    e.preventDefault()
    if (!email || !password) {
      setError('Please enter your email and password.')
      return
    }
    // TODO: replace with a real call to your auth API
    navigate('/home')
  }

  function handleSocialLogin(provider) {
    // TODO: hook this up to Google / Apple / Microsoft OAuth
    console.log('Login with', provider)
    navigate('/home')
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justify: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f8f8fb',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        padding: '20px 16px',
        boxSizing: 'border-box'
      }}
    >

      <div
        style={{
          width: '100%',
          maxWidth: 360,
          background: 'white',
          borderRadius: 16,
          padding: '36px 0',
          textAlign: 'center',
          marginBottom: 20,
          fontWeight: 800,
          fontSize: 32,
          letterSpacing: 2,
          color: '#000',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
        }}
      >
        LOGO
      </div>

      <div
        style={{
          width: '100%',
          maxWidth: 360,
          backgroundColor: '#8488d7',
          borderRadius: 24,
          padding: '28px 20px',
          boxSizing: 'border-box',
          boxShadow: '0 8px 24px rgba(91,95,168,0.25)'
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 28,
            fontWeight: 700,
            color: '#ffffff',
            letterSpacing: 0.5
          }}
        >
          Login
        </h1>
        <p
          style={{
            marginTop: 4,
            marginBottom: 20,
            fontSize: 13,
            color: '#e8e9f7',
            opacity: 1,
            lineHeight: 1.3
          }}
        >
          Sign into your account by entering your information below.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            type="button"
            onClick={() => handleSocialLogin('Google')}
            style={socialBtnStyle}
          >
            {/* Google Icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" style={{ marginRight: 12, flexShrink: 0 }}>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            Continue with Google
          </button>

          <button
            type="button"
            onClick={() => handleSocialLogin('Apple')}
            style={socialBtnStyle}
          >
            // Apple Icon
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#000" style={{ marginRight: 12, flexShrink: 0 }}>
  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.18c.67-.83 1.13-1.98.99-3.18-1.03.05-2.31.7-3.03 1.54-.64.75-1.2 1.93-1.04 3.09 1.16.09 2.37-.62 3.08-1.45z" />
            </svg>
            Continue with Apple
          </button>

          <button
            type="button"
            onClick={() => handleSocialLogin('Microsoft')}
            style={socialBtnStyle}
          >
            // Microsoft Icon
            <svg width="18" height="18" viewBox="0 0 23 23" style={{ marginRight: 12, flexShrink: 0 }}>
              <path fill="#f35325" d="M1 1h10v10H1z" />
              <path fill="#81bc06" d="M12 1h10v10H12z" />
              <path fill="#05a6f0" d="M1 12h10v10H1z" />
              <path fill="#ffba08" d="M12 12h10v10H12z" />
            </svg>
            Continue with Microsoft
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#c7c9ec', margin: '16px 0 12px 0' }}>
          or continue with:
        </p>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
              style={{ ...inputStyle, paddingRight: 36 }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                color: '#8e96ab'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            </button>
          </div>

          {error && <p style={{ color: '#d93838', fontSize: 12, margin: 0 }}>{error}</p>}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <button
              type="button"
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.5)',
                color: '#ffffff',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Forgot Password?
            </button>

            <button
              type="submit"
              style={{
                backgroundColor: '#c7e8e1',
                border: 'none',
                color: '#223832',
                borderRadius: 8,
                padding: '10px 24px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Login
            </button>
          </div>
        </form>
      </div>

      <p style={{ textAlign: 'center', fontSize: 13, marginTop: 20, color: '#333333' }}>
        Don’t have an account?{' '}
        <a href="#" style={{ color: '#1a30f3', textDecoration: 'none', fontWeight: 700 }}>
          Create Account
        </a>
      </p>
    </div>
  )


const socialBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start', 
  width: '100%',
  padding: '12px 18px',         
  backgroundColor: '#ffffff',
  border: 'none',
  borderRadius: 10,
  fontSize: 14,
  fontWeight: 600,
  color: '#000000',
  cursor: 'pointer',
  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
  boxSizing: 'border-box'
}

const inputStyle = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.7)',
  backgroundColor: 'rgba(255, 255, 255, 0.45)',
  fontSize: 13,
  color: '#4a5568',
  outline: 'none',
  boxSizing: 'border-box'
}}