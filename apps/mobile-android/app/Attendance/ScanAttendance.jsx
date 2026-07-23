import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav.jsx'
import { useApp } from '../AppContext.jsx'
import jsQR from 'jsqr'
import * as faceapi from 'face-api.js'

const STAGES = [
  { key: 1, title: 'Stage 1:\nQR CODE SCAN' },
  { key: 2, title: 'Stage 2:\nFACIAL RECOGNITION' },
  { key: 3, title: 'Stage 3:\nLOCATION VERIFICATION' },
]

const FACE_MATCH_THRESHOLD = 0.6
const LOCATION_RADIUS_METERS = 100

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function ScanAttendance() {
  const navigate = useNavigate()
  const { user, schedule, logAttendance } = useApp()

  const [stage, setStage] = useState(1)
  const [matchedClass, setMatchedClass] = useState(null)
  const [statusText, setStatusText] = useState('')
  const [errorText, setErrorText] = useState('')
  const [busy, setBusy] = useState(false)
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [faceMatched, setFaceMatched] = useState(false)
  const [locationResult, setLocationResult] = useState(null) // null | 'skipped' | { ok, distance }

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(null)

  if (!canvasRef.current && typeof document !== 'undefined') {
    canvasRef.current = document.createElement('canvas')
  }

  // Start the camera once, on mount
  useEffect(() => {
    let cancelled = false
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: {} })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
      } catch (err) {
        console.error(err)
        setErrorText('Could not access the camera. Check permissions and try again.')
      }
    }
    startCamera()
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  // Load face-api models once, in the background, so stage 2 doesn't stall on it
  useEffect(() => {
    let cancelled = false
    async function loadModels() {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
        ])
        if (!cancelled) setModelsLoaded(true)
      } catch (err) {
        console.error(err)
        if (!cancelled) setErrorText('Could not load face recognition models.')
      }
    }
    loadModels()
    return () => {
      cancelled = true
    }
  }, [])

  // Camera no longer needed once we reach the location stage
  useEffect(() => {
    if (stage === 3) {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [stage])

  // Stage 1: continuously scan camera frames for a QR code
  useEffect(() => {
    if (stage !== 1) return
    setErrorText('')
    setStatusText('Point your camera at the classroom QR code…')

    function tick() {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(imageData.data, imageData.width, imageData.height)

        if (code && code.data) {
          const match = (schedule || []).find((item) => item.id === code.data)
          if (match) {
            setMatchedClass(match)
            setStatusText(`QR Code Scanned! ${match.subject} — ${match.class}`)
            return // stop scanning once matched
          }
          setErrorText("This QR code doesn't match any of your enrolled classes.")
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [stage, schedule])

  // Stage 2: attempt to match the live camera face against the enrolled descriptor
  const attemptFaceMatch = useCallback(async () => {
    if (!videoRef.current) return
    if (!user?.faceDescriptor) {
      setErrorText('No Face ID on file yet. Set it up first from Account.')
      return
    }
    setBusy(true)
    setErrorText('')
    setStatusText('Scanning your face…')

    const detection = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor()

    setBusy(false)

    if (!detection) {
      setErrorText('No face detected — center your face in frame and try again.')
      return
    }

    const distance = faceapi.euclideanDistance(Array.from(detection.descriptor), user.faceDescriptor)

    if (distance <= FACE_MATCH_THRESHOLD) {
      setFaceMatched(true)
      setStatusText('Matched!')
      setErrorText('')
    } else {
      setErrorText('Face not recognized. Please try again.')
    }
  }, [user])

  useEffect(() => {
    if (stage !== 2) return
    if (modelsLoaded) {
      attemptFaceMatch()
    } else {
      setStatusText('Loading face recognition…')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, modelsLoaded])

  // Stage 3: compare current GPS position against the matched class's coordinates
  const checkLocation = useCallback(() => {
    if (!matchedClass?.latitude || !matchedClass?.longitude) {
      setLocationResult('skipped')
      setStatusText('This class has no registered location — skipping verification.')
      return
    }
    if (!navigator.geolocation) {
      setErrorText('Location services are not available on this device.')
      return
    }
    setBusy(true)
    setErrorText('')
    setStatusText('Checking your location…')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setBusy(false)
        const distance = haversineMeters(
          position.coords.latitude,
          position.coords.longitude,
          matchedClass.latitude,
          matchedClass.longitude
        )
        if (distance <= LOCATION_RADIUS_METERS) {
          setLocationResult({ ok: true, distance })
          setStatusText('Location Verified!')
        } else {
          setLocationResult({ ok: false, distance })
          setErrorText(`You're about ${Math.round(distance)}m from the classroom — too far to check in.`)
        }
      },
      () => {
        setBusy(false)
        setErrorText('Could not get your location. Check permissions and try again.')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [matchedClass])

  useEffect(() => {
    if (stage === 3) checkLocation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage])

  const locationOk =
    locationResult === 'skipped' || (locationResult && typeof locationResult === 'object' && locationResult.ok)

  const canAdvance =
    (stage === 1 && !!matchedClass) || (stage === 2 && faceMatched) || (stage === 3 && locationOk)

  async function handleNext() {
    if (stage < 3) {
      setStage(stage + 1)
      setErrorText('')
      return
    }

    setBusy(true)
    try {
      await logAttendance(matchedClass.enrollmentId, true)
      alert('Attendance submitted!')
      navigate('/home')
    } catch (err) {
      setErrorText(err?.message || 'Failed to submit attendance. Please try again.')
    } finally {
      setBusy(false)
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

      <div style={{ fontSize: 11, fontWeight: 700, color: '#c0392b', marginBottom: 6 }}>
        {stage === 3 ? 'YOUR LOCATION' : '● CAMERA FEED'}
      </div>

      <div className="camera-box" style={{ position: 'relative', overflow: 'hidden' }}>
        {stage === 3 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 13, color: 'var(--ink-soft)' }}>
            Map preview
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
          />
        )}
      </div>

      {statusText && <p style={{ fontWeight: 700, marginTop: 8 }}>{statusText}</p>}
      {errorText && <p style={{ color: '#d9534f', fontSize: 13, fontWeight: 500 }}>{errorText}</p>}

      {stage === 2 && faceMatched && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 0 24px' }}>
          <div className="avatar" />
          <span>{user?.name}</span>
        </div>
      )}

      {stage === 2 && !faceMatched && !busy && modelsLoaded && (
        <button className="btn btn-block" onClick={attemptFaceMatch} style={{ marginBottom: 12 }}>
          Try Again
        </button>
      )}

      {stage === 3 && locationResult && typeof locationResult === 'object' && !locationResult.ok && !busy && (
        <button className="btn btn-block" onClick={checkLocation} style={{ marginBottom: 12 }}>
          Retry Location Check
        </button>
      )}

      <button className="btn btn-primary btn-block" onClick={handleNext} disabled={!canAdvance || busy}>
        {busy ? 'Please wait…' : stage < 3 ? 'Next Step' : 'Submit'}
      </button>

      <BottomNav />
    </div>
  )
}