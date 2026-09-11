import React, { useState, useRef, useEffect, useCallback } from "react";
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
} from "react-native";
import {
  FileText,
  Download,
  Plus,
  X,
  FileCheck,
  Award,
  CreditCard,
  Briefcase,
  Layers,
  Sparkles,
} from "lucide-react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useAppStore } from "../../store/useAppStore";
import { DocumentRequestRecord } from "../../utils/api";
import { Theme } from "../../constants/theme";
import { Card } from "../../components/ui/Card";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { IconCircle } from "../../components/ui/IconCircle";

const DOC_TYPES = [
  {
    id: "attestation_travail",
    label: "Attestation de travail",
    icon: "📜",
    category: "Attestations",
    variant: "blue" as const,
  },
  {
    id: "bulletin_paie",
    label: "Bulletin de paie",
    icon: "💵",
    category: "Paie",
    variant: "green" as const,
  },
  {
    id: "attestation_salaire",
    label: "Attestation de salaire",
    icon: "📑",
    category: "Attestations",
    variant: "purple" as const,
  },
  {
    id: "fiche_evaluation",
    label: "Fiche d'évaluation",
    icon: "⭐",
    category: "Carrière",
    variant: "coral" as const,
  },
  {
    id: "autre",
    label: "Autre document RH",
    icon: "📂",
    category: "Autre",
    variant: "yellow" as const,
  },
];

const PERIODS = ["Mois en cours", "Mois dernier", "3 derniers mois", "Année en cours"];

const STATUS_MAP: Record<string, { label: string; statusType: string }> = {
  pending: { label: "En attente RH", statusType: "pending" },
  processing: { label: "En cours de préparation", statusType: "processing" },
  ready: { label: "Prêt à télécharger", statusType: "ready" },
  delivered: { label: "Délivré", statusType: "delivered" },
  rejected: { label: "Refusé", statusType: "rejected" },
};

import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DocumentsScreen() {
  const insets = useSafeAreaInsets();
  const { documentRequests, submitDocumentRequest, fetchDocumentRequests, refreshData, logout } = useAppStore();
  const { highlightId } = useLocalSearchParams<{ highlightId?: string }>();

  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | number | null>(null);

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
    const itemExists = documentRequests.some(
      (d) => d.id.toString() === targetIdStr,
    );

    if (itemExists) {
      const timer = setTimeout(() => {
        const yPos = itemYPositions.current[targetIdStr];
        if (yPos !== undefined && scrollViewRef.current) {
          scrollViewRef.current.scrollTo({
            y: Math.max(0, yPos - 120),
            animated: true,
          });
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
  }, [highlightId, documentRequests]);

  // Form state
  const [selectedType, setSelectedType] = useState<typeof DOC_TYPES[number]>(
    DOC_TYPES[0],
  );
  const [period, setPeriod] = useState<string>("Mois en cours");
  const [comment, setComment] = useState("");

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshData]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await submitDocumentRequest({
        document_type: selectedType.id,
        period_month: period,
        comment: comment.trim() || undefined,
      });

      setShowModal(false);
      setComment("");

      Alert.alert(
        "✅ Demande transmise",
        `Votre demande de "${selectedType.label}" a été transmise à l'équipe RH.`,
      );
    } catch (err: any) {
      if (err.message === "SESSION_EXPIRED") {
        await logout();
        router.replace("/login");
        return;
      }
      Alert.alert(
        "Erreur",
        err.message ?? "Impossible de transmettre la demande.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadDoc = async (doc: DocumentRequestRecord) => {
    if (doc.status !== "ready" && doc.status !== "delivered") {
      Alert.alert(
        "Document en cours",
        "Ce document n'est pas encore prêt. Vous recevrez une notification dès qu'il sera disponible.",
      );
      return;
    }

    setDownloadingId(doc.id);
    try {
      await new Promise((res) => setTimeout(res, 1200));
      Alert.alert(
        "📥 Téléchargement simulé",
        `Le document "${doc.document_type_label || doc.file_name}" a été généré et téléchargé dans vos fichiers localement.`,
      );
    } finally {
      setDownloadingId(null);
    }
  };

  const pendingCount = documentRequests.filter(
    (d) => d.status === "pending" || d.status === "processing",
  ).length;
  const readyCount = documentRequests.filter(
    (d) => d.status === "ready" || d.status === "delivered",
  ).length;

  return (
    <View style={[styles.container, { paddingLeft: insets.left, paddingRight: insets.right }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 10, 52) }]}>
        <Text style={styles.headerTitle}>Documents Administratifs</Text>
        <Text style={styles.headerSub}>
          Demandez et téléchargez vos attestations & bulletins de paie
        </Text>

        {/* Overview Card */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summaryLabel}>
                MES DEMANDES DE DOCUMENTS
              </Text>
              <Text style={styles.summaryTotal}>
                {documentRequests.length} au total
              </Text>
            </View>
            <IconCircle variant="blue" size={48}>
              <FileText color={Theme.colors.status.info.text} size={24} />
            </IconCircle>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryBreakdown}>
            <View style={styles.summaryStat}>
              <Text style={[styles.summaryStatVal, { color: Theme.colors.status.warning.text }]}>
                {pendingCount}
              </Text>
              <Text style={styles.summaryStatLabel}>En cours</Text>
            </View>
            <View style={styles.summaryStat}>
              <Text style={[styles.summaryStatVal, { color: Theme.colors.status.success.text }]}>
                {readyCount}
              </Text>
              <Text style={styles.summaryStatLabel}>Prêts / Délivrés</Text>
            </View>
            <View style={styles.summaryStat}>
              <Text style={[styles.summaryStatVal, { color: Theme.colors.primary }]}>
                {documentRequests.length}
              </Text>
              <Text style={styles.summaryStatLabel}>Total</Text>
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
        {/* Action button */}
        <View style={styles.section}>
          <PrimaryButton
            title="Demander un Document"
            icon={<Plus color={Theme.colors.textWhite} size={18} />}
            onPress={() => setShowModal(true)}
            variant="black"
          />
        </View>

        {/* Requests List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Mes Demandes ({documentRequests.length})
          </Text>

          {documentRequests.length === 0 ? (
            <Card style={styles.emptyCard}>
              <IconCircle variant="blue" size={54}>
                <FileText color={Theme.colors.status.info.text} size={28} />
              </IconCircle>
              <Text style={styles.emptyTitle}>Aucune demande de document</Text>
              <Text style={styles.emptySub}>
                Faites une nouvelle demande pour obtenir une attestation ou fiche de paie.
              </Text>
            </Card>
          ) : (
            documentRequests.map((doc) => {
              const statusInfo = STATUS_MAP[doc.status] || {
                label: doc.status_label || doc.status,
                statusType: doc.status,
              };
              const isReady = doc.status === "ready" || doc.status === "delivered";
              const isDownloading = downloadingId === doc.id;
              const isHighlighted = highlightedId === doc.id.toString();

              const typeConfig = DOC_TYPES.find((t) => t.id === doc.document_type) || DOC_TYPES[0];

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
                  key={doc.id}
                  onLayout={(e) => handleCardLayout(doc.id, e.nativeEvent.layout.y)}
                  style={[
                    styles.docCardWrapper,
                    isHighlighted && {
                      borderColor: interpolatedBorder,
                      backgroundColor: interpolatedBg,
                      borderWidth: 2,
                    },
                  ]}
                >
                  <Card style={styles.docCardInner}>
                    <View style={styles.docTop}>
                      <View style={styles.docLeft}>
                        <IconCircle variant={typeConfig.variant} size={42}>
                          <Text style={{ fontSize: 20 }}>{typeConfig.icon}</Text>
                        </IconCircle>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.docTitle}>{doc.document_type_label || typeConfig.label}</Text>
                          <Text style={styles.docPeriod}>Période : {doc.period_month || 'Mois en cours'}</Text>
                          <Text style={styles.docDate}>Demandé le : {doc.request_date || 'Aujourd\'hui'}</Text>
                        </View>
                      </View>
                      <StatusBadge status={statusInfo.statusType} label={statusInfo.label} />
                    </View>

                    {doc.comment ? (
                      <Text style={styles.docComment}>"{doc.comment}"</Text>
                    ) : null}

                    {doc.status === "rejected" ? (
                      <View style={styles.rejectedBox}>
                        <X color={Theme.colors.status.danger.text} size={14} />
                        <Text style={styles.rejectedText}>
                          Demande refusée par les RH. Veuillez contacter votre responsable.
                        </Text>
                      </View>
                    ) : (
                      <PrimaryButton
                        title={isDownloading ? "Téléchargement..." : "Télécharger"}
                        icon={
                          isDownloading ? (
                            <ActivityIndicator color={Theme.colors.textWhite} size="small" />
                          ) : (
                            <Download color={isReady ? Theme.colors.textWhite : Theme.colors.textTertiary} size={14} />
                          )
                        }
                        onPress={() => handleDownloadDoc(doc)}
                        variant={isReady ? "coral" : "secondary"}
                        disabled={!isReady || isDownloading}
                        style={styles.downloadBtnStyle}
                        textStyle={{ fontSize: 13 }}
                      />
                    )}
                  </Card>
                </Animated.View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* New Request Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Demande de Document RH</Text>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setShowModal(false)}
              >
                <X color={Theme.colors.textSecondary} size={20} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Type Selection */}
              <Text style={styles.fieldLabel}>Type de document *</Text>
              <View style={styles.docTypeGrid}>
                {DOC_TYPES.map((t) => {
                  const isSel = selectedType.id === t.id;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={[styles.docTypeCard, isSel && styles.docTypeCardActive]}
                      onPress={() => setSelectedType(t)}
                    >
                      <Text style={styles.docTypeIcon}>{t.icon}</Text>
                      <Text style={[styles.docTypeLabel, isSel && styles.docTypeLabelActive]}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Period selection */}
              <Text style={styles.fieldLabel}>Période concernée *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {PERIODS.map((p) => {
                  const isSel = period === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      style={[styles.chip, isSel && styles.chipActive]}
                      onPress={() => setPeriod(p)}
                    >
                      <Text style={[styles.chipText, isSel && styles.chipTextActive]}>
                        {p}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Additional comment */}
              <Text style={styles.fieldLabel}>Précisions / Remarques (Optionnel)</Text>
              <TextInput
                style={[styles.input, styles.inputMulti]}
                placeholder="Ex: besoin d'une mention spécifique pour une démarche bancaire..."
                placeholderTextColor={Theme.colors.textTertiary}
                multiline
                numberOfLines={3}
                value={comment}
                onChangeText={setComment}
              />

              <PrimaryButton
                title="Transmettre la demande"
                onPress={handleSubmit}
                loading={isSubmitting}
                variant="black"
                style={{ marginTop: 20 }}
              />

              <View style={{ height: 20 }} />
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
    fontWeight: "800",
  },
  headerSub: {
    color: Theme.colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
    fontWeight: "500",
  },
  summaryCard: {
    marginTop: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    color: Theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  summaryTotal: {
    color: Theme.colors.textPrimary,
    fontSize: 26,
    fontWeight: "800",
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Theme.colors.border,
    marginVertical: 14,
  },
  summaryBreakdown: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  summaryStat: {
    alignItems: "center",
  },
  summaryStatVal: {
    fontSize: 18,
    fontWeight: "800",
  },
  summaryStatLabel: {
    color: Theme.colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
    fontWeight: "600",
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
    fontWeight: "800",
    color: Theme.colors.textPrimary,
    marginBottom: 12,
  },

  emptyCard: {
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Theme.colors.textPrimary,
    marginTop: 14,
  },
  emptySub: {
    fontSize: 13,
    color: Theme.colors.textSecondary,
    marginTop: 4,
    textAlign: "center",
  },

  docCardWrapper: {
    borderRadius: Theme.radius.xl,
    marginBottom: 12,
  },
  docCardInner: {
    padding: Theme.spacing.md,
  },
  docTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  docLeft: {
    flexDirection: "row",
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  docTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: Theme.colors.textPrimary,
  },
  docPeriod: {
    fontSize: 12,
    color: Theme.colors.primary,
    fontWeight: "700",
    marginTop: 2,
  },
  docDate: {
    fontSize: 11,
    color: Theme.colors.textSecondary,
    marginTop: 2,
  },
  docComment: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
    marginTop: 8,
    fontStyle: "italic",
  },
  rejectedBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Theme.colors.status.danger.bg,
    borderRadius: Theme.radius.md,
    padding: 8,
    marginTop: 8,
  },
  rejectedText: {
    color: Theme.colors.status.danger.text,
    fontSize: 12,
    fontWeight: "600",
  },
  downloadBtnStyle: {
    height: 40,
    marginTop: 12,
    alignSelf: "flex-start",
    paddingHorizontal: 16,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(26, 26, 26, 0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Theme.spacing.xl,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Theme.colors.textPrimary,
  },
  modalClose: {
    backgroundColor: Theme.colors.background,
    padding: 8,
    borderRadius: Theme.radius.full,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: Theme.colors.textPrimary,
    marginBottom: 8,
    marginTop: 12,
  },
  docTypeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  docTypeCard: {
    width: "48%",
    backgroundColor: Theme.colors.background,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    borderRadius: Theme.radius.md,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  docTypeCardActive: {
    backgroundColor: Theme.colors.pastelBg.coral,
    borderColor: Theme.colors.primary,
  },
  docTypeIcon: {
    fontSize: 18,
  },
  docTypeLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Theme.colors.textSecondary,
    flex: 1,
  },
  docTypeLabelActive: {
    color: Theme.colors.primary,
    fontWeight: "800",
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Theme.radius.full,
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginRight: 6,
  },
  chipActive: {
    backgroundColor: Theme.colors.pastelBg.coral,
    borderColor: Theme.colors.primary,
  },
  chipText: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
    fontWeight: "600",
  },
  chipTextActive: {
    color: Theme.colors.primary,
    fontWeight: "800",
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
    textAlignVertical: "top",
  },
});
