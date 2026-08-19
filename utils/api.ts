import * as SecureStore from "expo-secure-store";

const BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8070";

// ─── Token storage keys ───────────────────────────────────────────────────────
export const ACCESS_TOKEN_KEY = "smart_hr_access_token";
export const REFRESH_TOKEN_KEY = "smart_hr_refresh_token";

// ─── Core fetch with automatic Bearer header + 401 token refresh ──────────────
let isRefreshing = false;

export async function apiFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  // If unauthorized and we aren't already refreshing, attempt a token refresh
  if (response.status === 401 && !isRefreshing) {
    isRefreshing = true;
    try {
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      if (!refreshToken) throw new Error("No refresh token");

      const refreshRes = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!refreshRes.ok) throw new Error("Refresh failed");

      const data = await refreshRes.json();
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, data.access_token);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.refresh_token);

      // Retry original request with new token
      headers["Authorization"] = `Bearer ${data.access_token}`;
      return fetch(`${BASE_URL}${path}`, { ...options, headers });
    } catch {
      // Refresh failed — clear tokens so app redirects to login
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      throw new Error("SESSION_EXPIRED");
    } finally {
      isRefreshing = false;
    }
  }

  return response;
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────
export async function apiLogin(login: string, password: string) {
  const res = await fetch(`${BASE_URL}/api/v1/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login, password, device: "SmartHR-Mobile" }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Login failed");
  }
  return res.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    must_change_password?: boolean;
  }>;
}

export async function apiGetMe() {
  const res = await apiFetch("/api/v1/auth/me");
  if (!res.ok) throw new Error("Failed to fetch user profile");
  return res.json() as Promise<{
    user_id: number | null;
    name: string;
    login: string;
    employee_id: number | null;
    employee_name: string | null;
    role: string;
    must_change_password?: boolean;
  }>;
}

export async function apiChangePassword(
  newPassword: string,
  oldPassword?: string,
) {
  const res = await apiFetch("/api/v1/auth/change-password", {
    method: "POST",
    body: JSON.stringify({
      old_password: oldPassword,
      new_password: newPassword,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Password change failed");
  }
  return res.json();
}

// ─── Leaves helpers ───────────────────────────────────────────────────────────
export async function apiGetLeaves() {
  const res = await apiFetch("/api/v1/leaves");
  if (!res.ok) throw new Error("Failed to fetch leaves");
  return res.json();
}

export async function apiCreateLeave(payload: {
  holiday_status_id: number;
  date_from: string;
  date_to: string;
  reason?: string;
}) {
  const res = await apiFetch("/api/v1/leaves", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Failed to create leave");
  }
  return res.json();
}

// ─── Attendance helpers ───────────────────────────────────────────────────────
export async function apiCheckIn() {
  const res = await apiFetch("/api/v1/attendance/check-in", { method: "POST" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Check-in failed");
  }
  return res.json();
}

export async function apiCheckOut() {
  const res = await apiFetch("/api/v1/attendance/check-out", {
    method: "POST",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Check-out failed");
  }
  return res.json();
}

export async function apiGetAttendances(employeeId: number) {
  const res = await apiFetch(`/api/v1/attendance/${employeeId}`);
  if (!res.ok) throw new Error("Failed to fetch attendances");
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

export interface MonthlyAttendanceStats {
  present_days: number;
  late_days: number;
  absent_days: number;
  leave_days: number;
  total_worked_hours: number;
}

export interface MonthlyLeaveRecord {
  id: number;
  leave_type: string;
  date_from: string | null;
  date_to: string | null;
  number_of_days: number;
}

export interface AnomalyRecord {
  id: number;
  employee_id: number;
  employee: string;
  anomaly_type: string;
  status: "pending" | "resolved" | "rejected";
  date_concerned: string | null;
  comment: string;
  rh_comment: string;
  attachment_name?: string | null;
  detected_on: string | null;
  resolved: boolean;
}

export interface MonthlyAttendanceResponse {
  employee_id: number;
  month: number;
  year: number;
  stats: MonthlyAttendanceStats;
  attendances: AttendanceRecord[];
  leaves: MonthlyLeaveRecord[];
  anomalies: AnomalyRecord[];
}

export async function apiGetMonthlyAttendance(
  employeeId: number,
  month: number,
  year: number,
): Promise<MonthlyAttendanceResponse> {
  const res = await apiFetch(
    `/api/v1/attendance/${employeeId}?month=${month}&year=${year}`,
  );
  if (!res.ok) throw new Error("Failed to fetch monthly attendance");
  return res.json();
}

export async function apiReportAnomaly(payload: {
  date: string;
  comment: string;
  attendance_id?: number;
  attachment_base64?: string;
  attachment_name?: string;
}): Promise<AnomalyRecord> {
  const res = await apiFetch("/api/v1/attendance/anomaly", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Failed to submit anomaly claim");
  }
  return res.json();
}

export async function apiGetMyAnomalies(): Promise<AnomalyRecord[]> {
  const res = await apiFetch("/api/v1/attendance/anomalies/my");
  if (!res.ok) throw new Error("Failed to fetch anomaly claims");
  return res.json();
}

// ─── Appraisals helpers ───────────────────────────────────────────────────────
export interface AppraisalRecord {
  id: number;
  employee_id: number;
  employee: string;
  state: string;
  ai_performance_score: number;
  ai_high_potential: boolean;
  // Only present in detailed calls
  ai_summary?: string;
  ai_computed_on?: string | null;
}

export async function apiGetAppraisals(
  employeeId: number,
): Promise<AppraisalRecord[]> {
  const res = await apiFetch(`/api/v1/appraisals/${employeeId}`);
  if (!res.ok) throw new Error("Failed to fetch appraisals");
  return res.json();
}

export async function apiGetAppraisalAnalysis(
  appraisalId: number,
): Promise<AppraisalRecord> {
  const res = await apiFetch(`/api/v1/appraisal/${appraisalId}`);
  if (!res.ok) throw new Error("Failed to fetch appraisal analysis");
  return res.json();
}

// ─── Documents helpers ────────────────────────────────────────────────────────
export interface DocumentRequestRecord {
  id: number;
  document_type: string;
  document_type_label: string;
  custom_type_label?: string | null;
  period_month?: string | null;
  period_year?: number | null;
  comment?: string | null;
  status: "pending" | "processing" | "ready" | "delivered" | "rejected";
  status_label: string;
  rejection_reason?: string | null;
  has_file: boolean;
  file_name: string;
  request_date?: string | null;
  processed_date?: string | null;
}

export async function apiGetDocumentRequests(): Promise<
  DocumentRequestRecord[]
> {
  const res = await apiFetch("/api/v1/documents/my");
  if (!res.ok) throw new Error("Failed to fetch document requests");
  const data = await res.json();
  return data.requests ?? [];
}

export async function apiCreateDocumentRequest(payload: {
  document_type: string;
  custom_type_label?: string;
  period_month?: string;
  period_year?: number;
  comment?: string;
}): Promise<{ success: boolean; message: string; id: number }> {
  const res = await apiFetch("/api/v1/documents/request", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Failed to submit document request");
  }
  return res.json();
}

/**
 * Fetches a document's raw content from Odoo as base64, ready to be
 * written to disk. Goes through apiFetch (not FileSystem.downloadAsync)
 * so we keep the automatic 401 → refresh-token → retry behavior.
 */
export async function apiFetchDocumentBase64(
  docId: number,
): Promise<{ base64: string; mimeType: string }> {
  const res = await apiFetch(`/api/v1/documents/${docId}/download`);
  if (!res.ok) {
    throw new Error("Le fichier n'est pas disponible au téléchargement.");
  }

  const mimeType =
    res.headers.get("Content-Type")?.split(";")[0]?.trim() ||
    "application/octet-stream";

  const blob = await res.blob();
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(new Error("Impossible de lire le fichier téléchargé."));
    reader.onload = () => {
      const result = reader.result as string;
      // result looks like "data:<mime>;base64,AAAA..." — strip the prefix.
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.readAsDataURL(blob);
  });

  return { base64, mimeType };
}
