import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav.jsx'
import { useApp } from '../AppContext.jsx'

export default function Schedule() {
  const navigate = useNavigate()
  const { schedule, deleteSchedule } = useApp()
  
  // State for tracking which item is being deleted (for double-confirmation)
  const [itemToDelete, setItemToDelete] = useState(null)

  const handleConfirmDelete = () => {
    if (itemToDelete) {
      deleteSchedule(itemToDelete.id)
      setItemToDelete(null) // Close modal
    }
  }

  return (
    <div className="screen">
      <div className="topbar">
        <button className="back-btn" onClick={() => navigate('/home')}>
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
        <h1>Schedule</h1>
      </div>

      <div style={{ padding: '0 16px', paddingBottom: '100px' }}>
        <h3>Preferences</h3>
        <div className="link-row" onClick={() => navigate('/schedule/add')}>
          <span>Add Schedule</span>
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
            <path d="M5 12H14" />
            <path d="m10 5 7 7-7 7" />
          </svg>
        </div>

        {schedule.length === 0 && (
          <p className="empty-state">No schedule entries yet. Tap "Add Schedule" to create one.</p>
        )}

        {schedule.map((s) => (
          <div 
            className="card" 
            key={s.id}
            style={{
              borderRadius: '16px',
              padding: '16px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
              marginBottom: '12px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', color: '#1e293b' }}>{s.subject}</h3>
                  {s.type && <span className="pill mint">{s.type}</span>}
                </div>
                <p style={{ margin: '0', fontSize: '13px', color: '#64748b' }}>{s.class}</p>
              </div>

              {/* DELETE BUTTON */}
              <button
                type="button"
                onClick={() => setItemToDelete(s)}
                style={{
                  backgroundColor: '#fef2f2',
                  color: '#ef4444',
                  border: '1px solid #fecaca',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Delete
              </button>
            </div>

            <div style={{ marginTop: '10px', fontSize: '13px', color: '#334155' }}>
              <p style={{ margin: '2px 0' }}>{s.time}</p>
              <p style={{ margin: '2px 0' }}>
                {Array.isArray(s.frequency) ? s.frequency.join(', ') : s.frequency}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* DOUBLE-CONFIRMATION MODAL */}
      {itemToDelete && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div 
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '320px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
            }}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#0f172a' }}>
              Delete Schedule?
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#64748b', lineHeight: '1.4' }}>
              Are you sure you want to remove <strong>{itemToDelete.subject}</strong> ({itemToDelete.class})? This action cannot be undone.
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}