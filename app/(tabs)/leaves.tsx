import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Animated,
} from 'react-native';
import {
  Umbrella,
  Calendar as CalendarIcon,
  Plus,
  X,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Clock,
  Upload,
  FileCheck,
  CheckCircle,
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams, router } from 'expo-router';
import { useAppStore, LeaveRequest } from '../../store/useAppStore';
import { apiCreateLeave } from '../../utils/api';
import { Theme } from '../../constants/theme';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { IconCircle } from '../../components/ui/IconCircle';

const LEAVE_TYPES = [
  { id: 1, label: 'Congé Payé', value: 'Congé Payé', requiresProof: false },
  { id: 2, label: 'Maladie / Médical', value: 'Maladie', requiresProof: true },
  { id: 3, label: 'RTT / Récupération', value: 'RTT', requiresProof: false },
  { id: 4, label: 'Sans Solde', value: 'Sans Solde', requiresProof: false },
  { id: 5, label: 'Événement Familial', value: 'Événement Familial', requiresProof: true },
];

function dateToStr(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatDateFr(d: Date): string {
  const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const months = ['Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}

function daysBetween(start: Date, end: Date): number {
  const diffTime = end.getTime() - start.getTime();
  if (diffTime < 0) return 0;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

function mapStatus(status: string): string {
  if (status === 'validate' || status === 'Approved') return 'Approuvé';
  if (status === 'refuse' || status === 'Denied') return 'Refusé';
  return 'En attente';
}

export default function LeavesScreen() {
  const { leaveRequests, addLeaveRequest, refreshData, logout } = useAppStore();
  const { highlightId } = useLocalSearchParams<{ highlightId?: string }>();

  const [showModal, setShowModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Auto-scroll & Animated highlight setup
  const scrollViewRef = useRef<ScrollView>(null);
  const itemYPositions = useRef<Record<string, number>>({});
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const handleCardLayout = (id: string | number, y: number) => {
    itemYPositions.current[id.toString()] = y;
  };

  useEffect(() => {
    if (!highlightId) return;

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

  const daysRequested = daysBetween(startDate, endDate);

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Congés & Absences</Text>
        <Text style={styles.headerSub}>Gérez et suivez l'ensemble de vos demandes d'absence</Text>

        {/* Leave Balance Card */}
        <Card style={styles.balanceCard}>
          <View style={styles.balanceRow}>
            <View>
              <Text style={styles.balanceLabel}>SOLDE DISPONIBLE</Text>
              <Text style={styles.balanceDays}>22 Jours</Text>
            </View>
            <IconCircle variant="coral" size={48}>
              <Umbrella color={Theme.colors.primary} size={24} />
            </IconCircle>
          </View>
          <View style={styles.divider} />
          <View style={styles.balanceBreakdown}>
            <View style={styles.balanceStat}>
              <Text style={[styles.balanceStatVal, { color: Theme.colors.status.success.text }]}>
                {approvedCount}
              </Text>
              <Text style={styles.balanceStatLabel}>Approuvées</Text>
            </View>
            <View style={styles.balanceStat}>
              <Text style={[styles.balanceStatVal, { color: Theme.colors.status.warning.text }]}>
                {pendingCount}
              </Text>
              <Text style={styles.balanceStatLabel}>En attente</Text>
            </View>
            <View style={styles.balanceStat}>
              <Text style={[styles.balanceStatVal, { color: Theme.colors.primary }]}>
                {leaveRequests.length}
              </Text>
              <Text style={styles.balanceStatLabel}>Total</Text>
            </View>
          </View>
        </Card>
      </View>

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
            tintColor={Theme.colors.primary}
            colors={[Theme.colors.primary]}
          />
        }
      >
        {/* Action Buttons */}
        <View style={styles.section}>
          <View style={styles.actionRow}>
            <PrimaryButton
              title="Nouvelle Demande"
              icon={<Plus color={Theme.colors.textWhite} size={18} />}
              onPress={openNewRequestModal}
              variant="black"
              style={{ flex: 1 }}
            />
          </View>
        </View>

        {/* Requests List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mes Demandes ({leaveRequests.length})</Text>

          {leaveRequests.length === 0 ? (
            <Card style={styles.emptyState}>
              <IconCircle variant="purple" size={54}>
                <Umbrella color={Theme.colors.status.info.text} size={28} />
              </IconCircle>
              <Text style={styles.emptyText}>Aucune demande de congé</Text>
              <Text style={styles.emptySubtext}>Vos demandes d'absence apparaîtront ici</Text>
            </Card>
          ) : (
            leaveRequests.map((req) => {
              const displayStatus = mapStatus(req.status as string);
              const isHighlighted = highlightedId === req.id.toString();

              const interpolatedBorder = fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [Theme.colors.border, Theme.colors.primary],
              });
              const interpolatedBg = fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [Theme.colors.surface, '#FFEDE8'],
              });

              return (
                <Animated.View
                  key={req.id}
                  onLayout={(e) => handleCardLayout(req.id, e.nativeEvent.layout.y)}
                  style={[
                    styles.reqCardWrapper,
                    isHighlighted && {
                      borderColor: interpolatedBorder,
                      backgroundColor: interpolatedBg,
                      borderWidth: 2,
                    },
                  ]}
                >
                  <Card style={styles.reqCardInner}>
                    <View style={styles.reqHeaderRow}>
                      <View style={styles.reqTitleGroup}>
                        <IconCircle variant="purple" size={38}>
                          <Umbrella color={Theme.colors.status.info.text} size={20} />
                        </IconCircle>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.reqReason}>{req.leaveType}</Text>
                          <Text style={styles.reqDates}>
                            {req.startDate} ➔ {req.endDate} ({req.numberOfDays}j)
                          </Text>
                        </View>
                      </View>
                      <StatusBadge status={displayStatus} />
                    </View>

                    {req.reason ? (
                      <Text style={styles.reqComment}>Motif : "{req.reason}"</Text>
                    ) : null}

                    {req.aiRecommendation ? (
                      <View style={styles.aiBadge}>
                        <IconCircle variant="coral" size={24}>
                          <Sparkles color={Theme.colors.primary} size={13} />
                        </IconCircle>
                        <Text style={styles.aiText}>IA : {req.aiRecommendation}</Text>
                      </View>
                    ) : null}
                  </Card>
                </Animated.View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* New Leave Request Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouvelle Demande de Congé</Text>
              <TouchableOpacity style={styles.modalClose} onPress={() => setShowModal(false)}>
                <X color={Theme.colors.textSecondary} size={20} />
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
                    <ChevronLeft color={Theme.colors.primary} size={20} />
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
                    <ChevronRight color={Theme.colors.primary} size={20} />
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
                    <ChevronLeft color={Theme.colors.primary} size={20} />
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
                    <ChevronRight color={Theme.colors.primary} size={20} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Days count preview badge */}
              <View style={styles.daysBadge}>
                <Clock color={Theme.colors.primary} size={16} />
                <Text style={styles.daysBadgeText}>
                  Durée calculée : <Text style={{ fontSize: 15, fontWeight: '900' }}>{daysRequested} jour{daysRequested > 1 ? 's' : ''}</Text>
                </Text>
              </View>

              {/* Attachment Button */}
              {selectedType.requiresProof ? (
                <>
                  <Text style={styles.fieldLabel}>Justificatif * (Certificat médical / document)</Text>
                  <TouchableOpacity style={styles.uploadBox} onPress={handlePickDocument}>
                    {attachmentName ? (
                      <>
                        <FileCheck color={Theme.colors.status.success.text} size={20} />
                        <Text style={[styles.uploadText, { color: Theme.colors.status.success.text }]}>
                          {attachmentName}
                        </Text>
                      </>
                    ) : (
                      <>
                        <Upload color={Theme.colors.primary} size={20} />
                        <Text style={styles.uploadText}>Sélectionner un fichier (PDF / Image)</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              ) : null}

              {/* Reason Input */}
              <Text style={styles.fieldLabel}>Motif / Remarque *</Text>
              <TextInput
                style={[styles.input, styles.inputMulti]}
                placeholder="Précisez le motif de votre absence..."
                placeholderTextColor={Theme.colors.textTertiary}
                multiline
                numberOfLines={3}
                value={reason}
                onChangeText={setReason}
              />

              {/* Submit Button */}
              <PrimaryButton
                title={`Transmettre la demande (${daysRequested}j)`}
                onPress={handleSubmit}
                loading={isSubmitting}
                variant="coral"
                style={{ marginTop: 20 }}
              />

              <View style={{ height: 24 }} />
            </ScrollView>
          </Card>
        </View>
      </Modal>
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
  headerTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 24,
    fontWeight: '800',
  },
  headerSub: {
    color: Theme.colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
    fontWeight: '500',
  },
  balanceCard: {
    marginTop: 16,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    color: Theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  balanceDays: {
    color: Theme.colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Theme.colors.border,
    marginVertical: 14,
  },
  balanceBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  balanceStat: {
    alignItems: 'center',
  },
  balanceStatVal: {
    fontSize: 18,
    fontWeight: '800',
  },
  balanceStatLabel: {
    color: Theme.colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },

  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 140,
  },
  section: {
    paddingHorizontal: Theme.spacing.lg,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    color: Theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 14,
  },
  emptySubtext: {
    color: Theme.colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },

  reqCardWrapper: {
    borderRadius: Theme.radius.xl,
    marginBottom: 12,
  },
  reqCardInner: {
    padding: Theme.spacing.md,
  },
  reqHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  reqTitleGroup: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  reqReason: {
    fontSize: 15,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
  },
  reqDates: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
    marginTop: 3,
    fontWeight: '600',
  },
  reqComment: {
    fontSize: 13,
    color: Theme.colors.textSecondary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    backgroundColor: Theme.colors.pastelBg.coral,
    borderRadius: Theme.radius.md,
    padding: 8,
  },
  aiText: {
    fontSize: 12,
    color: Theme.colors.primary,
    fontWeight: '700',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 26, 0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Theme.spacing.xl,
    maxHeight: '92%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
  },
  modalClose: {
    backgroundColor: Theme.colors.background,
    padding: 8,
    borderRadius: Theme.radius.full,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
    marginBottom: 8,
    marginTop: 14,
  },
  typeScroll: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Theme.radius.full,
    backgroundColor: Theme.colors.background,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    marginRight: 8,
  },
  typeChipActive: {
    backgroundColor: Theme.colors.pastelBg.coral,
    borderColor: Theme.colors.primary,
  },
  typeChipText: {
    color: Theme.colors.textSecondary,
    fontWeight: '600',
    fontSize: 13,
  },
  typeChipTextActive: {
    color: Theme.colors.primary,
    fontWeight: '800',
  },

  dateControlCard: {
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.radius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: 14,
  },
  dateControlHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dateControlRole: {
    fontSize: 11,
    fontWeight: '800',
    color: Theme.colors.primary,
    letterSpacing: 0.5,
  },
  dateControlFormatted: {
    fontSize: 14,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
  },
  dateControlIso: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  stepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: Theme.colors.pastelBg.coral,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  stepBtnText: {
    color: Theme.colors.primary,
    fontWeight: '800',
    fontSize: 13,
  },
  quickShortcuts: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  shortcutChip: {
    backgroundColor: Theme.colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  shortcutText: {
    fontSize: 11,
    color: Theme.colors.textPrimary,
    fontWeight: '700',
  },

  daysBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Theme.colors.pastelBg.purple,
    borderRadius: Theme.radius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 14,
  },
  daysBadgeText: {
    color: Theme.colors.status.info.text,
    fontWeight: '700',
    fontSize: 13,
  },
  uploadBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Theme.colors.background,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Theme.colors.primary,
    borderRadius: Theme.radius.md,
    padding: 14,
  },
  uploadText: {
    fontSize: 13,
    color: Theme.colors.primary,
    fontWeight: '600',
  },
  input: {
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.radius.md,
    padding: 14,
    fontSize: 14,
    color: Theme.colors.textPrimary,
  },
  inputMulti: {
    height: 74,
    textAlignVertical: 'top',
  },
});
