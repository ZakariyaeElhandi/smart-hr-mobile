import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
  RefreshControl,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  CheckCircle,
  XCircle,
  Clock,
  Plus,
  X,
  AlertTriangle,
  Calendar as CalendarIcon,
  Umbrella,
  Upload,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useAppStore, LeaveRequest } from '../../store/useAppStore';
import { apiCreateLeave } from '../../utils/api';
import CalendarModal, { DayMark } from '../../components/CalendarModal';

// Map raw backend states → display-friendly French status
function mapStatus(state: string): 'Approuvé' | 'En attente' | 'Refusé' {
  if (state === 'validate' || state === 'Approved') return 'Approuvé';
  if (state === 'refuse' || state === 'Denied') return 'Refusé';
  return 'En attente';
}

const STATUS_COLORS: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  Approuvé: { bg: '#dcfce7', text: '#15803d', icon: <CheckCircle color="#16a34a" size={18} /> },
  Refusé: { bg: '#fee2e2', text: '#b91c1c', icon: <XCircle color="#dc2626" size={18} /> },
  'En attente': { bg: '#fef9c3', text: '#854d0e', icon: <Clock color="#d97706" size={18} /> },
};

const LEAVE_TYPES = [
  { label: 'Congé Annuel / Payé', value: 'Congé Annuel', id: 1, requiresProof: false },
  { label: 'Maladie', value: 'Maladie', id: 2, requiresProof: true },
  { label: 'Congé sans solde', value: 'Sans Solde', id: 3, requiresProof: false },
  { label: 'Maternité / Paternité', value: 'Maternité', id: 4, requiresProof: true },
  { label: 'Événement familial', value: 'Événement Familial', id: 5, requiresProof: false },
] as const;

function dateToStr(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatDateFr(d: Date): string {
  const options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' };
  return d.toLocaleDateString('fr-FR', options);
}

function daysBetween(start: Date, end: Date): number {
  const diff = end.getTime() - start.getTime();
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)) + 1);
}

export default function LeavesScreen() {
  const { logout, addLeaveRequest, leaveRequests, refreshData } = useAppStore();
  const { highlightId } = useLocalSearchParams<{ highlightId?: string }>();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  // Scroll & Highlighting State
  const scrollViewRef = useRef<ScrollView>(null);
  const itemYPositions = useRef<Record<string, number>>({});
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Handle Contextual Scroll & Highlight when highlightId param arrives
  useEffect(() => {
    if (!highlightId || leaveRequests.length === 0) return;

    const targetIdStr = highlightId.toString();
    const itemExists = leaveRequests.some((r) => r.id.toString() === targetIdStr);

    if (itemExists) {
      const timer = setTimeout(() => {
        const yPos = itemYPositions.current[targetIdStr];
        if (yPos !== undefined && scrollViewRef.current) {
          scrollViewRef.current.scrollTo({ y: Math.max(0, yPos - 120), animated: true });
        }
        setHighlightedId(targetIdStr);
        fadeAnim.setValue(1);

        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 2500,
          useNativeDriver: false,
        }).start(() => {
          setHighlightedId(null);
          router.setParams({ highlightId: undefined });
        });
      }, 350);

      return () => clearTimeout(timer);
    } else {
      router.setParams({ highlightId: undefined });
    }
  }, [highlightId, leaveRequests]);

  // Date state setup
  const getTomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  };

  const [startDate, setStartDate] = useState<Date>(getTomorrow());
  const [endDate, setEndDate] = useState<Date>(getTomorrow());
  const [activeDateTab, setActiveDateTab] = useState<'start' | 'end' | null>(null);

  const [reason, setReason] = useState('');
  const [selectedType, setSelectedType] = useState<typeof LEAVE_TYPES[number]>(LEAVE_TYPES[0]);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);

  const openNewRequestModal = () => {
    const tmr = getTomorrow();
    setStartDate(tmr);
    setEndDate(tmr);
    setReason('');
    setAttachmentName(null);
    setIsSubmitting(false);
    setActiveDateTab(null);
    setShowModal(true);
  };

  const handlePickDocument = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (!res.canceled && res.assets && res.assets[0]) {
        setAttachmentName(res.assets[0].name);
      }
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de sélectionner le justificatif.');
    }
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshData]);

  // Adjust date helpers
  const adjustStartDate = (days: number) => {
    const next = new Date(startDate);
    next.setDate(next.getDate() + days);
    setStartDate(next);
    if (next > endDate) {
      setEndDate(next);
    }
  };

  const adjustEndDate = (days: number) => {
    const next = new Date(endDate);
    next.setDate(next.getDate() + days);
    if (next < startDate) {
      setEndDate(startDate);
    } else {
      setEndDate(next);
    }
  };

  const setDurationDays = (duration: number) => {
    const nextEnd = new Date(startDate);
    nextEnd.setDate(nextEnd.getDate() + (duration - 1));
    setEndDate(nextEnd);
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      Alert.alert('Champs requis', 'Veuillez saisir le motif de votre demande de congé.');
      return;
    }
    if (endDate < startDate) {
      Alert.alert('Dates invalides', 'La date de fin doit être égale ou postérieure à la date de début.');
      return;
    }
    if (selectedType.requiresProof && !attachmentName) {
      Alert.alert('Justificatif requis', `Pour un congé de type "${selectedType.label}", veuillez joindre un justificatif (certificat médical, etc.).`);
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await apiCreateLeave({
        holiday_status_id: selectedType.id,
        date_from: dateToStr(startDate),
        date_to: dateToStr(endDate),
        reason: reason.trim(),
      });

      const newReq: LeaveRequest = {
        id: created.id,
        startDate: created.date_from?.split('T')[0] ?? dateToStr(startDate),
        endDate: created.date_to?.split('T')[0] ?? dateToStr(endDate),
        reason: reason.trim(),
        leaveType: selectedType.value,
        status: created.state ?? 'confirm',
        numberOfDays: created.number_of_days || daysBetween(startDate, endDate),
        aiRecommendation: created.ai_recommendation,
      };

      addLeaveRequest(newReq);
      setShowModal(false);
      setReason('');
      setAttachmentName(null);

      Alert.alert(
        '✅ Demande transmise',
        'Votre demande de congé a été enregistrée et transmise à l\'équipe RH.'
      );
    } catch (err: any) {
      if (err.message === 'SESSION_EXPIRED') {
        await logout();
        router.replace('/login');
        return;
      }
      Alert.alert('Erreur', err.message ?? 'Impossible de transmettre la demande. Veuillez réessayer.');
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

  const leaveMarks = useMemo<DayMark[]>(() => {
    const marks: DayMark[] = [];
    leaveRequests.forEach((req) => {
      if (!req.startDate || !req.endDate) return;
      const isApproved = req.status === 'validate' || req.status === 'Approved';
      const isRefused = req.status === 'refuse' || req.status === 'Denied';
      const color = isApproved ? '#10b981' : isRefused ? '#ef4444' : '#f59e0b';

      const start = new Date(req.startDate);
      const end = new Date(req.endDate);
      const cur = new Date(start);
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
      {/* Top Header */}
      <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.header}>
        <Text style={styles.headerTitle}>Congés & Absences</Text>
        <Text style={styles.headerSub}>Gérez et suivez l'ensemble de vos demandes d'absence</Text>

        {/* Leave Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceRow}>
            <View>
              <Text style={styles.balanceLabel}>SOLDE DISPONIBLE</Text>
              <Text style={styles.balanceDays}>22 Jours</Text>
            </View>
            <View style={styles.iconCircle}>
              <Umbrella color="#6366f1" size={28} />
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.balanceBreakdown}>
            <View style={styles.balanceStat}>
              <Text style={[styles.balanceStatVal, { color: '#15803d' }]}>{approvedCount}</Text>
              <Text style={styles.balanceStatLabel}>Approuvées</Text>
            </View>
            <View style={styles.balanceStat}>
              <Text style={[styles.balanceStatVal, { color: '#b45309' }]}>{pendingCount}</Text>
              <Text style={styles.balanceStatLabel}>En attente</Text>
            </View>
            <View style={styles.balanceStat}>
              <Text style={[styles.balanceStatVal, { color: '#6366f1' }]}>{leaveRequests.length}</Text>
              <Text style={styles.balanceStatLabel}>Total</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
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
              <TouchableOpacity style={styles.newRequestBtn} onPress={openNewRequestModal} activeOpacity={0.8}>
                <LinearGradient colors={['#6366f1', '#4f46e5']} style={styles.newRequestGrad}>
                  <Plus color="#fff" size={20} />
                  <Text style={styles.newRequestText}>Nouvelle Demande</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.calBtn} onPress={() => setShowCalendar(true)}>
                <CalendarIcon color="#6366f1" size={22} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Requests List */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Historique des Demandes</Text>
            {leaveRequests.length === 0 ? (
              <View style={styles.emptyState}>
                <Umbrella color="#cbd5e1" size={48} />
                <Text style={styles.emptyText}>Aucune demande de congé</Text>
                <Text style={styles.emptySubtext}>Vos demandes d'absence apparaîtront ici</Text>
              </View>
            ) : (
              leaveRequests.map((req) => {
                const displayStatus = mapStatus(req.status as string);
                const s = STATUS_COLORS[displayStatus];
                const isHighlighted = highlightedId === req.id.toString();

                const interpolatedBorder = fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['#e2e8f0', '#6366f1'],
                });
                const interpolatedBg = fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['#ffffff', '#e0e7ff'],
                });

                return (
                  <Animated.View
                    key={req.id}
                    onLayout={(e) => {
                      itemYPositions.current[req.id.toString()] = e.nativeEvent.layout.y;
                    }}
                    style={[
                      styles.reqCard,
                      isHighlighted && {
                        borderColor: interpolatedBorder,
                        borderWidth: 2,
                        backgroundColor: interpolatedBg,
                        shadowColor: '#6366f1',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.25,
                        shadowRadius: 8,
                        elevation: 5,
                      },
                    ]}
                  >
                    <View style={[styles.reqIconBox, { backgroundColor: s.bg }]}>
                      {s.icon}
                    </View>
                    <View style={styles.reqBody}>
                      <Text style={styles.reqReason}>{req.leaveType || req.reason || 'Demande de congé'}</Text>
                      <Text style={styles.reqDates}>
                        {req.startDate} → {req.endDate}
                        {req.numberOfDays ? `  (${req.numberOfDays} j)` : ''}
                      </Text>
                      {req.reason ? (
                        <Text style={styles.reqComment}>Motif : {req.reason}</Text>
                      ) : null}
                      {req.aiRecommendation && (
                        <View style={styles.aiBadge}>
                          <AlertTriangle color="#d97706" size={12} />
                          <Text style={styles.aiText}>Analyse RH : {req.aiRecommendation}</Text>
                        </View>
                      )}
                    </View>
                    <View style={[styles.reqBadge, { backgroundColor: s.bg }]}>
                      <Text style={[styles.reqBadgeText, { color: s.text }]}>{displayStatus}</Text>
                    </View>
                  </Animated.View>
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
          title="Planning des Congés"
          marks={leaveMarks}
          legend={[
            { color: '#10b981', label: 'Approuvé' },
            { color: '#f59e0b', label: 'En attente' },
            { color: '#ef4444', label: 'Refusé' },
          ]}
        />

        {/* Request Modal */}
        <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.modalKeyboardAvoiding}
              >
                <View style={styles.modalCard}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Nouvelle Demande de Congé</Text>
                    <TouchableOpacity onPress={() => setShowModal(false)} style={styles.modalClose}>
                      <X color="#64748b" size={22} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    {/* Type Chips */}
                    <Text style={styles.fieldLabel}>Type d'absence *</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
                      {LEAVE_TYPES.map((t) => {
                        const isSelected = selectedType.id === t.id;
                        return (
                          <TouchableOpacity
                            key={t.id}
                            onPress={() => setSelectedType(t)}
                            style={[styles.typeChip, isSelected && styles.typeChipActive]}
                          >
                            <Text style={[styles.typeChipText, isSelected && styles.typeChipTextActive]}>
                              {t.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>

                    {/* Inline Date Selectors */}
                    <Text style={styles.fieldLabel}>Période du congé *</Text>

                    {/* Start Date Box */}
                    <View style={styles.dateControlCard}>
                      <View style={styles.dateControlHeader}>
                        <Text style={styles.dateControlRole}>DATE DE DÉBUT</Text>
                        <Text style={styles.dateControlFormatted}>{formatDateFr(startDate)}</Text>
                        <Text style={styles.dateControlIso}>{dateToStr(startDate)}</Text>
                      </View>
                      <View style={styles.stepperRow}>
                        <TouchableOpacity style={styles.stepBtn} onPress={() => adjustStartDate(-1)}>
                          <ChevronLeft color="#4f46e5" size={20} />
                          <Text style={styles.stepBtnText}>- 1j</Text>
                        </TouchableOpacity>

                        <View style={styles.quickShortcuts}>
                          <TouchableOpacity style={styles.shortcutChip} onPress={() => setStartDate(getTomorrow())}>
                            <Text style={styles.shortcutText}>Demain</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.shortcutChip}
                            onPress={() => {
                              const nextMon = new Date();
                              nextMon.setDate(nextMon.getDate() + ((1 + 7 - nextMon.getDay()) % 7 || 7));
                              setStartDate(nextMon);
                              if (nextMon > endDate) setEndDate(nextMon);
                            }}
                          >
                            <Text style={styles.shortcutText}>Lundi pro.</Text>
                          </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={styles.stepBtn} onPress={() => adjustStartDate(1)}>
                          <Text style={styles.stepBtnText}>+ 1j</Text>
                          <ChevronRight color="#4f46e5" size={20} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* End Date Box */}
                    <View style={[styles.dateControlCard, { marginTop: 10 }]}>
                      <View style={styles.dateControlHeader}>
                        <Text style={styles.dateControlRole}>DATE DE FIN</Text>
                        <Text style={styles.dateControlFormatted}>{formatDateFr(endDate)}</Text>
                        <Text style={styles.dateControlIso}>{dateToStr(endDate)}</Text>
                      </View>
                      <View style={styles.stepperRow}>
                        <TouchableOpacity style={styles.stepBtn} onPress={() => adjustEndDate(-1)}>
                          <ChevronLeft color="#4f46e5" size={20} />
                          <Text style={styles.stepBtnText}>- 1j</Text>
                        </TouchableOpacity>

                        <View style={styles.quickShortcuts}>
                          <TouchableOpacity style={styles.shortcutChip} onPress={() => setDurationDays(1)}>
                            <Text style={styles.shortcutText}>1 Jour</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.shortcutChip} onPress={() => setDurationDays(3)}>
                            <Text style={styles.shortcutText}>3 Jours</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.shortcutChip} onPress={() => setDurationDays(5)}>
                            <Text style={styles.shortcutText}>1 Semaine</Text>
                          </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={styles.stepBtn} onPress={() => adjustEndDate(1)}>
                          <Text style={styles.stepBtnText}>+ 1j</Text>
                          <ChevronRight color="#4f46e5" size={20} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Days count preview badge */}
                    <View style={styles.daysBadge}>
                      <Clock color="#4338ca" size={16} />
                      <Text style={styles.daysBadgeText}>
                        Durée calculée : <Text style={{ fontSize: 15, fontWeight: '900' }}>{daysRequested} jour{daysRequested > 1 ? 's' : ''}</Text>
                      </Text>
                    </View>

                    {/* Proof Upload (Medical Certificate etc) */}
                    {selectedType.requiresProof && (
                      <View style={{ marginTop: 12 }}>
                        <Text style={styles.fieldLabel}>Justificatif obligatoire * (Certificat médical, etc.)</Text>
                        <TouchableOpacity style={styles.uploadBox} onPress={handlePickDocument}>
                          <Upload color="#6366f1" size={20} />
                          <Text style={styles.uploadText}>
                            {attachmentName ? `✓ ${attachmentName}` : 'Sélectionner un fichier (PDF, Image)'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Reason */}
                    <Text style={styles.fieldLabel}>Motif de l'absence *</Text>
                    <TextInput
                      style={[styles.input, styles.inputMulti]}
                      placeholder="Saisissez une brève explication..."
                      placeholderTextColor="#94a3b8"
                      multiline
                      value={reason}
                      onChangeText={setReason}
                    />

                    <TouchableOpacity onPress={handleSubmit} disabled={isSubmitting} activeOpacity={0.85}>
                      <LinearGradient colors={['#6366f1', '#4f46e5']} style={styles.submitBtn}>
                        {isSubmitting ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Text style={styles.submitBtnText}>Transmettre la demande ({daysRequested}j)</Text>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>

                    <View style={{ height: 24 }} />
                  </ScrollView>
                </View>
              </KeyboardAvoidingView>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingTop: 52, paddingHorizontal: 20, paddingBottom: 90 },
  headerTitle: { color: '#ffffff', fontSize: 26, fontWeight: '800' },
  headerSub: { color: '#94a3b8', fontSize: 13, marginTop: 4, fontWeight: '500' },
  balanceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginTop: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceLabel: { color: '#94a3b8', fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  balanceDays: { color: '#0f172a', fontSize: 28, fontWeight: '800', marginTop: 2 },
  iconCircle: { width: 48, height: 48, borderRadius: 99, backgroundColor: '#e0e7ff', alignItems: 'center', justifyContent: 'center' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 14 },
  balanceBreakdown: { flexDirection: 'row', justifyContent: 'space-around' },
  balanceStat: { alignItems: 'center' },
  balanceStatVal: { fontSize: 18, fontWeight: '800' },
  balanceStatLabel: { color: '#64748b', fontSize: 11, marginTop: 2, fontWeight: '600' },

  scroll: { flex: 1, marginTop: -50 },
  scrollContent: { flexGrow: 1, paddingBottom: 140 },
  section: { paddingHorizontal: 20, marginTop: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
  actionRow: { flexDirection: 'row', gap: 12 },
  newRequestBtn: { flex: 1, borderRadius: 16, overflow: 'hidden' },
  newRequestGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 15 },
  newRequestText: { color: '#ffffff', fontWeight: '800', fontSize: 15 },
  calBtn: { backgroundColor: '#ffffff', width: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: '#0f172a', fontSize: 16, fontWeight: '800', marginTop: 16 },
  emptySubtext: { color: '#94a3b8', fontSize: 13, marginTop: 4 },
  reqCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  reqIconBox: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  reqBody: { flex: 1 },
  reqReason: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  reqDates: { fontSize: 12, color: '#64748b', marginTop: 3, fontWeight: '600' },
  reqComment: { fontSize: 12, color: '#475569', marginTop: 2 },
  aiBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  aiText: { fontSize: 11, color: '#d97706', fontWeight: '600' },
  reqBadge: { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  reqBadgeText: { fontSize: 11, fontWeight: '800' },

  // Modal & Date Selector
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalKeyboardAvoiding: { width: '100%', maxHeight: '92%' },
  modalCard: { backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '100%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  modalClose: { backgroundColor: '#f1f5f9', padding: 8, borderRadius: 99 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 8, marginTop: 14 },
  typeScroll: { flexDirection: 'row', marginBottom: 6 },
  typeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, backgroundColor: '#f1f5f9', borderWidth: 1.5, borderColor: '#e2e8f0', marginRight: 8 },
  typeChipActive: { backgroundColor: '#e0e7ff', borderColor: '#6366f1' },
  typeChipText: { color: '#64748b', fontWeight: '600', fontSize: 13 },
  typeChipTextActive: { color: '#4338ca', fontWeight: '800' },

  // Inline Date Control Card
  dateControlCard: { backgroundColor: '#f8fafc', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', padding: 14 },
  dateControlHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  dateControlRole: { fontSize: 11, fontWeight: '800', color: '#6366f1', letterSpacing: 0.5 },
  dateControlFormatted: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  dateControlIso: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  stepBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#e0e7ff', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  stepBtnText: { color: '#3730a3', fontWeight: '800', fontSize: 13 },
  quickShortcuts: { flexDirection: 'row', gap: 6, flex: 1, justifyContent: 'center' },
  shortcutChip: { backgroundColor: '#ffffff', borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', paddingHorizontal: 8, paddingVertical: 6 },
  shortcutText: { fontSize: 11, color: '#334155', fontWeight: '700' },

  daysBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#e0e7ff', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, marginTop: 14 },
  daysBadgeText: { color: '#3730a3', fontWeight: '700', fontSize: 13 },
  uploadBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f8fafc', borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#818cf8', borderRadius: 12, padding: 14 },
  uploadText: { fontSize: 13, color: '#4338ca', fontWeight: '600' },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 14, fontSize: 14, color: '#0f172a' },
  inputMulti: { height: 74, textAlignVertical: 'top' },
  submitBtn: { borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 20 },
  submitBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 15 },
});
