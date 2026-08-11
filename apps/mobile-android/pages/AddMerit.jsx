import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav.jsx'
import { useApp } from '../AppContext.jsx'
import { supabase } from '../supabaseClient.js'

const CATEGORIES = ['Academic', 'Leadership', 'Sports', 'Volunteering', 'Others']

export default function AddMerit() {
  const navigate = useNavigate()
  const { user, addMerit } = useApp()

  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [level, setLevel] = useState('')
  const [roles, setRoles] = useState('')
  const [photo, setPhoto] = useState(null)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name || !category || !level || !roles) {
      setError('Please fill in all fields.')
      return
    }

    setError('')
    setIsSubmitting(true)

    try {
      let proofUrl = null
      if (photo) {
        // Clean filename to prevent special character upload errors in Supabase Storage
        const cleanFileName = photo.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
        // FIXED: this path used to be flat — `${Date.now()}_${filename}` —
        // in a bucket that's read via getPublicUrl(). Date.now() has
        // millisecond precision, which is guessable/brute-forceable within
        // an active submission window, so anyone could enumerate and view
        // other students' proof uploads (often photos of ID cards or
        // certificates) without ever being given a link. Namespacing by
        // the uploader's user id (a UUID, not practically guessable) closes
        // that off without changing the stored URL format, so nothing else
        // that reads proof_file_url needs to change.
        //
        // This does NOT make the bucket private — it's still public, so a
        // copied/shared link is still viewable by anyone who has it. Making
        // the bucket private (with a storage RLS policy scoped to this
        // folder structure, see supabase/001_rls_policies.sql) is a
        // separate change that needs coordinating with whoever built the
        // admin/lecturer review app, since it currently expects a public URL.
        const filePath = `${user.id}/${Date.now()}_${cleanFileName}`

        const { data, error: uploadError } = await supabase.storage
          .from('merit-proofs')
          .upload(filePath, photo, {
            contentType: photo.type,
            upsert: true
          })

        if (uploadError) {
          console.error('Supabase upload error:', uploadError)
          setError(`Upload failed: ${uploadError.message || 'Check storage permissions.'}`)
          setIsSubmitting(false)
          return
        }

        const { data: urlData } = supabase.storage
          .from('merit-proofs')
          .getPublicUrl(filePath)

        proofUrl = urlData.publicUrl
      }

      // FIXED: previously called without a try/catch — addMerit() didn't use
      // to throw on failure, but it does now (validation errors, rate
      // limiting, RPC errors), so an uncaught rejection here would have left
      // the button stuck on "Uploading..." forever with no error shown.
      //
      // `category` isn't passed through: merit_claims doesn't have a column
      // for it yet (see AppContext.jsx's addMerit) — the dropdown stays in
      // the form, but confirm with whoever owns the schema whether it should
      // be added before relying on it being saved anywhere.
      await addMerit({ name, level, roles, proofUrl, points: 0 })

      navigate('/merits', {
        state: { notification: 'Your merit submission has been sent for checking!' }
      })
    } catch (err) {
      console.error(err)
      setError(err?.message || 'Failed to submit. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="screen">
      <div className="topbar">
        <button className="back-btn" onClick={() => navigate('/merits')}>
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
        <div className="topbar-spacer"/>
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
            }} 
          />
        </div>

        <div className="field">
          <label>Category</label>
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value)
              if (error) setError('')
            }}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '10px',
              border: '1px solid #d0d7de',
              backgroundColor: '#fff',
              fontSize: '14px',
              color: category ? '#1f2937' : '#6b7280'
            }}
          >
            <option value="" disabled>Select Category</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
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
            }} 
          />
          {error && <p style={{ color: '#b03a3a', fontSize: 13, marginTop: 6 }}>{error}</p>}
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
              }}
            >
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
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
            disabled={isSubmitting}
            style={{
              backgroundColor: isSubmitting ? '#a3d1c3' : '#cde6de',
              color: '#000000c1',
              border: 'none',
              padding: '8px 24px',
              borderRadius: '16px',
              fontSize: '16px',
              fontWeight: '400',
              cursor: isSubmitting ? 'not-allowed' : 'pointer'
            }}
          >
            {isSubmitting ? 'Uploading...' : 'Submit'}
          </button>
        </div>
      </form>

      <BottomNav />
    </div>
  )
}