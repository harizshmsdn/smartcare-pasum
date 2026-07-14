import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav.jsx'
import { useApp } from '../AppContext.jsx'

export default function AddMerit() {
  const navigate = useNavigate()
  const { addMerit } = useApp()

  const [name, setName] = useState('')
  const [level, setLevel] = useState('')
  const [roles, setRoles] = useState('')
  const [photo, setPhoto] = useState(null)
  const[error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!name || !level || !roles) {
      setError('Please fill in all fields.')
      return
    }

    setError('')
    
    // TODO: upload `photo` as proof to your file storage, then save the record via your API.
    // Points here default to 0; usually merit points are approved/assigned by staff after review.
    addMerit({ name, points: 0 })
    navigate('/merits')
  }

  return (
    <div className="screen">
    <div className="topbar">
      <button className="back-btn" 
      onClick={() => navigate('/merits')}>
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
    <h1>Add More Merits</h1>
    </div>

      <form onSubmit={handleSubmit}>

        <div className="field">
          <label>Competition/Event Name</label>
          <input 
            placeholder="Enter Competition/Event Name Here" 
            value={name} 
            onChange={(e) => { 
            setName(e.target.value)
            if (error) setError('')
            }} />
        </div>

        <div className="field">
          <label>Competition/Event Level</label>
          <input
            placeholder="Enter Competition/Event Level Here"
            value={level}
            onChange={(e) => {
            setLevel(e.target.value)
            if (error) setError('')
            }}
          />
        </div>

        <div className="field">
          <label>Roles</label>
          <input 
            placeholder="Enter Roles Here" 
            value={roles} 
            onChange={(e) => {
            setRoles(e.target.value)
            if (error) setError('')
            }} />
           {error && <p style={{ color: '#b03a3a', fontSize: 13 }}>{error}</p>}
        </div>
        
        <div className="field">
          <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', fontWeight: '500' }}>
            Proof
            </label>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
              type="file"
              id="proof-upload"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => setPhoto(e.target.files[0] || null)}
              />
              
              <label
              htmlFor="proof-upload"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #d0d7de',
                backgroundColor: '#f6f8fa',
                color: '#24292f',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
              }}>
                
                <svg width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  {photo ? 'Change File' : 'Upload File'}
                  </label>
                  
                  <span style={{ fontSize: '13px', color: photo ? '#1f2937' : '#6b7280' }}>
                    {photo ? photo.name : 'No file chosen'}
                    </span>
                    
                    {photo && (
                      <button
                      type="button"
                      onClick={() => setPhoto(null)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontSize: '14px',
                        padding: '2px 4px'
                      }}
                      title="Remove file"
                      >
                        ✕
                        </button>
                      )}
                      </div>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', paddingBottom: '90px' }}>
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
