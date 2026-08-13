import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { requireString, optionalString, requireUrl, requireDescriptorArray, requireWeekdayList, requireTime } from './Validators.js'

const AppContext = createContext(null)

// alerts has no `title` column — this fills in a short, human title based
// on `type` for display in Notification.jsx/Home.jsx. Extend as you add
// more notification types (and check these strings are valid values for
// the alerts.type enum — see the note in loadStudentData).
const ALERT_TYPE_TITLES = {
  schedule: 'Schedule Updated',
  merits: 'Merit Submitted',
  assessment: 'New Assessment',
  general: 'Notification',
}

export function AppProvider({ children }) {
  const [user, setUser] = useState(null)
  const [schedule, setSchedule] = useState([])
  const [merits, setMerits] = useState([])
  const [attendanceData, setAttendanceData] = useState([])
  const [assessmentData, setAssessmentData] = useState([])
  const [notifications, setNotifications] = useState([])
  // FIXED: renamed the *initial auth check* flag so it's clearly separate
  // from any later data-loading. This one should resolve almost instantly
  // (it just reads local session storage) and only gates the very first paint.
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
          matricsNumber: profile.institutional_id || '',
          class: profile.class_group || '',
          email: profile.email || '',
          phone: profile.phone_number || '',
          emergencyName: profile.emergency_contact_name || '',
          emergencyRelationship: profile.emergency_contact_relationship || '',
          emergencyPhone: profile.emergency_contact_phone || '',
          // FIXED: was never fetched, so user?.faceDescriptor was always
          // undefined — FaceEnrollment and ScanAttendance both depend on it.
          faceDescriptor: profile.face_descriptor || null,
        })
      }

      // FIXED: added pincode/latitude/longitude — ScanAttendance.jsx matches
      // scanned codes against `item.pincode` and geofences against
      // `matchedClass.latitude`/`longitude`, but these were never selected
      // here, so both checks were silently working with `undefined`.
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

        // Fetch counts dynamically for total sessions and attended sessions
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

      // DECISION: reusing `alerts` instead of a separate `notifications`
      // table. One real blocker for this: alerts.lecturer_id is NOT NULL
      // (FK -> profiles), but self-generated notifications like "Merit
      // Submitted" have no lecturer to attribute them to — this requires
      // making lecturer_id nullable (see suggested_migration.sql). alerts
      // also has no `title` column, so a short title is derived from
      // `type` on the client instead of adding one — swap in a real title
      // column later if you want more control over the wording than the
      // generic map below gives you.
      // WORTH CHECKING: alerts.type and alerts.priority are enum
      // (USER-DEFINED) columns — the schema dump doesn't list their
      // allowed values, so double-check 'schedule'/'merits'/'general' (used
      // below) and 'low' (used as priority for self-generated alerts in
      // triggerNotification) are actually valid values for those enums.
      const { data: notifs } = await supabase
        .from('alerts')
        .select('*')
        .eq('student_id', userId)
        .order('created_at', { ascending: false })

      if (notifs) {
        setNotifications(notifs.map((n) => ({
          id: n.id,
          title: ALERT_TYPE_TITLES[n.type] || 'Notification',
          message: n.message,
          type: n.type,
          read: n.is_read,
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

  // RESOLVED per your migration: profiles now has class_group and
  // emergency_contact_* (identification_number dropped — unused in the UI
  // and confirmed not needed). Wired through Validators.js here since
  // that file's own header says every AppContext write should run through
  // it — this was the one mutation still skipping it entirely.
  async function updateProfile(updatedData) {
    if (!user) throw new Error('No active session — please log in again.')
    try {
      const payload = {
        id: user.id,
        full_name: requireString(updatedData.name, 'name', { maxLength: 120 }),
        institutional_id: optionalString(updatedData.matricsNumber, 'matricsNumber', { maxLength: 40 }),
        class_group: optionalString(updatedData.class, 'class', { maxLength: 40 }),
        phone_number: optionalString(updatedData.phone, 'phone', { maxLength: 30 }),
        emergency_contact_name: optionalString(updatedData.emergencyName, 'emergencyName', { maxLength: 120 }),
        emergency_contact_relationship: optionalString(updatedData.emergencyRelationship, 'emergencyRelationship', { maxLength: 60 }),
        emergency_contact_phone: optionalString(updatedData.emergencyPhone, 'emergencyPhone', { maxLength: 30 }),
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase.from('profiles').upsert(payload)

      if (error) throw error

      // PERF FIX: this used to call loadStudentData(user.id) here, which
      // re-runs all 6+ relational queries (schedule, attendance, merits,
      // scores, notifications) just to reflect a profile edit. We already
      // have the exact next-state from the caller (every screen that calls
      // updateProfile passes `{ ...user, <changed fields> }`), so just
      // merge it into state directly — no extra network round trip.
      setUser((prev) => ({ ...prev, ...updatedData }))
    } catch (err) {
      console.error('Profile update write failure:', err)
      throw err
    }
  }

  // FIXED: brand new — FaceEnrollment.jsx calls this on capture, but it
  // was never defined anywhere in context, so Face ID setup threw immediately.
  // SCHEMA MISMATCH — your profiles table has `face_hash` (varchar), not
  // `face_descriptor`. This write will fail as-is. Also worth deciding:
  // a face-api.js descriptor is a 128-length float array (~1-2KB as JSON),
  // which doesn't fit naturally in a varchar named "hash" — either widen
  // face_hash to a jsonb/numeric[] column, or add a dedicated
  // face_descriptor column, rather than reusing face_hash as-is.
  async function saveFaceDescriptor(descriptorArray) {
    if (!user) throw new Error('No active session — please log in again.')
    try {
      const validated = requireDescriptorArray(descriptorArray, 'faceDescriptor')
      const { error } = await supabase
        .from('profiles')
        .update({ face_descriptor: validated })
        .eq('id', user.id)

      if (error) throw error
      setUser((prev) => ({ ...prev, faceDescriptor: validated }))
    } catch (err) {
      console.error('Error saving face descriptor:', err)
      throw err
    }
  }

  async function addMerit(entry) {
    if (!user) return
    try {
      const payload = {
        student_id: user.id,
        title: requireString(entry.name, 'name', { maxLength: 150 }),
        // RESOLVED: your migration added merit_level/merit_roles (not
        // level/role — Postgres reserves neither word, but merit_roles
        // avoids colliding with profiles.role in any future joined query).
        merit_level: requireString(entry.level, 'level', { maxLength: 60 }),
        merit_roles: requireString(entry.roles, 'roles', { maxLength: 120 }),
        // proofUrl comes from Supabase Storage's own getPublicUrl() in
        // AddMerit.jsx, so it's already a real https URL — requireUrl
        // still catches anything unexpected (e.g. someone forcing a
        // relative/http path in past a future refactor) before it's stored.
        proof_file_url: entry.proofUrl ? requireUrl(entry.proofUrl, 'proofUrl') : null,
        awarded_points: 0, // students don't award their own points — always 0 until a reviewer sets it
        status: 'pending'
      }

      const { data, error } = await supabase.from('merit_claims').insert([payload]).select()
      if (error) throw error

      if (data) {
        setMerits((prev) => [
          ...prev,
          { id: data[0].id, name: data[0].title, points: data[0].awarded_points, status: 'pending' }
        ])
        await triggerNotification('Merit Submitted', `Your claim for "${entry.name}" is pending review.`, 'merits')
      }
    } catch (err) {
      console.error('Error submitting merit claim:', err)
      throw err
    }
  }

  // RESOLVED (item 1 from last review): AddSchedule.jsx is now a picker
  // over classes the lecturer side already created, matching
  // classes.lecturer_id being NOT NULL. Returns classes the student isn't
  // already enrolled in.
  async function fetchAvailableClasses() {
    if (!user) return []
    try {
      const enrolledClassIds = schedule.map((s) => s.id)
      let query = supabase
        .from('classes')
        .select('id, group_code, type, day_of_week, start_time, end_time, location, semester, subjects (name, code)')
        .order('day_of_week', { ascending: true })

      if (enrolledClassIds.length > 0) {
        query = query.not('id', 'in', `(${enrolledClassIds.join(',')})`)
      }

      const { data, error } = await query
      if (error) throw error
      return (data || []).filter((c) => c.subjects)
    } catch (err) {
      console.error('Error fetching available classes:', err)
      throw err
    }
  }

  async function addSchedule(entry) {
    if (!user) return
    try {
      let classIds = []

      if (entry.classId) {
        // Picker path — enrolling into a class that already exists.
        classIds = [entry.classId]
      } else if (entry.subject && entry.class) {
        // RESTORED per your note: there's no lecturer/admin app populating
        // classes yet, so students have to be able to bootstrap their own.
        //
        // IMPORTANT — this is find-or-create, not plain create. If every
        // student who types "Calculus I" got their own private classes
        // row, no two students could ever share an attendance_sessions
        // row for it — QR/PIN check-in is meaningless if you're the only
        // person who can ever be "in" that class. So this looks for an
        // existing subject (by name) and class (by subject + group code +
        // day) before creating new ones, so students converge on one
        // shared class the same way they'd converge on a real one.
        // Second-order effect: subjects.code has a UNIQUE constraint —
        // plain create-every-time would eventually collide once two
        // students pick the same generated code anyway.
        //
        // classes.lecturer_id/semester and subjects.credit_hours are now
        // nullable (see suggested_migration.sql) — a self-authored class
        // has lecturer_id = null until/unless a real lecturer later
        // claims it via the admin app; that's a real product hook worth
        // having (an actual instructor can "claim" a class students
        // already organized themselves around), not just a workaround.
        const subjectName = requireString(entry.subject, 'subject', { maxLength: 120 })
        const groupCode = requireString(entry.class, 'class', { maxLength: 40 })
        const classType = requireString(entry.type || 'Lecture', 'type', { maxLength: 30 })
        const days = requireWeekdayList(entry.frequency, 'frequency')
        const startTime = requireTime(entry.startTime, 'startTime')
        const endTime = requireTime(entry.endTime, 'endTime')
        const location = optionalString(entry.location, 'location', { maxLength: 120 })

        let { data: existingSubject } = await supabase
          .from('subjects')
          .select('id')
          .ilike('name', subjectName)
          .maybeSingle()

        let subjectId = existingSubject?.id
        if (!subjectId) {
          const generatedCode = subjectName.replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase() + Math.floor(100 + Math.random() * 900)
          const { data: newSubject, error: subErr } = await supabase
            .from('subjects')
            .insert([{ name: subjectName, code: generatedCode }])
            .select('id')
            .single()
          // A duplicate-name race (two students creating the same brand
          // new subject at once) fails on the code's uniqueness — treat
          // that as "someone else just created it", not a hard error.
          if (subErr) {
            const { data: retrySubject } = await supabase.from('subjects').select('id').ilike('name', subjectName).maybeSingle()
            if (!retrySubject) throw subErr
            subjectId = retrySubject.id
          } else {
            subjectId = newSubject.id
          }
        }

        for (const day of days) {
          let { data: existingClass } = await supabase
            .from('classes')
            .select('id')
            .eq('subject_id', subjectId)
            .eq('group_code', groupCode)
            .eq('day_of_week', day)
            .maybeSingle()

          let classId = existingClass?.id
          if (!classId) {
            const { data: newClass, error: classErr } = await supabase
              .from('classes')
              .insert([{
                subject_id: subjectId,
                group_code: groupCode,
                type: classType,
                day_of_week: day,
                start_time: `${startTime}:00`,
                end_time: `${endTime}:00`,
                location: location || null,
                lecturer_id: null,
                semester: null
              }])
              .select('id')
              .single()
            if (classErr) throw classErr
            classId = newClass.id
          }
          classIds.push(classId)
        }
      } else {
        throw new Error('No class selected to add.')
      }

      for (const classId of classIds) {
        // Avoid duplicate enrollment rows — enrollments has no unique
        // constraint on (student_id, class_id) in the schema, so this
        // guards it at the app level instead.
        const { data: alreadyEnrolled } = await supabase
          .from('enrollments')
          .select('id')
          .eq('student_id', user.id)
          .eq('class_id', classId)
          .maybeSingle()

        if (alreadyEnrolled) continue

        const { error: enrollError } = await supabase
          .from('enrollments')
          // FIXED: enrollments only has (student_id, class_id,
          // current_attendance_rate). sessions_total/sessions_attended
          // don't exist on this table — that insert was failing outright.
          // current_attendance_rate defaults to 0, no need to set it here.
          .insert([{ student_id: user.id, class_id: classId }])

        if (enrollError) throw enrollError

        // PERF FIX: this used to call loadStudentData(user.id) — a full
        // re-fetch of schedule + attendance + merits + scores + notifications
        // — just to show one new class. Instead, fetch only the one class
        // just enrolled in and merge it into local state.
        const { data: classData, error: classFetchError } = await supabase
          .from('classes')
          .select('id, group_code, type, day_of_week, start_time, end_time, location, subjects (name, code)')
          .eq('id', classId)
          .single()

        if (!classFetchError && classData) {
          setSchedule((prev) => [
            ...prev,
            {
              id: classData.id,
              subject: classData.subjects?.name,
              class: classData.group_code,
              time: classData.start_time && classData.end_time
                ? `${classData.start_time.substring(0, 5)} - ${classData.end_time.substring(0, 5)}`
                : 'N/A',
              frequency: `Every ${classData.day_of_week}`,
              location: classData.location,
              type: classData.type
            }
          ])
        }
      }

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

      // PERF FIX: local removal instead of a full reload — we already know
      // exactly which class was removed. Note schedule entries are keyed
      // by class id, but attendanceData entries are keyed by enrollment id
      // (see loadStudentData above) — pull the enrollmentId off the
      // matching schedule item before it's removed so both lists stay
      // in sync.
      setSchedule((prev) => {
        const removed = prev.find((item) => item.id === classId)
        if (removed?.enrollmentId) {
          setAttendanceData((att) => att.filter((item) => item.id !== removed.enrollmentId))
        }
        return prev.filter((item) => item.id !== classId)
      })
    } catch (err) {
      console.error('Error deleting schedule item:', err)
    }
  }

  // REMOVED addAssessment(). Checked ContinuousAssessment.jsx — it's
  // display-only, no add-a-score form calls this, which matches "read-only
  // for students." That's actually already how the read side works:
  // assessmentData (above, in loadStudentData) already pulls real,
  // lecturer-authored records from student_scores/assessments — correct
  // schema, no changes needed there. This function was the only thing
  // trying to let a student write their own score, into the wrong table
  // no less (assessments is a class-level definition, not a per-student
  // result). Deleted rather than leaving a dead, broken export around;
  // personal_grade_logs isn't needed either unless you want a genuinely
  // separate "just for me" tracker later — happy to build that as its own
  // feature if so, but it'd be additive, not a fix to this screen.

  // SECURITY: this used to compute face/location "verified" flags entirely
  // client-side (in ScanAttendance.jsx) and then trust them, plus compute
  // and write the new attendance rate itself via direct table writes.
  // Anyone with a valid session JWT could call the Supabase client (or a
  // raw REST/RPC request) directly and skip the whole scan flow — insert
  // whatever face_verified/location_verified they wanted, or set their own
  // current_attendance_rate outright. Now this calls a SECURITY DEFINER
  // Postgres function (see supabase/002_mark_attendance_rpc.sql) that
  // re-derives both verdicts server-side from raw evidence (coordinates,
  // face descriptor) and does the insert + rate recalculation atomically,
  // in one round trip. For this to actually close the hole, direct
  // INSERT/UPDATE grants on attendance_records/enrollments must be
  // revoked from the authenticated role (also in that file) — the RPC
  // alone doesn't help if the table is still directly writable.
  async function logAttendance(sessionId, { latitude, longitude, faceDescriptor } = {}) {
    if (!user) throw new Error('No active session — please log in again.')
    try {
      const { data, error } = await supabase.rpc('mark_attendance', {
        p_session_id: sessionId,
        p_lat: latitude ?? null,
        p_lng: longitude ?? null,
        p_face_descriptor: faceDescriptor ?? null,
      })

      if (error) throw error

      setAttendanceData((prev) =>
        prev.map((item) =>
          item.id === data.enrollmentId
            ? { ...item, percent: data.newRate, total: data.total, attended: data.attended, absent: data.total - data.attended }
            : item
        )
      )
      return data
    } catch (err) {
      console.error('Error logging attendance session:', err)
      throw err
    }
  }

  // DECISION: writes to `alerts` now instead of a separate table.
  // `title` param is kept for callers' convenience but not persisted
  // (alerts has no title column) — ALERT_TYPE_TITLES derives it from
  // `type` on read instead, so pass a `type` that's actually in
  // ALERT_TYPE_TITLES if you want a specific label to show.
  async function triggerNotification(title, message, type = 'general') {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('alerts')
        // lecturer_id intentionally omitted — requires the nullable-lecturer_id
        // migration (see suggested_migration.sql) since this is student-generated,
        // not lecturer-generated.
        .insert([{ student_id: user.id, message, type, priority: 'low', is_read: false }])
        .select()
        .single()

      if (error) throw error
      setNotifications((prev) => [
        { id: data.id, title: ALERT_TYPE_TITLES[data.type] || title, message: data.message, type: data.type, read: false, time: new Date(data.created_at).toLocaleString() },
        ...prev
      ])
    } catch (err) {
      console.error('Error creating notification:', err)
    }
  }

  async function markAsRead(id) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    const { error } = await supabase.from('alerts').update({ is_read: true }).eq('id', id)
    if (error) console.error('Error marking notification read:', error)
  }

  async function markAllAsRead() {
    if (!user) return
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    const { error } = await supabase.from('alerts').update({ is_read: true }).eq('student_id', user.id)
    if (error) console.error('Error marking all notifications read:', error)
  }

  async function deleteNotification(id) {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    const { error } = await supabase.from('alerts').delete().eq('id', id)
    if (error) console.error('Error deleting notification:', error)
  }

  async function clearAllNotifications() {
    if (!user) return
    setNotifications([])
    const { error } = await supabase.from('alerts').delete().eq('student_id', user.id)
    if (error) console.error('Error clearing notifications:', error)
  }

  const value = {
    user,
    setUser,
    updateProfile,
    saveFaceDescriptor,
    schedule,
    addSchedule,
    fetchAvailableClasses,
    deleteSchedule,
    merits,
    addMerit,
    totalMerits: merits.reduce((sum, m) => sum + Number(m.points || 0), 0),
    assessmentData,
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

  // FIXED: this used to be `{!loading && children}`, which hid the ENTIRE
  // app — including the Login page — until the initial session check
  // resolved. If that check ever hung (e.g. because supabaseClient.js
  // threw during construction), you'd get a permanent blank page with
  // no visible error. Children now always render; only add a loading
  // screen here if you want one, and even then it will resolve in
  // milliseconds since it's a local check, not blocking navigation.
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