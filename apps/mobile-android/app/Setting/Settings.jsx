import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav.jsx'
import { supabase } from '../../supabaseClient.js'

export default function Settings() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState(true)

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="screen">
    <div className="topbar">
      <button className="back-btn" onClick={() => navigate('/account')}>
        {/* Replaced '←' with a rounded SVG arrow */}
        <svg 
          width="20" 
          height="20" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5"      /* Makes it slightly bold */
          strokeLinecap="round"  /* Softens the line ends */
          strokeLinejoin="round" /* Makes the arrowhead corner less pointy */
        >
          <path d="M19 12H5" />
          <path d="m12 19-7-7 7-7" />
      </svg>
    </button>
    <h1>Settings</h1>
    </div>

      <h3>Preferences</h3>

      <div className="link-row" onClick={() => navigate('/settings/change-password')}>
        Change Password <span>→</span>
      </div>

      <div className="toggle-row">
        <div>
          <strong>Notifications</strong>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-soft)' }}>Enable/Disable Schedule</p>
        </div>
        <button
          className={'toggle' + (notifications ? ' on' : '')}
          onClick={() => setNotifications(!notifications)}
          aria-label="Toggle notifications"
        >
          <span className="knob" />
        </button>
      </div>

      <div style={{ marginTop: 24 }}>
        <h3>About</h3>
        <p style={{ color: '#3d3dc7', fontSize: 13 }}>Version 1.0.0</p>
        <h3>Data Protection Policy</h3>
        <p style={{ color: '#3d3dc7', fontSize: 13 }}>Learn More About Data Collection And Policy</p>
      </div>

      <BottomNav />
    </div>
  )
}