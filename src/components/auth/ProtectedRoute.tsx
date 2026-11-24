import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { IS_MOCK_MODE } from '../../services';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Array<'JOB_SEEKER' | 'EMPLOYER' | 'ADMIN'>;
}

export function getHomeDashboardForRole(role: 'JOB_SEEKER' | 'EMPLOYER' | 'ADMIN'): string {
  if (role === 'ADMIN') return '/admin';
  if (role === 'EMPLOYER') return '/employer/dashboard';
  return '/dashboard';
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { authSession, authLoading } = useApp();
  const location = useLocation();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-primary">
          <span className="material-symbols-outlined text-[32px] animate-spin">progress_activity</span>
          <span className="font-label-md text-on-surface-variant">Verifying session...</span>
        </div>
      </div>
    );
  }

  // Enforce authentication when live Spring Boot backend is configured or user signed out
  if (!authSession.isAuthenticated) {
    return <Navigate replace state={{ from: location.pathname }} to="/auth" />;
  }

  // Enforce role-based authorization when connected to live Spring Boot backend
  if (
    !IS_MOCK_MODE &&
    allowedRoles &&
    allowedRoles.length > 0 &&
    !allowedRoles.includes(authSession.role)
  ) {
    return <Navigate replace to={getHomeDashboardForRole(authSession.role)} />;
  }

  return <>{children}</>;
}
