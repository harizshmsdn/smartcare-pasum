import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav.jsx'
import { useApp } from '../AppContext.jsx'
import { supabase } from '../supabaseClient.js'

export default function StudentInfo() {
  const navigate = useNavigate()
  const { user, setUser, updateProfile } = useApp()
  const [error, setError] = useState('')
  const [successNotice, setSuccessNotice] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!user?.name || !user?.matricsNumber || !user?.class || !user?.phone) {
      setError('Please fill in all fields.')
      setSuccessNotice('')
      return
    }

    setError('')
    setSuccessNotice('')
    setIsSubmitting(true)

    try {
      // Get logged-in user session
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.user) {
        throw new Error('User session not found. Please log in again.')
      }

      // Upsert student info directly to Supabase profiles table
      const { error: dbError } = await supabase
        .from('profiles')
        .upsert({
          id: session.user.id,
          name: user.name,
          matrics_number: user.matricsNumber,
          class: user.class,
          phone: user.phone,
          updated_at: new Date().toISOString()
        })

      if (dbError) throw dbError

      // Sync local context state if updateProfile helper exists
      if (typeof updateProfile === 'function') {
        await updateProfile(user)
      } else {
        setUser({ ...user })
      }

      setSuccessNotice('Your personal details have been saved successfully!')
    } catch (err) {
      console.error(err)
      setError(err?.message || 'Failed to save to database. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="screen">
      <div className="topbar">
        <button className="back-btn" onClick={() => navigate('/account')}>
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
        <h1>Profile</h1>
        <div className="topbar-spacer"/>
      </div>

      {/* Success Notice Banner */}
      {successNotice && (
        <div style={{
          backgroundColor: '#d1fae5',
          color: '#065f46',
          padding: '12px 16px',
          borderRadius: '12px',
          marginBottom: '16px',
          fontSize: '14px',
          fontWeight: '500',
          border: '1px solid #a7f3d0'
        }}>
          {successNotice}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Full Name</label>
          <input 
            placeholder="Insert Full Name Here" 
            value={user?.name || ''} 
            onChange={(e) => {
              setUser({ ...user, name: e.target.value })
              if (successNotice) setSuccessNotice('')
            }} 
          />
        </div>
        <div className="field">
          <label>Matrics Number</label>
          <input 
            placeholder="Insert Matrics Number Here" 
            value={user?.matricsNumber || ''} 
            onChange={(e) => {
              setUser({ ...user, matricsNumber: e.target.value })
              if (successNotice) setSuccessNotice('')
            }} 
          />
        </div>
        <div className="field">
          <label>Class</label>
          <input 
            placeholder="Insert Class Here" 
            value={user?.class || ''} 
            onChange={(e) => {
              setUser({ ...user, class: e.target.value })
              if (successNotice) setSuccessNotice('')
            }} 
          />
        </div>
        <div className="field">
          <label>Phone Number</label>
          <input 
            placeholder="Insert Phone Number Here" 
            value={user?.phone || ''} 
            onChange={(e) => {
              setUser({ ...user, phone: e.target.value })
              if (successNotice) setSuccessNotice('')
            }} 
          />
        </div>

        {error && <p style={{ color: '#d93838', fontSize: 12, margin: '8px 0 0 0' }}>{error}</p>}

        {/* Right-aligned Submit Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', paddingBottom: '90px' }}>
          <button 
            type="submit" 
            disabled={isSubmitting}
            style={{
              backgroundColor: isSubmitting ? '#a3d1c3' : '#cde6de',
              color: '#000000c1',
              border: 'none',
              padding: '8px 24px',
              borderRadius: '16px',
              fontSize: '16px',
              fontWeight: '400',
              cursor: isSubmitting ? 'not-allowed' : 'pointer'
            }}
          >
            {isSubmitting ? 'Saving...' : 'Submit'}
          </button>
        </div>
      </form>

      <BottomNav />
    </div>
  )
}