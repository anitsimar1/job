import { JwtClaims, JwtTokenPair } from '../types/api';

const ACCESS_TOKEN_KEY = 'jobconnect_access_token';
const REFRESH_TOKEN_KEY = 'jobconnect_refresh_token';
const REMEMBER_ME_KEY = 'jobconnect_remember_me';

/**
 * Client-side JWT storage & inspection helper.
 * Note: Decoding JWT claims on the client is strictly for UX state (expiry checks, role hints)
 * and never replaces server-side cryptographic signature verification in Spring Security.
 */
export const tokenStorage = {
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY) || sessionStorage.getItem(ACCESS_TOKEN_KEY);
  },

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY) || sessionStorage.getItem(REFRESH_TOKEN_KEY);
  },

  setTokens(tokens: JwtTokenPair, rememberMe = true): void {
    this.clearTokens();
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    if (tokens.refreshToken) {
      storage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    }
    localStorage.setItem(REMEMBER_ME_KEY, String(rememberMe));
  },

  isRemembered(): boolean {
    return localStorage.getItem(REMEMBER_ME_KEY) !== 'false';
  },

  clearTokens(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  decodeJwtClaims(token: string): JwtClaims | null {
    try {
      const parts = token.split('.');
      if (parts.length < 2) return null;
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      const jsonPayload = decodeURIComponent(
        atob(padded)
          .split('')
          .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
          .join('')
      );
      return JSON.parse(jsonPayload) as JwtClaims;
    } catch {
      return null;
    }
  },

  isTokenExpired(token: string, skewSeconds = 30): boolean {
    const claims = this.decodeJwtClaims(token);
    if (!claims || typeof claims.exp !== 'number') return false;
    const nowSeconds = Math.floor(Date.now() / 1000);
    return claims.exp - skewSeconds <= nowSeconds;
  },
};
