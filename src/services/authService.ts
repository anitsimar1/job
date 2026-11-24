import { INITIAL_PROFILE } from '../data/mockData';
import { AuthSession, UserSummary } from '../types';
import { apiClient, BACKEND_ORIGIN, IS_MOCK_MODE, withMockFallback } from './apiClient';
import { tokenStorage } from './tokenStorage';

export interface LoginPayload {
  email: string;
  password: string;
  rememberMe: boolean;
  accountType?: 'JOB_SEEKER' | 'EMPLOYER';
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  targetRoles?: string[];
  resumeFileName?: string;
  rememberMe?: boolean;
  accountType?: 'JOB_SEEKER' | 'EMPLOYER';
  companyName?: string;
}

export interface SpringAuthResponse {
  user: UserSummary;
  role: string;
  expiresInMs?: number;
  accessToken?: string;
}

function normalizeRole(role?: string, roles?: string[]): 'JOB_SEEKER' | 'EMPLOYER' | 'ADMIN' {
  if (role && role.toUpperCase().includes('ADMIN')) return 'ADMIN';
  if (Array.isArray(roles) && roles.some((r) => r.toUpperCase().includes('ADMIN'))) return 'ADMIN';
  if (role && role.toUpperCase().includes('EMPLOYER')) return 'EMPLOYER';
  if (Array.isArray(roles) && roles.some((r) => r.toUpperCase().includes('EMPLOYER'))) return 'EMPLOYER';
  return 'JOB_SEEKER';
}

function toAuthSession(res: SpringAuthResponse, rememberMe: boolean): AuthSession {
  if (res.accessToken) {
    tokenStorage.setTokens({ accessToken: res.accessToken }, rememberMe);
  }
  return {
    isAuthenticated: true,
    isDemoMode: false,
    userId: String(res.user.id),
    userEmail: res.user.email,
    userName: res.user.fullName,
    companyName: res.user.companyName,
    profileImage: res.user.profileImage,
    role: normalizeRole(res.role, res.user.roles),
    authProvider: res.user.authProvider,
    emailVerified: res.user.emailVerified,
    rememberMe,
    accessToken: res.accessToken,
    tokenExpiresAt: res.expiresInMs ? Date.now() + res.expiresInMs : undefined,
  };
}

/**
 * Authentication service aligned with Spring Boot Security + HttpOnly JWT cookies:
 * - POST /auth/register
 * - POST /auth/login
 * - POST /auth/logout
 * - GET  /auth/me
 */
export const authService = {
  async login(payload: LoginPayload): Promise<AuthSession> {
    return withMockFallback(
      async () => {
        const res = await apiClient.post<SpringAuthResponse>(
          '/auth/login',
          {
            email: payload.email,
            password: payload.password,
            rememberMe: payload.rememberMe,
            ...(payload.accountType ? { loginAs: payload.accountType } : {}),
          },
          { ...({ _skipAuthRefresh: true } as object) }
        );
        return toAuthSession(res, payload.rememberMe);
      },
      () => ({
        isAuthenticated: true,
        isDemoMode: true,
        userEmail: payload.email || INITIAL_PROFILE.email,
        userName: INITIAL_PROFILE.fullName,
        role: payload.accountType === 'EMPLOYER' ? ('EMPLOYER' as const) : ('JOB_SEEKER' as const),
        rememberMe: payload.rememberMe,
      })
    );
  },

  async register(payload: RegisterPayload): Promise<AuthSession> {
    const rememberMe = payload.rememberMe ?? true;
    const accountType = payload.accountType || 'JOB_SEEKER';
    const companyName = payload.companyName?.trim();
    const targetRolesStr =
      accountType === 'JOB_SEEKER'
        ? payload.targetRoles
            ?.map((r) => r.trim())
            .filter(Boolean)
            .join(', ')
        : undefined;
    return withMockFallback(
      async () => {
        const res = await apiClient.post<SpringAuthResponse>(
          '/auth/register',
          {
            fullName: payload.fullName,
            email: payload.email,
            password: payload.password,
            confirmPassword: payload.confirmPassword,
            phone: payload.phone,
            rememberMe,
            accountType,
            ...(companyName ? { companyName } : {}),
            ...(targetRolesStr ? { targetRoles: targetRolesStr } : {}),
          },
          { ...({ _skipAuthRefresh: true } as object) }
        );
        return toAuthSession(res, rememberMe);
      },
      () => ({
        isAuthenticated: true,
        isDemoMode: true,
        userEmail: payload.email,
        userName: payload.fullName || 'Alexandra Vance',
        companyName,
        role: accountType === 'EMPLOYER' ? ('EMPLOYER' as const) : ('JOB_SEEKER' as const),
        rememberMe,
      })
    );
  },

  getGoogleOAuthUrl(): string {
    return `${BACKEND_ORIGIN}/oauth2/authorization/google`;
  },

  async getCurrentSession(): Promise<AuthSession | null> {
    if (IS_MOCK_MODE) {
      return null;
    }
    try {
      const user = await apiClient.get<UserSummary>('/auth/me', {
        ...({ _skipAuthRefresh: true } as object),
      });
      return {
        isAuthenticated: true,
        isDemoMode: false,
        userId: String(user.id),
        userEmail: user.email,
        userName: user.fullName,
        companyName: user.companyName,
        profileImage: user.profileImage,
        role: normalizeRole(undefined, user.roles),
        authProvider: user.authProvider,
        emailVerified: user.emailVerified,
        rememberMe: true,
      };
    } catch {
      return null;
    }
  },

  restoreSessionFromToken(): AuthSession | null {
    const accessToken = tokenStorage.getAccessToken();
    if (!accessToken || tokenStorage.isTokenExpired(accessToken)) {
      return null;
    }
    const claims = tokenStorage.decodeJwtClaims(accessToken);
    if (!claims) return null;

    return {
      isAuthenticated: true,
      isDemoMode: false,
      userId: typeof claims.sub === 'string' ? claims.sub : undefined,
      userEmail: typeof claims.email === 'string' ? claims.email : INITIAL_PROFILE.email,
      userName: typeof claims.name === 'string' ? claims.name : INITIAL_PROFILE.fullName,
      role: normalizeRole(
        undefined,
        Array.isArray(claims.roles) ? (claims.roles as string[]) : undefined
      ),
      rememberMe: tokenStorage.isRemembered(),
      accessToken,
      tokenExpiresAt: typeof claims.exp === 'number' ? claims.exp * 1000 : undefined,
    };
  },

  async logout(): Promise<void> {
    try {
      await withMockFallback(
        () => apiClient.post<void>('/auth/logout'),
        () => undefined
      );
    } finally {
      tokenStorage.clearTokens();
    }
  },
};
