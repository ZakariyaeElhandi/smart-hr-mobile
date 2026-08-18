import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Calendar as CalendarIcon,
  Bell,
  LogOut,
  FileText,
  Info,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useAppStore } from '../../store/useAppStore';
import DayDetailModal, { DayDetailData } from '../../components/DayDetailModal';
import AnomalyModal from '../../components/AnomalyModal';
import NotificationsModal from '../../components/NotificationsModal';

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export default function MaPresenceScreen() {
  const {
    user,
    logout,
    monthlyAttendance,
    selectedMonth,
    selectedYear,
    isMonthlyLoading,
    fetchMonthlyAttendance,
    notifications,
    markNotificationsRead,
    myAnomalies,
  } = useAppStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedDayDetail, setSelectedDayDetail] = useState<DayDetailData | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAnomalyModal, setShowAnomalyModal] = useState(false);
  const [anomalyInitialDate, setAnomalyInitialDate] = useState<string | undefined>();
  const [showNotifs, setShowNotifs] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const pendingAnomaliesCount = myAnomalies.filter((a) => a.status === 'pending').length;

  const now = new Date();
  const currentRealMonth = now.getMonth() + 1;
  const currentRealYear = now.getFullYear();

  // Load monthly data on mount or when month/year changes
  useEffect(() => {
    fetchMonthlyAttendance(selectedMonth, selectedYear);
  }, [selectedMonth, selectedYear]);

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      fetchMonthlyAttendance(12, selectedYear - 1);
    } else {
      fetchMonthlyAttendance(selectedMonth - 1, selectedYear);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      fetchMonthlyAttendance(1, selectedYear + 1);
    } else {
      fetchMonthlyAttendance(selectedMonth + 1, selectedYear);
    }
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchMonthlyAttendance(selectedMonth, selectedYear);
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedMonth, selectedYear]);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  // Build daily status map for the calendar grid
  const calendarDays = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    // In JS getDay(): 0 is Sun, 1 is Mon... convert to Monday-based index (0=Mon, 6=Sun)
    const firstDayObj = new Date(selectedYear, selectedMonth - 1, 1);
    let startDayOfWeek = firstDayObj.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6; // Sunday becomes 6

    const attendances = monthlyAttendance?.attendances || [];
    const leaves = monthlyAttendance?.leaves || [];
    const anomalies = monthlyAttendance?.anomalies || [];

    // Map check-ins by date string YYYY-MM-DD
    const attMap: Record<string, any> = {};
    attendances.forEach((a) => {
      if (a.check_in) {
        const dateStr = a.check_in.split('T')[0];
        attMap[dateStr] = a;
      }
    });

    // Map leaves by date string
    const leaveSet = new Set<string>();
    leaves.forEach((l) => {
      if (l.date_from && l.date_to) {
        const cur = new Date(l.date_from);
        const end = new Date(l.date_to);
        while (cur <= end) {
          const dateStr = cur.toISOString().split('T')[0];
          leaveSet.add(dateStr);
          cur.setDate(cur.getDate() + 1);
        }
      }
    });

    const todayStr = now.toISOString().split('T')[0];

    const grid = [];

    // Empty lead cells
    for (let i = 0; i < startDayOfWeek; i++) {
      grid.push({ dayNumber: null });
    }

    // Actual month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dateObj = new Date(selectedYear, selectedMonth - 1, day);
      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

      const attRecord = attMap[dateStr];
      const isLeave = leaveSet.has(dateStr);
      const isPast = dateStr <= todayStr;

      let status: 'present' | 'late' | 'absent' | 'leave' | 'weekend' = 'weekend';
      let statusLabel = 'Weekend / Non travaillé';
      let color = '#94a3b8'; // gray
      let bgColor = '#f8fafc';

      if (isLeave) {
        status = 'leave';
        statusLabel = 'Congé / Jour férié';
        color = '#3b82f6';
        bgColor = '#dbeafe';
      } else if (attRecord) {
        if (attRecord.is_late) {
          status = 'late';
          statusLabel = 'Présent (Retard)';
          color = '#f59e0b';
          bgColor = '#fef3c7';
        } else {
          status = 'present';
          statusLabel = 'Présent';
          color = '#10b981';
          bgColor = '#dcfce7';
        }
      } else if (!isWeekend && isPast) {
        status = 'absent';
        statusLabel = 'Absent / Non pointé';
        color = '#ef4444';
        bgColor = '#fee2e2';
      }

      grid.push({
        dayNumber: day,
        dateStr,
        status,
        statusLabel,
        color,
        bgColor,
        attRecord,
        isLeave,
        isWeekend,
      });
    }

    return grid;
  }, [monthlyAttendance, selectedMonth, selectedYear]);

  // Click on a calendar day
  const handleDayPress = (dayItem: any) => {
    if (!dayItem.dayNumber) return;

    const data: DayDetailData = {
      date: dayItem.dateStr,
      status: dayItem.status,
      statusLabel: dayItem.statusLabel,
      checkIn: dayItem.attRecord?.check_in ?? null,
      checkOut: dayItem.attRecord?.check_out ?? null,
      workedHours: dayItem.attRecord?.worked_hours ?? 0,
      isLate: dayItem.attRecord?.is_late ?? false,
      lateMinutes: dayItem.attRecord?.late_minutes ?? 0,
      anomalyType: dayItem.attRecord?.anomaly_type ?? null,
      attendanceId: dayItem.attRecord?.id,
    };

    setSelectedDayDetail(data);
    setShowDetailModal(true);
  };

  const handleOpenAnomalyForDate = (data: DayDetailData) => {
    setAnomalyInitialDate(data.date);
    setShowAnomalyModal(true);
  };

  const stats = monthlyAttendance?.stats || {
    present_days: 0,
    late_days: 0,
    absent_days: 0,
    leave_days: 0,
    total_worked_hours: 0,
  };

  const totalHrs = stats.total_worked_hours;
  const hoursFormatted = `${Math.floor(totalHrs)}h ${Math.round((totalHrs % 1) * 60)}m`;

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.appName}>Smart HR AI ✦ Présence</Text>
            <Text style={styles.userName}>{user.name || 'Employé'} 👋</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setShowNotifs(true)}
            >
              <Bell color="#e2e8f0" size={20} />
              {unreadCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={handleLogout}>
              <LogOut color="#e2e8f0" size={20} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Month Selector Bar */}
        <View style={styles.monthSelectorBar}>
          <TouchableOpacity style={styles.monthArrow} onPress={handlePrevMonth}>
            <ChevronLeft color="#f1f5f9" size={20} />
          </TouchableOpacity>
          <View style={styles.monthTitleWrapper}>
            <CalendarIcon color="#818cf8" size={16} />
            <Text style={styles.monthTitle}>
              {MONTHS_FR[selectedMonth - 1]} {selectedYear}
            </Text>
          </View>
          <TouchableOpacity style={styles.monthArrow} onPress={handleNextMonth}>
            <ChevronRight color="#f1f5f9" size={20} />
          </TouchableOpacity>
        </View>

        {/* Monthly Summary Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#4ade80' }]}>{stats.present_days}</Text>
            <Text style={styles.statLabel}>Présent</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#fbbf24' }]}>{stats.late_days}</Text>
            <Text style={styles.statLabel}>Retards</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#f87171' }]}>{stats.absent_days}</Text>
            <Text style={styles.statLabel}>Absences</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#60a5fa' }]}>{hoursFormatted}</Text>
            <Text style={styles.statLabel}>Total Heures</Text>
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
        {/* Read-Only Notice Bar */}
        <View style={styles.readOnlyNotice}>
          <Info color="#4338ca" size={16} />
          <Text style={styles.readOnlyNoticeText}>
            Les données ci-dessous correspondent au pointage officiel enregistré (Lecture seule).
          </Text>
        </View>

        {/* Calendar Section */}
        <View style={styles.calendarContainer}>
          <View style={styles.calendarHeaderRow}>
            <Text style={styles.calendarSectionTitle}>Calendrier Mensuel</Text>
            {isMonthlyLoading && <ActivityIndicator color="#6366f1" size="small" />}
          </View>

          {/* Weekday Labels */}
          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((w, idx) => (
              <Text key={idx} style={styles.weekdayText}>{w}</Text>
            ))}
          </View>

          {/* Calendar Days Grid */}
          <View style={styles.daysGrid}>
            {calendarDays.map((item, index) => {
              if (!item.dayNumber) {
                return <View key={index} style={styles.emptyDayCell} />;
              }

              const isToday =
                item.dayNumber === now.getDate() &&
                selectedMonth === currentRealMonth &&
                selectedYear === currentRealYear;

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dayCell,
                    { backgroundColor: item.bgColor },
                    isToday && styles.todayBorder,
                  ]}
                  onPress={() => handleDayPress(item)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dayNumberText, { color: item.color }]}>
                    {item.dayNumber}
                  </Text>

                  {/* Indicator Dot */}
                  <View style={[styles.dotIndicator, { backgroundColor: item.color }]} />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Color Code Legend */}
          <View style={styles.legendContainer}>
            <Text style={styles.legendTitle}>Légende des couleurs :</Text>
            <View style={styles.legendGrid}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
                <Text style={styles.legendLabel}>Présent</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
                <Text style={styles.legendLabel}>Retard</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
                <Text style={styles.legendLabel}>Absent</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#3b82f6' }]} />
                <Text style={styles.legendLabel}>Congé / Férié</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#94a3b8' }]} />
                <Text style={styles.legendLabel}>Weekend</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Anomaly & Claims Action Bar */}
        <View style={styles.claimsBanner}>
          <View style={styles.claimsBannerLeft}>
            <AlertTriangle color="#dc2626" size={24} />
            <View>
              <Text style={styles.claimsBannerTitle}>Erreur sur votre présence ?</Text>
              <Text style={styles.claimsBannerSub}>
                {pendingAnomaliesCount > 0
                  ? `${pendingAnomaliesCount} réclamation(s) en attente du RH`
                  : "Signalez toute omission ou erreur de pointage."}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.claimsBannerBtn}
            onPress={() => {
              setAnomalyInitialDate(undefined);
              setShowAnomalyModal(true);
            }}
          >
            <FileText color="#ffffff" size={16} />
            <Text style={styles.claimsBannerBtnText}>Suivi Réclamations</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 90 }} />
      </ScrollView>

      {/* Day Detail Modal */}
      <DayDetailModal
        visible={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        data={selectedDayDetail}
        onReportAnomaly={handleOpenAnomalyForDate}
      />

      {/* Anomaly Modal */}
      <AnomalyModal
        visible={showAnomalyModal}
        onClose={() => setShowAnomalyModal(false)}
        initialDate={anomalyInitialDate}
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
  header: { paddingTop: 52, paddingBottom: 20, paddingHorizontal: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  appName: { color: '#818cf8', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  userName: { color: '#f1f5f9', fontSize: 24, fontWeight: '800', marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 10 },
  actionBtn: { backgroundColor: 'rgba(255,255,255,0.08)', padding: 10, borderRadius: 12, position: 'relative' },
  notifBadge: {
    minWidth: 16, height: 16,
    backgroundColor: '#ef4444',
    borderRadius: 99,
    position: 'absolute', top: 5, right: 5,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notifBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },

  monthSelectorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  monthArrow: { padding: 6 },
  monthTitleWrapper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  monthTitle: { color: '#ffffff', fontSize: 16, fontWeight: '800' },

  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statValue: { fontSize: 17, fontWeight: '800' },
  statLabel: { color: '#94a3b8', fontSize: 10, marginTop: 2, textAlign: 'center', fontWeight: '600' },

  scroll: { flex: 1 },

  readOnlyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#e0e7ff',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 12,
    borderRadius: 14,
  },
  readOnlyNoticeText: { fontSize: 12, color: '#3730a3', fontWeight: '600', flex: 1 },

  calendarContainer: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  calendarSectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },

  weekdayRow: { flexDirection: 'row', marginBottom: 8 },
  weekdayText: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '700', color: '#94a3b8' },

  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  emptyDayCell: { width: '14.28%', height: 48 },
  dayCell: {
    width: '14.28%',
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    marginBottom: 6,
  },
  todayBorder: {
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  dayNumberText: { fontSize: 14, fontWeight: '800' },
  dotIndicator: { width: 5, height: 5, borderRadius: 99, marginTop: 2 },

  legendContainer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  legendTitle: { fontSize: 12, fontWeight: '700', color: '#64748b', marginBottom: 8 },
  legendGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 99 },
  legendLabel: { fontSize: 11, color: '#475569', fontWeight: '600' },

  claimsBanner: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 20,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: '#fee2e2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  claimsBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  claimsBannerTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  claimsBannerSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  claimsBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#dc2626',
    paddingVertical: 12,
    borderRadius: 14,
  },
  claimsBannerBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 14 },
});
