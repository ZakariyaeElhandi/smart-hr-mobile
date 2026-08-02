import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Plane, CheckCircle, XCircle, Clock, Plus, X } from 'lucide-react-native';
import { useState } from 'react';
import { useAppStore, LeaveRequest } from '../../store/useAppStore';

const STATUS_COLORS: Record<string, { bg: string; text: string; icon: JSX.Element }> = {
  Approved: { bg: '#dcfce7', text: '#15803d', icon: <CheckCircle color="#16a34a" size={18} /> },
  Denied: { bg: '#fee2e2', text: '#b91c1c', icon: <XCircle color="#dc2626" size={18} /> },
  Pending: { bg: '#fef9c3', text: '#92400e', icon: <Clock color="#d97706" size={18} /> },
};

export default function LeavesScreen() {
  const { user, leaveRequests, addLeaveRequest } = useAppStore();
  const [showModal, setShowModal] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [type, setType] = useState<'Annual' | 'Sick' | 'Personal'>('Annual');

  const handleSubmit = () => {
    if (!startDate || !endDate || !reason) {
      Alert.alert('Missing Fields', 'Please fill in all fields before submitting.');
      return;
    }
    const newReq: LeaveRequest = {
      id: Date.now().toString(),
      startDate, endDate, reason, status: 'Pending',
    };
    addLeaveRequest(newReq);
    setShowModal(false);
    setStartDate(''); setEndDate(''); setReason('');
    Alert.alert('✅ Request Submitted', 'Your leave request has been sent to your manager in Odoo.');
  };

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
              <Text style={styles.balanceLabel}>AVAILABLE BALANCE</Text>
              <Text style={styles.balanceDays}>{user.vacationDaysLeft} days</Text>
            </View>
            <Plane color="#4f46e5" size={40} />
          </View>
          <View style={styles.divider} />
          <View style={styles.balanceBreakdown}>
            {[{ label: 'Approved', val: leaveRequests.filter(r=>r.status==='Approved').length, color: '#15803d' },
              { label: 'Pending', val: leaveRequests.filter(r=>r.status==='Pending').length, color: '#d97706' },
              { label: 'Total Used', val: 3, color: '#6d28d9' }].map(item => (
              <View key={item.label} style={styles.balanceStat}>
                <Text style={[styles.balanceStatVal, { color: item.color }]}>{item.val}</Text>
                <Text style={styles.balanceStatLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* New Request Button */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.newRequestBtn} onPress={() => setShowModal(true)}>
            <LinearGradient colors={['#4f46e5', '#7c3aed']} style={styles.newRequestGrad}>
              <Plus color="#fff" size={20} />
              <Text style={styles.newRequestText}>Request New Time Off</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Requests List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All Requests</Text>
          {leaveRequests.map(req => {
            const s = STATUS_COLORS[req.status];
            return (
              <View key={req.id} style={styles.reqCard}>
                <View style={[styles.reqIconBox, { backgroundColor: s.bg }]}>
                  {s.icon}
                </View>
                <View style={styles.reqBody}>
                  <Text style={styles.reqReason}>{req.reason}</Text>
                  <Text style={styles.reqDates}>{req.startDate} → {req.endDate}</Text>
                </View>
                <View style={[styles.reqBadge, { backgroundColor: s.bg }]}>
                  <Text style={[styles.reqBadgeText, { color: s.text }]}>{req.status}</Text>
                </View>
              </View>
            );
          })}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Leave Request</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X color="#64748b" size={24} />
              </TouchableOpacity>
            </View>

            {/* Leave Type */}
            <Text style={styles.fieldLabel}>Leave Type</Text>
            <View style={styles.typeRow}>
              {(['Annual', 'Sick', 'Personal'] as const).map(t => (
                <TouchableOpacity key={t} onPress={() => setType(t)}
                  style={[styles.typeChip, type === t && styles.typeChipActive]}>
                  <Text style={[styles.typeChipText, type === t && styles.typeChipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Start Date</Text>
            <TextInput style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor="#94a3b8"
              value={startDate} onChangeText={setStartDate} />

            <Text style={styles.fieldLabel}>End Date</Text>
            <TextInput style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor="#94a3b8"
              value={endDate} onChangeText={setEndDate} />

            <Text style={styles.fieldLabel}>Reason</Text>
            <TextInput style={[styles.input, styles.inputMulti]} placeholder="Briefly explain your reason..."
              placeholderTextColor="#94a3b8" multiline value={reason} onChangeText={setReason} />

            <TouchableOpacity onPress={handleSubmit}>
              <LinearGradient colors={['#4f46e5', '#7c3aed']} style={styles.submitBtn}>
                <Text style={styles.submitBtnText}>Submit Request to Odoo</Text>
              </LinearGradient>
            </TouchableOpacity>
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
  newRequestBtn: { borderRadius: 16, overflow: 'hidden' },
  newRequestGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  newRequestText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  reqCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  reqIconBox: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  reqBody: { flex: 1 },
  reqReason: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  reqDates: { fontSize: 12, color: '#94a3b8', marginTop: 3 },
  reqBadge: { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  reqBadgeText: { fontSize: 11, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8, marginTop: 14 },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 99, backgroundColor: '#f1f5f9', borderWidth: 1.5, borderColor: '#e2e8f0' },
  typeChipActive: { backgroundColor: '#ede9fe', borderColor: '#7c3aed' },
  typeChipText: { color: '#64748b', fontWeight: '600', fontSize: 13 },
  typeChipTextActive: { color: '#7c3aed' },
  input: { backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, fontSize: 14, color: '#0f172a' },
  inputMulti: { height: 90, textAlignVertical: 'top' },
  submitBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 20 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
