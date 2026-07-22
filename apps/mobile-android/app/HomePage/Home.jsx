import { useNavigate } from 'react-router-dom'
import { useApp } from '../AppContext.jsx'
import BottomNav from '../components/BottomNav.jsx'

export default function Home() {
  const navigate = useNavigate()
  const { user, schedule } = useApp()

  const userName = user?.name || 'Name'

  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' })
  const todaySchedule = (schedule || []).filter(
    (item) => typeof item.frequency === 'string' && item.frequency.includes(todayName)
  )

  const shortcuts = [
    { 
      name: 'Attendance', 
      path: '/attendance', 
      color: '#dbe2f9', 
      iconColor: '#374151',
      icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>) 
    },
    { 
      name: 'Schedule', 
      path: '/schedule', 
      color: '#dbe2f9', 
      iconColor: '#374151',
      icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>) 
    },
    { 
      name: 'Assessment', 
      path: '/continuousassessment', 
      color: '#dbe2f9', 
      iconColor: '#374151',
      icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>) 
    },
    { 
      name: 'Merits', 
      path: '/merits', 
      color: '#dbe2f9', 
      iconColor: '#374151',
      icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2z" /></svg>) 
    }
  ]

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#dbe2f9', fontFamily: 'sans-serif' }}>
      
      <div 
        style={{
          background: 'linear-gradient(180deg, #fbf7f0 0%, #f3eff8 100%)',
          padding: '16px 20px 18px 20px',
          borderRadius: 0
        }}
      >

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div 
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: '#0000009e',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.08)'
              }}
            >
              <img 
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Garry" 
                alt="Avatar" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            <div>
              <span style={{ fontSize: '11px', color: '#71717a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                Welcome Back
              </span>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#18181b' }}>
                {userName}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/notification')}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative',
              boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3f3f46" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            <span 
              style={{
                position: 'absolute',
                top: '8px',
                right: '9px',
                width: '6px',
                height: '6px',
                backgroundColor: '#ef4444',
                borderRadius: '50%'
              }}
            />
          </button>
        </div>

        <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: '700', color: '#27272a' }}>
          Shortcuts
        </h3>

        {/* Updated grid to repeat(4, 1fr) for 1 row of 4 items */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', justifyItems: 'center' }}>
          {shortcuts.map((item) => (
            <div
              key={item.name}
              onClick={() => navigate(item.path)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                textAlign: 'center',
                width: '100%'
              }}
            >
              <div
                style={{
                  width: '58px',
                  height: '58px',
                  borderRadius: '50%',
                  background: `linear-gradient(145deg, ${item.color}, ${item.color}cc)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: item.iconColor,
                  marginBottom: '6px',
                  boxShadow: `0 4px 10px ${item.color}66, inset 0 1px 1px rgba(255,255,255,0.5)`,
                  transition: 'transform 0.15s ease'
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.92)')}
                onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                {item.icon}
              </div>
              <span style={{ fontSize: '10.5px', color: '#4b5563', fontWeight: '600', lineHeight: '1.1', maxWidth: '75px' }}>
                {item.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '20px 20px 100px 20px' }}>
        <h3 style={{ margin: '0 0 14px 0', fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>
          Classrooms
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {todaySchedule.length > 0 ? (
            todaySchedule.map((item, idx) => (
              <div
                key={item.id || idx}
                style={{
                  backgroundColor: '#f8fafc',
                  borderRadius: '14px',
                  padding: '14px 18px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                  border: '1px solid #e2e8f0'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
                    {item.subject}
                  </h4>
                  {item.type && <span className="pill mint">{item.type}</span>}
                </div>
                <p style={{ margin: '0 0 2px 0', fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>
                  {item.class}
                </p>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
                  {item.time}
                </p>
              </div>
            ))
          ) : (
            <p style={{ color: '#64748b', fontSize: '13px', textAlign: 'center' }}>No classrooms scheduled today.</p>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}