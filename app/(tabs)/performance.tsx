import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Animated,
} from 'react-native';
import {
  TrendingUp,
  BrainCircuit,
  Award,
  Star,
  Zap,
  RefreshCw,
  AlertCircle,
  Sparkles,
  ChevronRight,
} from 'lucide-react-native';
import { useAppStore } from '../../store/useAppStore';
import { Theme } from '../../constants/theme';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { IconCircle } from '../../components/ui/IconCircle';

function ScoreRing({ score, color }: { score: number; color: string }) {
  return (
    <View style={styles.scoreRingOuter}>
      <View style={[styles.scoreRingInner, { borderColor: color }]}>
        <Text style={[styles.scoreNum, { color }]}>{score}</Text>
        <Text style={styles.scoreOf}>/100</Text>
      </View>
    </View>
  );
}

import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PerformanceScreen() {
  const insets = useSafeAreaInsets();
  const { user, appraisals, appraisalDetail, refreshData } = useAppStore();
  const [refreshing, setRefreshing] = useState(false);

  // Animated Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(500)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const openSummary = () => {
    setModalVisible(true);
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeSummary = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 500,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => setModalVisible(false));
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  const latestAppraisal = appraisals[0] ?? null;
  const score = latestAppraisal?.ai_performance_score ?? 0;
  const scoreColor =
    score >= 90
      ? Theme.colors.status.success.text
      : score >= 75
      ? Theme.colors.status.warning.text
      : score > 0
      ? Theme.colors.status.danger.text
      : Theme.colors.textSecondary;
  const isHighPotential = latestAppraisal?.ai_high_potential ?? false;

  const stateLabel: Record<string, string> = {
    new: 'Brouillon',
    pending: 'En cours',
    done: 'Validé / Clôturé',
    cancel: 'Annulé',
  };

  return (
    <View style={[styles.container, { paddingLeft: insets.left, paddingRight: insets.right }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 10, 52) }]}>
        <Text style={styles.headerTitle}>Mon Bilan & Performance</Text>
        <Text style={styles.headerSub}>Synthèses et recommandations de carrière</Text>

        {/* Score Card */}
        <Card style={styles.scoreCard}>
          <ScoreRing score={score} color={scoreColor} />
          <View style={styles.scoreDetails}>
            <Text style={styles.scoreName}>{user.name || 'Collaborateur'}</Text>
            {isHighPotential && (
              <View style={styles.highPotentialBadge}>
                <Star color={Theme.colors.primary} size={13} fill={Theme.colors.primary} />
                <Text style={styles.highPotentialText}>Haut Potentiel (HIPO)</Text>
              </View>
            )}
            {latestAppraisal ? (
              <View style={styles.stateBadge}>
                <Text style={styles.stateBadgeText}>
                  {stateLabel[latestAppraisal.state] ?? latestAppraisal.state}
                </Text>
              </View>
            ) : (
              <Text style={styles.noAppraisalHint}>Aucun bilan actif</Text>
            )}
          </View>
        </Card>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Theme.colors.primary}
            colors={[Theme.colors.primary]}
          />
        }
      >
        {/* Empty state */}
        {appraisals.length === 0 && (
          <Card style={styles.emptyCard}>
            <IconCircle variant="blue" size={54}>
              <AlertCircle color={Theme.colors.textSecondary} size={28} />
            </IconCircle>
            <Text style={styles.emptyTitle}>Aucun bilan enregistré</Text>
            <Text style={styles.emptyBody}>
              Aucun entretien de bilan n'a encore été planifié pour cette période. Vos synthèses de performance et recommandations d'évolution apparaîtront ici.
            </Text>
            <PrimaryButton
              title="Actualiser"
              icon={<RefreshCw color={Theme.colors.textPrimary} size={16} />}
              onPress={handleRefresh}
              variant="outline"
              style={{ marginTop: 18 }}
            />
          </Card>
        )}

        {/* AI Summary Card */}
        {appraisalDetail?.ai_summary ? (
          <View style={styles.section}>
            <Card style={styles.aiCard}>
              <View style={styles.aiHeader}>
                <IconCircle variant="purple" size={38}>
                  <Sparkles color={Theme.colors.status.info.text} size={20} />
                </IconCircle>
                <Text style={styles.aiTitle}>Synthèse d'Analyse RH</Text>
                <View style={styles.aiBadge}>
                  <Text style={styles.aiBadgeText}>Smart Assistant</Text>
                </View>
              </View>
              
              <Text style={styles.aiPreviewText} numberOfLines={2}>
                {appraisalDetail.ai_summary}
              </Text>
              
              <TouchableOpacity style={styles.aiOpenBtn} onPress={openSummary}>
                <Text style={styles.aiOpenBtnText}>Lire l'analyse complète</Text>
                <ChevronRight color={Theme.colors.primary} size={16} />
              </TouchableOpacity>

              {appraisalDetail.ai_computed_on && (
                <Text style={styles.aiDate}>
                  Généré le {new Date(appraisalDetail.ai_computed_on).toLocaleDateString('fr-FR')}
                </Text>
              )}
            </Card>
          </View>
        ) : (
          appraisals.length > 0 && (
            <View style={styles.section}>
              <Card style={styles.aiCard}>
                <View style={styles.aiHeader}>
                  <IconCircle variant="purple" size={38}>
                    <BrainCircuit color={Theme.colors.status.info.text} size={20} />
                  </IconCircle>
                  <Text style={styles.aiTitle}>Synthèse d'Analyse RH</Text>
                </View>
                <View style={styles.aiLoading}>
                  <ActivityIndicator color={Theme.colors.primary} />
                  <Text style={styles.aiLoadingText}>Synthèse en cours de préparation...</Text>
                </View>
              </Card>
            </View>
          )
        )}

        {/* Appraisal History */}
        {appraisals.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Historique des bilans</Text>
            {appraisals.map((a) => {
              const aScore = a.ai_performance_score;
              const aColor =
                aScore >= 90
                  ? Theme.colors.status.success.text
                  : aScore >= 75
                  ? Theme.colors.status.warning.text
                  : aScore > 0
                  ? Theme.colors.status.danger.text
                  : Theme.colors.textSecondary;
              return (
                <Card key={a.id} style={styles.appraisalCard}>
                  <View style={styles.appraisalTop}>
                    <View style={styles.appraisalLeft}>
                      <IconCircle variant="yellow" size={36}>
                        <Award color={Theme.colors.status.warning.text} size={18} />
                      </IconCircle>
                      <Text style={styles.appraisalPeriod}>
                        {stateLabel[a.state] ?? a.state} — {a.employee}
                      </Text>
                    </View>
                    <View style={styles.appraisalScoreBadge}>
                      <Text style={[styles.appraisalScore, { color: aColor }]}>
                        {aScore > 0 ? `${aScore}/100` : 'En cours'}
                      </Text>
                    </View>
                  </View>
                  {a.ai_high_potential && (
                    <View style={styles.hpRow}>
                      <Star color={Theme.colors.primary} size={13} fill={Theme.colors.primary} />
                      <Text style={styles.hpText}>Profil Haut Potentiel identifié</Text>
                    </View>
                  )}
                </Card>
              );
            })}
          </View>
        )}

        {/* Quick Stats Grid */}
        {appraisals.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Aperçu Global</Text>
            <View style={styles.statsRow}>
              <StatCard
                title="Bilans réalisés"
                value={appraisals.length}
                icon={<Zap color={Theme.colors.status.info.text} size={20} />}
                variant="purple"
              />
              <StatCard
                title="Score Bilan"
                value={score > 0 ? score : '—'}
                icon={<TrendingUp color={Theme.colors.status.success.text} size={20} />}
                variant="green"
                valueColor={scoreColor}
              />
              <StatCard
                title="Haut Potentiel"
                value={isHighPotential ? 'Oui' : 'Non'}
                icon={<Star color={Theme.colors.primary} size={20} />}
                variant="coral"
                valueColor={isHighPotential ? Theme.colors.primary : Theme.colors.textSecondary}
              />
            </View>
          </View>
        )}
      </ScrollView>

      {/* AI Summary Modal */}
      {modalVisible && (
        <Modal visible transparent animationType="none" onRequestClose={closeSummary}>
          <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closeSummary} activeOpacity={1} />
            <Animated.View style={[styles.modalContent, { transform: [{ translateY: slideAnim }], paddingBottom: Math.max(insets.bottom, 24) }]}>
              <View style={styles.modalDragHandle} />
              <View style={styles.modalAiHeader}>
                <IconCircle variant="purple" size={48}>
                  <Sparkles color={Theme.colors.status.info.text} size={24} />
                </IconCircle>
                <View style={styles.modalAiTitleWrap}>
                  <Text style={styles.modalAiTitle}>Synthèse d'Analyse RH</Text>
                  <Text style={styles.modalAiSub}>Smart Assistant IA</Text>
                </View>
              </View>
              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.modalAiText}>{appraisalDetail?.ai_summary}</Text>
              </ScrollView>
              <PrimaryButton title="Fermer" onPress={closeSummary} variant="black" style={styles.modalCloseBtn} />
            </Animated.View>
          </Animated.View>
        </Modal>
      )}
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
  scoreCard: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  scoreRingOuter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  scoreRingInner: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 3.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNum: {
    fontSize: 24,
    fontWeight: '800',
  },
  scoreOf: {
    color: Theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  scoreDetails: {
    flex: 1,
    gap: 6,
  },
  scoreName: {
    color: Theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  highPotentialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Theme.colors.pastelBg.coral,
    borderRadius: Theme.radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  highPotentialText: {
    color: Theme.colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  stateBadge: {
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  stateBadgeText: {
    color: Theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  noAppraisalHint: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
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

  emptyCard: {
    margin: Theme.spacing.lg,
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
    marginTop: 14,
    marginBottom: 6,
  },
  emptyBody: {
    color: Theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },

  aiCard: {
    padding: Theme.spacing.lg,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  aiTitle: {
    color: Theme.colors.textPrimary,
    fontWeight: '800',
    fontSize: 15,
    flex: 1,
  },
  aiBadge: {
    backgroundColor: Theme.colors.pastelBg.purple,
    borderRadius: Theme.radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  aiBadgeText: {
    color: Theme.colors.status.info.text,
    fontSize: 11,
    fontWeight: '800',
  },
  aiPreviewText: {
    color: Theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
  },
  aiOpenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: Theme.radius.lg,
  },
  aiOpenBtnText: {
    color: Theme.colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  aiDate: {
    color: Theme.colors.textSecondary,
    fontSize: 11,
    marginTop: 12,
    fontWeight: '600',
  },
  aiLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  aiLoadingText: {
    color: Theme.colors.textSecondary,
    fontSize: 13,
    flex: 1,
  },

  appraisalCard: {
    marginBottom: 10,
    padding: Theme.spacing.md,
  },
  appraisalTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appraisalLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  appraisalPeriod: {
    color: Theme.colors.textPrimary,
    fontWeight: '800',
    fontSize: 14,
    flex: 1,
  },
  appraisalScoreBadge: {
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  appraisalScore: {
    fontWeight: '800',
    fontSize: 12,
  },
  hpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  hpText: {
    color: Theme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },

  statsRow: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Theme.colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: Theme.spacing.xl,
    paddingTop: Theme.spacing.md,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  modalDragHandle: {
    width: 40,
    height: 5,
    backgroundColor: Theme.colors.border,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalAiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  modalAiTitleWrap: {
    flex: 1,
  },
  modalAiTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
  },
  modalAiSub: {
    fontSize: 13,
    color: Theme.colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  modalScroll: {
    marginBottom: 20,
  },
  modalAiText: {
    fontSize: 15,
    lineHeight: 24,
    color: Theme.colors.textPrimary,
  },
  modalCloseBtn: {
    marginTop: 8,
  },
});
