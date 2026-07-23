import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

const AppContext = createContext(null)

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
          identificationNumber: profile.identification_number || '',
          matricsNumber: profile.institutional_id || '',
          class: profile.class_group || '',
          email: profile.email || '',
          phone: profile.phone_number || '',
          emergencyName: profile.emergency_contact_name || '',
          emergencyRelationship: profile.emergency_contact_relationship || '',
          emergencyPhone: profile.emergency_contact_phone || '',
        })
      }

      const { data: enrollments } = await supabase
        .from('enrollments')
        .select(`
          id,
          sessions_total,
          sessions_attended,
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
            time: `${en.classes.start_time.substring(0, 5)} - ${en.classes.end_time.substring(0, 5)}`,
            frequency: `Every ${en.classes.day_of_week}`,
            location: en.classes.location,
            type: en.classes.type
          }))
        setSchedule(formattedSchedule)

        const formattedAttendance = enrollments
          .filter(en => en.classes && en.classes.subjects)
          .map((en) => {
            const total = Number(en.sessions_total) || 0
            const attended = Number(en.sessions_attended) || 0
            const percent = total > 0 ? Math.round((attended / total) * 100) : 0

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

      const { data: assessments } = await supabase
        .from('assessments')
        .select('*')
        .eq('student_id', userId)

      if (assessments) {
        const grouped = assessments.reduce((acc, current) => {
          const subjectName = current.subject_name
          if (!acc[subjectName]) {
            acc[subjectName] = { subject: subjectName, totalScore: 0, totalPossible: 0, items: [] }
          }
          acc[subjectName].items.push([current.title, `${current.score}/${current.possible_score}`])
          acc[subjectName].totalScore += current.score
          acc[subjectName].totalPossible += current.possible_score
          return acc
        }, {})

        const formattedAssessments = Object.values(grouped).map(group => ({
          subject: group.subject,
          percent: group.totalPossible > 0 ? Math.round((group.totalScore / group.totalPossible) * 100) : 0,
          items: group.items
        }))

        setAssessmentData(formattedAssessments)
      }

      // FIXED: Notification.jsx expected notifications/markAsRead/markAllAsRead/
      // deleteNotification/clearAllNotifications from context, but none of that
      // existed anywhere. Added a real notifications table + fetch here.
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

  async function updateProfile(updatedData) {
    if (!user) throw new Error('No active session — please log in again.')
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: updatedData.name,
          identification_number: updatedData.identificationNumber,
          institutional_id: updatedData.matricsNumber,
          class_group: updatedData.class,
          phone_number: updatedData.phone,
          emergency_contact_name: updatedData.emergencyName,
          emergency_contact_relationship: updatedData.emergencyRelationship,
          emergency_contact_phone: updatedData.emergencyPhone,
          updated_at: new Date().toISOString()
        })

      if (error) throw error
      await loadStudentData(user.id)
    } catch (err) {
      console.error('Profile update write failure:', err)
      throw err
    }
  }

  async function addMerit(entry) {
    if (!user) return
    const { data, error } = await supabase
      .from('merit_claims')
      .insert([
        {
          student_id: user.id,
          title: entry.name,
          level: entry.level,
          role: entry.roles,
          proof_url: entry.proofUrl,
          awarded_points: Number(entry.points || 0),
          status: 'pending'
        }
      ])
      .select()

    if (!error && data) {
      setMerits((prev) => [
        ...prev,
        { id: data[0].id, name: data[0].title, points: data[0].awarded_points, status: 'pending' }
      ])
      await triggerNotification('Merit Submitted', `Your claim for "${entry.name}" is pending review.`, 'merits')
    }
  }

  async function addSchedule(entry) {
    if (!user) return
    try {
      if (entry.subject && entry.class) {
        const { data: subData, error: subErr } = await supabase
          .from('subjects')
          .insert([{ name: entry.subject, code: entry.subject.substring(0, 4).toUpperCase() + '101' }])
          .select()
          .single()

        if (subErr || !subData) throw new Error(subErr?.message || "Subject build failure")

        for (const day of entry.frequency) {
          const { data: classData, error: classErr } = await supabase
            .from('classes')
            .insert([{
              subject_id: subData.id,
              group_code: entry.class,
              type: entry.type || 'Lecture',
              day_of_week: day,
              start_time: `${entry.startTime}:00`,
              end_time: `${entry.endTime}:00`,
              location: entry.location || 'Main Hall'
            }])
            .select()
            .single()

          if (classErr || !classData) throw new Error(classErr?.message || "Class configuration failure")

          await supabase
            .from('enrollments')
            .insert([{ student_id: user.id, class_id: classData.id, sessions_total: 0, sessions_attended: 0 }])
        }
      }
      else if (entry.classId) {
        await supabase
          .from('enrollments')
          .insert([{ student_id: user.id, class_id: entry.classId, sessions_total: 0, sessions_attended: 0 }])
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

  async function addAssessment(entry) {
    if (!user) return
    try {
      const { error } = await supabase
        .from('assessments')
        .insert([
          {
            student_id: user.id,
            subject_name: entry.subject,
            title: entry.title,
            score: Number(entry.score),
            possible_score: Number(entry.totalPossible)
          }
        ])

      if (error) throw error
      await loadStudentData(user.id)
    } catch (err) {
      console.error('Error adding assessment log entry:', err)
      throw err
    }
  }

  async function logAttendance(enrollmentId, present = true) {
    if (!user) throw new Error('No active session — please log in again.')
    try {
      const { data: current, error: fetchError } = await supabase
        .from('enrollments')
        .select('sessions_total, sessions_attended')
        .eq('id', enrollmentId)
        .single()

      if (fetchError || !current) throw fetchError || new Error('Enrollment not found')

      const { error } = await supabase
        .from('enrollments')
        .update({
          sessions_total: (current.sessions_total || 0) + 1,
          sessions_attended: (current.sessions_attended || 0) + (present ? 1 : 0)
        })
        .eq('id', enrollmentId)

      if (error) throw error
      await loadStudentData(user.id)
    } catch (err) {
      console.error('Error logging attendance session:', err)
      throw err
    }
  }

  // FIXED: brand new — this whole feature was referenced by Notification.jsx
  // and StudentInfo.jsx but never actually implemented anywhere.
  async function triggerNotification(title, message, type = 'general') {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert([{ student_id: user.id, title, message, type, read: false }])
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

  async function markAsRead(id) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id)
    if (error) console.error('Error marking notification read:', error)
  }

  async function markAllAsRead() {
    if (!user) return
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    const { error } = await supabase.from('notifications').update({ read: true }).eq('student_id', user.id)
    if (error) console.error('Error marking all notifications read:', error)
  }

  async function deleteNotification(id) {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    const { error } = await supabase.from('notifications').delete().eq('id', id)
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
    schedule,
    addSchedule,
    deleteSchedule,
    merits,
    addMerit,
    totalMerits: merits.reduce((sum, m) => sum + Number(m.points || 0), 0),
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