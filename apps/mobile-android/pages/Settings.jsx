import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav.jsx'
import { supabase } from '../supabaseClient.js'

export default function Settings() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  // Load the saved preference on mount so the toggle reflects what's
  // actually stored — this is also what the backend checks before pushing
  // a notification to this user.
  // SCHEMA MISMATCH — notifications_enabled does not exist on `profiles`.
  // The only table with that column name in your schema is `settings`,
  // and that's the lecturer's own preferences table (settings.lecturer_id
  // NOT NULL UNIQUE) — a different table, different owner, not this
  // student toggle. This read/write pair will fail until you add
  // notifications_enabled to `profiles` (see suggested_migration.sql).
  useEffect(() => {
    async function loadPreference() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('notifications_enabled')
        .eq('id', session.user.id)
        .single()

      if (!fetchError && data && typeof data.notifications_enabled === 'boolean') {
        setNotifications(data.notifications_enabled)
      }
    }
    loadPreference()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  async function handleToggleNotifications() {
    const nextValue = !notifications
    setError('')

    // Turning ON: ask the browser/OS for permission first — if it's
    // blocked at the system level, there's no point flipping the toggle.
    if (nextValue && typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setError('Notifications are blocked for this app in your phone/browser settings. Please enable them there first.')
        return
      }
    }

    setIsSaving(true)
    setNotifications(nextValue)

    try {
      // Turning OFF: unsubscribe this device from push so no push events
      // are delivered even if OS-level permission is still "granted".
      // This is best-effort and safely skipped if push isn't set up.
      if (!nextValue && 'serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration()
        const subscription = await registration?.pushManager?.getSubscription()
        if (subscription) {
          await subscription.unsubscribe()
        }
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('User session not found. Please log in again.')
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: session.user.id,
          notifications_enabled: nextValue,
          updated_at: new Date().toISOString()
        })

      if (updateError) throw updateError
    } catch (err) {
      console.error('Failed to update notification preference:', err)
      setError(err?.message || 'Could not save your preference. Please try again.')
      setNotifications(!nextValue) // revert the toggle on failure
    } finally {
      setIsSaving(false)
    }
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
    <div className="topbar-spacer"/>
    </div>

      <h3>Preferences</h3>

      <div className="link-row" onClick={() => navigate('/settings/change-password')}>
        Change Password <span>→</span>
      </div>

      <div className="toggle-row">
        <div>
          <strong>Notifications</strong>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-soft)' }}>Enable/Disable Notifications</p>
        </div>
        <button
          className={'toggle' + (notifications ? ' on' : '')}
          onClick={handleToggleNotifications}
          disabled={isSaving}
          aria-label="Toggle notifications"
        >
          <span className="knob" />
        </button>
      </div>
      {error && <p style={{ color: '#d93838', fontSize: 12, margin: '8px 0 0 0' }}>{error}</p>}

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