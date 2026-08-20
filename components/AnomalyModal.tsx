import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, AlertTriangle, Paperclip, Send, Clock, CheckCircle2, XCircle } from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';
import { AnomalyRecord } from '../utils/api';

interface Props {
  visible: boolean;
  onClose: () => void;
  initialDate?: string;
  initialTab?: 'form' | 'list';
  highlightId?: string;
}

export default function AnomalyModal({ visible, onClose, initialDate, initialTab, highlightId }: Props) {
  const { submitAnomalyClaim, myAnomalies, fetchMyAnomalies } = useAppStore();

  const [activeTab, setActiveTab] = useState<'form' | 'list'>(initialTab || 'form');
  const [date, setDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [comment, setComment] = useState('');
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [attachmentBase64, setAttachmentBase64] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (initialDate) {
      setDate(initialDate);
    }
  }, [initialDate]);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, visible]);

  const handleSimulateAttachment = () => {
    setAttachmentName('justificatif_presence.jpg');
    setAttachmentBase64('data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
    Alert.alert('📎 Pièce jointe ajoutée', 'Fichier "justificatif_presence.jpg" sélectionné.');
  };

  const handleSubmit = async () => {
    if (!comment.trim()) {
      Alert.alert('Champs requis', 'Veuillez saisir un commentaire expliquant l\'anomalie.');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitAnomalyClaim({
        date,
        comment: comment.trim(),
        attachment_base64: attachmentBase64 || undefined,
        attachment_name: attachmentName || undefined,
      });

      Alert.alert(
        '✅ Réclamation transmise',
        'Votre signalement d\'anomalie a été transmis à l\'équipe RH.'
      );
      setComment('');
      setAttachmentName(null);
      setAttachmentBase64(null);
      setActiveTab('list');
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible de transmettre la réclamation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoiding}
          >
            <View style={styles.card}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.titleRow}>
                  <AlertTriangle color="#dc2626" size={22} />
                  <Text style={styles.title}>Signalement & Réclamations</Text>
                </View>
                <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                  <X color="#64748b" size={20} />
                </TouchableOpacity>
              </View>

              {/* Sub-tabs */}
              <View style={styles.tabContainer}>
                <TouchableOpacity
                  style={[styles.tabBtn, activeTab === 'form' && styles.tabBtnActive]}
                  onPress={() => setActiveTab('form')}
                >
                  <Text style={[styles.tabText, activeTab === 'form' && styles.tabTextActive]}>
                    Signaler une erreur
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tabBtn, activeTab === 'list' && styles.tabBtnActive]}
                  onPress={() => {
                    fetchMyAnomalies();
                    setActiveTab('list');
                  }}
                >
                  <Text style={[styles.tabText, activeTab === 'list' && styles.tabTextActive]}>
                    Mes Réclamations ({myAnomalies.length})
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.body}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {activeTab === 'form' ? (
                  <View style={styles.formContainer}>
                    {/* Date Concerned */}
                    <Text style={styles.label}>Date concernée</Text>
                    <TextInput
                      style={styles.inputDate}
                      value={date}
                      onChangeText={setDate}
                      placeholder="AAAA-MM-JJ"
                    />

                    {/* Comment / Reason */}
                    <Text style={styles.label}>Commentaire / Motif du signalement *</Text>
                    <TextInput
                      style={styles.inputMultiline}
                      value={comment}
                      onChangeText={setComment}
                      placeholder="Ex: J'étais présent sur le site mais la pointeuse physique était hors service..."
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />

                    {/* Attachment */}
                    <Text style={styles.label}>Photo / Justificatif (optionnel)</Text>
                    <TouchableOpacity style={styles.attachmentBtn} onPress={handleSimulateAttachment}>
                      <Paperclip color="#6366f1" size={18} />
                      <Text style={styles.attachmentBtnText}>
                        {attachmentName ? `Fichier : ${attachmentName}` : 'Ajouter un justificatif ou photo'}
                      </Text>
                    </TouchableOpacity>

                    {/* Submit button */}
                    <TouchableOpacity
                      style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
                      onPress={handleSubmit}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <>
                          <Send color="#fff" size={18} />
                          <Text style={styles.submitBtnText}>Transmettre au RH</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.listContainer}>
                    {myAnomalies.length === 0 ? (
                      <View style={styles.emptyState}>
                        <Clock color="#94a3b8" size={36} />
                        <Text style={styles.emptyText}>Aucune réclamation enregistrée.</Text>
                      </View>
                    ) : (
                      myAnomalies.map((item) => (
                        <ClaimCard
                          key={item.id}
                          item={item}
                          isHighlighted={highlightId !== undefined && item.id.toString() === highlightId.toString()}
                        />
                      ))
                    )}
                  </View>
                )}
                <View style={{ height: 20 }} />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

function ClaimCard({ item, isHighlighted }: { item: AnomalyRecord; isHighlighted?: boolean }) {
  const isResolved = item.status === 'resolved' || item.resolved;
  const isRejected = item.status === 'rejected';

  const badgeBg = isResolved ? '#dcfce7' : isRejected ? '#fee2e2' : '#fef9c3';
  const badgeColor = isResolved ? '#15803d' : isRejected ? '#b91c1c' : '#92400e';
  const statusLabel = isResolved ? 'Traité / Validé' : isRejected ? 'Rejeté' : 'En attente RH';

  return (
    <View
      style={[
        styles.claimCard,
        isHighlighted && {
          borderColor: '#6366f1',
          borderWidth: 2,
          backgroundColor: '#e0e7ff',
        },
      ]}
    >
      <View style={styles.claimHeader}>
        <View style={[styles.badge, { backgroundColor: badgeBg }]}>
          {isResolved ? (
            <CheckCircle2 color="#16a34a" size={14} />
          ) : isRejected ? (
            <XCircle color="#dc2626" size={14} />
          ) : (
            <Clock color="#d97706" size={14} />
          )}
          <Text style={[styles.badgeText, { color: badgeColor }]}>{statusLabel}</Text>
        </View>
        <Text style={styles.claimDate}>Date : {item.date_concerned || '—'}</Text>
      </View>

      <Text style={styles.claimComment}>"{item.comment}"</Text>

      {item.rh_comment ? (
        <View style={styles.rhBox}>
          <Text style={styles.rhTitle}>Réponse RH :</Text>
          <Text style={styles.rhText}>{item.rh_comment}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  keyboardAvoiding: {
    width: '100%',
    maxHeight: '90%',
  },
  card: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  closeBtn: {
    backgroundColor: '#f1f5f9',
    padding: 8,
    borderRadius: 99,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#6366f1',
    fontWeight: '800',
  },
  body: {
    marginTop: 4,
  },
  formContainer: {
    gap: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginTop: 4,
  },
  inputDate: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0f172a',
  },
  inputMultiline: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0f172a',
    minHeight: 100,
  },
  attachmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#eeeffe',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 14,
  },
  attachmentBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4338ca',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6366f1',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 12,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
  },
  listContainer: {
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    padding: 30,
    gap: 10,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  claimCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  claimHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  claimDate: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  claimComment: {
    fontSize: 14,
    color: '#1e293b',
    fontStyle: 'italic',
  },
  rhBox: {
    marginTop: 10,
    backgroundColor: '#f1f5f9',
    padding: 10,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#6366f1',
  },
  rhTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4338ca',
    marginBottom: 2,
  },
  rhText: {
    fontSize: 13,
    color: '#334155',
  },
});
