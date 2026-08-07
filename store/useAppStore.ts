import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, apiGetMe, apiLogin } from '../utils/api';

export interface LeaveRequest {
  id: string | number;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Denied' | 'draft' | 'confirm' | 'validate' | 'refuse';
  leaveType?: string;
  aiRecommendation?: string;
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

  // Leaves
  leaveRequests: LeaveRequest[];

  // Performance (still mock until appraisal API is ready)
  performanceScore: number;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<boolean>;
  toggleClockIn: () => void;
  setLeaveRequests: (requests: LeaveRequest[]) => void;
  addLeaveRequest: (request: LeaveRequest) => void;
  setClockedIn: (value: boolean) => void;
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
  leaveRequests: [],
  performanceScore: 92, // Still mock

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
      return true;
    } catch {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      set({ isAuthLoading: false, isLoggedIn: false });
      return false;
    }
  },

  toggleClockIn: () => set((s) => ({ isClockedIn: !s.isClockedIn })),
  setClockedIn: (value) => set({ isClockedIn: value }),
  setLeaveRequests: (requests) => set({ leaveRequests: requests }),
  addLeaveRequest: (request) =>
    set((s) => ({ leaveRequests: [request, ...s.leaveRequests] })),
}));
