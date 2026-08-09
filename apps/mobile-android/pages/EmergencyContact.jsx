import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav.jsx'
import { useApp } from '../AppContext.jsx'

export default function EmergencyContact() {
  const navigate = useNavigate()
  const { user, updateProfile } = useApp()
  const [error, setError] = useState('')
  const [successNotice, setSuccessNotice] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [emergency, setEmergency] = useState({
    name: user?.emergencyName || '',
    relationship: user?.emergencyRelationship || '',
    phone: user?.emergencyPhone || ''
  })

  async function handleSubmit(e) {
    e.preventDefault()
    if (!emergency.name || !emergency.relationship || !emergency.phone) {
      setError('Please fill in all fields.')
      setSuccessNotice('')
      return
    }

    setError('')
    setSuccessNotice('')
    setIsSubmitting(true)

    try {
      // FIXED: this used to also fire its own
      // supabase.from('profiles').upsert({ emergency_name, emergency_relationship,
      // emergency_phone, ... }) directly — those column names don't match the
      // actual schema (the real columns are emergency_contact_name /
      // _relationship / _phone, per AppContext.jsx's updateProfile). That
      // upsert threw a "column does not exist" error on every single submit,
      // and the correct updateProfile() call below was never reached.
      // updateProfile() is the one validated write path for this table now —
      // going through it means these fields get the same length checks as
      // every other profile edit, instead of being written raw and twice.
      await updateProfile({
        ...user,
        emergencyName: emergency.name,
        emergencyRelationship: emergency.relationship,
        emergencyPhone: emergency.phone,
      })

      setSuccessNotice('Emergency contact details saved successfully!')
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
        <h1>Emergency Contact</h1>
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
          <label>Name</label>
          <input 
            placeholder="Insert Name Here" 
            value={emergency.name} 
            onChange={(e) => {
              setEmergency({ ...emergency, name: e.target.value })
              if (successNotice) setSuccessNotice('')
            }} 
          />
        </div>
        <div className="field">
          <label>Relationship</label>
          <input 
            placeholder="Insert Relationship Here" 
            value={emergency.relationship} 
            onChange={(e) => {
              setEmergency({ ...emergency, relationship: e.target.value })
              if (successNotice) setSuccessNotice('')
            }} 
          />
        </div>
        <div className="field">
          <label>Phone Number</label>
          <input 
            placeholder="Insert Phone Number Here" 
            value={emergency.phone} 
            onChange={(e) => {
              setEmergency({ ...emergency, phone: e.target.value })
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