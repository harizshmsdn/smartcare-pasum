import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav.jsx'

const initialNotifications = [
  {
    id: 1,
    title: 'New Schedule Added',
    message: 'Physics (BT2) class has been added to your schedule for Tuesday.',
    time: '10 mins ago',
    type: 'schedule',
    read: false,
  },
  {
    id: 2,
    title: 'Merits Updated',
    message: 'You received +15 points for Sukan Asasi Malaysia!',
    time: '2 hours ago',
    type: 'merits',
    read: false,
  },
  {
    id: 3,
    title: 'Assessment Reminder',
    message: 'Chemistry Midterm grade is updated (16/20).',
    time: 'Yesterday',
    type: 'assessment',
    read: true,
  },
  {
    id: 4,
    title: 'Attendance Warning',
    message: 'Programming attendance is at 60%. Please check your records.',
    time: '3 days ago',
    type: 'attendance',
    read: true,
  },
]

export default function Notification() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState(initialNotifications)

  // Mark single item as read
  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item))
    )
  }

  // Mark all as read
  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })))
  }

  // Delete single notification
  const deleteNotification = (id) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id))
  }

  // Clear all notifications
  const clearAll = () => {
    setNotifications([])
  }

  // Helper to choose badge icon based on notification type
  const getBadgeIcon = (type) => {
    switch (type) {
      case 'schedule':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        )
      case 'merits':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
          </svg>
        )
      case 'assessment':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        )
      default:
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        )
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'sans-serif' }}>
      {/* TOPBAR */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          position: 'sticky',
          top: 0,
          zIndex: 10
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            type="button" 
            onClick={() => navigate(-1)} 
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" />
              <path d="m12 19-7-7 7-7" />
            </svg>
          </button>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
            Notifications
          </h1>
          {unreadCount > 0 && (
            <span 
              style={{
                backgroundColor: '#ef4444',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '12px'
              }}
            >
              {unreadCount} New
            </span>
          )}
        </div>

        {notifications.length > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            style={{
              background: 'none',
              border: 'none',
              color: '#2563eb',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Read All
          </button>
        )}
      </div>

      {/* NOTIFICATIONS LIST */}
      <div style={{ padding: '16px 20px 100px 20px' }}>
        {notifications.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: '60px', color: '#94a3b8' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '12px' }}>
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>No notifications right now.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => markAsRead(item.id)}
                style={{
                  backgroundColor: item.read ? '#ffffff' : '#f0fdf4',
                  border: item.read ? '1px solid #e2e8f0' : '1px solid #bbf7d0',
                  borderRadius: '14px',
                  padding: '14px 16px',
                  position: 'relative',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                  transition: 'background-color 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  {/* TYPE ICON BADGE */}
                  <div 
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: item.read ? '#f1f5f9' : '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      border: '1px solid #e2e8f0'
                    }}
                  >
                    {getBadgeIcon(item.type)}
                  </div>

                  {/* NOTIFICATION DETAILS */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>
                        {item.title}
                      </h4>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>{item.time}</span>
                    </div>

                    <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: '#475569', lineHeight: '1.4' }}>
                      {item.message}
                    </p>
                  </div>

                  {/* DELETE BUTTON */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation() // Prevent triggering markAsRead
                      deleteNotification(item.id)
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#cbd5e1',
                      padding: '2px',
                      cursor: 'pointer'
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}

            {/* CLEAR ALL BUTTON */}
            <button
              type="button"
              onClick={clearAll}
              style={{
                marginTop: '16px',
                backgroundColor: 'transparent',
                border: 'none',
                color: '#64748b',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                textAlign: 'center',
                width: '100%'
              }}
            >
              Clear All Notifications
            </button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}