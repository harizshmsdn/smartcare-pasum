import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav.jsx'
import { useApp } from '../AppContext.jsx'

const readOnlyInputStyle = {
  backgroundColor: '#ffffff',
  color: '#52525b',
  cursor: 'not-allowed'
}

export default function StudentInfo() {
  const navigate = useNavigate()
  const { user } = useApp()

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

      {/* Info Banner - explains why fields are locked */}
      <div style={{
        backgroundColor: '#eff6ff',
        color: '#1d4ed8',
        padding: '12px 16px',
        borderRadius: '12px',
        marginBottom: '16px',
        fontSize: '13px',
        fontWeight: '500',
        border: '1px solid #bfdbfe'
      }}>
        Your profile details are managed by the admin. Contact them if anything needs to be updated.
      </div>

      <div className="field">
        <label>Full Name</label>
        <input
          value={user?.name || ''}
          readOnly
          disabled
          style={readOnlyInputStyle}
        />
      </div>
      <div className="field">
        <label>Matrics Number</label>
        <input
          value={user?.matricsNumber || ''}
          readOnly
          disabled
          style={readOnlyInputStyle}
        />
      </div>
      <div className="field">
        <label>Class</label>
        <input
          value={user?.class || ''}
          readOnly
          disabled
          style={readOnlyInputStyle}
        />
      </div>
      <div className="field">
        <label>Phone Number</label>
        <input
          value={user?.phone || ''}
          readOnly
          disabled
          style={readOnlyInputStyle}
        />
      </div>

      <div style={{ paddingBottom: '90px' }} />

      <BottomNav />
    </div>
  )
}