import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  TrendingUp,
  BrainCircuit,
  Award,
  Star,
  Zap,
  RefreshCw,
  AlertCircle,
  Sparkles,
} from 'lucide-react-native';
import { useAppStore } from '../../store/useAppStore';
import { Theme } from '../../constants/theme';

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

export default function PerformanceScreen() {
  const { user, appraisals, appraisalDetail, refreshData } = useAppStore();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  const latestAppraisal = appraisals[0] ?? null;
  const score = latestAppraisal?.ai_performance_score ?? 0;
  const scoreColor =
    score >= 90 ? '#10b981' : score >= 75 ? '#f59e0b' : score > 0 ? '#ef4444' : '#64748b';
  const isHighPotential = latestAppraisal?.ai_high_potential ?? false;

  const stateLabel: Record<string, string> = {
    new: 'Brouillon',
    pending: 'En cours',
    done: 'Validé / Clôturé',
    cancel: 'Annulé',
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.header}>
        <Text style={styles.headerTitle}>Mon Bilan & Performance</Text>
        <Text style={styles.headerSub}>Synthèses et recommandations de carrière</Text>

        {/* Score Card */}
        <View style={styles.scoreCard}>
          <ScoreRing score={score} color={scoreColor} />
          <View style={styles.scoreDetails}>
            <Text style={styles.scoreName}>{user.name || 'Collaborateur'}</Text>
            {isHighPotential && (
              <View style={styles.highPotentialBadge}>
                <Star color="#f59e0b" size={12} fill="#f59e0b" />
                <Text style={styles.highPotentialText}>Haut Potentiel</Text>
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
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#6366f1"
            colors={['#6366f1']}
          />
        }
      >
        {/* Empty state */}
        {appraisals.length === 0 && (
          <View style={styles.emptyCard}>
            <AlertCircle color="#94a3b8" size={40} />
            <Text style={styles.emptyTitle}>Aucun bilan enregistre</Text>
            <Text style={styles.emptyBody}>
              Aucun entretien de bilan n'a encore été planifié pour cette période. Vos synthèses de performance et recommandations d'évolution apparaîtront ici.
            </Text>
            <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh}>
              <RefreshCw color="#6366f1" size={16} />
              <Text style={styles.refreshBtnText}>Actualiser</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* AI Summary Card */}
        {appraisalDetail?.ai_summary ? (
          <View style={styles.section}>
            <View style={styles.aiCard}>
              <View style={styles.aiHeader}>
                <Sparkles color="#8b5cf6" size={22} />
                <Text style={styles.aiTitle}>Synthèse d'Analyse RH</Text>
                <View style={styles.aiBadge}>
                  <Text style={styles.aiBadgeText}>Smart Assistant</Text>
                </View>
              </View>
              <Text style={styles.aiText}>{appraisalDetail.ai_summary}</Text>
              {appraisalDetail.ai_computed_on && (
                <Text style={styles.aiDate}>
                  Généré le {new Date(appraisalDetail.ai_computed_on).toLocaleDateString('fr-FR')}
                </Text>
              )}
            </View>
          </View>
        ) : (
          appraisals.length > 0 && (
            <View style={styles.section}>
              <View style={styles.aiCard}>
                <View style={styles.aiHeader}>
                  <BrainCircuit color="#8b5cf6" size={22} />
                  <Text style={styles.aiTitle}>Synthèse d'Analyse RH</Text>
                </View>
                <View style={styles.aiLoading}>
                  <ActivityIndicator color="#8b5cf6" />
                  <Text style={styles.aiLoadingText}>Synthèse en cours de préparation...</Text>
                </View>
              </View>
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
                aScore >= 90 ? '#10b981' : aScore >= 75 ? '#f59e0b' : aScore > 0 ? '#ef4444' : '#94a3b8';
              return (
                <View key={a.id} style={styles.appraisalCard}>
                  <View style={styles.appraisalTop}>
                    <View style={styles.appraisalLeft}>
                      <Award color="#f59e0b" size={18} />
                      <Text style={styles.appraisalPeriod}>
                        {stateLabel[a.state] ?? a.state} — {a.employee}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.appraisalScoreBadge,
                        { backgroundColor: aScore > 0 ? '#fef9c3' : '#f1f5f9' },
                      ]}
                    >
                      <Text style={[styles.appraisalScore, { color: aColor }]}>
                        {aScore > 0 ? `${aScore}/100` : 'En cours'}
                      </Text>
                    </View>
                  </View>
                  {a.ai_high_potential && (
                    <View style={styles.hpRow}>
                      <Star color="#f59e0b" size={13} fill="#f59e0b" />
                      <Text style={styles.hpText}>Profil Haut Potentiel identifié</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Quick Stats Row */}
        {appraisals.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Aperçu Global</Text>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Zap color="#6366f1" size={22} />
                <Text style={styles.statValue}>{appraisals.length}</Text>
                <Text style={styles.statLabel}>Bilans réalisés</Text>
              </View>
              <View style={styles.statCard}>
                <TrendingUp color="#10b981" size={22} />
                <Text style={styles.statValue}>{score > 0 ? score : '—'}</Text>
                <Text style={styles.statLabel}>Score Bilan</Text>
              </View>
              <View style={styles.statCard}>
                <Star color="#f59e0b" size={22} />
                <Text style={styles.statValue}>{isHighPotential ? 'Oui' : 'Non'}</Text>
                <Text style={styles.statLabel}>Haut Potentiel</Text>
              </View>
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingTop: 52, paddingHorizontal: 20, paddingBottom: 90 },
  headerTitle: { color: '#ffffff', fontSize: 26, fontWeight: '800' },
  headerSub: { color: '#94a3b8', fontSize: 13, marginTop: 4, fontWeight: '500' },
  scoreCard: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 22,
    padding: 20,
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  scoreRingOuter: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreRingInner: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNum: { fontSize: 26, fontWeight: '800' },
  scoreOf: { color: '#94a3b8', fontSize: 11 },
  scoreDetails: { flex: 1, gap: 8 },
  scoreName: { color: '#ffffff', fontSize: 18, fontWeight: '800' },
  highPotentialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  highPotentialText: { color: '#f59e0b', fontSize: 11, fontWeight: '700' },
  stateBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  stateBadgeText: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '600' },
  noAppraisalHint: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },

  scroll: { flex: 1, marginTop: -50 },
  section: { paddingHorizontal: 20, marginTop: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 12 },

  emptyCard: {
    margin: 20,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginTop: 14, marginBottom: 6 },
  emptyBody: { color: '#64748b', fontSize: 13, lineHeight: 20, textAlign: 'center' },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 18,
    backgroundColor: '#e0e7ff',
    borderRadius: 99,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  refreshBtnText: { color: '#4338ca', fontWeight: '800', fontSize: 13 },

  aiCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  aiTitle: { color: '#0f172a', fontWeight: '800', fontSize: 15, flex: 1 },
  aiBadge: { backgroundColor: '#e0e7ff', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  aiBadgeText: { color: '#4338ca', fontSize: 11, fontWeight: '800' },
  aiText: { color: '#334155', fontSize: 14, lineHeight: 22 },
  aiDate: { color: '#94a3b8', fontSize: 11, marginTop: 12, fontWeight: '600' },
  aiLoading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  aiLoadingText: { color: '#94a3b8', fontSize: 13, flex: 1 },

  appraisalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  appraisalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  appraisalLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  appraisalPeriod: { color: '#0f172a', fontWeight: '800', fontSize: 14, flex: 1 },
  appraisalScoreBadge: { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  appraisalScore: { fontWeight: '800', fontSize: 12 },
  hpRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  hpText: { color: '#f59e0b', fontSize: 12, fontWeight: '600' },

  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statValue: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  statLabel: { fontSize: 11, color: '#64748b', fontWeight: '600' },
});
