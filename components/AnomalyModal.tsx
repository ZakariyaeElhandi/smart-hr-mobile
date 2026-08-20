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
import { Theme } from '../constants/theme';
import { Card } from './ui/Card';
import { StatusBadge } from './ui/StatusBadge';
import { PrimaryButton } from './ui/PrimaryButton';
import { IconCircle } from './ui/IconCircle';

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
            <Card style={styles.card}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.titleRow}>
                  <IconCircle variant="coral" size={38}>
                    <AlertTriangle color={Theme.colors.primary} size={20} />
                  </IconCircle>
                  <Text style={styles.title}>Signalement & Réclamations</Text>
                </View>
                <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                  <X color={Theme.colors.textSecondary} size={20} />
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
                      placeholderTextColor={Theme.colors.textTertiary}
                    />

                    {/* Comment / Reason */}
                    <Text style={styles.label}>Commentaire / Motif du signalement *</Text>
                    <TextInput
                      style={styles.inputMultiline}
                      value={comment}
                      onChangeText={setComment}
                      placeholder="Ex: J'étais présent sur le site mais la pointeuse physique était hors service..."
                      placeholderTextColor={Theme.colors.textTertiary}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />

                    {/* Attachment */}
                    <Text style={styles.label}>Photo / Justificatif (optionnel)</Text>
                    <TouchableOpacity style={styles.attachmentBtn} onPress={handleSimulateAttachment}>
                      <Paperclip color={Theme.colors.primary} size={18} />
                      <Text style={styles.attachmentBtnText}>
                        {attachmentName ? `Fichier : ${attachmentName}` : 'Ajouter un justificatif ou photo'}
                      </Text>
                    </TouchableOpacity>

                    {/* Submit button */}
                    <PrimaryButton
                      title="Transmettre au RH"
                      icon={<Send color={Theme.colors.textWhite} size={18} />}
                      onPress={handleSubmit}
                      loading={isSubmitting}
                      variant="black"
                      style={{ marginTop: 12 }}
                    />
                  </View>
                ) : (
                  <View style={styles.listContainer}>
                    {myAnomalies.length === 0 ? (
                      <View style={styles.emptyState}>
                        <IconCircle variant="yellow" size={48}>
                          <Clock color={Theme.colors.status.warning.text} size={24} />
                        </IconCircle>
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
            </Card>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

function ClaimCard({ item, isHighlighted }: { item: AnomalyRecord; isHighlighted?: boolean }) {
  const isResolved = item.status === 'resolved' || item.resolved;
  const isRejected = item.status === 'rejected';

  const statusLabel = isResolved ? 'Traité / Validé' : isRejected ? 'Rejeté' : 'En attente RH';
  const statusType = isResolved ? 'resolved' : isRejected ? 'rejected' : 'pending';

  return (
    <Card
      style={[
        styles.claimCard,
        isHighlighted && {
          borderColor: Theme.colors.primary,
          borderWidth: 2,
          backgroundColor: Theme.colors.pastelBg.coral,
        },
      ]}
    >
      <View style={styles.claimHeader}>
        <StatusBadge status={statusType} label={statusLabel} />
        <Text style={styles.claimDate}>Date : {item.date_concerned || '—'}</Text>
      </View>

      <Text style={styles.claimComment}>"{item.comment}"</Text>

      {item.rh_comment ? (
        <View style={styles.rhBox}>
          <Text style={styles.rhTitle}>Réponse RH :</Text>
          <Text style={styles.rhText}>{item.rh_comment}</Text>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 26, 0.5)',
    justifyContent: 'flex-end',
  },
  keyboardAvoiding: {
    width: '100%',
    maxHeight: '90%',
  },
  card: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Theme.spacing.xl,
    maxHeight: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
  },
  closeBtn: {
    backgroundColor: Theme.colors.background,
    padding: 8,
    borderRadius: Theme.radius.full,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.radius.md,
    padding: 4,
    marginBottom: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: Theme.radius.sm,
  },
  tabBtnActive: {
    backgroundColor: Theme.colors.surface,
    ...Theme.shadows.soft,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
  },
  tabTextActive: {
    color: Theme.colors.primary,
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
    color: Theme.colors.textPrimary,
    marginTop: 4,
  },
  inputDate: {
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Theme.colors.textPrimary,
  },
  inputMultiline: {
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Theme.colors.textPrimary,
    minHeight: 100,
  },
  attachmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Theme.colors.pastelBg.coral,
    borderWidth: 1.5,
    borderColor: Theme.colors.primary,
    borderStyle: 'dashed',
    borderRadius: Theme.radius.md,
    padding: 14,
  },
  attachmentBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.colors.primary,
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
    color: Theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  claimCard: {
    marginBottom: 10,
    padding: Theme.spacing.md,
  },
  claimHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  claimDate: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
    fontWeight: '600',
  },
  claimComment: {
    fontSize: 14,
    color: Theme.colors.textPrimary,
    fontStyle: 'italic',
  },
  rhBox: {
    marginTop: 10,
    backgroundColor: Theme.colors.background,
    padding: 10,
    borderRadius: Theme.radius.sm,
    borderLeftWidth: 3,
    borderLeftColor: Theme.colors.primary,
  },
  rhTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: Theme.colors.primary,
    marginBottom: 2,
  },
  rhText: {
    fontSize: 13,
    color: Theme.colors.textPrimary,
  },
});
