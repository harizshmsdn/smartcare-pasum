//mock data for testing purposes
import { createContext, useContext, useState } from 'react'

const AppContext = createContext(null)

const initialSchedule = [
  { id: 1, subject: 'Physics', class: 'BT2', time: '02:00 PM - 03:00 PM', frequency: 'Every Tuesday' },
  { id: 2, subject: 'Physics', class: 'BT2', time: '02:00 PM - 03:00 PM', frequency: 'Every Tuesday' },
]

const initialMerits = [
  { id: 1, name: 'Majlis Anugerah Emas', points: 5 },
  { id: 2, name: 'Sukan Asasi Malaysia', points: 15 },
  { id: 3, name: 'Sukmum Bola Jaring KK11', points: 10 },
]

const assessmentData = [
  { subject: 'Physics', percent: 40, items: [['Quiz 1', '10/10'], ['Midterm', '20/20'], ['Lab Report', '10/10']] },
  { subject: 'Chemistry', percent: 34, items: [['Quiz 1', '8/10'], ['Midterm', '16/20'], ['Lab Report', '10/10']] },
  { subject: 'Programming', percent: 40, items: [['Quiz 1', '10/10'], ['Midterm', '20/20'], ['Tutorial', '10/10']] },
]

const attendanceData = [
  { subject: 'Physics', percent: 100, total: 25, attended: 25, absent: 0 },
  { subject: 'Chemistry', percent: 90, total: 20, attended: 18, absent: 2 },
  { subject: 'Programming', percent: 60, total: 25, attended: 15, absent: 10 },
]

export function AppProvider({ children }) {
  const [user, setUser] = useState({
    name: '',
    identificationNumber: '',
    matricsNumber: '',
    class: '',
    phone: '',
  })

  const [schedule, setSchedule] = useState(initialSchedule)
  const [merits, setMerits] = useState(initialMerits)

  function addSchedule(entry) {
    setSchedule((prev) => [...prev, { id: Date.now(), ...entry }])
  }

  // FIXED: Changed setSchedules to setSchedule
  function deleteSchedule(id) {
    setSchedule((prev) => prev.filter((item) => String(item.id) !== String(id)))
  }

  function addMerit(entry) {
    setMerits((prev) => [...prev, { id: Date.now(), ...entry }])
  }

  const value = {
    user,
    setUser,
    schedule,
    addSchedule,
    deleteSchedule, // FIXED: Exported deleteSchedule so useApp() can access it
    merits,
    addMerit,
    totalMerits: merits.reduce((sum, m) => sum + Number(m.points || 0), 0),
    assessmentData,
    attendanceData,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  return useContext(AppContext)
}