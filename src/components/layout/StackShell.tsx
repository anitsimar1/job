import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BrandLogo } from '../common/BrandLogo';
import { SafeImage } from '../common/SafeImage';
import { useApp } from '../../context/AppContext';

interface StackShellProps {
  title: string;
  backTo?: string;
  children: React.ReactNode;
}

export function StackShell({ title, backTo, children }: StackShellProps) {
  const navigate = useNavigate();
  const { profile, authSession, showToast } = useApp();
  const userAvatarSrc = profile.avatar || authSession.profileImage || '';
  const userDisplayName =
    (authSession.isAuthenticated && authSession.userName) || profile.fullName || 'Candidate';

  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="bg-surface text-on-surface font-body-md flex flex-col min-h-screen relative antialiased">
      <header className="fixed top-0 w-full z-50 bg-surface/85 backdrop-blur-xl pt-safe shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-16 px-gutter-sm max-w-4xl mx-auto flex items-center justify-between gap-space-sm">
          <div className="flex items-center gap-space-xs">
            <button
              aria-label="Go back"
              className="w-11 h-11 flex items-center justify-center rounded-lg text-on-surface hover:bg-surface-container active:scale-95 transition-all"
              onClick={handleBack}
              type="button"
            >
              <span className="material-symbols-outlined text-[24px]">arrow_back</span>
            </button>
            <Link className="flex items-center gap-space-xs" to="/">
              <BrandLogo className="h-8 w-8" />
              <span className="font-headline-sm text-headline-sm font-bold text-primary tracking-tight hidden sm:inline">
                JobConnect
              </span>
            </Link>
          </div>

          <h1 className="font-headline-sm text-headline-sm font-semibold text-on-surface truncate flex-1 text-center px-space-xs">
            {title}
          </h1>

          <div className="flex items-center gap-space-xs">
            <button
              aria-label="Notifications"
              className="relative w-11 h-11 flex items-center justify-center rounded-lg text-on-surface hover:bg-surface-container active:scale-95 transition-all"
              onClick={() => showToast('Application auto-save is enabled', 'notifications')}
              type="button"
            >
              <span className="material-symbols-outlined text-[24px]">notifications</span>
              <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-error ring-2 ring-surface" />
            </button>
            {authSession.isAuthenticated ? (
              <Link
                aria-label="Profile"
                className="w-11 h-11 flex items-center justify-center rounded-full hover:ring-2 hover:ring-secondary/30 transition-all"
                to="/profile"
              >
                <SafeImage
                  alt={userDisplayName}
                  className="w-8 h-8 rounded-full object-cover ring-1 ring-outline-variant/40"
                  fallbackIcon="person"
                  src={userAvatarSrc}
                />
              </Link>
            ) : (
              <Link
                aria-label="Sign In"
                className="h-9 px-3 rounded-lg bg-primary text-on-primary hover:bg-secondary font-label-md text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 shrink-0"
                to="/auth"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                  login
                </span>
                <span>Sign In</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col relative w-full pt-16 pb-safe bg-surface">
        <div className="w-full max-w-3xl mx-auto flex-1 flex flex-col">{children}</div>
      </main>
    </div>
  );
}
