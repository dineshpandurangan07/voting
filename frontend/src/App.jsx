import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import DashboardLayout from './components/Layout/DashboardLayout';
import ProtectedRoute from './components/common/ProtectedRoute';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const VoterDashboard = lazy(() => import('./pages/VoterDashboard'));
const Elections = lazy(() => import('./pages/Elections'));
const ElectionDetails = lazy(() => import('./pages/ElectionDetails'));
const CreateElection = lazy(() => import('./pages/CreateElection'));
const Candidates = lazy(() => import('./pages/Candidates'));
const Voters = lazy(() => import('./pages/Voters'));
const VotingPage = lazy(() => import('./pages/VotingPage'));
const Results = lazy(() => import('./pages/Results'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Security = lazy(() => import('./pages/Security'));
const AuditLogs = lazy(() => import('./pages/AuditLogs'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));

function Loader() {
  return (
    <div className="flex items-center justify-center h-screen">
      <span className="animate-spin w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full"></span>
    </div>
  );
}

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" />;
  return user.role === 'voter' ? <Navigate to="/voter-dashboard" /> : <Navigate to="/dashboard" />;
}

function AppRoutes() {
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<HomeRedirect />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={
            <RoleGate roles={['super_admin', 'election_officer', 'auditor']}>
              <AdminDashboard />
            </RoleGate>
          } />
          <Route path="/voter-dashboard" element={
            <RoleGate roles={['voter']}>
              <VoterDashboard />
            </RoleGate>
          } />
          <Route path="/elections" element={
            <RoleGate roles={['super_admin', 'election_officer', 'auditor']}>
              <Elections />
            </RoleGate>
          } />
          <Route path="/elections/new" element={
            <RoleGate roles={['super_admin', 'election_officer']}>
              <CreateElection />
            </RoleGate>
          } />
          <Route path="/elections/:id" element={<ElectionDetails />} />
          <Route path="/elections/:id/vote" element={<VotingPage />} />
          <Route path="/candidates" element={
            <RoleGate roles={['super_admin', 'election_officer']}>
              <Candidates />
            </RoleGate>
          } />
          <Route path="/voters" element={
            <RoleGate roles={['super_admin', 'election_officer']}>
              <Voters />
            </RoleGate>
          } />
          <Route path="/results/:electionId" element={<Results />} />
          <Route path="/analytics" element={
            <RoleGate roles={['super_admin', 'election_officer', 'auditor']}>
              <Analytics />
            </RoleGate>
          } />
          <Route path="/security" element={
            <RoleGate roles={['super_admin', 'election_officer', 'auditor']}>
              <Security />
            </RoleGate>
          } />
          <Route path="/audit-logs" element={
            <RoleGate roles={['super_admin', 'auditor']}>
              <AuditLogs />
            </RoleGate>
          } />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<HomeRedirect />} />
        </Route>
      </Route>
    </Routes>
    </Suspense>
  );
}

function RoleGate({ roles, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (!roles.includes(user.role)) {
    return user.role === 'voter' ? <Navigate to="/voter-dashboard" /> : <Navigate to="/dashboard" />;
  }
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster position="top-right" toastOptions={{ style: { borderRadius: '8px', fontSize: '14px' } }} />
      </BrowserRouter>
    </AuthProvider>
  );
}