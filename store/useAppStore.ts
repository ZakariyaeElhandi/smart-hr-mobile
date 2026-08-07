import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  AttendanceRecord,
  apiGetMe,
  apiLogin,
  apiGetLeaves,
  apiGetAttendances,
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
  user: UserProfile;

  // Attendance
  isClockedIn: boolean;
  attendances: AttendanceRecord[];

  // Leaves
  leaveRequests: LeaveRequest[];

  // Notifications (in-app)
  notifications: Notification[];

  // Performance (still mock until appraisal API is ready)
  performanceScore: number;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<boolean>;
  refreshData: () => Promise<void>;
  toggleClockIn: () => void;
  setLeaveRequests: (requests: LeaveRequest[]) => void;
  addLeaveRequest: (request: LeaveRequest) => void;
  setClockedIn: (value: boolean) => void;
  setAttendances: (records: AttendanceRecord[]) => void;
  markNotificationsRead: () => void;
}

// Build in-app notifications by comparing leave statuses
function buildNotifications(leaves: LeaveRequest[]): Notification[] {
  return leaves
    .filter((l) => l.status === 'validate' || l.status === 'Approved' || l.status === 'refuse' || l.status === 'Denied')
    .slice(0, 15)
    .map((l) => {
      const isApproved = l.status === 'validate' || l.status === 'Approved';
      return {
        id: `leave-${l.id}`,
        title: isApproved ? '✅ Leave Approved' : '❌ Leave Refused',
        message: `${l.leaveType ?? 'Leave'} (${l.startDate} → ${l.endDate}) was ${isApproved ? 'approved' : 'refused'}.`,
        type: isApproved ? 'approved' : 'refused',
        timestamp: new Date(),
        read: false,
      } as Notification;
    });
}

export const useAppStore = create<AppState>((set, get) => ({
  isLoggedIn: false,
  isAuthLoading: true,
  authError: null,
  user: {
    name: '',
    department: '',
    employeeId: null,
    role: 'employee',
  },
  isClockedIn: false,
  attendances: [],
  leaveRequests: [],
  notifications: [],
  performanceScore: 92,

  login: async (email, password) => {
    set({ isAuthLoading: true, authError: null });
    try {
      const tokens = await apiLogin(email, password);
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.access_token);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refresh_token);

      const me = await apiGetMe();
      set({
        isLoggedIn: true,
        isAuthLoading: false,
        user: {
          name: me.employee_name ?? me.name,
          department: '',
          employeeId: me.employee_id,
          role: me.role,
        },
      });

      // Eagerly load data after login
      get().refreshData();
    } catch (err: any) {
      set({ isAuthLoading: false, authError: err.message ?? 'Login failed' });
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    set({
      isLoggedIn: false,
      user: { name: '', department: '', employeeId: null, role: 'employee' },
      leaveRequests: [],
      attendances: [],
      notifications: [],
      isClockedIn: false,
    });
  },

  restoreSession: async () => {
    set({ isAuthLoading: true });
    try {
      const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      if (!token) {
        set({ isAuthLoading: false, isLoggedIn: false });
        return false;
      }
      const me = await apiGetMe();
      set({
        isLoggedIn: true,
        isAuthLoading: false,
        user: {
          name: me.employee_name ?? me.name,
          department: '',
          employeeId: me.employee_id,
          role: me.role,
        },
      });
      // Eagerly load data after session restore
      get().refreshData();
      return true;
    } catch {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      set({ isAuthLoading: false, isLoggedIn: false });
      return false;
    }
  },

  refreshData: async () => {
    const { user } = get();
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
      const notifs = buildNotifications(mapped);
      set({ leaveRequests: mapped, notifications: notifs });
    } catch (_) {}

    if (user.employeeId) {
      try {
        const records = await apiGetAttendances(user.employeeId);
        // Check if currently clocked in (last record has no check_out)
        const isClockedIn = records.length > 0 && !records[0].check_out;
        set({ attendances: records, isClockedIn });
      } catch (_) {}
    }
  },

  toggleClockIn: () => set((s) => ({ isClockedIn: !s.isClockedIn })),
  setClockedIn: (value) => set({ isClockedIn: value }),
  setLeaveRequests: (requests) => set({ leaveRequests: requests }),
  addLeaveRequest: (request) =>
    set((s) => ({ leaveRequests: [request, ...s.leaveRequests] })),
  setAttendances: (records) => set({ attendances: records }),
  markNotificationsRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
    })),
}));
