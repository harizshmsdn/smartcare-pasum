import { NavLink } from 'react-router-dom'

export default function BottomNav() {
  return (
    <div style={navWrapperStyle}>
      <nav style={navBarContainerStyle}>
        
        {/* HOME LINK */}
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
              <svg 
                className="nav-icon"
                viewBox="0 0 24 24" 
                fill={isActive ? '#4d5bf7' : 'none'} 
                stroke={isActive ? '#4d5bf7' : '#8a8f99'} 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span className="nav-label">HOME</span>
            </>
          )}
        </NavLink>

        {/* CENTER QR BUTTON */}
        <div style={centerButtonWrapperStyle}>
          <NavLink 
            to="/scanattendance" 
            style={qrButtonStyle} 
            title="Scan QR"
          >
            <svg 
              className="qr-icon"
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="#ffffff" 
              strokeWidth="2.2"
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
              <path d="M14 14h3v3h-3z" />
              <path d="M17 17h4v4h-4z" />
              <path d="M14 20h3" />
              <path d="M20 14v3" />
            </svg>
          </NavLink>
        </div>

        {/* ACCOUNT LINK */}
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
              <span className="nav-label">ACCOUNT</span>
              <svg 
                className="nav-icon"
                viewBox="0 0 24 24" 
                fill="none" 
                stroke={isActive ? '#4d5bf7' : '#8a8f99'}
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z" />
                <path d="M12 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
                <path d="M8 16a4 4 0 0 1 8 0" />
              </svg>
            </>
          )}
        </NavLink>

        {/* Inline Responsive Styles */}
        <style>{`
          .nav-icon {
            width: clamp(18px, 4.5vw, 22px);
            height: clamp(18px, 4.5vw, 22px);
            flex-shrink: 0;
          }
          .qr-icon {
            width: clamp(22px, 5.5vw, 28px);
            height: clamp(22px, 5.5vw, 28px);
          }
          .nav-label {
            font-size: clamp(10px, 2.6vw, 12px);
            letter-spacing: 0.5px;
            white-space: nowrap;
          }
          /* Hide labels on extremely tiny viewports (<320px) to prevent overlap */
          @media (max-width: 320px) {
            .nav-label {
              display: none;
            }
          }
        `}</style>
      </nav>
    </div>
  )
}

// Fixed Wrapper with iOS Safe Area dynamic spacing
const navWrapperStyle = {
  position: 'fixed',
  bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
  left: 0,
  right: 0,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000,
  padding: '0 16px',
  pointerEvents: 'none'
}

// Fluid Floating Navigation Bar Container
const navBarContainerStyle = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  minWidth: '260px',
  maxWidth: '440px', // Scales nicely on tablets without stretching too far apart
  height: 'clamp(54px, 12vw, 64px)', // Dynamically scales height with viewport
  backgroundColor: '#ffffff',
  borderRadius: '100px',
  padding: '0 clamp(16px, 5vw, 32px)',
  boxShadow: '0 8px 24px rgba(77, 91, 247, 0.12)',
  pointerEvents: 'auto',
  boxSizing: 'border-box'
}

const navLinkStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 'clamp(4px, 1.5vw, 8px)',
  textDecoration: 'none',
  transition: 'color 0.2s ease, transform 0.15s ease',
  pointerEvents: 'auto'
}

// Responsive Floating Center Button Wrapper
const centerButtonWrapperStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -60%)', // Center relative to container top
  width: 'clamp(58px, 14vw, 70px)',
  height: 'clamp(58px, 14vw, 70px)',
  backgroundColor: '#ffffff',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.03)',
  pointerEvents: 'auto',
  zIndex: 1001
}

// Responsive Action QR Button
const qrButtonStyle = {
  width: 'clamp(46px, 11vw, 56px)',
  height: 'clamp(46px, 11vw, 56px)',
  backgroundColor: '#4d5bf7',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 6px 16px rgba(77, 91, 247, 0.35)',
  textDecoration: 'none',
  cursor: 'pointer',
  pointerEvents: 'auto',
  zIndex: 1002
}