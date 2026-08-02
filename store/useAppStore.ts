import { create } from 'zustand';

export interface LeaveRequest {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Denied';
}

interface AppState {
  user: {
    name: string;
    department: string;
    vacationDaysLeft: number;
  };
  isClockedIn: boolean;
  leaveRequests: LeaveRequest[];
  performanceScore: number;
  toggleClockIn: () => void;
  addLeaveRequest: (request: LeaveRequest) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: {
    name: 'Nicolas',
    department: 'Software Engineering',
    vacationDaysLeft: 14,
  },
  isClockedIn: false,
  leaveRequests: [
    { id: '1', startDate: '2026-08-15', endDate: '2026-08-20', reason: 'Summer Vacation', status: 'Approved' },
    { id: '2', startDate: '2026-09-01', endDate: '2026-09-02', reason: 'Personal Leave', status: 'Pending' },
  ],
  performanceScore: 92,
  toggleClockIn: () => set((state) => ({ isClockedIn: !state.isClockedIn })),
  addLeaveRequest: (request) => set((state) => ({ 
    leaveRequests: [request, ...state.leaveRequests],
    user: { ...state.user, vacationDaysLeft: state.user.vacationDaysLeft - 1 } 
  })),
}));
