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
  category: 'leave' | 'document' | 'anomaly';
  relatedId: string | number;
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
  markSingleNotificationRead: (id: string) => void;
}

function buildNotifications(
  leaves: LeaveRequest[],
  documents: DocumentRequestRecord[],
  anomalies: AnomalyRecord[],
  existing: Notification[]
): Notification[] {
  const readIds = new Set(existing.filter((n) => n.read).map((n) => n.id));
  const notifs: Notification[] = [];

  // 1. Leaves
  leaves.forEach((l) => {
    const isApproved = l.status === 'validate' || l.status === 'Approved';
    const isRefused  = l.status === 'refuse'   || l.status === 'Denied';
    const isPending  = l.status === 'confirm'  || l.status === 'Pending';

    if (!isApproved && !isRefused && !isPending) return;

    const id = `leave-${l.id}`;
    const title = isApproved ? '✅ Congé Approuvé'
      : isRefused ? '❌ Congé Refusé'
      : '⏳ Congé en Attente';
    const message = isApproved
      ? `Votre demande de ${l.leaveType ?? 'congé'} (${l.startDate} → ${l.endDate}) a été approuvée.`
      : isRefused
      ? `Votre demande de ${l.leaveType ?? 'congé'} (${l.startDate} → ${l.endDate}) a été refusée.`
      : `Votre demande de ${l.leaveType ?? 'congé'} (${l.startDate} → ${l.endDate}) est en cours d'examen.`;

    notifs.push({
      id,
      title,
      message,
      type: isApproved ? 'approved' : isRefused ? 'refused' : 'info',
      category: 'leave',
      relatedId: l.id,
      timestamp: new Date(),
      read: readIds.has(id),
    });
  });

  // 2. Documents
  documents.forEach((doc) => {
    const isReady = doc.status === 'ready' || doc.status === 'delivered';
    const isRejected = doc.status === 'rejected';
    const isProcessing = doc.status === 'processing' || doc.status === 'pending';

    if (!isReady && !isRejected && !isProcessing) return;

    const id = `doc-${doc.id}`;
    const docLabel = doc.document_type_label || doc.custom_type_label || 'Document';
    const title = isReady ? '📄 Document Disponible'
      : isRejected ? '❌ Demande de Document Refusée'
      : '⏳ Demande de Document en Traitement';
    const message = isReady
      ? `Votre document "${docLabel}" est prêt à être téléchargé.`
      : isRejected
      ? `Votre demande pour "${docLabel}" a été refusée${doc.rejection_reason ? ' : ' + doc.rejection_reason : '.'}`
      : `Votre demande pour "${docLabel}" est en cours de traitement.`;

    notifs.push({
      id,
      title,
      message,
      type: isReady ? 'approved' : isRejected ? 'refused' : 'info',
      category: 'document',
      relatedId: doc.id,
      timestamp: new Date(),
      read: readIds.has(id),
    });
  });

  // 3. Anomalies
  anomalies.forEach((a) => {
    const isResolved = a.status === 'resolved' || a.resolved;
    const isRejected = a.status === 'rejected';
    const isPending = a.status === 'pending';

    if (!isResolved && !isRejected && !isPending) return;

    const id = `anomaly-${a.id}`;
    const title = isResolved ? '✅ Signalement Résolu'
      : isRejected ? '❌ Signalement Non Retenu'
      : '⚠️ Signalement Enregistré';
    const message = isResolved
      ? `Votre réclamation d'anomalie du ${a.date_concerned || 'jour'} a été traitée par les RH.`
      : isRejected
      ? `Votre réclamation d'anomalie du ${a.date_concerned || 'jour'} n'a pas été retenue.`
      : `Votre réclamation du ${a.date_concerned || 'jour'} a bien été prise en compte.`;

    notifs.push({
      id,
      title,
      message,
      type: isResolved ? 'approved' : isRejected ? 'refused' : 'info',
      category: 'anomaly',
      relatedId: a.id,
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

    let fetchedLeaves: LeaveRequest[] = [];
    let fetchedDocs: DocumentRequestRecord[] = [];
    let fetchedAnomalies: AnomalyRecord[] = [];

    // Fetch leaves
    try {
      const rawLeaves = await apiGetLeaves();
      fetchedLeaves = rawLeaves.map((l: any) => ({
        id: l.id,
        startDate: l.date_from ? l.date_from.split('T')[0] : '',
        endDate: l.date_to ? l.date_to.split('T')[0] : '',
        reason: l.name ?? '',
        status: l.state,
        leaveType: l.holiday_status,
        numberOfDays: l.number_of_days,
        aiRecommendation: l.ai_recommendation,
      }));
      set({ leaveRequests: fetchedLeaves });
    } catch (_) {}

    // Fetch document requests
    try {
      fetchedDocs = await apiGetDocumentRequests();
      set({ documentRequests: fetchedDocs });
    } catch (_) {}

    if (user.employeeId) {
      // Fetch monthly attendance + anomalies
      get().fetchMonthlyAttendance(selectedMonth, selectedYear);
      try {
        fetchedAnomalies = await apiGetMyAnomalies();
        set({ myAnomalies: fetchedAnomalies });
      } catch (_) {}

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

    // Build consolidated notifications
    const notifs = buildNotifications(
      fetchedLeaves,
      fetchedDocs,
      fetchedAnomalies,
      get().notifications
    );
    set({ notifications: notifs });
  },

  setLeaveRequests: (requests) => set({ leaveRequests: requests }),
  addLeaveRequest: (request) =>
    set((s) => ({ leaveRequests: [request, ...s.leaveRequests] })),
  setAttendances: (records) => set({ attendances: records }),
  markNotificationsRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
    })),
  markSingleNotificationRead: (id: string) =>
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    })),
}));
