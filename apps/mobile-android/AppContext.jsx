import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import {
  optionalString,
  requireString,
  requireNumber,
  requireUrl,
  pickAllowed,
  requireDescriptorArray,
  requireWeekdayList,
  requireTime,
} from './validators'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [user, setUser] = useState(null)
  const [schedule, setSchedule] = useState([])
  const [merits, setMerits] = useState([])
  const [attendanceData, setAttendanceData] = useState([])
  const [assessmentData, setAssessmentData] = useState([])
  const [notifications, setNotifications] = useState([])
  const [authChecked, setAuthChecked] = useState(false)

  // 1. Monitor Authentication State Change
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) loadStudentData(session.user.id)
      else setAuthChecked(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        loadStudentData(session.user.id)
      } else {
        setUser(null)
        setSchedule([])
        setMerits([])
        setAttendanceData([])
        setAssessmentData([])
        setNotifications([])
        setAuthChecked(true)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // 2. Fetch all real relational data for the student
  async function loadStudentData(userId) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (profile) {
        setUser({
          id: profile.id,
          name: profile.full_name || '',
          identificationNumber: profile.identification_number || '',
          matricsNumber: profile.institutional_id || '',
          class: profile.class_group || '',
          email: profile.email || '',
          phone: profile.phone_number || '',
          emergencyName: profile.emergency_contact_name || '',
          emergencyRelationship: profile.emergency_contact_relationship || '',
          emergencyPhone: profile.emergency_contact_phone || '',
          // SECURITY NOTE: this raw biometric descriptor is shipped to the
          // browser on every load (FaceEnrollment reads it to show "already
          // enrolled" state). Nothing in the check-in flow needs it anymore —
          // verify_session_pin / mark_attendance never touch it — so consider
          // replacing this column with a `has_face_id` boolean derived
          // server-side and dropping face_descriptor from this select
          // entirely, once you're ready to also stop sending it up from
          // FaceEnrollment.jsx.
          faceDescriptor: profile.face_descriptor || null,
        })
      }

      // NOTE: pincode/geo columns are intentionally NOT selected here.
      // ScanAttendance.jsx no longer reads PIN/geofence data from this
      // client-side `schedule` list at all — it gets that per-session, from
      // the server, via the verify_session_pin RPC (supabase/002). Keeping
      // it out of this select means a logged-in student's browser never
      // holds every future session's PIN/coordinates at once, only the one
      // they just scanned.
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select(`
          id,
          current_attendance_rate,
          classes (
            id,
            group_code,
            type,
            day_of_week,
            start_time,
            end_time,
            location,
            subjects (
              name,
              code
            )
          )
        `)
        .eq('student_id', userId)

      if (enrollments) {
        const formattedSchedule = enrollments
          .filter(en => en.classes && en.classes.subjects)
          .map((en) => ({
            id: en.classes.id,
            enrollmentId: en.id,
            subject: en.classes.subjects.name,
            class: en.classes.group_code,
            time: en.classes.start_time && en.classes.end_time
              ? `${en.classes.start_time.substring(0, 5)} - ${en.classes.end_time.substring(0, 5)}`
              : 'N/A',
            frequency: `Every ${en.classes.day_of_week}`,
            location: en.classes.location,
            type: en.classes.type
          }))
        setSchedule(formattedSchedule)

        const classIds = enrollments.map(en => en.classes?.id).filter(Boolean)
        const { data: allSessions } = await supabase
          .from('attendance_sessions')
          .select('id, class_id')
          .in('class_id', classIds)

        const { data: studentRecords } = await supabase
          .from('attendance_records')
          .select('session_id')
          .eq('student_id', userId)

        const sessionsByClass = (allSessions || []).reduce((acc, s) => {
          if (!acc[s.class_id]) acc[s.class_id] = []
          acc[s.class_id].push(s.id)
          return acc
        }, {})

        const attendedSessionIds = new Set((studentRecords || []).map(r => r.session_id))

        const formattedAttendance = enrollments
          .filter(en => en.classes && en.classes.subjects)
          .map((en) => {
            const classId = en.classes.id
            const classSessions = sessionsByClass[classId] || []
            const total = classSessions.length
            const attended = classSessions.filter(sid => attendedSessionIds.has(sid)).length
            const percent = Number(en.current_attendance_rate) || (total > 0 ? Math.round((attended / total) * 100) : 0)

            return {
              id: en.id,
              subject: en.classes.subjects.name,
              percent,
              total,
              attended,
              absent: total - attended
            }
          })
        setAttendanceData(formattedAttendance)
      }

      const { data: claims } = await supabase
        .from('merit_claims')
        .select('*')
        .eq('student_id', userId)

      if (claims) {
        const formattedMerits = claims.map((c) => ({
          id: c.id,
          name: c.title,
          points: c.awarded_points,
          status: c.status
        }))
        setMerits(formattedMerits)
      }

      // NOTE (unverified — flagged in SECURITY_REVIEW.md): this reads from
      // `student_scores` (score_achieved / total_marks, reached through
      // assessments -> classes -> subjects). addAssessment() below writes to
      // a *different* table, `assessments`, with different column names
      // (subject_name, score, possible_score) and no relation back to this
      // query. As shipped, nothing logged via addAssessment ever appears
      // here. Confirm with whoever owns the schema whether `assessments` is
      // a separate personal-tracker table or simply the wrong target.
      const { data: scores, error: scoresError } = await supabase
        .from('student_scores')
        .select(`
          score_achieved,
          assessments (
            title,
            total_marks,
            classes (
              subjects (
                name
              )
            )
          )
        `)
        .eq('student_id', userId)

      if (scoresError) {
        console.error('Error fetching student scores:', scoresError)
      }

      if (scores) {
        const grouped = scores.reduce((acc, current) => {
          const subjectName = current.assessments?.classes?.subjects?.name || 'Unknown Subject'
          if (!acc[subjectName]) {
            acc[subjectName] = { subject: subjectName, totalScore: 0, totalPossible: 0, items: [] }
          }
          const score = Number(current.score_achieved) || 0
          const possible = Number(current.assessments?.total_marks) || 100

          acc[subjectName].items.push([current.assessments?.title || 'Assessment', `${score}/${possible}`])
          acc[subjectName].totalScore += score
          acc[subjectName].totalPossible += possible
          return acc
        }, {})

        const formattedAssessments = Object.values(grouped).map(group => ({
          subject: group.subject,
          percent: group.totalPossible > 0 ? Math.round((group.totalScore / group.totalPossible) * 100) : 0,
          items: group.items
        }))

        setAssessmentData(formattedAssessments)
      }

      const { data: notifs } = await supabase
        .from('notifications')
        .select('*')
        .eq('student_id', userId)
        .order('created_at', { ascending: false })

      if (notifs) {
        setNotifications(notifs.map((n) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.type,
          read: n.read,
          time: new Date(n.created_at).toLocaleString(),
        })))
      }

    } catch (err) {
      console.error('Error synchronizing student payload:', err)
    } finally {
      setAuthChecked(true)
    }
  }

  // 3. Database Action Mutations
  //
  // VALIDATION NOTE: every function below runs its input through
  // validators.js before touching Supabase — this rejects bad shapes/sizes
  // fast with a friendly message. It is defense-in-depth, not the real
  // backstop: RLS policies (supabase/001_rls_policies.sql) and the
  // SECURITY DEFINER RPCs (supabase/002_mark_attendance_rpc.sql) are what
  // actually protect the database from a user who bypasses this file
  // entirely and calls supabase-js directly from DevTools.

  async function updateProfile(updatedData) {
    if (!user) throw new Error('No active session — please log in again.')
    try {
      const clean = pickAllowed(updatedData, [
        'name', 'identificationNumber', 'matricsNumber', 'class', 'phone',
        'emergencyName', 'emergencyRelationship', 'emergencyPhone',
        // allow-but-ignore: callers often spread the whole `user` object in
        'id', 'email', 'faceDescriptor',
      ])

      const payload = {
        id: user.id,
        full_name: optionalString(clean.name, 'name', { maxLength: 100 }),
        identification_number: optionalString(clean.identificationNumber, 'identificationNumber', { maxLength: 30 }),
        institutional_id: optionalString(clean.matricsNumber, 'matricsNumber', { maxLength: 30 }),
        class_group: optionalString(clean.class, 'class', { maxLength: 50 }),
        phone_number: optionalString(clean.phone, 'phone', { maxLength: 30 }),
        emergency_contact_name: optionalString(clean.emergencyName, 'emergencyName', { maxLength: 100 }),
        emergency_contact_relationship: optionalString(clean.emergencyRelationship, 'emergencyRelationship', { maxLength: 50 }),
        emergency_contact_phone: optionalString(clean.emergencyPhone, 'emergencyPhone', { maxLength: 30 }),
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase.from('profiles').upsert(payload)

      if (error) throw error
      await loadStudentData(user.id)
    } catch (err) {
      console.error('Profile update write failure:', err)
      throw err
    }
  }

  async function saveFaceDescriptor(descriptorArray) {
    if (!user) throw new Error('No active session — please log in again.')
    try {
      // face-api.js's FaceRecognitionNet always emits a 128-length
      // Float32Array — reject anything else before it reaches the DB.
      const descriptor = requireDescriptorArray(descriptorArray, 'faceDescriptor', { length: 128 })

      const { error } = await supabase
        .from('profiles')
        .update({ face_descriptor: descriptor })
        .eq('id', user.id)

      if (error) throw error
      setUser((prev) => ({ ...prev, faceDescriptor: descriptor }))
    } catch (err) {
      console.error('Error saving face descriptor:', err)
      throw err
    }
  }

  // HARDENED: this used to be a raw `.insert()` into merit_claims, trusting
  // whatever `entry.points` the caller passed, with no rate limit. It now
  // goes through the submit_merit_claim() RPC (SECURITY DEFINER), which
  // re-validates server-side, clamps points to a sane range, and
  // rate-limits per student. See supabase/002_mark_attendance_rpc.sql.
  async function addMerit(entry) {
    if (!user) return
    try {
      const clean = pickAllowed(entry, ['name', 'level', 'roles', 'proofUrl', 'points'])
      const title = requireString(clean.name, 'name', { maxLength: 200 })
      const level = optionalString(clean.level, 'level', { maxLength: 100 })
      const role = optionalString(clean.roles, 'roles', { maxLength: 100 })
      const points = requireNumber(clean.points ?? 0, 'points', { min: 0, max: 100 })
      const proofUrl = clean.proofUrl
        ? requireUrl(clean.proofUrl, 'proofUrl') // tighten with { allowedHosts: [...] } once the merit-proofs bucket's hostname is fixed (see AddMerit.jsx / 001_rls_policies.sql)
        : null

      const { data, error } = await supabase.rpc('submit_merit_claim', {
        p_title: title,
        p_level: level,
        p_role: role,
        p_proof_file_url: proofUrl,
        p_points: points,
      })

      if (error) throw error

      setMerits((prev) => [
        ...prev,
        { id: data.id, name: data.title, points: data.awarded_points, status: data.status }
      ])
      await triggerNotification('Merit Submitted', `Your claim for "${entry.name}" is pending review.`, 'merits')
    } catch (err) {
      console.error('Error adding merit claim:', err)
      throw err
    }
  }

  // NOTE (product decision, not silently changed here): this inserts
  // directly into the SHARED `subjects` and `classes` tables — the same
  // tables the lecturer/admin app and every other student's schedule read
  // from. See the "classes / subjects" block in
  // supabase/001_rls_policies.sql for the two ways to close this off, and
  // pick one before this ships. Validation added below either way, since
  // the field values were previously unbounded.
  async function addSchedule(entry) {
    if (!user) return
    try {
      const clean = pickAllowed(entry, ['id', 'subject', 'class', 'location', 'type', 'startTime', 'endTime', 'time', 'frequency', 'classId'])
      const days = requireWeekdayList(clean.frequency, 'frequency')
      const location = optionalString(clean.location, 'location', { maxLength: 100 })

      if (clean.subject && clean.class) {
        const subjectName = requireString(clean.subject, 'subject', { maxLength: 150 })
        const groupCode = requireString(clean.class, 'class', { maxLength: 50 })
        const classType = optionalString(clean.type, 'type', { maxLength: 30 }) || 'Lecture'
        const startTime = requireTime(clean.startTime, 'startTime')
        const endTime = requireTime(clean.endTime, 'endTime')

        const { data: subData, error: subErr } = await supabase
          .from('subjects')
          .insert([{ name: subjectName, code: subjectName.substring(0, 4).toUpperCase() + '101' }])
          .select()
          .single()

        if (subErr || !subData) throw new Error(subErr?.message || "Subject build failure")

        for (const day of days) {
          const { data: classData, error: classErr } = await supabase
            .from('classes')
            .insert([{
              subject_id: subData.id,
              group_code: groupCode,
              type: classType,
              day_of_week: day,
              start_time: `${startTime}:00`,
              end_time: `${endTime}:00`,
              location: location || 'Main Hall'
            }])
            .select()
            .single()

          if (classErr || !classData) throw new Error(classErr?.message || "Class configuration failure")

          await supabase
            .from('enrollments')
            .insert([{ student_id: user.id, class_id: classData.id, sessions_total: 0, sessions_attended: 0 }])
        }
      }
      else if (clean.classId) {
        await supabase
          .from('enrollments')
          .insert([{ student_id: user.id, class_id: clean.classId, sessions_total: 0, sessions_attended: 0 }])
      }

      await loadStudentData(user.id)
      await triggerNotification('Schedule Updated', `${entry.subject || 'A class'} was added to your schedule.`, 'schedule')
    } catch (err) {
      console.error('Error adding schedule blocks:', err)
      throw err
    }
  }

  async function deleteSchedule(classId) {
    if (!user) return
    try {
      const { error } = await supabase
        .from('enrollments')
        .delete()
        .eq('student_id', user.id)
        .eq('class_id', classId)

      if (error) throw error
      await loadStudentData(user.id)
    } catch (err) {
      console.error('Error deleting schedule item:', err)
    }
  }

  // NOTE: see the comment above the student_scores/assessments read in
  // loadStudentData — this writes to a table the read path never looks at.
  async function addAssessment(entry) {
    if (!user) return
    try {
      const clean = pickAllowed(entry, ['subject', 'title', 'score', 'totalPossible'])
      const subjectName = requireString(clean.subject, 'subject', { maxLength: 150 })
      const title = requireString(clean.title, 'title', { maxLength: 150 })
      const score = requireNumber(clean.score, 'score', { min: 0, max: 100000 })
      const possible = requireNumber(clean.totalPossible, 'totalPossible', { min: 0, max: 100000 })

      const { error } = await supabase
        .from('assessments')
        .insert([
          {
            student_id: user.id,
            subject_name: subjectName,
            title,
            score,
            possible_score: possible
          }
        ])

      if (error) throw error
      await loadStudentData(user.id)
    } catch (err) {
      console.error('Error adding assessment log entry:', err)
      throw err
    }
  }

  // HARDENED: this used to insert straight into attendance_records with
  // client-computed `faceVerified`/`locationVerified` booleans, and
  // separately UPDATE the enrollment's attendance rate — meaning anyone
  // with DevTools open could call
  //   useApp().logAttendance(anyEnrollmentId, anySessionId, true, true)
  // and get marked Present for a class they aren't even enrolled in, with
  // zero verification, as many times as they liked.
  //
  // It now calls mark_attendance() (SECURITY DEFINER, see
  // supabase/002_mark_attendance_rpc.sql), which:
  //   - confirms the enrollment actually belongs to the calling student
  //   - confirms the session belongs to that enrollment's class
  //   - refuses duplicate check-ins for the same session
  //   - rate-limits check-in attempts per student
  //   - if this session requires location, RECOMPUTES the distance itself
  //     from the raw lat/lng passed in `locationPayload` — the client can no
  //     longer just assert "location_verified: true"
  //   - recomputes the attendance rate itself (client can no longer set it)
  //
  // `faceVerified` is still a plain client-reported boolean — the RPC can
  // reject `false` when the session requires Face ID, but it can't catch a
  // client that lies and sends `true` without actually matching, since the
  // comparison itself (face-api.js) runs entirely in the browser. Closing
  // that gap for real means sending the live face descriptor to the server
  // and comparing it against profiles.face_descriptor there (a euclidean
  // distance check is straightforward in plpgsql, no ML infra needed) —
  // left as a follow-up rather than done blind here, since it also touches
  // FaceEnrollment.jsx and how much biometric data you want transiting the
  // network per scan.
  async function logAttendance(enrollmentId, sessionId, faceVerified, locationPayload) {
    if (!user) throw new Error('No active session — please log in again.')
    try {
      const { data, error } = await supabase.rpc('mark_attendance', {
        p_enrollment_id: enrollmentId,
        p_session_id: sessionId,
        p_face_verified: !!faceVerified,
        p_latitude: locationPayload?.lat ?? null,
        p_longitude: locationPayload?.lng ?? null,
      })

      if (error) throw error

      await loadStudentData(user.id)
      return data
    } catch (err) {
      console.error('Error logging attendance session:', err)
      throw err
    }
  }

  async function triggerNotification(title, message, type = 'general') {
    if (!user) return
    try {
      const clean = {
        title: requireString(title, 'title', { maxLength: 150 }),
        message: requireString(message, 'message', { maxLength: 500 }),
        type: optionalString(type, 'type', { maxLength: 30 }) || 'general',
      }
      const { data, error } = await supabase
        .from('notifications')
        .insert([{ student_id: user.id, ...clean, read: false }])
        .select()
        .single()

      if (error) throw error
      setNotifications((prev) => [
        { id: data.id, title: data.title, message: data.message, type: data.type, read: false, time: new Date(data.created_at).toLocaleString() },
        ...prev
      ])
    } catch (err) {
      console.error('Error creating notification:', err)
    }
  }

  // FIXED (IDOR): these previously matched on `id` alone, with no check
  // that the notification belonged to the calling student. Any logged-in
  // user who could guess/enumerate a notification id could mark it read or
  // delete it — someone else's notification, not their own. Both now scope
  // to `student_id = user.id` too. This must ALSO be enforced in your
  // notifications RLS policy (see supabase/001_rls_policies.sql) — this
  // client-side filter is a defense-in-depth backstop, not the real fix.
  async function markAsRead(id) {
    if (!user) return
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .eq('student_id', user.id)
    if (error) console.error('Error marking notification read:', error)
  }

  async function markAllAsRead() {
    if (!user) return
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    const { error } = await supabase.from('notifications').update({ read: true }).eq('student_id', user.id)
    if (error) console.error('Error marking all notifications read:', error)
  }

  async function deleteNotification(id) {
    if (!user) return
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('student_id', user.id)
    if (error) console.error('Error deleting notification:', error)
  }

  async function clearAllNotifications() {
    if (!user) return
    setNotifications([])
    const { error } = await supabase.from('notifications').delete().eq('student_id', user.id)
    if (error) console.error('Error clearing notifications:', error)
  }

  const value = {
    user,
    setUser,
    updateProfile,
    saveFaceDescriptor,
    schedule,
    addSchedule,
    deleteSchedule,
    merits,
    addMerit,
    // FIXED: previously summed every claim's points regardless of status,
    // so a self-submitted, not-yet-reviewed claim inflated this total
    // immediately. Now only counts claims the admin has actually approved.
    // CONFIRM the exact status string your admin app writes on approval —
    // this assumes 'approved' (case-insensitive); update if yours differs.
    totalMerits: merits
      .filter((m) => (m.status || '').toLowerCase() === 'approved')
      .reduce((sum, m) => sum + Number(m.points || 0), 0),
    assessmentData,
    addAssessment,
    attendanceData,
    logAttendance,
    loadStudentData,
    notifications,
    triggerNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
  }

  if (!authChecked) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif', color: '#64748b' }}>
        Loading…
      </div>
    )
  }

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  return useContext(AppContext)
}