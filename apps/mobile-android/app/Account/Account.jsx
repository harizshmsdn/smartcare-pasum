import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav.jsx'
import { supabase } from '../../supabaseClient.js'

// Arrow Icon
const IconArrow = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
)

export default function Profile() {
  const navigate = useNavigate()

  const menuItems = [
    {
      id: 'student-info',
      title: 'Student Information',
      path: '/profile/studentinfo',
      showArrow: true
    },
    {
      id: 'emergency-contact',
      title: 'Emergency Contact',
      path: '/profile/emergencycontact',
      showArrow: true
    },
    {
      id: 'settings',
      title: 'Settings',
      path: '/settings',
      showArrow: true
    },
    {
      id: 'logout',
      title: 'Logout',
      titleColor: '#ef4444',
      showArrow: false,
      onClick: async () => {
        await supabase.auth.signOut()
        navigate('/login')
      }
    }
  ]

  return (
    /* Removed backgroundColor: '#f3eff8' here so it matches your app's default .screen style */
    <div className="screen" style={{ minHeight: '100vh', paddingBottom: '100px' }}>
      
      {/* Top Bar Header */}
      <div className="topbar" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px' }}>
        <button className="back-btn" onClick={() => navigate('/home')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="m12 19-7-7 7-7" />
          </svg>
        </button>
        <h1 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>Account</h1>
      </div>

      {/* Cards List Stack */}
      <div style={{ padding: '10px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {menuItems.map((item) => (
          <div
            key={item.id}
            onClick={() => (item.onClick ? item.onClick() : navigate(item.path))}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
              border: '1px solid #e2e8f0',
              cursor: 'pointer',
              transition: 'transform 0.1s ease, box-shadow 0.1s ease'
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: item.titleColor || '#0f172a' }}>
                {item.title}
              </h3>
            </div>

            {item.showArrow && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '12px' }}>
                <IconArrow />
              </div>
            )}
          </div>
        ))}
      </div>

      <BottomNav />
    </div>
  )
}