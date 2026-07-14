import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav.jsx'
import { useApp } from '../AppContext.jsx'

const IconAddress = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 11.5 12 4l9 7.5" />
    <path d="M5.5 9.5V20h13V9.5" />
  </svg>
)

const IconEmergency = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="6" width="18" height="13" rx="2" />
    <path d="M3 10.5h18" />
    <path d="M7 15h4" />
  </svg>
)

const IconPersonal = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.5-7 8-7s8 3 8 7" />
  </svg>
)

// Updated TABS structure with icons to match the design in Screenshot 2026-07-07 145056.png
const TABS = [
  { id: 'Personal', label: 'Personal', icon: <IconPersonal /> },
  { id: 'Home', label: 'Address', icon: <IconAddress /> },
  { id: 'Emergency', label: 'Emergency', icon: <IconEmergency /> },
]


export default function Profile() {
  const navigate = useNavigate()
  const { user, setUser } = useApp()
  const [tab, setTab] = useState('Personal')
  const [error, setError] = useState('')

  // Separate local state for "Home" and "Emergency"
  const [address, setAddress] = useState({ line1: '', line2: '', line3: '', postal: '', city: '', state: '', country: '' })
  const [emergency, setEmergency] = useState({ name: '', relationship: '', phone: '' })

  function handleSubmit(e) {
    e.preventDefault()
    if (!user.identificationNumber || !user.name || !user.matricsNumber || !user.class || !user.phone) {
      setError('Please fill in all fields.')
      return
    }
    if (tab === 'Home' && (!address.line1 || !address.line2 || !address.postal || !address.city || !address.state || !address.country)) {
      setError('Please fill in all fields.')
      return
    }
    if (tab === 'Emergency' && (!emergency.name || !emergency.relationship || !emergency.phone)) {
      setError('Please fill in all fields.')
      return
    }

    setError('')
    // TODO: send the relevant tab's data to your backend, e.g. PUT /api/students/:id
    alert(`${tab} details saved (demo only).`)
  }

  return (
  <div className="screen">
    <div className="topbar">
      <button className="back-btn" onClick={() => navigate(-1)}>
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
    <h1>Profile</h1>
    </div>

      {/* New Segmented Tab Bar Design */}
      <div className="tabs-container">
        <div className="segmented-control">
          {TABS.map((t) => {
            const isActive = tab === t.id
            return (
              <button
                key={t.id}
                type="button"
                className={`tab-pill ${isActive ? 'active' : 'icon-only'}`}
                onClick={() => setTab(t.id)}
              >
                <span className="tab-icon">{t.icon}</span>
                {isActive && <span className="tab-label">{t.label}</span>}
              </button>
            )
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {tab === 'Personal' && (
          <>
            <div className="field">
              <label>Identification Number</label>
              <input placeholder="Insert Identification Number Here" value={user.identificationNumber} onChange={(e) => setUser({ ...user, identificationNumber: e.target.value })} />
            </div>
            <div className="field">
              <label>Full Name</label>
              <input placeholder="Insert Full Name Here" value={user.name} onChange={(e) => setUser({ ...user, name: e.target.value })} />
            </div>
            <div className="field">
              <label>Matrics Number</label>
              <input placeholder="Insert Matrics Number Here" value={user.matricsNumber} onChange={(e) => setUser({ ...user, matricsNumber: e.target.value })} />
            </div>
            <div className="field">
              <label>Class</label>
              <input placeholder="Insert Class Here" value={user.class} onChange={(e) => setUser({ ...user, class: e.target.value })} />
            </div>
            <div className="field">
              <label>Phone Number</label>
              <input placeholder="Insert Phone Number Here" value={user.phone} onChange={(e) => setUser({ ...user, phone: e.target.value })} />
            </div>
          </>
        )}

        {tab === 'Home' && (
          <>
            <div className="field">
              <label>Address 1</label>
              <input placeholder="Insert Address 1 Here" value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} />
            </div>
            <div className="field">
              <label>Address 2</label>
              <input placeholder="Insert Address 2 Here" value={address.line2} onChange={(e) => setAddress({ ...address, line2: e.target.value })} />
            </div>
            <div className="field">
              <label>Address 3 (Optional)</label>
              <input placeholder="Insert Address 3 Here" value={address.line3} onChange={(e) => setAddress({ ...address, line3: e.target.value })} />
            </div>
            <div className="field">
              <label>Postal Code</label>
              <input placeholder="Insert Postal Code Here" value={address.postal} onChange={(e) => setAddress({ ...address, postal: e.target.value })} />
            </div>
            <div className="field">
              <label>City</label>
              <input placeholder="Insert City Here" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
            </div>
            <div className="field">
              <label>State</label>
              <input placeholder="Insert State Here" value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} />
            </div>
            <div className="field">
              <label>Country</label>
              <input placeholder="Insert Country Here" value={address.country} onChange={(e) => setAddress({ ...address, country: e.target.value })} />
            </div>
          </>
        )}

        {tab === 'Emergency' && (
          <>
            <div className="field">
              <label>Name</label>
              <input placeholder="Insert Name Here" value={emergency.name} onChange={(e) => setEmergency({ ...emergency, name: e.target.value })} />
            </div>
            <div className="field">
              <label>Relationship</label>
              <input placeholder="Insert Relationship Here" value={emergency.relationship} onChange={(e) => setEmergency({ ...emergency, relationship: e.target.value })} />
            </div>
            <div className="field">
              <label>Phone Number</label>
              <input placeholder="Insert Phone Number Here" value={emergency.phone} onChange={(e) => setEmergency({ ...emergency, phone: e.target.value })} />
            </div>
          </>
        )}

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