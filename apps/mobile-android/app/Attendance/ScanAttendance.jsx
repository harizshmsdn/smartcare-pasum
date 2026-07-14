import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav.jsx'
import { useApp } from '../AppContext.jsx'

const STAGES = [
  { key: 1, title: 'Stage 1:\nFACIAL RECOGNITION' },
  { key: 2, title: 'Stage 2:\nQR CODE SCAN' },
  { key: 3, title: 'Stage 3:\nLOCATION VERIFICATION' },
]

export default function ScanAttendance() {
  const navigate = useNavigate()
  const { user } = useApp()
  const [stage, setStage] = useState(1)

  function handleNext() {
    if (stage < 3) {
      setStage(stage + 1)
    } else {
      // TODO: submit the completed attendance check-in to your backend here
      alert('Attendance submitted!')
      navigate('/home')
    }
  }

  const progressPct = (stage / 3) * 100

  return (
    <div className="screen">
      <div className="topbar">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <h1 style={{ whiteSpace: 'pre-line', fontSize: 16 }}>{STAGES[stage - 1].title}</h1>
      </div>

      <div className="stage-progress">
        <div className="fill" style={{ width: `${progressPct}%` }} />
      </div>

      {stage === 1 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#c0392b', marginBottom: 6 }}>● CAMERA FEED</div>
          <div className="camera-box">Camera preview (facial recognition)</div>
          <p style={{ fontWeight: 700 }}>Matched!</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            <div className="avatar" />
            <span>{user.name}</span>
          </div>
        </>
      )}

      {stage === 2 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#c0392b', marginBottom: 6 }}>● CAMERA FEED</div>
          <div className="camera-box">Point camera at the classroom QR code</div>
          <p style={{ fontWeight: 700 }}>QR Code Scanned!</p>
          <p>Physics - BT2</p>
        </>
      )}

      {stage === 3 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6 }}>YOUR LOCATION</div>
          <div className="camera-box">Map preview</div>
          <p style={{ fontWeight: 700 }}>Location Verified!</p>
        </>
      )}

      <button className="btn btn-primary btn-block" onClick={handleNext}>
        {stage < 3 ? 'Next Step' : 'Submit'}
      </button>

      <BottomNav />
    </div>
  )
}
