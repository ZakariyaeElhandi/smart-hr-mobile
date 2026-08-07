import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Bell, Clock, CheckCircle, TrendingUp, Calendar, LogOut } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { useAppStore } from '../../store/useAppStore';
import { apiCheckIn, apiCheckOut } from '../../utils/api';
import CalendarModal, { DayMark } from '../../components/CalendarModal';
import NotificationsModal from '../../components/NotificationsModal';

export default function HomeScreen() {
  const {
    user, isClockedIn, setClockedIn, logout,
    leaveRequests, attendances, notifications,
    refreshData, markNotificationsRead,
  } = useAppStore();

  const [isClockLoading, setIsClockLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const pendingLeaves = leaveRequests.filter(
    (r) => r.status === 'Pending' || r.status === 'confirm'
  );

  const now = new Date();
  const greeting =
    now.getHours() < 12 ? 'Good Morning'
    : now.getHours() < 18 ? 'Good Afternoon'
    : 'Good Evening';

  // Build attendance calendar marks
  const attendanceMarks = useMemo<DayMark[]>(() => {
    const marks: DayMark[] = [];
    attendances.forEach((a) => {
      if (!a.check_in) return;
      const dateStr = a.check_in.split('T')[0];
      const hasAnomaly = !!a.anomaly_type;
      const noCheckout = !a.check_out;
      const isLate = a.is_late;
      marks.push({
        date: dateStr,
        color: hasAnomaly || noCheckout ? '#ef4444' : isLate ? '#f59e0b' : '#10b981',
        label: hasAnomaly ? 'Anomaly' : noCheckout ? 'No checkout' : isLate ? 'Late' : 'Present',
      });
    });
    return marks;
  }, [attendances]);

  const handleClockIn = useCallback(async () => {
    setIsClockLoading(true);
    try {
      if (!isClockedIn) {
        await apiCheckIn();
        setClockedIn(true);
        Alert.alert('✅ Clocked In', 'Your attendance has been recorded in Odoo.');
      } else {
        await apiCheckOut();
        setClockedIn(false);
        Alert.alert('👋 Clocked Out', 'Your session has been closed in Odoo.');
      }
      // Refresh attendance data after clocking
      refreshData();
    } catch (err: any) {
      if (err.message === 'SESSION_EXPIRED') {
        Alert.alert('Session expired', 'Please log in again.');
        await logout();
        router.replace('/login');
        return;
      }
      Alert.alert('Error', err.message ?? 'Something went wrong.');
    } finally {
      setIsClockLoading(false);
    }
  }, [isClockedIn]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshData]);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  // Today's attendance summary
  const todayStr = now.toISOString().split('T')[0];
  const todayRecord = attendances.find((a) => a.check_in?.startsWith(todayStr));
  const workedTodayHrs = todayRecord?.worked_hours
    ? `${Math.floor(todayRecord.worked_hours)}h${Math.round((todayRecord.worked_hours % 1) * 60)}m`
    : isClockedIn ? 'Active' : '—';

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.userName}>{user.name || 'Employee'} 👋</Text>
            <Text style={styles.department}>
              {user.role ? user.role.toUpperCase() : 'Staff'}
            </Text>
          </View>
          <View style={styles.headerActions}>
            {/* Bell with badge */}
            <TouchableOpacity
              style={styles.bellWrapper}
              onPress={() => { setShowNotifs(true); markNotificationsRead(); }}
            >
              <Bell color="#e2e8f0" size={22} />
              {unreadCount > 0 && (
                <View style={styles.notifDot}>
                  <Text style={styles.notifDotText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <LogOut color="#e2e8f0" size={20} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, isClockedIn ? styles.clockedInText : styles.clockedOutText]}>
              {isClockedIn ? 'Active' : 'Offline'}
            </Text>
            <Text style={styles.statLabel}>Status</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{workedTodayHrs}</Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{pendingLeaves.length}</Text>
            <Text style={styles.statLabel}>Pending Req.</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#6366f1"
            colors={['#6366f1']}
          />
        }
      >
        {/* Clock In Section */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Attendance</Text>
            <TouchableOpacity
              style={styles.calendarPill}
              onPress={() => setShowCalendar(true)}
            >
              <Calendar color="#6366f1" size={14} />
              <Text style={styles.calendarPillText}>View Calendar</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.clockCard}>
            <View style={styles.clockCardInner}>
              <View>
                <Text style={styles.clockTitle}>
                  {isClockedIn ? '🟢  Currently Clocked In' : '⚪  Not Clocked In'}
                </Text>
                <View style={styles.locationRow}>
                  <MapPin color="#94a3b8" size={13} />
                  <Text style={styles.locationText}>Synced with Odoo Attendance</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={handleClockIn}
                disabled={isClockLoading}
                style={[
                  styles.clockBtn,
                  isClockedIn ? styles.clockBtnOut : styles.clockBtnIn,
                  isClockLoading && styles.clockBtnLoading,
                ]}
              >
                {isClockLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Clock color="#fff" size={16} />
                    <Text style={styles.clockBtnText}>
                      {isClockedIn ? 'Clock Out' : 'Clock In'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            {isClockedIn && (
              <View style={styles.activeBar}>
                <Text style={styles.activeBarText}>⏱  Working hours tracking active — synced live to Odoo</Text>
              </View>
            )}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: '#eff6ff' }]}
              onPress={() => router.push('/(tabs)/leaves')}
            >
              <Calendar color="#3b82f6" size={28} />
              <Text style={[styles.actionLabel, { color: '#1d4ed8' }]}>Request{'\n'}Time Off</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionCard, { backgroundColor: '#f0fdf4' }]}>
              <TrendingUp color="#16a34a" size={28} />
              <Text style={[styles.actionLabel, { color: '#15803d' }]}>View{'\n'}Performance</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionCard, { backgroundColor: '#fdf4ff' }]}>
              <CheckCircle color="#9333ea" size={28} />
              <Text style={[styles.actionLabel, { color: '#7e22ce' }]}>My{'\n'}Appraisals</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Leaves */}
        {leaveRequests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Leave Requests</Text>
            {leaveRequests.slice(0, 3).map((req) => {
              const isApproved = req.status === 'validate' || req.status === 'Approved';
              const isPending = req.status === 'confirm' || req.status === 'Pending';
              const bgColor = isApproved ? '#dcfce7' : isPending ? '#fef9c3' : '#fee2e2';
              const txtColor = isApproved ? '#15803d' : isPending ? '#92400e' : '#b91c1c';
              const label = isApproved ? 'Approved' : isPending ? 'Pending' : 'Refused';
              return (
                <View key={req.id} style={styles.notifCard}>
                  <View style={[styles.notifIcon, { backgroundColor: bgColor }]}>
                    {isApproved
                      ? <CheckCircle color="#16a34a" size={20} />
                      : isPending
                      ? <Clock color="#d97706" size={20} />
                      : <Bell color="#dc2626" size={20} />
                    }
                  </View>
                  <View style={styles.notifBody}>
                    <Text style={styles.notifTitle}>{req.leaveType || req.reason || 'Leave Request'}</Text>
                    <Text style={styles.notifText}>{req.startDate} → {req.endDate}</Text>
                    <Text style={[styles.notifTime, { color: txtColor, fontWeight: '700' }]}>{label}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Attendance Calendar Modal */}
      <CalendarModal
        visible={showCalendar}
        onClose={() => setShowCalendar(false)}
        title="Attendance Calendar"
        marks={attendanceMarks}
        legend={[
          { color: '#10b981', label: 'Present' },
          { color: '#f59e0b', label: 'Late arrival' },
          { color: '#ef4444', label: 'Issue / No checkout' },
        ]}
      />

      {/* Notifications Modal */}
      <NotificationsModal
        visible={showNotifs}
        onClose={() => setShowNotifs(false)}
        notifications={notifications}
        onMarkRead={markNotificationsRead}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingTop: 56, paddingBottom: 24, paddingHorizontal: 24 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  greeting: { color: '#94a3b8', fontSize: 15, fontWeight: '500' },
  userName: { color: '#f1f5f9', fontSize: 28, fontWeight: '800', marginTop: 2 },
  department: { color: '#64748b', fontSize: 13, marginTop: 4 },
  headerActions: { flexDirection: 'row', gap: 10 },
  bellWrapper: { backgroundColor: 'rgba(255,255,255,0.08)', padding: 12, borderRadius: 14, position: 'relative' },
  notifDot: {
    minWidth: 16, height: 16,
    backgroundColor: '#ef4444',
    borderRadius: 99,
    position: 'absolute', top: 7, right: 7,
    borderWidth: 1.5, borderColor: '#16213e',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notifDotText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.08)', padding: 12, borderRadius: 14 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  statValue: { color: '#f1f5f9', fontSize: 20, fontWeight: '800' },
  statLabel: { color: '#64748b', fontSize: 11, marginTop: 4, textAlign: 'center' },
  clockedInText: { color: '#4ade80' },
  clockedOutText: { color: '#94a3b8' },
  scroll: { flex: 1 },
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  calendarPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#ede9fe', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99 },
  calendarPillText: { fontSize: 12, fontWeight: '700', color: '#6366f1' },
  clockCard: { backgroundColor: '#ffffff', borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3 },
  clockCardInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  clockTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 6 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { color: '#94a3b8', fontSize: 12 },
  clockBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 14, minWidth: 110, justifyContent: 'center' },
  clockBtnIn: { backgroundColor: '#10b981' },
  clockBtnOut: { backgroundColor: '#ef4444' },
  clockBtnLoading: { opacity: 0.65 },
  clockBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  activeBar: { backgroundColor: '#f0fdf4', paddingVertical: 10, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: '#dcfce7' },
  activeBarText: { color: '#15803d', fontSize: 12, fontWeight: '600' },
  actionsGrid: { flexDirection: 'row', gap: 12 },
  actionCard: { flex: 1, borderRadius: 18, padding: 16, alignItems: 'center', gap: 10 },
  actionLabel: { fontSize: 12, fontWeight: '700', textAlign: 'center', lineHeight: 17 },
  notifCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  notifIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  notifBody: { flex: 1 },
  notifTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  notifText: { fontSize: 13, color: '#64748b', lineHeight: 18 },
  notifTime: { fontSize: 11, color: '#94a3b8', marginTop: 6 },
});
