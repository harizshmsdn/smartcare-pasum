import { Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './AppContext.jsx'
import { supabase } from './supabaseClient.js'

import Login from './pages/Login.jsx'
import Home from './pages/Home.jsx'
import Account from './pages/Account.jsx'
import Settings from './pages/Settings.jsx'
import ChangePassword from './pages/ChangePassword.jsx'
import Schedule from './pages/Schedule.jsx'
import AddSchedule from './pages/AddSchedule.jsx'
import ScanAttendance from './pages/ScanAttendance.jsx'
import ContinuousAssessment from './pages/ContinuousAssessment.jsx'
import AttendanceRecord from './pages/AttendanceRecord.jsx'
import Merits from './pages/Merits.jsx'
import AddMerit from './pages/AddMerit.jsx'
import Notification from './pages/Notification.jsx'
import StudentInfo from './pages/StudentInfo.jsx'
import EmergencyContact from './pages/EmergencyContact.jsx'

export default function App() {
  return (
    <div className="phone">
      <AppProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/home" element={<Home />} />
          <Route path="/account" element={<Account />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/change-password" element={<ChangePassword />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/schedule/add" element={<AddSchedule />} />
          <Route path="/scanattendance" element={<ScanAttendance />} />
          <Route path="/continuousassessment" element={<ContinuousAssessment />} />
          <Route path="/attendance" element={<AttendanceRecord />} />
          <Route path="/merits" element={<Merits />} />
          <Route path="/merits/add" element={<AddMerit />} />
          <Route path="/notification" element={<Notification/>} />
          <Route path="/profile/studentinfo" element={<StudentInfo />} />
          <Route path="/profile/emergencycontact" element={<EmergencyContact />} />
        </Routes>
      </AppProvider>
    </div>
  )
}
