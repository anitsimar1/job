import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BrandLogo } from '../common/BrandLogo';
import { SafeImage } from '../common/SafeImage';
import { useApp } from '../../context/AppContext';
import { IS_MOCK_MODE } from '../../services';

interface MobileTabShellProps {
  pageLabel: string;
  children: React.ReactNode;
}

export function MobileTabShell({ pageLabel, children }: MobileTabShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, authSession, logout, offerSpotlight, applications } = useApp();
  const userAvatarSrc = profile.avatar || authSession.profileImage || '';
  const userDisplayName =
    (authSession.isAuthenticated && authSession.userName) || profile.fullName || 'Candidate';

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const isEmployer = authSession.isAuthenticated && authSession.role === 'EMPLOYER';

  const navItems = isEmployer
    ? [
        { path: '/', label: 'Home', icon: 'home' },
        { path: '/jobs', label: 'Job Board', icon: 'search' },
        { path: '/employer/dashboard', label: 'Admin Dashboard', icon: 'admin_panel_settings' },
        { path: '/profile', label: 'Account', icon: 'person' },
      ]
    : [
        { path: '/', label: 'Home', icon: 'home' },
        { path: '/jobs', label: 'Find Jobs', icon: 'search' },
        { path: '/applications', label: 'My Applications', icon: 'assignment' },
        { path: '/dashboard', label: 'Dashboard', icon: 'grid_view' },
        { path: '/profile', label: 'Profile & Resume', icon: 'person' },
      ];

  const bottomTabs = isEmployer
    ? [
        { path: '/', label: 'Home', icon: 'home' },
        { path: '/jobs', label: 'Board', icon: 'travel_explore' },
        { path: '/employer/dashboard', label: 'Admin', icon: 'admin_panel_settings' },
        { path: '/profile', label: 'Account', icon: 'account_circle' },
      ]
    : [
        { path: '/', label: 'Home', icon: 'home' },
        { path: '/jobs', label: 'Search', icon: 'travel_explore' },
        { path: '/applications', label: 'Applications', icon: 'work_outline' },
        { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
        { path: '/profile', label: 'Profile', icon: 'account_circle' },
      ];

  return (
    <div className="bg-surface text-on-surface font-body-md flex flex-col min-h-screen relative antialiased">
      {/* Top Fixed Header */}
      <header className="fixed top-0 w-full z-50 bg-surface/85 backdrop-blur-xl pt-safe shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-16 px-gutter-sm max-w-6xl mx-auto flex items-center justify-between gap-space-sm">
          <div className="flex items-center gap-space-sm">
            <button
              aria-label="Open navigation drawer"
              className="w-11 h-11 flex items-center justify-center rounded-lg text-on-surface hover:bg-surface-container active:scale-95 transition-all"
              onClick={() => setDrawerOpen(true)}
              type="button"
            >
              <span className="material-symbols-outlined text-[24px]">menu</span>
            </button>
            <Link className="flex items-center gap-2" to="/">
              <BrandLogo className="h-8 w-8 shrink-0" />
              <span className="font-headline-sm text-headline-sm font-bold text-primary tracking-tight">
                JobConnect
              </span>
            </Link>
          </div>

          {/* Desktop Quick Nav Pills */}
          <nav className="hidden lg:flex items-center gap-1 bg-surface-container-low p-1 rounded-xl">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-1.5 rounded-lg font-label-md text-label-md transition-all ${
                  isActive(item.path)
                    ? 'bg-surface-container-lowest text-primary font-bold shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-space-xs relative">
            <span className="font-label-md text-label-md text-on-surface-variant hidden sm:inline-block lg:hidden max-w-[140px] truncate">
              {pageLabel}
            </span>

            <button
              aria-label="Notifications"
              className="relative w-11 h-11 flex items-center justify-center rounded-lg text-on-surface hover:bg-surface-container active:scale-95 transition-all"
              onClick={() => setNotifOpen((prev) => !prev)}
              type="button"
            >
              <span className="material-symbols-outlined text-[24px]">notifications</span>
              <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-error ring-2 ring-surface" />
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-14 w-80 bg-surface-container-lowest rounded-2xl shadow-xl p-3 z-50 border border-outline-variant/20">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-surface-container">
                  <span className="font-headline-sm text-sm font-bold text-on-surface">
                    Notifications
                  </span>
                  <button
                    className="font-label-sm text-secondary hover:underline"
                    onClick={() => setNotifOpen(false)}
                    type="button"
                  >
                    Close
                  </button>
                </div>
                {isEmployer ? (
                  <div className="flex flex-col gap-2">
                    <button
                      className="text-left p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors"
                      onClick={() => {
                        setNotifOpen(false);
                        navigate('/employer/dashboard');
                      }}
                      type="button"
                    >
                      <p className="font-label-md text-on-surface font-semibold">
                        Applicant Email Alerts Active
                      </p>
                      <p className="font-body-sm text-xs text-on-surface-variant">
                        Every candidate application emails {authSession.userEmail} &amp; updates your Poster Dashboard.
                      </p>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <button
                      className="text-left p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors"
                      onClick={() => {
                        setNotifOpen(false);
                        navigate('/applications');
                      }}
                      type="button"
                    >
                      <p className="font-label-md text-on-surface font-semibold">
                        Offer Received: {offerSpotlight.company}
                      </p>
                      <p className="font-body-sm text-xs text-on-surface-variant">
                        {offerSpotlight.roleTitle} • {offerSpotlight.expiresIn}
                      </p>
                    </button>
                    <button
                      className="text-left p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors"
                      onClick={() => {
                        setNotifOpen(false);
                        navigate('/dashboard');
                      }}
                      type="button"
                    >
                      <p className="font-label-md text-on-surface font-semibold">
                        Final Round Tomorrow at 2:00 PM
                      </p>
                      <p className="font-body-sm text-xs text-on-surface-variant">
                        {applications[0]?.company} • System Design with Marcus Vance
                      </p>
                    </button>
                  </div>
                )}
              </div>
            )}

            {authSession.isAuthenticated ? (
              <Link
                aria-label="Profile & Resume"
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

      {/* Slide-out Navigation Drawer */}
      <div
        className={`fixed inset-0 z-[60] bg-on-surface/40 backdrop-blur-sm transition-opacity duration-300 ${
          drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setDrawerOpen(false);
        }}
      >
        <aside
          className={`fixed top-0 left-0 bottom-0 w-72 max-w-[85vw] bg-surface-container-lowest shadow-[0_20px_25px_-5px_rgba(15,23,42,0.15)] flex flex-col pt-safe pb-safe transition-transform duration-300 ease-out ${
            drawerOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="h-16 px-gutter-sm flex items-center justify-between">
            <div className="flex items-center gap-space-sm">
              <BrandLogo className="h-7 w-7" />
              <span className="font-headline-sm text-headline-sm font-bold text-primary">
                JobConnect
              </span>
            </div>
            <button
              aria-label="Close drawer"
              className="w-11 h-11 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container active:scale-95 transition-all"
              onClick={() => setDrawerOpen(false)}
              type="button"
            >
              <span className="material-symbols-outlined text-[22px]">close</span>
            </button>
          </div>

          {authSession.isAuthenticated ? (
            <div className="px-gutter-sm py-space-sm flex items-center gap-space-md bg-surface-container-low mx-gutter-sm rounded-xl">
              <SafeImage
                alt={userDisplayName}
                className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-outline-variant/40"
                fallbackIcon="person"
                src={userAvatarSrc}
              />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="font-label-lg text-label-lg text-on-surface truncate">
                  {userDisplayName}
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant truncate">
                  {authSession.role === 'ADMIN'
                    ? 'Platform Administrator'
                    : authSession.role === 'EMPLOYER'
                      ? `Admin (Job Poster) • ${authSession.companyName || profile.companyName || 'Employer'}`
                      : 'Executive Candidate'}
                </span>
              </div>
            </div>
          ) : (
            <Link
              className="px-gutter-sm py-space-sm flex items-center gap-space-md bg-surface-container-low hover:bg-surface-container mx-gutter-sm rounded-xl transition-colors"
              onClick={() => setDrawerOpen(false)}
              to="/auth"
            >
              <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">person</span>
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="font-label-lg text-label-lg text-primary font-semibold truncate">
                  Sign In to JobConnect
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant truncate">
                  Sync profile, resumes &amp; applications
                </span>
              </div>
            </Link>
          )}

          <nav className="flex-1 overflow-y-auto px-gutter-sm py-space-md flex flex-col gap-space-2xs">
            {navItems.map((item) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-space-md px-gutter-sm h-12 rounded-lg transition-all font-label-lg text-label-lg ${
                    active
                      ? 'bg-primary-container text-on-primary font-semibold'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                  }`}
                  onClick={() => setDrawerOpen(false)}
                  to={item.path}
                >
                  <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}

            <div className="h-px bg-outline-variant/30 my-space-xs" />

            {(authSession.role === 'ADMIN' || IS_MOCK_MODE) && (
              <Link
                className={`flex items-center gap-space-md px-gutter-sm h-12 rounded-lg transition-all font-label-lg text-label-lg ${
                  isActive('/employer/dashboard')
                    ? 'bg-primary-container text-on-primary font-semibold'
                    : 'text-secondary hover:bg-surface-container'
                }`}
                onClick={() => setDrawerOpen(false)}
                to="/employer/dashboard"
              >
                <span className="material-symbols-outlined text-[22px]">business_center</span>
                <span>Job Poster Hub</span>
              </Link>
            )}

            {(authSession.role === 'ADMIN' || IS_MOCK_MODE) && (
              <Link
                className={`flex items-center gap-space-md px-gutter-sm h-12 rounded-lg transition-all font-label-lg text-label-lg ${
                  isActive('/admin')
                    ? 'bg-primary-container text-on-primary font-semibold'
                    : 'text-secondary hover:bg-surface-container'
                }`}
                onClick={() => setDrawerOpen(false)}
                to="/admin"
              >
                <span className="material-symbols-outlined text-[22px]">admin_panel_settings</span>
                <span>Admin Portal</span>
              </Link>
            )}

            {authSession.isAuthenticated && !IS_MOCK_MODE ? (
              <button
                className="flex items-center gap-space-md px-gutter-sm h-12 rounded-lg transition-all font-label-lg text-label-lg text-error hover:bg-error-container/40 w-full text-left"
                onClick={async () => {
                  await logout();
                  setDrawerOpen(false);
                  navigate('/auth');
                }}
                type="button"
              >
                <span className="material-symbols-outlined text-[22px]">logout</span>
                <span>Sign Out</span>
              </button>
            ) : (
              <Link
                className={`flex items-center gap-space-md px-gutter-sm h-12 rounded-lg transition-all font-label-lg text-label-lg ${
                  isActive('/auth')
                    ? 'bg-primary-container text-on-primary font-semibold'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
                onClick={() => setDrawerOpen(false)}
                to="/auth"
              >
                <span className="material-symbols-outlined text-[22px]">login</span>
                <span>Sign In / Register</span>
              </Link>
            )}
          </nav>

          <div className="p-gutter-sm mt-auto">
            <div className="bg-surface-container px-space-md py-space-sm rounded-lg flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                v2.4 Executive
              </span>
              <span className="font-label-sm text-label-sm text-tertiary-fixed-dim bg-tertiary px-space-xs py-0.5 rounded-full">
                PRO
              </span>
            </div>
          </div>
        </aside>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative w-full pt-16 pb-20 lg:pb-10 bg-surface">
        <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col">{children}</div>
      </main>

      {/* Fixed Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 w-full z-50 pb-safe bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_-1px_8px_rgba(0,0,0,0.04)] lg:hidden">
        <div className="flex justify-around items-center h-16 px-gutter-sm max-w-md mx-auto">
          {bottomTabs.map((tab) => {
            const active = isActive(tab.path);
            return (
              <Link
                key={tab.path}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center justify-center min-w-[56px] h-12 rounded-lg active:scale-95 transition-all ${
                  active
                    ? 'text-secondary font-bold'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
                to={tab.path}
              >
                <span className="material-symbols-outlined text-[24px]">{tab.icon}</span>
                <span className="font-label-sm text-label-sm mt-0.5">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
