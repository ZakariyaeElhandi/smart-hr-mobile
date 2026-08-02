import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Bell, Clock, CheckCircle, TrendingUp, Calendar } from 'lucide-react-native';
import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { user, isClockedIn, toggleClockIn, leaveRequests } = useAppStore();
  const [isCheckingGPS, setIsCheckingGPS] = useState(false);

  const approvedLeaves = leaveRequests.filter(r => r.status === 'Approved');
  const pendingLeaves = leaveRequests.filter(r => r.status === 'Pending');

  const handleClockIn = () => {
    if (!isClockedIn) {
      setIsCheckingGPS(true);
      setTimeout(() => {
        setIsCheckingGPS(false);
        toggleClockIn();
        Alert.alert('✅ Clocked In', 'GPS verified. You are at Casablanca HQ.');
      }, 1800);
    } else {
      toggleClockIn();
    }
  };

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good Morning' : now.getHours() < 18 ? 'Good Afternoon' : 'Good Evening';

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.userName}>{user.name} 👋</Text>
            <Text style={styles.department}>{user.department}</Text>
          </View>
          <TouchableOpacity style={styles.bellWrapper}>
            <Bell color="#e2e8f0" size={22} />
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{user.vacationDaysLeft}</Text>
            <Text style={styles.statLabel}>Days Off Left</Text>
          </View>
          <View style={[styles.statCard, styles.statCardMiddle]}>
            <Text style={[styles.statValue, isClockedIn ? styles.clockedInText : styles.clockedOutText]}>
              {isClockedIn ? 'Active' : 'Offline'}
            </Text>
            <Text style={styles.statLabel}>Status</Text>
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
                  <Text style={styles.locationText}>Casablanca HQ • GPS Required</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={handleClockIn}
                disabled={isCheckingGPS}
                style={[styles.clockBtn, isClockedIn ? styles.clockBtnOut : styles.clockBtnIn, isCheckingGPS && styles.clockBtnLoading]}
              >
                <Clock color="#fff" size={16} />
                <Text style={styles.clockBtnText}>
                  {isCheckingGPS ? 'Checking GPS...' : isClockedIn ? 'Clock Out' : 'Clock In'}
                </Text>
              </TouchableOpacity>
            </View>
            {isClockedIn && (
              <View style={styles.activeBar}>
                <Text style={styles.activeBarText}>⏱  Session started — working hours tracking active</Text>
              </View>
            )}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={[styles.actionCard, { backgroundColor: '#eff6ff' }]}>
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

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Notifications</Text>

          <View style={styles.notifCard}>
            <View style={[styles.notifIcon, { backgroundColor: '#dcfce7' }]}>
              <CheckCircle color="#16a34a" size={20} />
            </View>
            <View style={styles.notifBody}>
              <Text style={styles.notifTitle}>Leave Request Approved ✓</Text>
              <Text style={styles.notifText}>Your summer vacation Aug 15–20 has been approved by your manager.</Text>
              <Text style={styles.notifTime}>2 hours ago</Text>
            </View>
          </View>

          <View style={styles.notifCard}>
            <View style={[styles.notifIcon, { backgroundColor: '#fef9c3' }]}>
              <Bell color="#ca8a04" size={20} />
            </View>
            <View style={styles.notifBody}>
              <Text style={styles.notifTitle}>Performance Review Due</Text>
              <Text style={styles.notifText}>Your Q3 self-evaluation is due in 5 days. Tap to complete.</Text>
              <Text style={styles.notifTime}>Yesterday</Text>
            </View>
          </View>
        </View>

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
  bellWrapper: { backgroundColor: 'rgba(255,255,255,0.08)', padding: 12, borderRadius: 14, position: 'relative' },
  notifDot: { width: 9, height: 9, backgroundColor: '#ef4444', borderRadius: 99, position: 'absolute', top: 10, right: 10, borderWidth: 1.5, borderColor: '#16213e' },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  statCardMiddle: {},
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
  clockBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 14 },
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
