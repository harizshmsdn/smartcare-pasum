import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav.jsx'
import { useApp } from '../AppContext.jsx'
import { supabase } from '../supabaseClient.js'
import jsQR from 'jsqr'
import * as faceapi from 'face-api.js'

const STAGES = [
  { key: 1, title: 'Stage 1:\nQR / PIN CODE SCAN' },
  { key: 2, title: 'Stage 2:\nFACIAL RECOGNITION' },
  { key: 3, title: 'Stage 3:\nLOCATION VERIFICATION' },
]

const FACE_MATCH_THRESHOLD = 0.6
const LOCATION_RADIUS_METERS = 100
// Reject a GPS fix that's too coarse to trust for a ~100m geofence — a
// network-based fallback position can easily report accuracy in the
// hundreds/thousands of meters, which would otherwise pass or fail the
// distance check essentially at random.
const MAX_ACCEPTABLE_ACCURACY_METERS = 75

const SUPPORTS_QR_WORKER =
  typeof Worker !== 'undefined' &&
  typeof OffscreenCanvas !== 'undefined' &&
  typeof createImageBitmap !== 'undefined'

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
  const [capturedDescriptor, setCapturedDescriptor] = useState(null)
  const [locationResult, setLocationResult] = useState(null) // null | 'skipped' | { ok, distance }
  const [capturedCoords, setCapturedCoords] = useState(null)

  const [isManualPin, setIsManualPin] = useState(false)
  const [pinCode, setPinCode] = useState('')

  const [cameraPermission, setCameraPermission] = useState('unknown')
  const [locationPermission, setLocationPermission] = useState('unknown')

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(null)
  const qrWorkerRef = useRef(null)
  const qrDecodeInFlightRef = useRef(false)

  if (!canvasRef.current && typeof document !== 'undefined') {
    canvasRef.current = document.createElement('canvas')
  }

  useEffect(() => {
    if (navigator.permissions?.query) {
      navigator.permissions.query({ name: 'camera' }).then((status) => {
        setCameraPermission(status.state)
        status.onchange = () => setCameraPermission(status.state)
      }).catch(() => setCameraPermission('unknown')) // some browsers don't support querying 'camera'

      navigator.permissions.query({ name: 'geolocation' }).then((status) => {
        setLocationPermission(status.state)
        status.onchange = () => setLocationPermission(status.state)
      }).catch(() => setLocationPermission('unknown'))
    }
  }, [])

  useEffect(() => {
    if (!SUPPORTS_QR_WORKER) return
    const worker = new Worker(new URL('../qrWorker.js', import.meta.url), { type: 'module' })
    qrWorkerRef.current = worker
    return () => {
      worker.terminate()
      qrWorkerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (stage === 3 || (stage === 1 && isManualPin)) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
      return
    }

    let cancelled = false

    async function initCamera() {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }

      const targetFacingMode = stage === 1 ? 'environment' : 'user'

      if (cameraPermission === 'denied') {
        setErrorText('Camera access is blocked for this app. Enable it in your browser/site settings, then reload.')
        return
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: targetFacingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        })

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        streamRef.current = stream

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().catch((err) => console.error('Video play error:', err))
          }
        }
      } catch (err) {
        console.error(`Error loading ${targetFacingMode} camera:`, err)
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true })
          if (!cancelled) {
            streamRef.current = fallbackStream
            if (videoRef.current) videoRef.current.srcObject = fallbackStream
          }
        } catch (fallbackErr) {
          setErrorText('Could not access the camera. Check permissions and try again.')
        }
      }
    }

    initCamera()

    return () => {
      cancelled = true
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [stage, isManualPin, cameraPermission])

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

  const verifyScannedPin = useCallback(async (scannedPin) => {
    setBusy(true)
    setErrorText('')
    setStatusText('Verifying PIN...')
    try {
      const { data: session, error: sessionError } = await supabase
        .from('attendance_sessions')
        .select('id, class_id, geo_lat, geo_lng, geo_radius_meters, online_mode, face_id_required, location_required')
        .eq('session_pin', scannedPin)
        .is('closed_at', null)
        .maybeSingle()

      if (sessionError) throw sessionError

      if (!session) {
        setErrorText('Invalid PIN code. Please check with your lecturer.')
        setMatchedClass(null)
        return
      }

      const match = (schedule || []).find((item) => item.id === session.class_id)
      if (!match) {
        setErrorText("You are not enrolled in this class.")
        setMatchedClass(null)
        return
      }

      setMatchedClass({
        ...match,
        sessionId: session.id,
        latitude: session.geo_lat || match.latitude,
        longitude: session.geo_lng || match.longitude,
        geoRadius: session.geo_radius_meters,
        faceIdRequired: session.face_id_required,
        locationRequired: session.location_required,
      })
      setStatusText(`PIN Verified! ${match.subject} — ${match.class}`)
      setErrorText('')
    } catch (err) {
      console.error(err)
      setErrorText(err.message || 'Error verifying PIN. Please try again.')
    } finally {
      setBusy(false)
    }
  }, [schedule])

  useEffect(() => {
    if (stage !== 1 || isManualPin || matchedClass || busy) return
    setErrorText('')
    setStatusText('Point your camera at the classroom QR code…')

    let cancelled = false

    if (SUPPORTS_QR_WORKER && qrWorkerRef.current) {
      const worker = qrWorkerRef.current
      let requestCounter = 0

      const handleMessage = (event) => {
        qrDecodeInFlightRef.current = false
        if (cancelled) return
        const { data } = event.data
        if (data) {
          verifyScannedPin(data.trim())
          return
        }
        rafRef.current = requestAnimationFrame(tick)
      }
      worker.addEventListener('message', handleMessage)

      function tick() {
        const video = videoRef.current
        if (
          video &&
          video.readyState === video.HAVE_ENOUGH_DATA &&
          !qrDecodeInFlightRef.current
        ) {
          qrDecodeInFlightRef.current = true
          createImageBitmap(video)
            .then((bitmap) => {
              if (cancelled) {
                bitmap.close()
                qrDecodeInFlightRef.current = false
                return
              }
              worker.postMessage({ bitmap, requestId: ++requestCounter }, [bitmap])
            })
            .catch(() => {
              qrDecodeInFlightRef.current = false
              rafRef.current = requestAnimationFrame(tick)
            })
        } else {
          rafRef.current = requestAnimationFrame(tick)
        }
      }

      rafRef.current = requestAnimationFrame(tick)
      return () => {
        cancelled = true
        worker.removeEventListener('message', handleMessage)
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
      }
    }

    function tickFallback() {
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
          verifyScannedPin(code.data.trim())
          return
        }
      }
      rafRef.current = requestAnimationFrame(tickFallback)
    }

    rafRef.current = requestAnimationFrame(tickFallback)
    return () => {
      cancelled = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [stage, isManualPin, matchedClass, busy, verifyScannedPin])

  const handlePinSubmit = async (e) => {
    e.preventDefault()
    setErrorText('')
    if (!pinCode.trim()) {
      setErrorText('Please enter a PIN code.')
      return
    }
    await verifyScannedPin(pinCode.trim())
  }

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
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
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
      setCapturedDescriptor(Array.from(detection.descriptor))
      setStatusText('Matched!')
      setErrorText('')
    } else {
      setErrorText('Face not recognized. Please try again.')
    }
  }, [user])

  useEffect(() => {
    if (stage !== 2) return
    if (matchedClass && !matchedClass.faceIdRequired) {
      setFaceMatched(true)
      setStatusText('Face ID not required — skipped.')
      return
    }
    if (modelsLoaded) {
      attemptFaceMatch()
    } else {
      setStatusText('Loading face recognition…')
    }
  }, [stage, modelsLoaded, matchedClass])

  const checkLocation = useCallback(() => {
    if (matchedClass && !matchedClass.locationRequired) {
      setLocationResult('skipped')
      setStatusText('Location verification is not required for this session — skipping.')
      return
    }
    if (!matchedClass?.latitude || !matchedClass?.longitude) {
      setLocationResult('skipped')
      setStatusText('This class has no registered location — skipping verification.')
      return
    }
    if (!navigator.geolocation) {
      setErrorText('Location services are not available on this device.')
      return
    }
    if (locationPermission === 'denied') {
      setErrorText('Location access is blocked for this app. Enable it in your browser/site settings, then retry.')
      return
    }
    setBusy(true)
    setErrorText('')
    setStatusText('Checking your location…')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setBusy(false)
        const { accuracy } = position.coords

        if (accuracy != null && accuracy > MAX_ACCEPTABLE_ACCURACY_METERS) {
          setLocationResult({ ok: false, distance: null })
          setErrorText(
            `Your location fix is too imprecise (±${Math.round(accuracy)}m) to verify reliably. Move to an open area or enable high-accuracy/GPS mode and retry.`
          )
          return
        }

        const distance = haversineMeters(
          position.coords.latitude,
          position.coords.longitude,
          matchedClass.latitude,
          matchedClass.longitude
        )
        const allowedRadius = matchedClass.geoRadius || LOCATION_RADIUS_METERS
        setCapturedCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude })
        if (distance <= allowedRadius) {
          setLocationResult({ ok: true, distance })
          setStatusText('Location Verified!')
        } else {
          setLocationResult({ ok: false, distance })
          setErrorText(`You're about ${Math.round(distance)}m from the classroom — too far to check in.`)
        }
      },
      (geoErr) => {
        setBusy(false)
        if (geoErr.code === geoErr.PERMISSION_DENIED) {
          setErrorText('Location access was denied. Enable it in your browser/site settings, then retry.')
        } else {
          setErrorText('Could not get your location. Check permissions and try again.')
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }, [matchedClass, locationPermission])

  useEffect(() => {
    if (stage === 3) checkLocation()
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
      await logAttendance(matchedClass.sessionId, {
        latitude: matchedClass.locationRequired ? capturedCoords?.latitude : undefined,
        longitude: matchedClass.locationRequired ? capturedCoords?.longitude : undefined,
        faceDescriptor: matchedClass.faceIdRequired ? capturedDescriptor : undefined,
      })
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
        {stage === 3 ? 'YOUR LOCATION' : isManualPin ? '● PIN CODE ENTRY' : '● CAMERA FEED'}
      </div>

      <div className="camera-box" style={{ position: 'relative', overflow: 'hidden' }}>
        {stage === 3 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 13, color: 'var(--ink-soft)' }}>
            Map preview
          </div>
        ) : stage === 1 && isManualPin ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 20 }}>
            <p style={{ margin: '0 0 12px 0', fontSize: 13, fontWeight: 600 }}>Enter Class PIN Code</p>
            <form onSubmit={handlePinSubmit} style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 280 }}>
              <input
                type="text"
                placeholder="e.g. 8492"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1px solid #CBD5E1',
                  textAlign: 'center',
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: 2
                }}
              />
              <button
                type="submit"
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#4F46E5',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Verify
              </button>
            </form>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit', transform: stage === 2 ? 'scaleX(-1)' : 'none' }}
          />
        )}
      </div>
      
      {stage === 1 && (
        <div style={{ textAlign: 'center', marginTop: 10 }}>
          <button
            type="button"
            onClick={() => {
              setIsManualPin(!isManualPin)
              setErrorText('')
              setStatusText('')
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#4F46E5',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            {isManualPin ? 'Switch to QR Code Scanner' : "Can't scan QR? Enter PIN code instead"}
          </button>
        </div>
      )}

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