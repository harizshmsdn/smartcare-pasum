import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav.jsx'
import { useApp } from '../AppContext.jsx'

export default function Merits() {
  const navigate = useNavigate()
  const { merits, totalMerits } = useApp()

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
    <h1>Merits</h1>
    </div>

      {merits.map((m) => (
        <div className="card" key={m.id}>
          <h3>{m.name}</h3>
          <p>Merits Earned: {m.points}</p>
        </div>
      ))}

      <div className="link-row" onClick={() => navigate('/merits/add')}>
       <span>Add More Merit </span>

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

      <span className="pill mint">Total Merits: {totalMerits}</span>

      <BottomNav />
    </div>
  )
}