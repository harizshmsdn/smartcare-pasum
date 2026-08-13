import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { requireString, optionalString, requireUrl, requireDescriptorArray, requireWeekdayList, requireTime } from './Validators.js'

const AppContext = createContext(null)

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

      setUser((prev) => ({ ...prev, ...updatedData }))
    } catch (err) {
      console.error('Profile update write failure:', err)
      throw err
    }
  }

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
        merit_level: requireString(entry.level, 'level', { maxLength: 60 }),
        merit_roles: requireString(entry.roles, 'roles', { maxLength: 120 }),
        proof_file_url: entry.proofUrl ? requireUrl(entry.proofUrl, 'proofUrl') : null,
        awarded_points: 0,
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
        classIds = [entry.classId]
      } else if (entry.subject && entry.class) {
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
        const { data: alreadyEnrolled } = await supabase
          .from('enrollments')
          .select('id')
          .eq('student_id', user.id)
          .eq('class_id', classId)
          .maybeSingle()

        if (alreadyEnrolled) continue

        const { error: enrollError } = await supabase
          .from('enrollments')
          .insert([{ student_id: user.id, class_id: classId }])

        if (enrollError) throw enrollError

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
  async function triggerNotification(title, message, type = 'general') {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('alerts')
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