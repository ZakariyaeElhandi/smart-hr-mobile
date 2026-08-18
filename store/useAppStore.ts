import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  AttendanceRecord,
  AppraisalRecord,
  MonthlyAttendanceResponse,
  AnomalyRecord,
  apiGetMe,
  apiLogin,
  apiChangePassword,
  apiGetLeaves,
  apiGetAttendances,
  apiGetMonthlyAttendance,
  apiReportAnomaly,
  apiGetMyAnomalies,
  apiGetAppraisals,
  apiGetAppraisalAnalysis,
  DocumentRequestRecord,
  apiGetDocumentRequests,
  apiCreateDocumentRequest,
} from '../utils/api';

export interface LeaveRequest {
  id: string | number;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Denied' | 'draft' | 'confirm' | 'validate' | 'refuse';
  leaveType?: string;
  aiRecommendation?: string;
  numberOfDays?: number;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'approved' | 'refused' | 'info';
  timestamp: Date;
  read: boolean;
}

interface UserProfile {
  name: string;
  department: string;
  employeeId: number | null;
  role: string;
}

interface AppState {
  // Auth
  isLoggedIn: boolean;
  isAuthLoading: boolean;
  authError: string | null;
  mustChangePassword: boolean;
  user: UserProfile;

  // Attendance & Monthly Data
  attendances: AttendanceRecord[];
  monthlyAttendance: MonthlyAttendanceResponse | null;
  selectedMonth: number;
  selectedYear: number;
  isMonthlyLoading: boolean;
  myAnomalies: AnomalyRecord[];

  // Leaves
  leaveRequests: LeaveRequest[];

  // Notifications (in-app)
  notifications: Notification[];

  // Documents
  documentRequests: DocumentRequestRecord[];

  // Appraisals / Performance
  appraisals: AppraisalRecord[];
  appraisalDetail: AppraisalRecord | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (newPassword: string, oldPassword?: string) => Promise<void>;
  restoreSession: () => Promise<boolean>;
  refreshData: () => Promise<void>;
  fetchMonthlyAttendance: (month: number, year: number) => Promise<void>;
  fetchMyAnomalies: () => Promise<void>;
  fetchDocumentRequests: () => Promise<void>;
  submitDocumentRequest: (payload: {
    document_type: string;
    custom_type_label?: string;
    period_month?: string;
    period_year?: number;
    comment?: string;
  }) => Promise<void>;
  submitAnomalyClaim: (payload: {
    date: string;
    comment: string;
    attendance_id?: number;
    attachment_base64?: string;
    attachment_name?: string;
  }) => Promise<AnomalyRecord>;
  setLeaveRequests: (requests: LeaveRequest[]) => void;
  addLeaveRequest: (request: LeaveRequest) => void;
  setAttendances: (records: AttendanceRecord[]) => void;
  markNotificationsRead: () => void;
}

function buildNotifications(leaves: LeaveRequest[], existing: Notification[]): Notification[] {
  const readIds = new Set(existing.filter((n) => n.read).map((n) => n.id));
  const notifs: Notification[] = [];

  leaves.forEach((l) => {
    const isApproved = l.status === 'validate' || l.status === 'Approved';
    const isRefused  = l.status === 'refuse'   || l.status === 'Denied';
    const isPending  = l.status === 'confirm'  || l.status === 'Pending';

    if (!isApproved && !isRefused && !isPending) return;

    const id = `leave-${l.id}`;
    const title = isApproved ? '✅ Leave Approved'
      : isRefused ? '❌ Leave Refused'
      : '⏳ Leave Pending Review';
    const message = isApproved
      ? `Your ${l.leaveType ?? 'leave'} request (${l.startDate} → ${l.endDate}) was approved.`
      : isRefused
      ? `Your ${l.leaveType ?? 'leave'} request (${l.startDate} → ${l.endDate}) was refused.`
      : `Your ${l.leaveType ?? 'leave'} request (${l.startDate} → ${l.endDate}) is awaiting approval.`;

    notifs.push({
      id,
      title,
      message,
      type: isApproved ? 'approved' : isRefused ? 'refused' : 'info',
      timestamp: new Date(),
      read: readIds.has(id),
    });
  });

  return notifs;
}

const now = new Date();

export const useAppStore = create<AppState>((set, get) => ({
  isLoggedIn: false,
  isAuthLoading: true,
  authError: null,
  mustChangePassword: false,
  user: {
    name: '',
    department: '',
    employeeId: null,
    role: '',
  },

  attendances: [],
  monthlyAttendance: null,
  selectedMonth: now.getMonth() + 1,
  selectedYear: now.getFullYear(),
  isMonthlyLoading: false,
  myAnomalies: [],

  leaveRequests: [],
  notifications: [],
  documentRequests: [],
  appraisals: [],
  appraisalDetail: null,

  login: async (email, password) => {
    set({ isAuthLoading: true, authError: null });
    try {
      const tokens = await apiLogin(email, password);
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.access_token);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refresh_token);

      const me = await apiGetMe();
      const mustChange = tokens.must_change_password ?? me.must_change_password ?? false;

      set({
        isLoggedIn: true,
        isAuthLoading: false,
        mustChangePassword: mustChange,
        user: {
          name: me.employee_name ?? me.name,
          department: '',
          employeeId: me.employee_id,
          role: me.role,
        },
      });

      get().refreshData();
    } catch (err: any) {
      set({
        isAuthLoading: false,
        authError: err.message ?? 'Login failed',
      });
      throw err;
    }
  },

  changePassword: async (newPassword, oldPassword) => {
    await apiChangePassword(newPassword, oldPassword);
    set({ mustChangePassword: false });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    set({
      isLoggedIn: false,
      mustChangePassword: false,
      user: { name: '', department: '', employeeId: null, role: '' },
      attendances: [],
      monthlyAttendance: null,
      myAnomalies: [],
      leaveRequests: [],
      notifications: [],
      appraisals: [],
      appraisalDetail: null,
    });
  },

  restoreSession: async () => {
    set({ isAuthLoading: true });
    try {
      const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      if (!token) {
        set({ isAuthLoading: false, isLoggedIn: false, mustChangePassword: false });
        return false;
      }
      const me = await apiGetMe();
      set({
        isLoggedIn: true,
        isAuthLoading: false,
        mustChangePassword: me.must_change_password ?? false,
        user: {
          name: me.employee_name ?? me.name,
          department: '',
          employeeId: me.employee_id,
          role: me.role,
        },
      });
      get().refreshData();
      return true;
    } catch {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      set({ isAuthLoading: false, isLoggedIn: false, mustChangePassword: false });
      return false;
    }
  },

  fetchMonthlyAttendance: async (month: number, year: number) => {
    const { user } = get();
    if (!user.employeeId) return;

    set({ isMonthlyLoading: true, selectedMonth: month, selectedYear: year });
    try {
      const data = await apiGetMonthlyAttendance(user.employeeId, month, year);
      set({ monthlyAttendance: data, isMonthlyLoading: false });
    } catch (err) {
      set({ isMonthlyLoading: false });
    }
  },

  fetchMyAnomalies: async () => {
    try {
      const anomalies = await apiGetMyAnomalies();
      set({ myAnomalies: anomalies });
    } catch (_) {}
  },

  fetchDocumentRequests: async () => {
    try {
      const docs = await apiGetDocumentRequests();
      set({ documentRequests: docs });
    } catch (_) {}
  },

  submitDocumentRequest: async (payload) => {
    await apiCreateDocumentRequest(payload);
    await get().fetchDocumentRequests();
  },

  submitAnomalyClaim: async (payload) => {
    const anomaly = await apiReportAnomaly(payload);
    set((s) => ({ myAnomalies: [anomaly, ...s.myAnomalies] }));
    // Refresh monthly data to reflect the anomaly status
    const { selectedMonth, selectedYear } = get();
    get().fetchMonthlyAttendance(selectedMonth, selectedYear);
    return anomaly;
  },

  refreshData: async () => {
    const { user, selectedMonth, selectedYear } = get();

    // Fetch leaves
    try {
      const rawLeaves = await apiGetLeaves();
      const mapped: LeaveRequest[] = rawLeaves.map((l: any) => ({
        id: l.id,
        startDate: l.date_from ? l.date_from.split('T')[0] : '',
        endDate: l.date_to ? l.date_to.split('T')[0] : '',
        reason: l.name ?? '',
        status: l.state,
        leaveType: l.holiday_status,
        numberOfDays: l.number_of_days,
        aiRecommendation: l.ai_recommendation,
      }));
      const notifs = buildNotifications(mapped, get().notifications);
      set({ leaveRequests: mapped, notifications: notifs });
    } catch (_) {}

    // Fetch document requests
    get().fetchDocumentRequests();

    if (user.employeeId) {
      // Fetch monthly attendance + anomalies
      get().fetchMonthlyAttendance(selectedMonth, selectedYear);
      get().fetchMyAnomalies();

      // Fetch appraisals + AI analysis
      try {
        const appraisals = await apiGetAppraisals(user.employeeId);
        set({ appraisals });
        if (appraisals.length > 0) {
          const detail = await apiGetAppraisalAnalysis(appraisals[0].id);
          set({ appraisalDetail: detail });
        }
      } catch (_) {}
    }
  },

  setLeaveRequests: (requests) => set({ leaveRequests: requests }),
  addLeaveRequest: (request) =>
    set((s) => ({ leaveRequests: [request, ...s.leaveRequests] })),
  setAttendances: (records) => set({ attendances: records }),
  markNotificationsRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
    })),
}));
