import { router, useLocalSearchParams } from "expo-router";
import {
  AlertTriangle,
  Bell,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  LogOut,
  XCircle
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AnomalyModal from "../../components/AnomalyModal";
import DayDetailModal, { DayDetailData } from "../../components/DayDetailModal";
import NotificationsModal from "../../components/NotificationsModal";
import { Card } from "../../components/ui/Card";
import { IconCircle } from "../../components/ui/IconCircle";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { StatCard } from "../../components/ui/StatCard";
import { Theme } from "../../constants/theme";
import { useAppStore } from "../../store/useAppStore";

const MONTHS_FR = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function formatHeaderDate(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  return date.toLocaleDateString("en-US", options);
}

import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function MaPresenceScreen() {
  const insets = useSafeAreaInsets();
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

  const { highlightId } = useLocalSearchParams<{ highlightId?: string }>();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedDayDetail, setSelectedDayDetail] =
    useState<DayDetailData | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAnomalyModal, setShowAnomalyModal] = useState(false);
  const [anomalyInitialDate, setAnomalyInitialDate] = useState<
    string | undefined
  >();
  const [anomalyTab, setAnomalyTab] = useState<"form" | "list">("form");
  const [showNotifs, setShowNotifs] = useState(false);

  // Open AnomalyModal automatically when navigating with highlightId
  useEffect(() => {
    if (!highlightId) return;
    setAnomalyTab("list");
    setShowAnomalyModal(true);
  }, [highlightId]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const pendingAnomaliesCount = myAnomalies.filter(
    (a) => a.status === "pending",
  ).length;

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
    router.replace("/login");
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
        const dateStr = a.check_in.split("T")[0];
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
          const dateStr = cur.toISOString().split("T")[0];
          leaveSet.add(dateStr);
          cur.setDate(cur.getDate() + 1);
        }
      }
    });

    const todayStr = now.toISOString().split("T")[0];

    const grid = [];

    // Empty lead cells
    for (let i = 0; i < startDayOfWeek; i++) {
      grid.push({ dayNumber: null });
    }

    // Actual month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dateObj = new Date(selectedYear, selectedMonth - 1, day);
      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

      const attRecord = attMap[dateStr];
      const isLeave = leaveSet.has(dateStr);
      const isPast = dateStr <= todayStr;

      let status: "present" | "late" | "absent" | "leave" | "weekend" =
        "weekend";
      let statusLabel = "Weekend / Non travaillé";
      let color = Theme.colors.textSecondary;
      let bgColor = Theme.colors.background;

      if (isLeave) {
        status = "leave";
        statusLabel = "Congé / Jour férié";
        color = Theme.colors.status.info.text;
        bgColor = Theme.colors.status.info.bg;
      } else if (attRecord) {
        if (attRecord.is_late) {
          status = "late";
          statusLabel = "Présent (Retard)";
          color = Theme.colors.status.warning.text;
          bgColor = Theme.colors.status.warning.bg;
        } else {
          status = "present";
          statusLabel = "Présent";
          color = Theme.colors.status.success.text;
          bgColor = Theme.colors.status.success.bg;
        }
      } else if (!isWeekend && isPast) {
        status = "absent";
        statusLabel = "Absent / Non pointé";
        color = Theme.colors.status.danger.text;
        bgColor = Theme.colors.status.danger.bg;
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
    setAnomalyTab("form");
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
    <View
      style={[
        styles.container,
        { paddingLeft: insets.left, paddingRight: insets.right },
      ]}
    >
      {/* Top Header */}
      <View
        style={[styles.header, { paddingTop: Math.max(insets.top + 10, 52) }]}
      >
        <View style={styles.headerTop}>
          <View>
            <View style={styles.datePill}>
              <Text style={styles.datePillText}>{formatHeaderDate(now)}</Text>
            </View>
            <Text style={styles.welcomeText}>
              Bonjour, {user.name || "Collaborateur"} 👋
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setShowNotifs(true)}
            >
              <Bell color={Theme.colors.textPrimary} size={20} />
              {unreadCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={handleLogout}>
              <LogOut color={Theme.colors.textSecondary} size={20} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Check-in Button (Premium Pill CTA) */}
        <PrimaryButton
          title="Déclarer une anomalie"
          icon={<Clock color={Theme.colors.textWhite} size={20} />}
          onPress={() => {
            setAnomalyInitialDate(now.toISOString().split("T")[0]);
            setAnomalyTab("form");
            setShowAnomalyModal(true);
          }}
          variant="black"
          style={styles.checkInBtn}
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Theme.colors.primary}
            colors={[Theme.colors.primary]}
          />
        }
      >
        {/* Month Selector Bar */}
        <View style={styles.monthSelectorBar}>
          <TouchableOpacity style={styles.monthArrow} onPress={handlePrevMonth}>
            <ChevronLeft color={Theme.colors.textPrimary} size={20} />
          </TouchableOpacity>
          <View style={styles.monthTitleWrapper}>
            <CalendarIcon color={Theme.colors.primary} size={18} />
            <Text style={styles.monthTitle}>
              {MONTHS_FR[selectedMonth - 1]} {selectedYear}
            </Text>
          </View>
          <TouchableOpacity style={styles.monthArrow} onPress={handleNextMonth}>
            <ChevronRight color={Theme.colors.textPrimary} size={20} />
          </TouchableOpacity>
        </View>

        {/* Monthly Summary Stats Grid (2x2) */}
        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <StatCard
              title="Présences"
              value={stats.present_days}
              icon={
                <CheckCircle2
                  color={Theme.colors.status.success.text}
                  size={20}
                />
              }
              variant="green"
              valueColor={Theme.colors.status.success.text}
            />
            <StatCard
              title="Retards"
              value={stats.late_days}
              icon={
                <Clock color={Theme.colors.status.warning.text} size={20} />
              }
              variant="yellow"
              valueColor={Theme.colors.status.warning.text}
            />
          </View>
          <View style={styles.statsRow}>
            <StatCard
              title="Absences"
              value={stats.absent_days}
              icon={
                <XCircle color={Theme.colors.status.danger.text} size={20} />
              }
              variant="coral"
              valueColor={Theme.colors.status.danger.text}
            />
            <StatCard
              title="Total Heures"
              value={hoursFormatted}
              icon={<Clock color={Theme.colors.status.info.text} size={20} />}
              variant="purple"
              valueColor={Theme.colors.status.info.text}
            />
          </View>
        </View>

        {/* Calendar Section */}
        <Card style={styles.calendarCard}>
          <View style={styles.calendarHeaderRow}>
            <Text style={styles.calendarSectionTitle}>Calendrier Mensuel</Text>
            {isMonthlyLoading && (
              <ActivityIndicator color={Theme.colors.primary} size="small" />
            )}
          </View>

          {/* Weekday Labels */}
          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((w, idx) => (
              <Text key={idx} style={styles.weekdayText}>
                {w}
              </Text>
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
                  <View
                    style={[
                      styles.dotIndicator,
                      { backgroundColor: item.color },
                    ]}
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Color Code Legend */}
          <View style={styles.legendContainer}>
            <Text style={styles.legendTitle}>Légende des couleurs :</Text>
            <View style={styles.legendGrid}>
              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: Theme.colors.status.success.text },
                  ]}
                />
                <Text style={styles.legendLabel}>Présent</Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: Theme.colors.status.warning.text },
                  ]}
                />
                <Text style={styles.legendLabel}>Retard</Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: Theme.colors.status.danger.text },
                  ]}
                />
                <Text style={styles.legendLabel}>Absent</Text>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: Theme.colors.status.info.text },
                  ]}
                />
                <Text style={styles.legendLabel}>Congé / Férié</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Claims & Anomalies Banner */}
        <Card style={styles.claimsBanner}>
          <View style={styles.claimsHeader}>
            <IconCircle variant="coral" size={44}>
              <AlertTriangle color={Theme.colors.primary} size={22} />
            </IconCircle>
            <View style={{ flex: 1 }}>
              <Text style={styles.claimsTitle}>Signalements & Anomalies</Text>
              <Text style={styles.claimsSub}>
                {pendingAnomaliesCount > 0
                  ? `${pendingAnomaliesCount} réclamation(s) en cours d'examen RH.`
                  : "Déclarez un oubli de pointage ou une anomalie."}
              </Text>
            </View>
          </View>

          <PrimaryButton
            title="Suivi des Réclamations"
            icon={<FileText color={Theme.colors.textWhite} size={16} />}
            onPress={() => {
              setAnomalyInitialDate(undefined);
              setAnomalyTab("list");
              setShowAnomalyModal(true);
            }}
            variant="black"
          />
        </Card>
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
        onClose={() => {
          setShowAnomalyModal(false);
          if (highlightId) {
            router.setParams({ highlightId: undefined });
          }
        }}
        initialDate={anomalyInitialDate}
        initialTab={anomalyTab}
        highlightId={highlightId}
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
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    paddingTop: 52,
    paddingHorizontal: Theme.spacing.lg,
    paddingBottom: Theme.spacing.md,
    backgroundColor: Theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Theme.spacing.md,
  },
  datePill: {
    backgroundColor: Theme.colors.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Theme.radius.full,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  datePillText: {
    fontSize: 11,
    fontWeight: "700",
    color: Theme.colors.textSecondary,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: "800",
    color: Theme.colors.textPrimary,
    marginTop: 6,
  },
  headerActions: {
    flexDirection: "row",
    gap: 10,
  },
  actionBtn: {
    backgroundColor: Theme.colors.background,
    padding: 10,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    position: "relative",
  },
  notifBadge: {
    minWidth: 16,
    height: 16,
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.radius.full,
    position: "absolute",
    top: 4,
    right: 4,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  notifBadgeText: {
    color: Theme.colors.textWhite,
    fontSize: 9,
    fontWeight: "800",
  },
  checkInBtn: {
    marginTop: 4,
  },

  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.lg,
    paddingBottom: 140,
  },

  monthSelectorBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.xl,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    ...Theme.shadows.soft,
  },
  monthArrow: {
    padding: 6,
  },
  monthTitleWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  monthTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: "800",
  },

  statsGrid: {
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
  },
  statsRow: {
    flexDirection: "row",
    gap: Theme.spacing.md,
  },

  calendarCard: {
    marginBottom: Theme.spacing.lg,
  },
  calendarHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  calendarSectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Theme.colors.textPrimary,
  },

  weekdayRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  weekdayText: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
    color: Theme.colors.textTertiary,
  },

  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  emptyDayCell: {
    width: "14.28%",
    height: 48,
  },
  dayCell: {
    width: "14.28%",
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Theme.radius.md,
    marginBottom: 6,
  },
  todayBorder: {
    borderWidth: 2,
    borderColor: Theme.colors.primary,
  },
  dayNumberText: {
    fontSize: 14,
    fontWeight: "800",
  },
  dotIndicator: {
    width: 5,
    height: 5,
    borderRadius: Theme.radius.full,
    marginTop: 2,
  },

  legendContainer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: Theme.colors.textSecondary,
    marginBottom: 8,
  },
  legendGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: Theme.radius.full,
  },
  legendLabel: {
    fontSize: 11,
    color: Theme.colors.textSecondary,
    fontWeight: "600",
  },

  claimsBanner: {
    gap: 14,
  },
  claimsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  claimsTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Theme.colors.textPrimary,
  },
  claimsSub: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
});
