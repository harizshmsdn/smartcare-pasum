import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav.jsx'
import { supabase } from '../../supabaseClient.js'
import { useApp } from '../AppContext.jsx'

export default function ChangePassword() {
  const navigate = useNavigate()
  const { user } = useApp()
  const [form, setForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' })
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.oldPassword || !form.newPassword || !form.confirmPassword) {
      setError('Please fill in all fields.')
      return
    }
    if (form.newPassword !== form.confirmPassword) {
      setError('New password and confirmation do not match.')
      return
    }

    setError('')

    // Re-check the current password before allowing the change
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user?.email,
      password: form.oldPassword,
    })
    if (verifyError) {
      setError('Current password is incorrect.')
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: form.newPassword })
    if (updateError) {
      setError(updateError.message)
      return
    }

    alert('Password updated.')
    navigate('/settings')
  }

  return (
    <div className="screen">
    <div className="topbar">
      <button className="back-btn" onClick={() => navigate('/settings')}>
        <svg 
          width="20" 
          height="20" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5"     
          strokeLinecap="round"  
          strokeLinejoin="round" 
        >
          <path d="M19 12H5" />
          <path d="m12 19-7-7 7-7" />
      </svg>
    </button>
    <h1>Change Password</h1>
    </div>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Current Password</label>
          <input type="password" 
          placeholder="Enter Current Password Here" 
          value={form.oldPassword} 
          onChange={(e) => setForm({ ...form, oldPassword: e.target.value })} />
        </div>

        <div className="field">
          <label>New Password</label>
          <input type="password" 
          placeholder="Enter New Password Here" 
          value={form.newPassword} 
          onChange={(e) => setForm({ ...form, newPassword: e.target.value })} />
        </div>

        <div className="field">
          <label>Re-Type New Password</label>
          <input type="password" 
          placeholder="Re-Type New Password Here" 
          value={form.confirmPassword} 
          onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} />
        </div>

        {error && <p style={{ color: '#b03a3a', fontSize: 13 }}>{error}</p>}
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', paddingBottom: '90px' }}>
          <button 
          type="submit" 
          style={{
            backgroundColor: '#cde6de',
            color: '#000000c1',
            border: 'none',
            padding: '8px 24px',
            borderRadius: '16px',
            fontSize: '16px',
            fontWeight: '400',
            cursor: 'pointer'
          }}
          >
            Submit
          </button>
        </div>
        </form>
      <BottomNav />
    </div>
  )
}