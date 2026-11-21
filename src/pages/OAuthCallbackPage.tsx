import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { IS_MOCK_MODE } from '../services';
import { tokenStorage } from '../services/tokenStorage';

type CallbackStatus = 'verifying' | 'authenticated' | 'unauthenticated' | 'error';

export function OAuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { authSession, refreshAuthSession, showToast } = useApp();

  const [status, setStatus] = useState<CallbackStatus>('verifying');
  const [statusMessage, setStatusMessage] = useState<string>(
    'Verifying your Google authentication session...'
  );

  const authSessionRef = useRef(authSession);
  authSessionRef.current = authSession;

  useEffect(() => {
    let active = true;
    let redirectTimer: number | undefined;

    const oauthError = searchParams.get('oauth_error') || searchParams.get('error');

    const resolveCallback = async () => {
      if (oauthError) {
        tokenStorage.clearTokens();
        if (!active) return;
        setStatus('error');
        setStatusMessage(oauthError);
        showToast(oauthError, 'error');
        redirectTimer = window.setTimeout(() => {
          navigate('/', { replace: true });
        }, 1200);
        return;
      }

      if (IS_MOCK_MODE) {
        if (!active) return;
        const mockSession = authSessionRef.current;
        const target = mockSession.isAuthenticated
          ? mockSession.role === 'ADMIN'
            ? '/admin'
            : '/dashboard'
          : '/';
        setStatus(mockSession.isAuthenticated ? 'authenticated' : 'unauthenticated');
        setStatusMessage(
          mockSession.isAuthenticated
            ? 'Session active in preview mode. Redirecting...'
            : 'No active session found. Redirecting home...'
        );
        redirectTimer = window.setTimeout(() => {
          navigate(target, { replace: true });
        }, 400);
        return;
      }

      try {
        // Re-validates the HttpOnly JWT cookie against GET /api/auth/me
        const session = await refreshAuthSession();
        if (!active) return;

        if (session?.isAuthenticated) {
          const destination = session.role === 'ADMIN' ? '/admin' : '/dashboard';
          setStatus('authenticated');
          setStatusMessage(`Signed in as ${session.userName}. Redirecting to your workspace...`);
          showToast('Signed in with Google', 'verified');
          redirectTimer = window.setTimeout(() => {
            navigate(destination, { replace: true });
          }, 450);
        } else {
          tokenStorage.clearTokens();
          const message =
            'Unable to confirm your authenticated session. Redirecting to home...';
          setStatus('unauthenticated');
          setStatusMessage(message);
          showToast('Authentication session not active', 'info');
          redirectTimer = window.setTimeout(() => {
            navigate('/', { replace: true });
          }, 900);
        }
      } catch {
        if (!active) return;
        const fallbackMsg = 'Could not verify authentication status with backend.';
        setStatus('error');
        setStatusMessage(fallbackMsg);
        showToast(fallbackMsg, 'error');
        redirectTimer = window.setTimeout(() => {
          navigate('/', { replace: true });
        }, 1200);
      }
    };

    void resolveCallback();

    return () => {
      active = false;
      if (redirectTimer !== undefined) {
        window.clearTimeout(redirectTimer);
      }
    };
  }, [navigate, refreshAuthSession, searchParams, showToast]);

  return (
    <div className="min-h-screen bg-surface text-on-surface flex items-center justify-center px-margin py-8 antialiased">
      <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-6 shadow-md flex flex-col items-center text-center gap-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            status === 'error'
              ? 'bg-error-container text-on-error-container'
              : status === 'authenticated'
              ? 'bg-tertiary-container text-tertiary-fixed'
              : 'bg-surface-container-high text-primary'
          }`}
        >
          <span
            className={`material-symbols-outlined text-[26px] ${
              status === 'verifying' ? 'animate-spin' : ''
            }`}
          >
            {status === 'verifying'
              ? 'progress_activity'
              : status === 'authenticated'
              ? 'verified_user'
              : status === 'error'
              ? 'error'
              : 'info'}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <h1 className="font-headline-sm text-on-surface font-bold text-lg">
            {status === 'verifying'
              ? 'Completing Google Sign-In'
              : status === 'authenticated'
              ? 'Authentication Verified'
              : status === 'error'
              ? 'Authentication Interrupted'
              : 'Session Not Found'}
          </h1>
          <p className="font-body-sm text-on-surface-variant text-sm">{statusMessage}</p>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <Link
            className="px-4 py-2 rounded-lg bg-surface-container text-on-surface font-label-md text-xs hover:bg-surface-container-high transition-colors"
            to="/"
          >
            Go Home
          </Link>
          <Link
            className="px-4 py-2 rounded-lg bg-primary text-on-primary font-label-md text-xs hover:bg-secondary transition-colors"
            to="/auth"
          >
            Sign In Page
          </Link>
        </div>
      </div>
    </div>
  );
}
