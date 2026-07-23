import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav.jsx'
import { useApp } from '../AppContext.jsx'

export default function AttendanceRecord() {
  const navigate = useNavigate()
  const { attendanceData } = useApp()

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
          strokeWidth="2.5"      /* Makes it slightly bold */
          strokeLinecap="round"  /* Softens the line ends */
          strokeLinejoin="round" /* Makes the arrowhead corner less pointy */
        >
          <path d="M19 12H5" />
          <path d="m12 19-7-7 7-7" />
      </svg>
    </button>
    <h1>Attendance Record</h1>
    </div>

      <h3>Subjects</h3>
      {attendanceData.map((subj) => (
        <div className="card" key={subj.subject}>
          <h3>{subj.subject}</h3>
          <span className="pill mint">Present: {subj.percent}%</span>
          <p style={{ fontWeight: 600, color: 'var(--ink)' }}>Total Sessions: {subj.total}</p>
          <p style={{ fontWeight: 600, color: 'var(--ink)' }}>Sessions Attended: {subj.attended}</p>
          <p style={{ fontWeight: 600, color: 'var(--ink)' }}>Sessions Absent: {subj.absent}</p>
        </div>
      ))}

      <BottomNav />
    </div>
  )
}