import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav.jsx'
import { useApp } from '../AppContext.jsx'

export default function Profile() {
  const navigate = useNavigate()
  const { user, setUser, updateProfile } = useApp()
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!user?.name || !user?.matricsNumber || !user?.class || !user?.phone) {
      setError('Please fill in all fields.')
      return
    }

    setError('')
    try {
      await updateProfile(user)
      alert('Personal details saved.')
    } catch (err) {
      console.error(err)
      setError(err?.message || 'Failed to save. Please try again.')
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
      </div>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Full Name</label>
          <input 
            placeholder="Insert Full Name Here" 
            value={user?.name || ''} 
            onChange={(e) => setUser({ ...user, name: e.target.value })} 
          />
        </div>
        <div className="field">
          <label>Matrics Number</label>
          <input 
            placeholder="Insert Matrics Number Here" 
            value={user?.matricsNumber || ''} 
            onChange={(e) => setUser({ ...user, matricsNumber: e.target.value })} 
          />
        </div>
        <div className="field">
          <label>Class</label>
          <input 
            placeholder="Insert Class Here" 
            value={user?.class || ''} 
            onChange={(e) => setUser({ ...user, class: e.target.value })} 
          />
        </div>
        <div className="field">
          <label>Phone Number</label>
          <input 
            placeholder="Insert Phone Number Here" 
            value={user?.phone || ''} 
            onChange={(e) => setUser({ ...user, phone: e.target.value })} 
          />
        </div>

        {error && <p style={{ color: '#d93838', fontSize: 12, margin: '8px 0 0 0' }}>{error}</p>}

        {/* Right-aligned Submit Button */}
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