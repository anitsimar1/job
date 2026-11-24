/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Toast } from './components/common/Toast';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { HomePage } from './pages/HomePage';
import { AuthPage } from './pages/AuthPage';
import { FindJobsPage } from './pages/FindJobsPage';
import { JobDetailsPage } from './pages/JobDetailsPage';
import { ApplyJobPage } from './pages/ApplyJobPage';
import { MyApplicationsPage } from './pages/MyApplicationsPage';
import { DashboardPage } from './pages/DashboardPage';
import { EmployerDashboardPage } from './pages/EmployerDashboardPage';
import { ProfileResumePage } from './pages/ProfileResumePage';
import { AdminConsolePage } from './pages/AdminConsolePage';
import { OAuthCallbackPage } from './pages/OAuthCallbackPage';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <ScrollToTop />
        <Toast />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/register" element={<AuthPage />} />
          <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
          <Route path="/oauth2/callback" element={<OAuthCallbackPage />} />
          <Route path="/jobs" element={<FindJobsPage />} />
          <Route path="/jobs/:id" element={<JobDetailsPage />} />
          <Route
            path="/apply"
            element={
              <ProtectedRoute allowedRoles={['JOB_SEEKER', 'ADMIN']}>
                <ApplyJobPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/apply/:id"
            element={
              <ProtectedRoute allowedRoles={['JOB_SEEKER', 'ADMIN']}>
                <ApplyJobPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/applications"
            element={
              <ProtectedRoute allowedRoles={['JOB_SEEKER', 'ADMIN']}>
                <MyApplicationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['JOB_SEEKER', 'ADMIN']}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employer/dashboard"
            element={
              <ProtectedRoute allowedRoles={['EMPLOYER', 'ADMIN']}>
                <EmployerDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/poster/dashboard"
            element={
              <ProtectedRoute allowedRoles={['EMPLOYER', 'ADMIN']}>
                <EmployerDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute allowedRoles={['JOB_SEEKER', 'EMPLOYER', 'ADMIN']}>
                <ProfileResumePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminConsolePage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}
