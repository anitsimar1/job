import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { SafeImage } from '../components/common/SafeImage';
import { TESTIMONIAL_AVATAR } from '../data/mockData';
import { useApp } from '../context/AppContext';
import { authService, IS_MOCK_MODE } from '../services';
import { ApiError } from '../types/api';

const ROLE_OPTIONS = [
  { id: 'frontend', label: 'Frontend Engineer', icon: 'code' },
  { id: 'designer', label: 'Product Designer', icon: 'brush' },
  { id: 'devops', label: 'DevOps & Infra', icon: 'cloud_sync' },
  { id: 'data', label: 'Data Lead', icon: 'analytics' },
];

export function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { authSession, login, register, refreshAuthSession, logout, uploadResume, showToast } =
    useApp();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['Frontend Engineer']);
  const [resumeFileName, setResumeFileName] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [authBanner, setAuthBanner] = useState<{ title: string; msg: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const redirectFrom = (location.state as { from?: string } | null)?.from;

  useEffect(() => {
    const oauthStatus = searchParams.get('oauth');
    const oauthError = searchParams.get('oauth_error');
    if (!oauthStatus && !oauthError) {
      return;
    }

    setSearchParams({}, { replace: true });

    if (oauthError) {
      setValidationError(oauthError);
      showToast(oauthError, 'error');
      return;
    }

    if (oauthStatus === 'success') {
      let active = true;
      refreshAuthSession().then((session) => {
        if (!active) return;
        if (session?.isAuthenticated) {
          setAuthBanner({
            title: 'Signed In with Google',
            msg: `Welcome ${session.userName}! Directing to your workspace...`,
          });
          showToast('Signed in with Google', 'verified');
          const target =
            redirectFrom || (session.role === 'ADMIN' ? '/admin' : '/dashboard');
          window.setTimeout(() => navigate(target, { replace: true }), 600);
        } else {
          const fallbackMsg =
            'Google authentication finished, but your session cookie could not be verified.';
          setValidationError(fallbackMsg);
          showToast(fallbackMsg, 'error');
        }
      });
      return () => {
        active = false;
      };
    }
  }, [navigate, redirectFrom, refreshAuthSession, searchParams, setSearchParams, showToast]);

  const toggleRole = (label: string) => {
    setSelectedRoles((prev) =>
      prev.includes(label) ? prev.filter((r) => r !== label) : [...prev, label]
    );
  };

  const validateForm = (): string | null => {
    const trimmedEmail = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      return 'Please enter a valid work email address.';
    }
    if (password.length < 8) {
      return 'Password must be at least 8 characters long.';
    }
    if (mode === 'signup') {
      if (fullName.trim().length < 2) {
        return 'Full name must be at least 2 characters.';
      }
      if (phone.trim().length < 6) {
        return 'Please enter a valid contact phone number.';
      }
      if (password !== confirmPassword) {
        return 'Passwords do not match. Please verify both password fields.';
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const clientError = validateForm();
    if (clientError) {
      setValidationError(clientError);
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'signup') {
        const session = await register({
          fullName: fullName.trim(),
          email: email.trim(),
          password,
          confirmPassword,
          phone: phone.trim(),
          targetRoles: selectedRoles,
          resumeFileName,
        });
        if (resumeFile && !IS_MOCK_MODE) {
          await uploadResume(resumeFile).catch(() => undefined);
        }
        setAuthBanner({
          title: IS_MOCK_MODE ? 'Candidate Account Created (Preview Mode)' : 'Candidate Account Created',
          msg: `Welcome aboard ${fullName.trim()}! Directing to your personalized workspace...`,
        });
        const target =
          redirectFrom || (session.role === 'ADMIN' ? '/admin' : '/dashboard');
        window.setTimeout(() => navigate(target), 800);
      } else {
        const session = await login({ email: email.trim(), password, rememberMe });
        setAuthBanner({
          title: IS_MOCK_MODE ? 'Signed In (Preview Mode)' : 'Signed In',
          msg: 'Retrieving your matched executive opportunities...',
        });
        const target =
          redirectFrom || (session.role === 'ADMIN' ? '/admin' : '/dashboard');
        window.setTimeout(() => navigate(target), 800);
      }
    } catch (err) {
      let msg = 'Authentication failed. Please verify your credentials.';
      if (err instanceof ApiError) {
        const details = err.fieldErrors
          ? Object.values(err.fieldErrors).filter(Boolean).join(' ')
          : '';
        msg = details ? `${err.message}: ${details}` : err.message;
      } else if (err && typeof err === 'object' && 'message' in err) {
        msg = String((err as { message: unknown }).message);
      }
      setValidationError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = () => {
    setValidationError(null);
    setAuthBanner(null);
    if (IS_MOCK_MODE) {
      showToast(
        'Set VITE_API_BASE_URL to connect Google OAuth 2.0 via Spring Boot',
        'info'
      );
      return;
    }
    window.location.assign(authService.getGoogleOAuthUrl());
  };

  const handleSocialPreview = (provider: string) => {
    showToast(`${provider} OAuth will connect via Spring Security in production`, 'info');
  };

  return (
    <div className="bg-surface text-on-surface font-body-md flex flex-col min-h-screen relative antialiased pt-safe pb-safe">
      {/* Subtle Top Portal Return Bar */}
      <div className="max-w-md mx-auto w-full px-margin pt-4 flex items-center justify-between">
        <Link
          className="inline-flex items-center gap-1.5 font-label-md text-secondary hover:text-primary transition-colors"
          to="/"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span>Back to JobConnect</span>
        </Link>
        <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm">
          {IS_MOCK_MODE ? 'UI Preview Mode' : 'Spring Security JWT'}
        </span>
      </div>

      <main className="flex-1 flex flex-col relative w-full bg-surface">
        <div className="flex flex-col w-full pb-8 max-w-md mx-auto">
          <div className="px-margin pt-space-md flex flex-col gap-y-6">
            {/* Active Session Notice */}
            {authSession.isAuthenticated && !IS_MOCK_MODE && (
              <div className="bg-surface-container-lowest rounded-xl p-3.5 shadow-sm flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-label-md text-on-surface font-bold truncate">
                    Signed in as {authSession.userName}
                  </p>
                  <p className="font-body-sm text-xs text-on-surface-variant truncate">
                    {authSession.userEmail} • {authSession.role}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    className="px-3 py-1.5 rounded-lg bg-primary text-on-primary font-label-sm font-semibold"
                    onClick={() => navigate(authSession.role === 'ADMIN' ? '/admin' : '/dashboard')}
                    type="button"
                  >
                    Continue
                  </button>
                  <button
                    className="px-2.5 py-1.5 rounded-lg bg-surface-container text-on-surface-variant hover:text-error font-label-sm font-semibold"
                    onClick={() => logout()}
                    type="button"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            )}

            {/* Hero / Welcome Header */}
            <div className="flex flex-col gap-y-1.5 text-center items-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high text-primary font-label-md text-label-md mb-1 shadow-sm">
                <span
                  className="material-symbols-outlined text-[16px] text-secondary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  verified
                </span>
                <span>Executive Talent Discovery</span>
              </div>
              <h1 className="font-headline-xl-mobile text-headline-xl-mobile text-on-surface tracking-tight">
                {mode === 'signup' ? 'Join Top 3% Tech Talent' : 'Welcome back'}
              </h1>
              <p className="font-body-sm text-body-sm text-on-surface-variant max-w-xs">
                {mode === 'signup'
                  ? 'Create your free portfolio profile and get discovered by high-growth startups.'
                  : 'Connect with verified tech companies, transparent compensation & leadership roles.'}
              </p>
            </div>

            {/* Segmented Toggle Tabs */}
            <div className="bg-surface-container p-1 rounded-xl flex items-center shadow-inner relative">
              <button
                className={`flex-1 py-2.5 rounded-lg font-label-lg text-label-lg transition-all duration-200 flex items-center justify-center gap-1.5 ${
                  mode === 'signin'
                    ? 'bg-surface-container-lowest text-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
                onClick={() => {
                  setMode('signin');
                  setValidationError(null);
                  setAuthBanner(null);
                }}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">lock_open</span>
                <span>Sign In</span>
              </button>
              <button
                className={`flex-1 py-2.5 rounded-lg font-label-lg text-label-lg transition-all duration-200 flex items-center justify-center gap-1.5 ${
                  mode === 'signup'
                    ? 'bg-surface-container-lowest text-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
                onClick={() => {
                  setMode('signup');
                  setValidationError(null);
                  setAuthBanner(null);
                }}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">badge</span>
                <span>Create Account</span>
              </button>
            </div>

            {/* Auth Container Card */}
            <div className="bg-surface-container-lowest rounded-xl p-5 shadow-md flex flex-col gap-y-5">
              {/* Social Buttons */}
              <div className="flex flex-col gap-y-2.5">
                <button
                  className="w-full h-11 px-4 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors flex items-center justify-center gap-3 text-on-surface font-label-lg text-label-lg active:scale-[0.99]"
                  onClick={handleGoogleSignIn}
                  type="button"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      fill="#EA4335"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    className="h-11 px-3 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors flex items-center justify-center gap-2 text-on-surface font-label-md text-label-md active:scale-[0.99]"
                    onClick={() => handleSocialPreview('LinkedIn')}
                    type="button"
                  >
                    <svg className="w-4 h-4 fill-[#0A66C2]" viewBox="0 0 24 24">
                      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                    </svg>
                    <span>LinkedIn</span>
                  </button>
                  <button
                    className="h-11 px-3 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors flex items-center justify-center gap-2 text-on-surface font-label-md text-label-md active:scale-[0.99]"
                    onClick={() => handleSocialPreview('GitHub')}
                    type="button"
                  >
                    <svg className="w-4 h-4 fill-on-surface" viewBox="0 0 24 24">
                      <path
                        clipRule="evenodd"
                        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                        fillRule="evenodd"
                      />
                    </svg>
                    <span>GitHub</span>
                  </button>
                </div>
              </div>

              {/* Divider */}
              <div className="relative flex items-center justify-center my-0.5">
                <div className="w-full h-px bg-surface-container-high" />
                <span className="absolute px-3 bg-surface-container-lowest font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                  Or continue with email
                </span>
              </div>

              {/* Form */}
              <form className="flex flex-col gap-y-4" onSubmit={handleSubmit}>
                {validationError && (
                  <div
                    className="p-3 rounded-lg bg-error-container text-on-error-container font-body-sm text-xs flex items-center gap-2"
                    role="alert"
                  >
                    <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
                    <span>{validationError}</span>
                  </div>
                )}

                {mode === 'signup' && (
                  <>
                    <div className="flex flex-col gap-y-1.5">
                      <label className="font-label-md text-label-md text-on-surface flex items-center justify-between">
                        <span>Full Name</span>
                        <span className="text-on-surface-variant font-body-sm text-xs">Required</span>
                      </label>
                      <div className="relative flex items-center">
                        <span className="material-symbols-outlined absolute left-3 text-[18px] text-outline">
                          person
                        </span>
                        <input
                          className="w-full h-11 pl-10 pr-3 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md outline-none transition-all placeholder:text-outline focus:bg-surface-bright shadow-sm"
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Alexandra Vance"
                          required
                          type="text"
                          value={fullName}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-y-1.5">
                      <label className="font-label-md text-label-md text-on-surface flex items-center justify-between">
                        <span>Phone Number</span>
                        <span className="text-on-surface-variant font-body-sm text-xs">Required</span>
                      </label>
                      <div className="relative flex items-center">
                        <span className="material-symbols-outlined absolute left-3 text-[18px] text-outline">
                          call
                        </span>
                        <input
                          className="w-full h-11 pl-10 pr-3 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md outline-none transition-all placeholder:text-outline focus:bg-surface-bright shadow-sm"
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+1 (555) 234-8901"
                          required
                          type="tel"
                          value={phone}
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="flex flex-col gap-y-1.5">
                  <label className="font-label-md text-label-md text-on-surface flex items-center justify-between">
                    <span>Work Email</span>
                    <span className="text-secondary font-label-sm text-label-sm flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[14px]">shield</span> Trusted
                      domain
                    </span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-[18px] text-outline">
                      mail
                    </span>
                    <input
                      className="w-full h-11 pl-10 pr-3 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md outline-none transition-all placeholder:text-outline focus:bg-surface-bright shadow-sm"
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      required
                      type="email"
                      value={email}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-label-md text-label-md text-on-surface">Password</label>
                    {mode === 'signin' && (
                      <button
                        className="font-label-sm text-label-sm text-secondary hover:text-primary transition-colors"
                        onClick={() =>
                          showToast('Password reset link available once backend is connected', 'mail')
                        }
                        type="button"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-[18px] text-outline">
                      lock
                    </span>
                    <input
                      className="w-full h-11 pl-10 pr-10 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md outline-none transition-all placeholder:text-outline focus:bg-surface-bright shadow-sm"
                      minLength={8}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                    />
                    <button
                      aria-label="Toggle password visibility"
                      className="absolute right-3 p-1 rounded-md text-outline hover:text-on-surface transition-colors flex items-center justify-center"
                      onClick={() => setShowPassword((p) => !p)}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                {mode === 'signup' && (
                  <>
                    <div className="flex flex-col gap-y-1.5">
                      <label className="font-label-md text-label-md text-on-surface flex items-center justify-between">
                        <span>Confirm Password</span>
                        <span className="text-on-surface-variant font-body-sm text-xs">Min 8 chars</span>
                      </label>
                      <div className="relative flex items-center">
                        <span className="material-symbols-outlined absolute left-3 text-[18px] text-outline">
                          lock_reset
                        </span>
                        <input
                          className="w-full h-11 pl-10 pr-10 rounded-lg bg-surface-container-lowest text-on-surface font-body-md text-body-md outline-none transition-all placeholder:text-outline focus:bg-surface-bright shadow-sm"
                          minLength={8}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••••••"
                          required
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                        />
                        <button
                          aria-label="Toggle confirm password visibility"
                          className="absolute right-3 p-1 rounded-md text-outline hover:text-on-surface transition-colors flex items-center justify-center"
                          onClick={() => setShowConfirmPassword((p) => !p)}
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {showConfirmPassword ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-y-2 pt-1">
                      <div className="flex items-center justify-between">
                        <label className="font-label-md text-label-md text-on-surface">
                          Target Career Focus
                        </label>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">
                          Select 1 or more
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {ROLE_OPTIONS.map((role) => {
                          const selected = selectedRoles.includes(role.label);
                          return (
                            <button
                              key={role.id}
                              className={`px-3 py-1.5 rounded-full font-label-sm text-label-sm flex items-center gap-1 transition-all active:scale-95 shadow-sm ${
                                selected
                                  ? 'bg-surface-container-high text-primary'
                                  : 'bg-surface-container text-on-surface-variant'
                              }`}
                              onClick={() => toggleRole(role.label)}
                              type="button"
                            >
                              <span className="material-symbols-outlined text-[14px]">
                                {role.icon}
                              </span>
                              <span>{role.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex flex-col gap-y-2 pt-1">
                      <label className="font-label-md text-label-md text-on-surface flex items-center justify-between">
                        <span>Instant Application Resume</span>
                        <span className="font-label-sm text-label-sm text-tertiary font-bold">
                          Recommended
                        </span>
                      </label>
                      <div
                        className="group relative cursor-pointer rounded-xl bg-surface-container-low hover:bg-surface-container-high transition-all p-3.5 flex items-center gap-3"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <div
                          className={`w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center shrink-0 ${
                            resumeFileName ? 'text-tertiary-container' : 'text-secondary'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            {resumeFileName ? 'check_circle' : 'cloud_upload'}
                          </span>
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-label-md text-label-md text-on-surface truncate">
                            {resumeFileName || 'Tap to upload CV / Portfolio'}
                          </span>
                          <span className="font-body-sm text-body-sm text-on-surface-variant text-xs">
                            PDF or DOCX (Max 10MB)
                          </span>
                        </div>
                        <span className="material-symbols-outlined text-outline text-[18px] group-hover:text-primary">
                          arrow_forward
                        </span>
                        <input
                          accept=".pdf,.docx,.doc"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) {
                              setResumeFile(f);
                              setResumeFileName(f.name);
                            }
                          }}
                          ref={fileInputRef}
                          type="file"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="flex items-center gap-2.5 pt-0.5">
                  <label className="relative flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      checked={rememberMe}
                      className="sr-only peer"
                      onChange={(e) => setRememberMe(e.target.checked)}
                      type="checkbox"
                    />
                    <div className="w-5 h-5 rounded bg-surface-container peer-checked:bg-primary transition-colors flex items-center justify-center">
                      <span className="material-symbols-outlined text-white text-[16px] scale-0 peer-checked:scale-100 transition-transform">
                        check
                      </span>
                    </div>
                    <span className="font-label-md text-label-md text-on-surface">
                      Stay signed in for 30 days
                    </span>
                  </label>
                </div>

                <button
                  className={`mt-2 w-full min-h-[48px] rounded-lg text-on-primary font-label-lg text-label-lg shadow-md hover:bg-secondary active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${
                    mode === 'signup' ? 'bg-tertiary-container' : 'bg-primary-container'
                  }`}
                  disabled={submitting}
                  type="submit"
                >
                  {submitting ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">
                        refresh
                      </span>
                      <span>{mode === 'signup' ? 'Creating Account...' : 'Signing In...'}</span>
                    </>
                  ) : mode === 'signup' ? (
                    <>
                      <span>Create Free Account</span>
                      <span className="px-1.5 py-0.5 bg-tertiary text-tertiary-fixed rounded-full text-[11px] font-bold">
                        Fast-Track
                      </span>
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to JobConnect</span>
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </>
                  )}
                </button>

                {mode === 'signup' && (
                  <p className="font-body-sm text-body-sm text-center text-on-surface-variant text-xs pt-1">
                    By signing up, you agree to our{' '}
                    <span className="text-secondary font-label-sm">Terms</span> and{' '}
                    <span className="text-secondary font-label-sm">Privacy Policy</span>.
                  </p>
                )}
              </form>
            </div>

            {/* Live Feedback Notification Banner */}
            {authBanner && (
              <div className="bg-tertiary-container text-on-tertiary-fixed rounded-xl p-3 shadow-lg flex items-center gap-3">
                <span
                  className="material-symbols-outlined text-tertiary-fixed text-[22px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-label-md text-label-md font-bold text-white">
                    {authBanner.title}
                  </span>
                  <span className="font-body-sm text-body-sm text-xs text-tertiary-fixed/90">
                    {authBanner.msg}
                  </span>
                </div>
              </div>
            )}

            {/* Candidate Value Banner */}
            <div className="bg-surface-container rounded-xl p-4 flex flex-col gap-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary-fixed-dim opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-tertiary-container" />
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface font-semibold">
                    25,000+ Vetted Tech &amp; SaaS Roles
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-tertiary-container text-tertiary-fixed font-label-sm text-label-sm">
                  100% Free
                </span>
              </div>

              <div className="w-full h-px bg-surface-container-high" />

              <div className="flex flex-col gap-1.5">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider text-[10px]">
                  Hiring through JobConnect
                </span>
                <div className="grid grid-cols-4 items-center gap-2 pt-1 opacity-75">
                  {['Stripe', 'Airbnb', 'Figma', 'Datadog'].map((brand) => (
                    <div
                      key={brand}
                      className="flex items-center justify-center p-2 rounded-lg bg-surface-container-lowest shadow-sm"
                    >
                      <span className="font-headline-sm text-headline-sm font-bold text-on-surface tracking-tighter text-xs">
                        {brand}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Testimonial Card */}
            <div className="bg-surface-container-lowest rounded-xl p-3.5 flex items-center gap-3.5 shadow-sm">
              <SafeImage
                alt="Elena R."
                className="w-12 h-12 rounded-full object-cover shrink-0"
                src={TESTIMONIAL_AVATAR}
              />
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1 text-tertiary-container">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span
                      key={i}
                      className="material-symbols-outlined text-[14px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                  ))}
                </div>
                <p className="font-body-sm text-body-sm text-on-surface text-xs italic truncate mt-0.5">
                  “Signed an offer in 11 days. No ghost recruiters.”
                </p>
                <span className="font-label-sm text-label-sm text-on-surface-variant text-[11px]">
                  Elena R., Principal Architect at Series C
                </span>
              </div>
            </div>

            {/* Security / Preview Footnote */}
            <div className="flex items-center justify-center gap-3 text-on-surface-variant font-label-sm text-label-sm py-2 flex-wrap">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">integration_instructions</span>
                Spring Boot Auth Ready
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">visibility_off</span>
                Anonymous Option
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
