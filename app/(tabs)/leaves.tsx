import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, Modal, ActivityIndicator, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Plane, CheckCircle, XCircle, Clock, Plus, X, AlertTriangle, Calendar } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import type React from 'react';
import { router } from 'expo-router';
import { useAppStore, LeaveRequest } from '../../store/useAppStore';
import { apiCreateLeave } from '../../utils/api';
import CalendarModal, { DayMark } from '../../components/CalendarModal';
import DatePickerModal from '../../components/DatePickerModal';

// Map Odoo states → display-friendly status
function mapStatus(state: string): 'Approved' | 'Pending' | 'Denied' {
  if (state === 'validate' || state === 'Approved') return 'Approved';
  if (state === 'refuse' || state === 'Denied') return 'Denied';
  return 'Pending';
}

const STATUS_COLORS: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  Approved: { bg: '#dcfce7', text: '#15803d', icon: <CheckCircle color="#16a34a" size={18} /> },
  Denied:   { bg: '#fee2e2', text: '#b91c1c', icon: <XCircle color="#dc2626" size={18} /> },
  Pending:  { bg: '#fef9c3', text: '#92400e', icon: <Clock color="#d97706" size={18} /> },
};

// Odoo leave type IDs — queried directly from the DB
const LEAVE_TYPE_IDS: Record<string, number> = {
  'Annual': 1,
  'Sick':   2,
  'Personal': 4,
};

function dateToStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysBetween(start: Date, end: Date): number {
  const diff = end.getTime() - start.getTime();
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)) + 1);
}

export default function LeavesScreen() {
  const { logout, setLeaveRequests, addLeaveRequest, leaveRequests, refreshData } = useAppStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  // Date picker state
  const today = new Date();
  const [startDate, setStartDate] = useState<Date>(today);
  const [endDate, setEndDate] = useState<Date>(today);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [reason, setReason] = useState('');
  const [type, setType] = useState<'Annual' | 'Sick' | 'Personal'>('Annual');

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try { await refreshData(); }
    finally { setIsRefreshing(false); }
  }, [refreshData]);

  const handleSubmit = async () => {
    if (!reason) {
      Alert.alert('Missing Fields', 'Please add a reason for your leave request.');
      return;
    }
    if (endDate < startDate) {
      Alert.alert('Invalid Dates', 'End date must be on or after the start date.');
      return;
    }
    setIsSubmitting(true);
    try {
      const leaveTypeId = LEAVE_TYPE_IDS[type];
      const created = await apiCreateLeave({
        holiday_status_id: leaveTypeId,
        date_from: dateToStr(startDate),
        date_to:   dateToStr(endDate),
        reason,
      });
      const newReq: LeaveRequest = {
        id: created.id,
        startDate: created.date_from?.split('T')[0] ?? dateToStr(startDate),
        endDate:   created.date_to?.split('T')[0]   ?? dateToStr(endDate),
        reason,
        leaveType: type,
        status: created.state ?? 'confirm',
        numberOfDays: created.number_of_days,
        aiRecommendation: created.ai_recommendation,
      };
      addLeaveRequest(newReq);
      setShowModal(false);
      setReason('');

      const aiMsg = created.ai_recommendation
        ? `\n\nAI Recommendation: ${created.ai_recommendation}` : '';
      Alert.alert('✅ Request Submitted', `Your leave request has been sent to Odoo.${aiMsg}`);
    } catch (err: any) {
      if (err.message === 'SESSION_EXPIRED') {
        await logout();
        router.replace('/login');
        return;
      }
      Alert.alert('Error', err.message ?? 'Failed to submit request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const approvedCount = leaveRequests.filter(
    (r) => r.status === 'validate' || r.status === 'Approved'
  ).length;
  const pendingCount = leaveRequests.filter(
    (r) => r.status === 'confirm' || r.status === 'Pending'
  ).length;

  // Build calendar marks from leave requests
  const leaveMarks = useMemo<DayMark[]>(() => {
    const marks: DayMark[] = [];
    leaveRequests.forEach((req) => {
      if (!req.startDate || !req.endDate) return;
      const isApproved = req.status === 'validate' || req.status === 'Approved';
      const isRefused  = req.status === 'refuse'   || req.status === 'Denied';
      const color      = isApproved ? '#10b981' : isRefused ? '#ef4444' : '#f59e0b';

      // Mark every day in the range
      const start = new Date(req.startDate);
      const end   = new Date(req.endDate);
      const cur   = new Date(start);
      while (cur <= end) {
        marks.push({ date: dateToStr(cur), color, label: req.leaveType });
        cur.setDate(cur.getDate() + 1);
      }
    });
    return marks;
  }, [leaveRequests]);

  const daysRequested = daysBetween(startDate, endDate);

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#4f46e5', '#7c3aed']} style={styles.header}>
        <Text style={styles.headerTitle}>Time Off</Text>
        <Text style={styles.headerSub}>Plan and manage your leaves</Text>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceRow}>
            <View>
              <Text style={styles.balanceLabel}>LEAVE REQUESTS</Text>
              <Text style={styles.balanceDays}>{leaveRequests.length} total</Text>
            </View>
            <Plane color="#4f46e5" size={40} />
          </View>
          <View style={styles.divider} />
          <View style={styles.balanceBreakdown}>
            {[
              { label: 'Approved', val: approvedCount, color: '#15803d' },
              { label: 'Pending',  val: pendingCount,  color: '#d97706' },
              { label: 'Total',    val: leaveRequests.length, color: '#6d28d9' },
            ].map((item) => (
              <View key={item.label} style={styles.balanceStat}>
                <Text style={[styles.balanceStatVal, { color: item.color }]}>{item.val}</Text>
                <Text style={styles.balanceStatLabel}>{item.label}</Text>
              </View>
            ))}
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
        {/* Action Buttons */}
        <View style={styles.section}>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.newRequestBtn} onPress={() => setShowModal(true)}>
              <LinearGradient colors={['#4f46e5', '#7c3aed']} style={styles.newRequestGrad}>
                <Plus color="#fff" size={20} />
                <Text style={styles.newRequestText}>Request Time Off</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.calBtn} onPress={() => setShowCalendar(true)}>
              <Calendar color="#4f46e5" size={22} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Requests List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All Requests</Text>
          {leaveRequests.length === 0 ? (
            <View style={styles.emptyState}>
              <Plane color="#cbd5e1" size={48} />
              <Text style={styles.emptyText}>No leave requests yet</Text>
              <Text style={styles.emptySubtext}>Your Odoo leave history will appear here</Text>
            </View>
          ) : (
            leaveRequests.map((req) => {
              const displayStatus = mapStatus(req.status as string);
              const s = STATUS_COLORS[displayStatus];
              return (
                <View key={req.id} style={styles.reqCard}>
                  <View style={[styles.reqIconBox, { backgroundColor: s.bg }]}>
                    {s.icon}
                  </View>
                  <View style={styles.reqBody}>
                    <Text style={styles.reqReason}>{req.leaveType || req.reason || 'Leave'}</Text>
                    <Text style={styles.reqDates}>
                      {req.startDate} → {req.endDate}
                      {req.numberOfDays ? `  (${req.numberOfDays}d)` : ''}
                    </Text>
                    {req.aiRecommendation && (
                      <View style={styles.aiBadge}>
                        <AlertTriangle color="#d97706" size={12} />
                        <Text style={styles.aiText}>AI: {req.aiRecommendation}</Text>
                      </View>
                    )}
                  </View>
                  <View style={[styles.reqBadge, { backgroundColor: s.bg }]}>
                    <Text style={[styles.reqBadgeText, { color: s.text }]}>{displayStatus}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Leave Calendar Modal */}
      <CalendarModal
        visible={showCalendar}
        onClose={() => setShowCalendar(false)}
        title="Leave Calendar"
        marks={leaveMarks}
        legend={[
          { color: '#10b981', label: 'Approved' },
          { color: '#f59e0b', label: 'Pending' },
          { color: '#ef4444', label: 'Refused' },
        ]}
      />

      {/* Date Pickers */}
      <DatePickerModal
        visible={showStartPicker}
        onClose={() => setShowStartPicker(false)}
        label="Start Date"
        value={startDate}
        onChange={(d) => {
          setStartDate(d);
          if (d > endDate) setEndDate(d);
        }}
      />
      <DatePickerModal
        visible={showEndPicker}
        onClose={() => setShowEndPicker(false)}
        label="End Date"
        value={endDate}
        onChange={setEndDate}
        minimumDate={startDate}
      />

      {/* Request Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Leave Request</Text>
              <TouchableOpacity onPress={() => setShowModal(false)} style={styles.modalClose}>
                <X color="#64748b" size={22} />
              </TouchableOpacity>
            </View>

            {/* Type Chips */}
            <Text style={styles.fieldLabel}>Leave Type</Text>
            <View style={styles.typeRow}>
              {(['Annual', 'Sick', 'Personal'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setType(t)}
                  style={[styles.typeChip, type === t && styles.typeChipActive]}
                >
                  <Text style={[styles.typeChipText, type === t && styles.typeChipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Date pickers */}
            <Text style={styles.fieldLabel}>Start Date</Text>
            <TouchableOpacity style={styles.dateField} onPress={() => setShowStartPicker(true)}>
              <Calendar color="#6366f1" size={16} />
              <Text style={styles.dateFieldText}>{dateToStr(startDate)}</Text>
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>End Date</Text>
            <TouchableOpacity style={styles.dateField} onPress={() => setShowEndPicker(true)}>
              <Calendar color="#6366f1" size={16} />
              <Text style={styles.dateFieldText}>{dateToStr(endDate)}</Text>
            </TouchableOpacity>

            {/* Days count preview */}
            <View style={styles.daysBadge}>
              <Text style={styles.daysBadgeText}>
                {daysRequested} day{daysRequested !== 1 ? 's' : ''} requested
              </Text>
            </View>

            {/* Reason */}
            <Text style={styles.fieldLabel}>Reason</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              placeholder="Briefly explain your reason..."
              placeholderTextColor="#94a3b8"
              multiline
              value={reason}
              onChangeText={setReason}
            />

            <TouchableOpacity onPress={handleSubmit} disabled={isSubmitting}>
              <LinearGradient colors={['#4f46e5', '#7c3aed']} style={styles.submitBtn}>
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit to Odoo</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={{ height: 12 }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 100 },
  headerTitle: { color: '#fff', fontSize: 28, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 4 },
  balanceCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginTop: 20, shadowColor: '#4f46e5', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 8 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceLabel: { color: '#94a3b8', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  balanceDays: { color: '#0f172a', fontSize: 36, fontWeight: '800', marginTop: 4 },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 16 },
  balanceBreakdown: { flexDirection: 'row', justifyContent: 'space-around' },
  balanceStat: { alignItems: 'center' },
  balanceStatVal: { fontSize: 20, fontWeight: '800' },
  balanceStatLabel: { color: '#94a3b8', fontSize: 11, marginTop: 2 },
  scroll: { flex: 1, marginTop: -60 },
  section: { paddingHorizontal: 20, marginTop: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  actionRow: { flexDirection: 'row', gap: 12 },
  newRequestBtn: { flex: 1, borderRadius: 16, overflow: 'hidden' },
  newRequestGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  newRequestText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  calBtn: { backgroundColor: '#fff', width: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { color: '#64748b', fontSize: 16, fontWeight: '700', marginTop: 16 },
  emptySubtext: { color: '#94a3b8', fontSize: 13, marginTop: 6 },
  reqCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  reqIconBox: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  reqBody: { flex: 1 },
  reqReason: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  reqDates: { fontSize: 12, color: '#94a3b8', marginTop: 3 },
  aiBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  aiText: { fontSize: 11, color: '#d97706', fontWeight: '600' },
  reqBadge: { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  reqBadgeText: { fontSize: 11, fontWeight: '700' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  modalClose: { backgroundColor: '#f1f5f9', padding: 8, borderRadius: 99 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8, marginTop: 14 },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 99, backgroundColor: '#f1f5f9', borderWidth: 1.5, borderColor: '#e2e8f0' },
  typeChipActive: { backgroundColor: '#ede9fe', borderColor: '#7c3aed' },
  typeChipText: { color: '#64748b', fontWeight: '600', fontSize: 13 },
  typeChipTextActive: { color: '#7c3aed' },
  dateField: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, padding: 14 },
  dateFieldText: { fontSize: 15, color: '#0f172a', fontWeight: '600' },
  daysBadge: { backgroundColor: '#ede9fe', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14, alignSelf: 'flex-start', marginTop: 10 },
  daysBadgeText: { color: '#6d28d9', fontWeight: '700', fontSize: 13 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, fontSize: 14, color: '#0f172a' },
  inputMulti: { height: 80, textAlignVertical: 'top' },
  submitBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 20 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
