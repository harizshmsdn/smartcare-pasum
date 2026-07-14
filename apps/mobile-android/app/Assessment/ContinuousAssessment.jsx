import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav.jsx'
import { useApp } from '../AppContext.jsx'

export default function ContinuousAssessment() {
  const navigate = useNavigate()
  const { assessmentData } = useApp()

  return (
    <div className="screen">
    <div className="topbar">
      <button className="back-btn" onClick={() => navigate(-1)}>
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
    <h1>Continuous Assessment</h1>
    </div>

      <h3>Subjects</h3>
      {assessmentData.map((subj) => (
        <div className="card" key={subj.subject}>
          <h3>{subj.subject}</h3>
          <span className="pill mint">{subj.percent}%</span>
          {subj.items.map(([label, score]) => (
            <p key={label} style={{ fontWeight: 600, color: 'var(--ink)' }}>
              {label}: {score}
            </p>
          ))}
        </div>
      ))}

      <BottomNav />
    </div>
  )
}
