import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

export type AdminTabKey = 'overview' | 'jobs' | 'candidates' | 'analytics' | 'settings';

interface AdminShellProps {
  activeTab: AdminTabKey;
  onTabChange: (tab: AdminTabKey) => void;
  children: React.ReactNode;
}

export function AdminShell({ activeTab, onTabChange, children }: AdminShellProps) {
  const { moderationQueue, showToast } = useApp();
  const pendingCount = moderationQueue.filter(
    (m) => m.status === 'NEW LISTING' || m.status === 'DUPLICATE'
  ).length;

  const adminTabs: { key: AdminTabKey; label: string; icon: string }[] = [
    { key: 'overview', label: 'Overview', icon: 'analytics' },
    { key: 'jobs', label: 'Jobs', icon: 'assignment' },
    { key: 'candidates', label: 'Candidates', icon: 'group' },
    { key: 'analytics', label: 'Analytics', icon: 'insights' },
    { key: 'settings', label: 'Settings', icon: 'settings' },
  ];

  return (
    <div className="bg-surface text-on-surface font-body-md flex flex-col min-h-screen relative antialiased">
      {/* Admin Top Header */}
      <header className="fixed top-0 w-full z-50 bg-surface/85 backdrop-blur-xl pt-safe shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-16 px-gutter-sm max-w-6xl mx-auto flex items-center justify-between gap-space-sm">
          <Link className="flex items-center gap-space-sm" to="/admin">
            <div className="w-9 h-9 rounded-lg bg-primary-container text-on-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">shield_person</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-space-xs">
                <span className="font-headline-sm text-headline-sm font-bold text-primary tracking-tight">
                  JobConnect
                </span>
                <span className="font-label-sm text-[10px] uppercase font-bold text-secondary bg-secondary-fixed px-1.5 py-0.5 rounded">
                  Admin
                </span>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant leading-none">
                Management Console
              </span>
            </div>
          </Link>

          {/* Desktop Admin Tab Switcher */}
          <nav className="hidden lg:flex items-center gap-1 bg-surface-container-low p-1 rounded-xl">
            {adminTabs.map((tab) => (
              <button
                key={tab.key}
                className={`px-3 py-1.5 rounded-lg font-label-md text-label-md transition-all flex items-center gap-1.5 ${
                  activeTab === tab.key
                    ? 'bg-surface-container-lowest text-primary font-bold shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
                onClick={() => onTabChange(tab.key)}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-space-xs">
            <Link
              className="h-10 px-space-sm rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface flex items-center gap-space-xs active:scale-95 transition-all"
              title="Switch to User Mode"
              to="/dashboard"
            >
              <span className="material-symbols-outlined text-[18px] text-secondary">
                swap_horiz
              </span>
              <span className="font-label-sm text-label-sm font-medium">User Mode</span>
            </Link>

            <button
              aria-label="Admin notifications"
              className="relative w-10 h-10 flex items-center justify-center rounded-lg text-on-surface hover:bg-surface-container active:scale-95 transition-all"
              onClick={() =>
                showToast(`${pendingCount} items awaiting moderation review`, 'notifications')
              }
              type="button"
            >
              <span className="material-symbols-outlined text-[22px]">notifications</span>
              {pendingCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-error ring-2 ring-surface" />
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col relative w-full pt-16 pb-20 lg:pb-10 bg-surface">
        <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col">{children}</div>
      </main>

      {/* Admin Bottom Tab Bar */}
      <nav className="fixed bottom-0 w-full z-50 pb-safe bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_-1px_8px_rgba(0,0,0,0.04)] lg:hidden">
        <div className="flex justify-around items-center h-16 px-gutter-sm max-w-md mx-auto">
          {adminTabs.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center justify-center min-w-[56px] h-12 rounded-lg active:scale-95 transition-all ${
                  active
                    ? 'text-secondary font-bold'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
                onClick={() => onTabChange(tab.key)}
                type="button"
              >
                <span className="material-symbols-outlined text-[22px]">{tab.icon}</span>
                <span className="font-label-sm text-label-sm mt-0.5">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
