export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  timestamp?: string;
  path?: string;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first?: boolean;
  last?: boolean;
}

export interface ApiErrorPayload {
  status?: number;
  code?: string;
  message?: string;
  error?: string;
  path?: string;
  timestamp?: string;
  fieldErrors?: Record<string, string>;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly fieldErrors?: Record<string, string>;
  public readonly path?: string;
  public readonly timestamp?: string;
  public readonly isNetworkError: boolean;
  public readonly isAuthError: boolean;

  constructor(options: {
    message: string;
    status?: number;
    code?: string;
    fieldErrors?: Record<string, string>;
    path?: string;
    timestamp?: string;
    isNetworkError?: boolean;
  }) {
    super(options.message);
    this.name = 'ApiError';
    this.status = options.status ?? 500;
    this.code = options.code ?? 'API_ERROR';
    this.fieldErrors = options.fieldErrors;
    this.path = options.path;
    this.timestamp = options.timestamp;
    this.isNetworkError = Boolean(options.isNetworkError);
    this.isAuthError = this.status === 401 || this.status === 403;
  }
}

export interface JwtTokenPair {
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: number;
}

export interface JwtClaims {
  sub?: string;
  email?: string;
  name?: string;
  roles?: string[];
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}
