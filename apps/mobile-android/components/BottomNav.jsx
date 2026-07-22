import { NavLink } from 'react-router-dom'

export default function BottomNav() {
  return (
    <div style={navWrapperStyle}>
      <nav style={navBarContainerStyle}>
        
        <NavLink 
          to="/home" 
          style={({ isActive }) => ({
            ...navLinkStyle,
            color: isActive ? '#4d5bf7' : '#8a8f99',
            fontWeight: isActive ? 700 : 500,
          })}
        >
          {({ isActive }) => (
            <>
              <svg width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill={isActive ? '#4d5bf7' : 'none'} 
              stroke={isActive ? '#4d5bf7' : '#8a8f99'} 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
              <span style={{ fontSize: 11, letterSpacing: 0.5 }}>HOME</span>
            </>
          )}
        </NavLink>

        <div style={centerButtonWrapperStyle}>
          <NavLink 
            to="/scanattendance" 
            style={qrButtonStyle} 
            title="Scan QR"
          >
            <svg width="26" 
            height="26" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="#ffffff" 
            strokeWidth="2.2"
             strokeLinecap="round" 
             strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1.5"></rect>
              <rect x="14" y="3" width="7" height="7" rx="1.5"></rect>
              <rect x="3" y="14" width="7" height="7" rx="1.5"></rect>
              <path d="M14 14h3v3h-3z"></path>
              <path d="M17 17h4v4h-4z"></path>
              <path d="M14 20h3"></path>
              <path d="M20 14v3"></path>
            </svg>
          </NavLink>
        </div>

        <NavLink 
          to="/account" 
          style={({ isActive }) => ({
            ...navLinkStyle,
            color: isActive ? '#4d5bf7' : '#8a8f99',
            fontWeight: isActive ? 700 : 500,
          })}
        >
          {({ isActive }) => (
            <>
              <span style={{ fontSize: 11, letterSpacing: 0.5 }}>ACCOUNT</span>
              <svg width="20"
               height="20" 
               viewBox="0 0 24 24" 
               fill="none" stroke={isActive ? '#4d5bf7' : '#8a8f99'}
               strokeWidth="2" 
               strokeLinecap="round" 
               strokeLinejoin="round">
                <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z"></path>
                <path d="M12 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"></path>
                <path d="M8 16a4 4 0 0 1 8 0"></path>
              </svg>
            </>
          )}
        </NavLink>

      </nav>
    </div>
  )
}


// Fixed wrapper
const navWrapperStyle = {
  position: 'fixed',
  bottom: 20,
  left: 0,
  right: 0,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000,
  padding: '0 20px',
  pointerEvents: 'none'
}

const navBarContainerStyle = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  maxWidth: 360,
  height: 60,
  backgroundColor: '#ffffff',
  borderRadius: 35,
  padding: '0 28px',
  boxShadow: '0 8px 24px rgba(77, 91, 247, 0.12)',
  pointerEvents: 'auto',
  boxSizing: 'border-box'
}

const navLinkStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  textDecoration: 'none',
  transition: 'color 0.2s ease',
  pointerEvents: 'auto'
}

const centerButtonWrapperStyle = {
  position: 'absolute',
  top: -22,
  left: '50%',
  transform: 'translateX(-50%)',
  width: 68,
  height: 68,
  backgroundColor: '#ffffff',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 -4px 10px rgba(0, 0, 0, 0.02)',
  pointerEvents: 'auto',
  zIndex: 1001
}

const qrButtonStyle = {
  width: 54,
  height: 54,
  backgroundColor: '#4d5bf7',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 6px 16px rgba(77, 91, 247, 0.4)',
  textDecoration: 'none',
  cursor: 'pointer',
  pointerEvents: 'auto',
  zIndex: 1002
}