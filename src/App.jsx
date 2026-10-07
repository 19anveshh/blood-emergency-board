import { Navigate, Route, Routes } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import BloodBoardPage from './pages/BloodBoardPage'
import HospitalDashboard from './pages/HospitalDashboard'
import CreateRequestPage from './pages/CreateRequestPage'
import DonorDashboard from './pages/DonorDashboard'
import MatchingPage from './pages/MatchingPage'
import RequestDetailsPage from './pages/RequestDetailsPage'
import AdminDashboard from './pages/AdminDashboard'
import { GuestRoute, ProtectedRoute } from './auth/RouteGuards'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route path="/board" element={<BloodBoardPage />} />
      <Route element={<ProtectedRoute roles={['HOSPITAL']} />}>
        <Route path="/hospital" element={<HospitalDashboard />} />
        <Route path="/hospital/requests/new" element={<CreateRequestPage />} />
      </Route>
      <Route element={<ProtectedRoute roles={['DONOR']} />}>
        <Route path="/donor" element={<DonorDashboard />} />
      </Route>
      <Route element={<ProtectedRoute roles={['ADMIN']} />}>
        <Route path="/admin" element={<AdminDashboard />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route path="/matching/:requestId" element={<MatchingPage />} />
        <Route path="/requests/:requestId" element={<RequestDetailsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
