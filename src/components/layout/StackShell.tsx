import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BrandLogo } from '../common/BrandLogo';
import { SafeImage } from '../common/SafeImage';
import { USER_AVATAR_URL } from '../../data/mockData';
import { useApp } from '../../context/AppContext';

interface StackShellProps {
  title: string;
  backTo?: string;
  children: React.ReactNode;
}

export function StackShell({ title, backTo, children }: StackShellProps) {
  const navigate = useNavigate();
  const { profile, showToast } = useApp();

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
            <Link
              aria-label="Profile"
              className="w-11 h-11 flex items-center justify-center rounded-full hover:ring-2 hover:ring-secondary/30 transition-all"
              to="/profile"
            >
              <SafeImage
                alt={profile.fullName}
                className="w-8 h-8 rounded-full object-cover"
                src={USER_AVATAR_URL}
              />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col relative w-full pt-16 pb-safe bg-surface">
        <div className="w-full max-w-3xl mx-auto flex-1 flex flex-col">{children}</div>
      </main>
    </div>
  );
}
