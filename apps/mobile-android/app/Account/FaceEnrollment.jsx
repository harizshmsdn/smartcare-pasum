import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav.jsx'
import { useApp } from '../AppContext.jsx'
import * as faceapi from 'face-api.js'

export default function FaceEnrollment() {
  const navigate = useNavigate()
  const { user, saveFaceDescriptor } = useApp()

  const videoRef = useRef(null)
  const streamRef = useRef(null)

  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [status, setStatus] = useState('loading') // loading | ready | capturing | no-face | saved | error
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function setup() {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
        ])
        if (cancelled) return
        setModelsLoaded(true)

        const stream = await navigator.mediaDevices.getUserMedia({ video: {} })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
        setStatus('ready')
      } catch (err) {
        console.error(err)
        setError('Could not access the camera or load face models.')
        setStatus('error')
      }
    }

    setup()

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  async function handleCapture() {
    if (!videoRef.current || !modelsLoaded) return
    setStatus('capturing')
    setError('')

    const detection = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor()

    if (!detection) {
      setStatus('no-face')
      setError('No face detected — make sure your face is centered and well-lit, then try again.')
      return
    }

    try {
      await saveFaceDescriptor(Array.from(detection.descriptor))
      setStatus('saved')
    } catch (err) {
      setError(err?.message || 'Failed to save. Please try again.')
      setStatus('ready')
    }
  }

  return (
    <div className="screen">
      <div className="topbar">
        <button className="back-btn" onClick={() => navigate('/account')}>
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
        <h1>Face ID Setup</h1>
      </div>

      <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: '0 0 16px 0' }}>
        This is used to verify it's really you during attendance scanning. Center your face in the frame and tap Capture.
      </p>

      <div className="camera-box" style={{ position: 'relative', overflow: 'hidden' }}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
        />
      </div>

      {user?.faceDescriptor && status !== 'saved' && (
        <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 8 }}>
          You already have a Face ID on file. Capturing again will replace it.
        </p>
      )}

      {status === 'saved' && (
        <p style={{ fontWeight: 700, color: '#16a34a', marginTop: 12 }}>Face ID saved!</p>
      )}

      {error && <p style={{ color: '#d9534f', fontSize: 13, marginTop: 12, fontWeight: 500 }}>{error}</p>}

      <button
        className="btn btn-primary btn-block"
        onClick={handleCapture}
        disabled={status === 'loading' || status === 'capturing' || status === 'error'}
      >
        {status === 'loading' && 'Loading…'}
        {status === 'ready' && 'Capture'}
        {status === 'capturing' && 'Capturing…'}
        {status === 'no-face' && 'Try Again'}
        {status === 'saved' && 'Recapture'}
        {status === 'error' && 'Camera Unavailable'}
      </button>

      <BottomNav />
    </div>
  )
}