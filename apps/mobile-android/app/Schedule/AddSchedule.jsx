import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav.jsx'
import { useApp } from '../AppContext.jsx'

const MORNING = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30']
const AFTERNOON = ['12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30']
const EVENING = ['17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30']

const FREQUENCIES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function AddSchedule() {
  const navigate = useNavigate()
  const { addSchedule } = useApp()

  const [subject, setSubject] = useState('')
  const [className, setClassName] = useState('')
  const [startTime, setStartTime] = useState(null)
  const [endTime, setEndTime] = useState(null)
  const [frequency, setFrequency] = useState([])
  const [error, setError] = useState('')

  // Handle Start & End time range clicks
  function handleTimeClick(slot) {
    if (error) setError('')

    if (!startTime || (startTime && endTime)) {
      setStartTime(slot)
      setEndTime(null)
    } else if (startTime && !endTime) {
      if (slot < startTime) {
        setEndTime(startTime)
        setStartTime(slot)
      } else if (slot === startTime) {
        setStartTime(null)
      } else {
        setEndTime(slot)
      }
    }
  }

  function getSlotClass(slot) {
    if (slot === startTime || slot === endTime) return 'slot-btn selected'
    if (startTime && endTime && slot > startTime && slot < endTime) return 'slot-btn in-range'
    return 'slot-btn'
  }

  function toggleFrequency(f) {
    if (error) setError('')
    setFrequency((prev) => 
      prev.includes(f) ? prev.filter((item) => item !== f) : [...prev, f]
    )
  }

  function handleSubmit(e) {
    e.preventDefault()

    if (!subject || !className || !startTime || !endTime || frequency.length === 0) {
      setError('Please fill in all fields.')
      return
    }

    setError('')

    addSchedule({
      id: Date.now(),
      subject,
      class: className,
      startTime,
      endTime,
      time: `${startTime} - ${endTime}`,
      frequency,
    })

    navigate('/schedule')
  }

  return (
    <div className="screen">
      {/* Topbar */}
      <div className="topbar">
        <button className="back-btn" onClick={() => navigate('/schedule')} type="button" aria-label="Go back">
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
        <h1>Add Schedule</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Subject Name</label>
          <input
            placeholder="Enter Subject Name Here" 
            value={subject} 
            onChange={(e) => {
              setSubject(e.target.value)
              if (error) setError('')
            }} 
          />
        </div>

        <div className="field">
          <label>Class Name</label>
          <input 
            placeholder="Enter Class Name Here" 
            value={className} 
            onChange={(e) => {
              setClassName(e.target.value)
              if (error) setError('')
            }} 
          />
        </div>

        <div className="field">
          <label style={{ fontWeight: '600', marginBottom: '8px', display: 'block' }}>Time</label>
          
          <div 
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '16px',
              backgroundColor: '#fafbfc'
            }}
          >

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#334155' }}>Morning</span>
                {MORNING.map((t) => (
                  <button type="button" key={t} className={getSlotClass(t)} onClick={() => handleTimeClick(t)}>
                    {t}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#334155' }}>Afternoon</span>
                {AFTERNOON.map((t) => (
                  <button type="button" key={t} className={getSlotClass(t)} onClick={() => handleTimeClick(t)}>
                    {t}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#334155' }}>Evening</span>
                {EVENING.map((t) => (
                  <button type="button" key={t} className={getSlotClass(t)} onClick={() => handleTimeClick(t)}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginTop: '12px', fontSize: '12px', fontWeight: '500', color: '#475569' }}>
              {!startTime && ''}
              {startTime && endTime && `Selected: ${startTime} – ${endTime}`}
            </div>
          </div>
        </div>

        <div className="field" style={{ marginTop: '16px' }}>
          <label style={{ fontWeight: '600', marginBottom: '8px', display: 'block' }}>Frequency</label>
          
          <div 
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '16px',
              backgroundColor: '#fafbfc'
            }}
          >

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {FREQUENCIES.map((f) => {
                const isSelected = frequency.includes(f)
                return (
                  <button
                    type="button"
                    key={f}
                    className={'freq-option' + (isSelected ? ' selected' : '')}
                    onClick={() => toggleFrequency(f)}
                  >
                    {f}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {error && <p style={{ color: '#d9534f', fontSize: '13px', marginTop: '12px', fontWeight: '500' }}>{error}</p>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px', paddingBottom: '90px' }}>
          <button 
            type="submit" 
            style={{
              backgroundColor: '#cde6de',
              color: '#000000c1',
              border: 'none',
              padding: '8px 24px',
              borderRadius: '16px',
              fontSize: '16px',
              fontWeight: '400',
              cursor: 'pointer'
            }}
          >
            Submit
          </button>
        </div>
      </form>

      <BottomNav />
    </div>
  )
}