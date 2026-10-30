const API_BASE = import.meta.env.VITE_API_URL ?? '';

export type LoginResult = {
  ok: boolean;
  access: string;
  token: string;
  username: string;
  email: string;
  role: string;
  name: string;
};

let accessToken = '';
let refreshInFlight: Promise<boolean> | null = null;

export function getApiToken(): string {
  return accessToken;
}

export function clearApiToken(): void {
  accessToken = '';
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  return response.json().catch(() => ({}));
}

export async function apiErrorMessage(response: Response): Promise<string> {
  const data = await readJson(response);
  if (typeof data.error === 'string') return data.error;
  if (typeof data.detail === 'string') return data.detail;
  for (const value of Object.values(data)) {
    if (typeof value === 'string') return value;
    if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  }
  return 'Request failed.';
}

export async function refreshAccessToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const response = await fetch(`${API_BASE}/api/auth/token/refresh/`, {
      method: 'POST',
      credentials: 'include',
    });
    const data = await readJson(response);
    if (!response.ok || typeof data.access !== 'string') {
      accessToken = '';
      return false;
    }
    accessToken = data.access;
    return true;
  })().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

export class AuthApiError extends Error {
  code?: string;
  email?: string;

  constructor(message: string, opts?: { code?: string; email?: string }) {
    super(message);
    this.name = 'AuthApiError';
    this.code = opts?.code;
    this.email = opts?.email;
  }
}

export async function apiLogin(identifier: string, password: string): Promise<LoginResult> {
  const trimmed = identifier.trim();
  const body = trimmed.includes('@')
    ? { email: trimmed, password }
    : { username: trimmed, password };
  const response = await fetch(`${API_BASE}/api/auth/login/`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await readJson(response);
  if (!response.ok || !data.ok || typeof data.access !== 'string') {
    throw new AuthApiError(
      typeof data.error === 'string' ? data.error : 'Invalid credentials.',
      {
        code: typeof data.code === 'string' ? data.code : undefined,
        email: typeof data.email === 'string' ? data.email : undefined,
      },
    );
  }
  accessToken = data.access;
  return data as LoginResult;
}

export async function apiPublicAuthConfig(): Promise<{
  google_client_id: string;
  telegram_bot_username: string;
}> {
  const response = await fetch(`${API_BASE}/api/auth/public-config/`, {
    credentials: 'include',
  });
  const data = await readJson(response);
  return {
    google_client_id: typeof data.google_client_id === 'string' ? data.google_client_id : '',
    telegram_bot_username:
      typeof data.telegram_bot_username === 'string' ? data.telegram_bot_username.replace(/^@/, '') : '',
  };
}

export async function apiGoogleLogin(credential: string): Promise<LoginResult> {
  const response = await fetch(`${API_BASE}/api/auth/google/`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential, id_token: credential }),
  });
  const data = await readJson(response);
  if (!response.ok || !data.ok || typeof data.access !== 'string') {
    throw new Error(typeof data.error === 'string' ? data.error : 'Google sign-in failed.');
  }
  accessToken = data.access;
  return data as LoginResult;
}

export async function apiTelegramLogin(payload: Record<string, unknown>): Promise<LoginResult> {
  const response = await fetch(`${API_BASE}/api/auth/telegram/`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await readJson(response);
  if (!response.ok || !data.ok || typeof data.access !== 'string') {
    throw new Error(typeof data.error === 'string' ? data.error : 'Telegram sign-in failed.');
  }
  accessToken = data.access;
  return data as LoginResult;
}

export type RegisterResult = {
  ok: boolean;
  detail?: string;
  email?: string;
  email_sent?: boolean;
};

export async function apiRegister(payload: {
  email: string;
  password: string;
  first_name: string;
  last_name?: string;
  phone?: string;
}): Promise<RegisterResult> {
  const response = await fetch(`${API_BASE}/api/auth/register/`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await readJson(response);
  if (!response.ok || !data.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Could not create the account.');
  }
  return data as RegisterResult;
}

export async function apiVerifyEmail(email: string, code: string): Promise<{ detail?: string }> {
  const response = await fetch(`${API_BASE}/api/auth/verify-email/`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), code: code.trim() }),
  });
  const data = await readJson(response);
  if (!response.ok || !data.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Could not verify email.');
  }
  return { detail: typeof data.detail === 'string' ? data.detail : undefined };
}

export async function apiConfirmPasswordReset(
  token: string,
  password: string,
): Promise<{ detail?: string }> {
  const response = await fetch(`${API_BASE}/api/auth/password-reset/confirm/`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: token.trim(), password }),
  });
  const data = await readJson(response);
  if (!response.ok || !data.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Could not reset password.');
  }
  return { detail: typeof data.detail === 'string' ? data.detail : undefined };
}

export async function apiResendVerification(
  email: string,
): Promise<{ resend_cooldown_seconds?: number }> {
  const response = await fetch(`${API_BASE}/api/auth/resend-verification/`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim() }),
  });
  const data = await readJson(response);
  if (!response.ok || !data.ok) {
    throw new Error(
      typeof data.error === 'string' ? data.error : 'Could not resend the verification email.',
    );
  }
  return {
    resend_cooldown_seconds:
      typeof data.resend_cooldown_seconds === 'number' ? data.resend_cooldown_seconds : 60,
  };
}

export async function apiLogout(): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/auth/logout/`, {
      method: 'POST',
      credentials: 'include',
    });
  } finally {
    accessToken = '';
  }
}

export async function apiMe(): Promise<Record<string, unknown> | null> {
  const response = await apiRequest('/api/auth/me/');
  if (!response.ok) return null;
  return readJson(response);
}

export async function apiRequest(path: string, options: RequestInit & { _retried?: boolean } = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (options.body && !headers.has('Content-Type') && !isFormData) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });
  if (response.status === 401 && !options._retried && !path.startsWith('/api/auth/token/refresh')) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return apiRequest(path, { ...options, _retried: true });
  }
  return response;
}

export function apiHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = getApiToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}
