import * as SecureStore from 'expo-secure-store';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8070';

// ─── Token storage keys ───────────────────────────────────────────────────────
export const ACCESS_TOKEN_KEY = 'smart_hr_access_token';
export const REFRESH_TOKEN_KEY = 'smart_hr_refresh_token';

// ─── Core fetch with automatic Bearer header + 401 token refresh ──────────────
let isRefreshing = false;

export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  // If unauthorized and we aren't already refreshing, attempt a token refresh
  if (response.status === 401 && !isRefreshing) {
    isRefreshing = true;
    try {
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      if (!refreshToken) throw new Error('No refresh token');

      const refreshRes = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!refreshRes.ok) throw new Error('Refresh failed');

      const data = await refreshRes.json();
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, data.access_token);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.refresh_token);

      // Retry original request with new token
      headers['Authorization'] = `Bearer ${data.access_token}`;
      return fetch(`${BASE_URL}${path}`, { ...options, headers });
    } catch {
      // Refresh failed — clear tokens so app redirects to login
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      throw new Error('SESSION_EXPIRED');
    } finally {
      isRefreshing = false;
    }
  }

  return response;
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────
export async function apiLogin(login: string, password: string) {
  const res = await fetch(`${BASE_URL}/api/v1/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, password, device: 'SmartHR-Mobile' }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? 'Login failed');
  }
  return res.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }>;
}

export async function apiGetMe() {
  const res = await apiFetch('/api/v1/auth/me');
  if (!res.ok) throw new Error('Failed to fetch user profile');
  return res.json() as Promise<{
    user_id: number;
    name: string;
    login: string;
    employee_id: number | null;
    employee_name: string | null;
    role: string;
  }>;
}

// ─── Leaves helpers ───────────────────────────────────────────────────────────
export async function apiGetLeaves() {
  const res = await apiFetch('/api/v1/leaves');
  if (!res.ok) throw new Error('Failed to fetch leaves');
  return res.json();
}

export async function apiCreateLeave(payload: {
  holiday_status_id: number;
  date_from: string;
  date_to: string;
  reason?: string;
}) {
  const res = await apiFetch('/api/v1/leaves', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? 'Failed to create leave');
  }
  return res.json();
}

// ─── Attendance helpers ───────────────────────────────────────────────────────
export async function apiCheckIn() {
  const res = await apiFetch('/api/v1/attendance/check-in', { method: 'POST' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? 'Check-in failed');
  }
  return res.json();
}

export async function apiCheckOut() {
  const res = await apiFetch('/api/v1/attendance/check-out', { method: 'POST' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? 'Check-out failed');
  }
  return res.json();
}

export async function apiGetAttendances(employeeId: number) {
  const res = await apiFetch(`/api/v1/attendance/${employeeId}`);
  if (!res.ok) throw new Error('Failed to fetch attendances');
  return res.json() as Promise<AttendanceRecord[]>;
}

export interface AttendanceRecord {
  id: number;
  employee_id: number;
  employee: string;
  check_in: string | null;
  check_out: string | null;
  worked_hours: number;
  is_late: boolean;
  late_minutes: number;
  anomaly_type: string | null;
}
