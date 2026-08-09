import { Route, Navigate, useLocation } from 'react-router-dom'
import { AppProvider, useApp } from './AppContext.jsx'
import { supabase } from './supabaseClient.js'
import AnimatedRoutes from './components/AnimatedRoutes.jsx'

import Login from './pages/Login.jsx'
import CreateAccount from './pages/CreateAccount.jsx'
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
import FaceEnrollment from './pages/FaceEnrollment.jsx'

// FIXED: previously nothing checked `user` before rendering a protected
// page — deep-linking or bookmarking e.g. /home while logged out rendered
// Home.jsx anyway with an empty/broken state instead of sending the visitor
// to /login. This doesn't replace RLS (Supabase would still refuse the
// underlying data either way) but it stops a logged-out visitor from ever
// reaching a broken page in the first place.
//
// authChecked already gates the very first paint (see AppContext.jsx), so
// by the time this renders, `user` being null reliably means "not logged
// in" rather than "still checking."
function RequireAuth({ children }) {
  const { user } = useApp()
  const location = useLocation()
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return children
}

export default function App() {
  return (
    <div className="phone">
      <AppProvider>
        <AnimatedRoutes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/createaccount" element={<CreateAccount />} />
          <Route path="/home" element={<RequireAuth><Home /></RequireAuth>} />
          <Route path="/account" element={<RequireAuth><Account /></RequireAuth>} />
          <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
          <Route path="/settings/change-password" element={<RequireAuth><ChangePassword /></RequireAuth>} />
          <Route path="/schedule" element={<RequireAuth><Schedule /></RequireAuth>} />
          <Route path="/schedule/add" element={<RequireAuth><AddSchedule /></RequireAuth>} />
          <Route path="/scanattendance" element={<RequireAuth><ScanAttendance /></RequireAuth>} />
          <Route path="/continuousassessment" element={<RequireAuth><ContinuousAssessment /></RequireAuth>} />
          <Route path="/attendance" element={<RequireAuth><AttendanceRecord /></RequireAuth>} />
          <Route path="/merits" element={<RequireAuth><Merits /></RequireAuth>} />
          <Route path="/merits/add" element={<RequireAuth><AddMerit /></RequireAuth>} />
          <Route path="/notification" element={<RequireAuth><Notification/></RequireAuth>} />
          <Route path="/profile/studentinfo" element={<RequireAuth><StudentInfo /></RequireAuth>} />
          <Route path="/profile/emergencycontact" element={<RequireAuth><EmergencyContact /></RequireAuth>} />
          <Route path="/account/faceid" element={<RequireAuth><FaceEnrollment /></RequireAuth>} />
        </AnimatedRoutes>
      </AppProvider>
    </div>
  )
}