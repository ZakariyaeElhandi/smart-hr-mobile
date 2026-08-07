import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Bell, Clock, CheckCircle, TrendingUp, Calendar, LogOut } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { useAppStore } from '../../store/useAppStore';
import { apiCheckIn, apiCheckOut } from '../../utils/api';

export default function HomeScreen() {
  const { user, isClockedIn, setClockedIn, logout, leaveRequests } = useAppStore();
  const [isClockLoading, setIsClockLoading] = useState(false);

  const pendingLeaves = leaveRequests.filter(
    (r) => r.status === 'Pending' || r.status === 'confirm'
  );

  const now = new Date();
  const greeting =
    now.getHours() < 12
      ? 'Good Morning'
      : now.getHours() < 18
      ? 'Good Afternoon'
      : 'Good Evening';

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

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

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
            <TouchableOpacity style={styles.bellWrapper}>
              <Bell color="#e2e8f0" size={22} />
              <View style={styles.notifDot} />
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
            <Text style={styles.statValue}>{leaveRequests.length}</Text>
            <Text style={styles.statLabel}>Leave History</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{pendingLeaves.length}</Text>
            <Text style={styles.statLabel}>Pending Req.</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Clock In Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Attendance</Text>
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
                    <Text style={styles.notifTitle}>{req.reason || req.leaveType || 'Leave Request'}</Text>
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
  notifDot: { width: 9, height: 9, backgroundColor: '#ef4444', borderRadius: 99, position: 'absolute', top: 10, right: 10, borderWidth: 1.5, borderColor: '#16213e' },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.08)', padding: 12, borderRadius: 14 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  statValue: { color: '#f1f5f9', fontSize: 22, fontWeight: '800' },
  statLabel: { color: '#64748b', fontSize: 11, marginTop: 4, textAlign: 'center' },
  clockedInText: { color: '#4ade80' },
  clockedOutText: { color: '#94a3b8' },
  scroll: { flex: 1 },
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
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
