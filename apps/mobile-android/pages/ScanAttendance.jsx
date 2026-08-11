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
// Default geofence radius when a session doesn't set its own
// geo_radius_meters. 50m keeps check-ins tight to wherever the QR code /
// session was actually generated. A session can still override this by
// setting geo_radius_meters explicitly — see matchedClass.geoRadius below
// and mark_attendance's server-side coalesce in
// supabase/002_mark_attendance_rpc.sql, which must match this value or the
// client-side "you're too far" message and the server's actual accept/reject
// decision can disagree.
const LOCATION_RADIUS_METERS = 50

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
  const [locationResult, setLocationResult] = useState(null) // null | 'skipped' | { ok, distance, lat, lng }

  // Manual PIN Code States
  const [isManualPin, setIsManualPin] = useState(false)
  const [pinCode, setPinCode] = useState('')

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(null)

  if (!canvasRef.current && typeof document !== 'undefined') {
    canvasRef.current = document.createElement('canvas')
  }

  // Camera Management
  useEffect(() => {
    // Stop camera in Stage 3 or when switching to manual PIN input
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

      // Stage 1 (QR/PIN scan) always requests the BACK camera
      // ('environment') — you're pointing it at a QR code on a wall/screen,
      // not at yourself. Stage 2 (face recognition) always requests the
      // FRONT camera ('user') for the obvious reason. Stage 3 has no camera
      // (handled by the early-return above, before this function runs).
      const targetFacingMode = stage === 1 ? 'environment' : 'user'

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
  }, [stage, isManualPin])

  // Load face-api models once in background
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

  // FIXED: this used to run
  //   supabase.from('attendance_sessions').select('..., geo_lat, geo_lng, ...').eq('session_pin', scannedPin)
  // directly from the browser, with no rate limiting and no server-side
  // enrollment check ("You are not enrolled" was a client-side .find() over
  // `schedule`, not a real access control). That made the session PIN
  // brute-forceable — a 4-digit PIN is only 10,000 guesses — and handed back
  // the exact GPS coordinates of the classroom to anyone who found it,
  // enrolled or not.
  //
  // verify_session_pin (supabase/002_mark_attendance_rpc.sql) now does the
  // enrollment check and rate limiting server-side, and returns nothing at
  // all for both "wrong PIN" and "right PIN, not enrolled" so a client can't
  // even distinguish the two while guessing.
  const verifyScannedPin = useCallback(async (scannedPin) => {
    setBusy(true)
    setErrorText('')
    setStatusText('Verifying PIN...')
    try {
      const { data, error: rpcError } = await supabase.rpc('verify_session_pin', { p_pin: scannedPin })
      if (rpcError) throw rpcError

      const row = Array.isArray(data) ? data[0] : data
      if (!row) {
        setErrorText('Invalid PIN code, or you are not enrolled in this class.')
        setMatchedClass(null)
        return
      }

      setMatchedClass({
        id: row.class_id,
        enrollmentId: row.enrollment_id,
        sessionId: row.session_id,
        subject: row.subject,
        class: row.class_group,
        latitude: row.geo_lat,
        longitude: row.geo_lng,
        geoRadius: row.geo_radius_meters,
        faceIdRequired: row.face_id_required,
        locationRequired: row.location_required,
      })
      setStatusText(`PIN Verified! ${row.subject} — ${row.class_group}`)
      setErrorText('')
    } catch (err) {
      console.error(err)
      setErrorText(err.message?.includes('RATE_LIMITED')
        ? "Too many attempts — please wait a minute and try again."
        : (err.message || 'Error verifying PIN. Please try again.'))
    } finally {
      setBusy(false)
    }
  }, [])

  // Stage 1: QR Code Scanner Tick Loop
  useEffect(() => {
    if (stage !== 1 || isManualPin || matchedClass || busy) return
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
          verifyScannedPin(code.data.trim())
          return
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [stage, isManualPin, matchedClass, busy, verifyScannedPin])

  // Manual PIN Submission Handler
  const handlePinSubmit = async (e) => {
    e.preventDefault()
    setErrorText('')
    if (!pinCode.trim()) {
      setErrorText('Please enter a PIN code.')
      return
    }
    await verifyScannedPin(pinCode.trim())
  }

  // Stage 2: Face Matching
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, modelsLoaded, matchedClass])

  // Stage 3: Location Verification
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
    setBusy(true)
    setErrorText('')
    setStatusText('Checking your location…')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setBusy(false)
        const { latitude, longitude } = position.coords
        const distance = haversineMeters(latitude, longitude, matchedClass.latitude, matchedClass.longitude)
        const allowedRadius = matchedClass.geoRadius || LOCATION_RADIUS_METERS
        if (distance <= allowedRadius) {
          // lat/lng are kept here (not just the ok/distance verdict) so the
          // final submit can send the raw coordinates for the server to
          // independently re-check — see the comment on handleNext below.
          setLocationResult({ ok: true, distance, lat: latitude, lng: longitude })
          setStatusText('Location Verified!')
        } else {
          setLocationResult({ ok: false, distance, lat: latitude, lng: longitude })
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
      // FIXED: this used to send a pre-computed `location_verified` boolean
      // that logAttendance trusted outright — meaning "verified: true" could
      // be sent straight from devtools with no GPS check at all. Raw
      // coordinates are sent instead now, and the server (mark_attendance
      // RPC) recomputes the distance itself against the session's
      // registered location before accepting the check-in. face_verified is
      // still sent as a plain boolean — see the comment in
      // AppContext.jsx's logAttendance for why that gap remains open for now.
      const hasCoords = locationResult && typeof locationResult === 'object'
      await logAttendance(
        matchedClass.enrollmentId,
        matchedClass.sessionId,
        matchedClass.faceIdRequired ? faceMatched : false,
        matchedClass.locationRequired && hasCoords ? { lat: locationResult.lat, lng: locationResult.lng } : null
      )
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

      {/* DISPLAY AREA (Camera vs Manual PIN vs Location) */}
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
            // Front camera (stage 2, face recognition) is mirrored with
            // scaleX(-1) so it behaves like looking in a mirror — natural
            // for a selfie view, matches every phone camera app. Back
            // camera (stage 1, QR scan) is left un-mirrored: you're reading
            // a QR code / the room in front of you, not yourself, so
            // mirroring it would show everything backwards. This is purely
            // a CSS preview effect either way — jsQR reads frames straight
            // off the video track via canvas.drawImage(), which is
            // unaffected by this transform, so mirroring never changes what
            // gets scanned or submitted.
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit', transform: stage === 2 ? 'scaleX(-1)' : 'none' }}
          />
        )}
      </div>

      {/* STAGE 1 TOGGLE: QR SCANNER vs MANUAL PIN ENTRY */}
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