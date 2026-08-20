import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  FileCheck,
  FileText,
  Plus,
  X,
  XCircle,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useAppStore } from "../../store/useAppStore";
import { apiFetchDocumentBase64, DocumentRequestRecord } from "../../utils/api";
import { saveDocumentToDevice } from "../../utils/downloads";

const DOCUMENT_TYPES = [
  { id: "attestation_travail", label: "Attestation de travail", icon: "📄" },
  {
    id: "bulletin_paie",
    label: "Bulletin de paie",
    icon: "💰",
    requiresPeriod: true,
  },
  { id: "certificat_travail", label: "Certificat de travail", icon: "📜" },
  { id: "attestation_salaire", label: "Attestation de salaire", icon: "💵" },
  { id: "attestation_cnss", label: "Attestation CNSS", icon: "🏦" },
  { id: "contrat_travail", label: "Copie du contrat", icon: "📝" },
  {
    id: "autre",
    label: "Autre document",
    icon: "📋",
    requiresCustomText: true,
  },
] as const;

const MONTHS = [
  { id: "1", label: "Janvier" },
  { id: "2", label: "Février" },
  { id: "3", label: "Mars" },
  { id: "4", label: "Avril" },
  { id: "5", label: "Mai" },
  { id: "6", label: "Juin" },
  { id: "7", label: "Juillet" },
  { id: "8", label: "Août" },
  { id: "9", label: "Septembre" },
  { id: "10", label: "Octobre" },
  { id: "11", label: "Novembre" },
  { id: "12", label: "Décembre" },
];

const STATUS_MAP: Record<
  string,
  { bg: string; text: string; icon: React.ReactNode }
> = {
  pending: {
    bg: "#e0e7ff",
    text: "#3730a3",
    icon: <Clock color="#4338ca" size={16} />,
  },
  processing: {
    bg: "#fef9c3",
    text: "#854d0e",
    icon: <Clock color="#d97706" size={16} />,
  },
  ready: {
    bg: "#dcfce7",
    text: "#15803d",
    icon: <CheckCircle color="#16a34a" size={16} />,
  },
  delivered: {
    bg: "#d1fae5",
    text: "#065f46",
    icon: <FileCheck color="#059669" size={16} />,
  },
  rejected: {
    bg: "#fee2e2",
    text: "#b91c1c",
    icon: <XCircle color="#dc2626" size={16} />,
  },
};

export default function DocumentsScreen() {
  const { documentRequests, submitDocumentRequest, fetchDocumentRequests } =
    useAppStore();
  const { highlightId } = useLocalSearchParams<{ highlightId?: string }>();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  // Scroll & Highlighting State
  const scrollViewRef = useRef<ScrollView>(null);
  const itemYPositions = useRef<Record<string, number>>({});
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Handle Contextual Scroll & Highlight when highlightId param arrives
  useEffect(() => {
    if (!highlightId || documentRequests.length === 0) return;

    const targetIdStr = highlightId.toString();
    const itemExists = documentRequests.some(
      (doc) => doc.id.toString() === targetIdStr,
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
  const [selectedDocType, setSelectedDocType] = useState<
    (typeof DOCUMENT_TYPES)[number]
  >(DOCUMENT_TYPES[0]);
  const [customTypeLabel, setCustomTypeLabel] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("8");
  const [selectedYear, setSelectedYear] = useState("2026");
  const [comment, setComment] = useState("");

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchDocumentRequests();
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchDocumentRequests]);

  const handleSubmit = async () => {
    if (selectedDocType.id === "autre" && !customTypeLabel.trim()) {
      Alert.alert(
        "Précision requise",
        "Veuillez préciser le nom du document souhaité.",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await submitDocumentRequest({
        document_type: selectedDocType.id,
        custom_type_label:
          selectedDocType.id === "autre" ? customTypeLabel.trim() : undefined,
        period_month:
          selectedDocType.id === "bulletin_paie" ? selectedMonth : undefined,
        period_year:
          selectedDocType.id === "bulletin_paie"
            ? parseInt(selectedYear, 10)
            : undefined,
        comment: comment.trim() || undefined,
      });

      setShowModal(false);
      setCustomTypeLabel("");
      setComment("");
      Alert.alert(
        "✅ Demande transmise",
        "Votre demande de document administratif a été envoyée au service RH.",
      );
    } catch (err: any) {
      Alert.alert(
        "Erreur",
        err.message ?? "Impossible de transmettre la demande.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = async (doc: DocumentRequestRecord) => {
    if (downloadingId !== null) return; // avoid double taps / concurrent downloads
    setDownloadingId(doc.id);
    try {
      const { base64, mimeType } = await apiFetchDocumentBase64(doc.id);
      const fileName =
        doc.file_name && doc.file_name.trim().length > 0
          ? doc.file_name
          : `document-${doc.id}.pdf`;
      const saved = await saveDocumentToDevice(base64, fileName, mimeType);

      Alert.alert(
        "✅ Téléchargement terminé",
        `"${fileName}" a été enregistré dans ${saved.locationLabel}.`,
      );
    } catch (err: any) {
      Alert.alert(
        "Erreur",
        err.message ?? "Impossible de télécharger ce fichier.",
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
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={["#1a1a2e", "#16213e"]} style={styles.header}>
        <Text style={styles.headerTitle}>Documents Administratifs</Text>
        <Text style={styles.headerSub}>
          Demandez et téléchargez vos attestations & bulletins de paie
        </Text>

        {/* Overview Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summaryLabel}>
                MES DEMANDES DE DOCUMENTS
              </Text>
              <Text style={styles.summaryTotal}>
                {documentRequests.length} au total
              </Text>
            </View>
            <View style={styles.iconCircle}>
              <FileText color="#6366f1" size={28} />
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryBreakdown}>
            <View style={styles.summaryStat}>
              <Text style={[styles.summaryStatVal, { color: "#b45309" }]}>
                {pendingCount}
              </Text>
              <Text style={styles.summaryStatLabel}>En cours</Text>
            </View>
            <View style={styles.summaryStat}>
              <Text style={[styles.summaryStatVal, { color: "#15803d" }]}>
                {readyCount}
              </Text>
              <Text style={styles.summaryStatLabel}>Prêts / Délivrés</Text>
            </View>
            <View style={styles.summaryStat}>
              <Text style={[styles.summaryStatVal, { color: "#6366f1" }]}>
                {documentRequests.length}
              </Text>
              <Text style={styles.summaryStatLabel}>Total</Text>
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
            colors={["#6366f1"]}
          />
        }
      >
          {/* Action button */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.newBtn}
              onPress={() => setShowModal(true)}
            >
              <LinearGradient
                colors={["#6366f1", "#4f46e5"]}
                style={styles.newBtnGrad}
              >
                <Plus color="#fff" size={20} />
                <Text style={styles.newBtnText}>
                  Nouvelle Demande de Document
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* List of Requests */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Historique des Demandes</Text>
            {documentRequests.length === 0 ? (
              <View style={styles.emptyCard}>
                <FileText color="#cbd5e1" size={48} />
                <Text style={styles.emptyTitle}>
                  Aucune demande de document
                </Text>
                <Text style={styles.emptySub}>
                  Faites votre première demande d'attestation ou de bulletin de
                  paie ci-dessus.
                </Text>
              </View>
            ) : (
              documentRequests.map((doc) => {
                const s = STATUS_MAP[doc.status] || STATUS_MAP.pending;
                const isHighlighted = highlightedId === doc.id.toString();

                const interpolatedBorder = fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["#e2e8f0", "#6366f1"],
                });
                const interpolatedBg = fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["#ffffff", "#e0e7ff"],
                });

                return (
                  <Animated.View
                    key={doc.id}
                    onLayout={(e) => {
                      itemYPositions.current[doc.id.toString()] =
                        e.nativeEvent.layout.y;
                    }}
                    style={[
                      styles.docCard,
                      isHighlighted && {
                        borderColor: interpolatedBorder,
                        borderWidth: 2,
                        backgroundColor: interpolatedBg,
                        shadowColor: "#6366f1",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.25,
                        shadowRadius: 8,
                        elevation: 5,
                      },
                    ]}
                  >
                    <View style={styles.docTop}>
                      <View style={styles.docLeft}>
                        <View
                          style={[
                            styles.docIconCircle,
                            { backgroundColor: s.bg },
                          ]}
                        >
                          {s.icon}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.docTitle}>
                            {doc.custom_type_label || doc.document_type_label}
                          </Text>
                          {doc.period_month && doc.period_year ? (
                            <Text style={styles.docPeriod}>
                              Période : {doc.period_month}/{doc.period_year}
                            </Text>
                          ) : null}
                          <Text style={styles.docDate}>
                            Demandé le {doc.request_date ?? "—"}
                          </Text>
                        </View>
                      </View>
                      <View
                        style={[styles.statusBadge, { backgroundColor: s.bg }]}
                      >
                        <Text
                          style={[styles.statusBadgeText, { color: s.text }]}
                        >
                          {doc.status_label}
                        </Text>
                      </View>
                    </View>

                    {doc.comment ? (
                      <Text style={styles.docComment}>
                        Motif : {doc.comment}
                      </Text>
                    ) : null}

                    {doc.status === "rejected" && doc.rejection_reason ? (
                      <View style={styles.rejectedBox}>
                        <AlertCircle color="#dc2626" size={14} />
                        <Text style={styles.rejectedText}>
                          Motif du refus : {doc.rejection_reason}
                        </Text>
                      </View>
                    ) : null}

                    {doc.has_file && (
                      <TouchableOpacity
                        style={[
                          styles.downloadBtn,
                          downloadingId === doc.id &&
                            styles.downloadBtnDisabled,
                        ]}
                        onPress={() => handleDownload(doc)}
                        disabled={downloadingId === doc.id}
                      >
                        {downloadingId === doc.id ? (
                          <ActivityIndicator color="#4338ca" size="small" />
                        ) : (
                          <Download color="#4338ca" size={16} />
                        )}
                        <Text style={styles.downloadBtnText}>
                          {downloadingId === doc.id
                            ? "Téléchargement…"
                            : `Télécharger (${doc.file_name})`}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </Animated.View>
                );
              })
            )}
          </View>
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Modal New Document Request */}
        <Modal
          visible={showModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowModal(false)}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.modalKeyboardAvoiding}
              >
                <View style={styles.modalCard}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Demander un document</Text>
                    <TouchableOpacity
                      onPress={() => setShowModal(false)}
                      style={styles.modalClose}
                    >
                      <X color="#64748b" size={22} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                  >
                    <Text style={styles.fieldLabel}>
                      Type de document souhaité *
                    </Text>
                    <View style={styles.docTypeGrid}>
                      {DOCUMENT_TYPES.map((t) => {
                        const isSelected = selectedDocType.id === t.id;
                        return (
                          <TouchableOpacity
                            key={t.id}
                            style={[
                              styles.docTypeCard,
                              isSelected && styles.docTypeCardActive,
                            ]}
                            onPress={() => setSelectedDocType(t)}
                          >
                            <Text style={styles.docTypeIcon}>{t.icon}</Text>
                            <Text
                              style={[
                                styles.docTypeLabel,
                                isSelected && styles.docTypeLabelActive,
                              ]}
                            >
                              {t.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Custom type text input */}
                    {selectedDocType.id === "autre" && (
                      <View style={{ marginTop: 10 }}>
                        <Text style={styles.fieldLabel}>Nom du document *</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="Ex: Attestation d'affiliation, etc."
                          placeholderTextColor="#94a3b8"
                          value={customTypeLabel}
                          onChangeText={setCustomTypeLabel}
                        />
                      </View>
                    )}

                    {/* Payslip month & year selection */}
                    {selectedDocType.id === "bulletin_paie" && (
                      <View style={{ marginTop: 10 }}>
                        <Text style={styles.fieldLabel}>
                          Mois & Année du bulletin *
                        </Text>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          style={{ flexDirection: "row", marginBottom: 10 }}
                        >
                          {MONTHS.map((m) => (
                            <TouchableOpacity
                              key={m.id}
                              style={[
                                styles.chip,
                                selectedMonth === m.id && styles.chipActive,
                              ]}
                              onPress={() => setSelectedMonth(m.id)}
                            >
                              <Text
                                style={[
                                  styles.chipText,
                                  selectedMonth === m.id &&
                                    styles.chipTextActive,
                                ]}
                              >
                                {m.label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>

                        <View style={{ flexDirection: "row", gap: 10 }}>
                          {["2026", "2025"].map((y) => (
                            <TouchableOpacity
                              key={y}
                              style={[
                                styles.chip,
                                selectedYear === y && styles.chipActive,
                              ]}
                              onPress={() => setSelectedYear(y)}
                            >
                              <Text
                                style={[
                                  styles.chipText,
                                  selectedYear === y && styles.chipTextActive,
                                ]}
                              >
                                {y}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}

                    {/* Comment / Destination */}
                    <Text style={styles.fieldLabel}>
                      Motif / Destination (Optionnel)
                    </Text>
                    <TextInput
                      style={[styles.input, styles.inputMulti]}
                      placeholder="Ex: Pour dossier bancaire, demande de visa, etc."
                      placeholderTextColor="#94a3b8"
                      multiline
                      value={comment}
                      onChangeText={setComment}
                    />

                    <TouchableOpacity
                      onPress={handleSubmit}
                      disabled={isSubmitting}
                    >
                      <LinearGradient
                        colors={["#6366f1", "#4f46e5"]}
                        style={styles.submitBtn}
                      >
                        {isSubmitting ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Text style={styles.submitBtnText}>
                            Envoyer la demande
                          </Text>
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
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: { paddingTop: 52, paddingHorizontal: 20, paddingBottom: 90 },
  headerTitle: { color: "#ffffff", fontSize: 24, fontWeight: "800" },
  headerSub: {
    color: "#94a3b8",
    fontSize: 13,
    marginTop: 4,
    fontWeight: "500",
  },
  summaryCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
    marginTop: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  summaryTotal: {
    color: "#0f172a",
    fontSize: 26,
    fontWeight: "800",
    marginTop: 2,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 99,
    backgroundColor: "#e0e7ff",
    alignItems: "center",
    justifyContent: "center",
  },
  divider: { height: 1, backgroundColor: "#f1f5f9", marginVertical: 14 },
  summaryBreakdown: { flexDirection: "row", justifyContent: "space-around" },
  summaryStat: { alignItems: "center" },
  summaryStatVal: { fontSize: 18, fontWeight: "800" },
  summaryStatLabel: {
    color: "#64748b",
    fontSize: 11,
    marginTop: 2,
    fontWeight: "600",
  },

  scroll: { flex: 1, marginTop: -50 },
  scrollContent: { flexGrow: 1, paddingBottom: 140 },
  section: { paddingHorizontal: 20, marginTop: 16 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 12,
  },
  newBtn: { borderRadius: 16, overflow: "hidden" },
  newBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 15,
  },
  newBtnText: { color: "#ffffff", fontWeight: "800", fontSize: 15 },

  emptyCard: {
    alignItems: "center",
    paddingVertical: 40,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    marginTop: 14,
  },
  emptySub: {
    fontSize: 13,
    color: "#94a3b8",
    marginTop: 4,
    textAlign: "center",
    paddingHorizontal: 20,
  },

  docCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  docTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  docLeft: { flexDirection: "row", gap: 12, flex: 1, marginRight: 8 },
  docIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  docTitle: { fontSize: 14, fontWeight: "800", color: "#0f172a" },
  docPeriod: {
    fontSize: 12,
    color: "#6366f1",
    fontWeight: "700",
    marginTop: 2,
  },
  docDate: { fontSize: 11, color: "#94a3b8", marginTop: 2 },
  statusBadge: { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText: { fontSize: 11, fontWeight: "800" },
  docComment: {
    fontSize: 12,
    color: "#475569",
    marginTop: 8,
    fontStyle: "italic",
  },
  rejectedBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  rejectedText: { color: "#b91c1c", fontSize: 12, fontWeight: "600" },
  downloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#e0e7ff",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: "flex-start",
    marginTop: 10,
  },
  downloadBtnDisabled: { opacity: 0.6 },
  downloadBtnText: { color: "#3730a3", fontSize: 12, fontWeight: "800" },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  modalKeyboardAvoiding: { width: "100%", maxHeight: "90%" },
  modalCard: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "100%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#0f172a" },
  modalClose: { backgroundColor: "#f1f5f9", padding: 8, borderRadius: 99 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
    marginTop: 12,
  },
  docTypeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  docTypeCard: {
    width: "48%",
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  docTypeCardActive: { backgroundColor: "#e0e7ff", borderColor: "#6366f1" },
  docTypeIcon: { fontSize: 18 },
  docTypeLabel: { fontSize: 12, fontWeight: "600", color: "#475569", flex: 1 },
  docTypeLabelActive: { color: "#3730a3", fontWeight: "800" },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 99,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginRight: 6,
  },
  chipActive: { backgroundColor: "#e0e7ff", borderColor: "#6366f1" },
  chipText: { fontSize: 12, color: "#64748b", fontWeight: "600" },
  chipTextActive: { color: "#3730a3", fontWeight: "800" },
  input: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: "#0f172a",
  },
  inputMulti: { height: 74, textAlignVertical: "top" },
  submitBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 20,
  },
  submitBtnText: { color: "#ffffff", fontWeight: "800", fontSize: 15 },
});
