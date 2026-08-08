import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  TrendingUp, BrainCircuit, Award, Star, Zap, RefreshCw, AlertCircle,
} from 'lucide-react-native';
import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';

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

  // Derived values from real Odoo data
  const latestAppraisal = appraisals[0] ?? null;
  const score = latestAppraisal?.ai_performance_score ?? 0;
  const scoreColor = score >= 90 ? '#10b981' : score >= 75 ? '#f59e0b' : score > 0 ? '#ef4444' : '#64748b';
  const isHighPotential = latestAppraisal?.ai_high_potential ?? false;

  // State label mapping
  const stateLabel: Record<string, string> = {
    new: 'Draft',
    pending: 'Pending',
    done: 'Completed',
    cancel: 'Cancelled',
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#0f172a', '#1e1b4b']} style={styles.header}>
        <Text style={styles.headerTitle}>Performance</Text>
        <Text style={styles.headerSub}>Appraisals & AI Career Insights</Text>

        {/* Score Card */}
        <View style={styles.scoreCard}>
          <ScoreRing score={score} color={scoreColor} />
          <View style={styles.scoreDetails}>
            <Text style={styles.scoreName}>{user.name || 'Employee'}</Text>
            {isHighPotential && (
              <View style={styles.highPotentialBadge}>
                <Star color="#f59e0b" size={12} fill="#f59e0b" />
                <Text style={styles.highPotentialText}>High Potential</Text>
              </View>
            )}
            {latestAppraisal ? (
              <View style={styles.stateBadge}>
                <Text style={styles.stateBadgeText}>
                  {stateLabel[latestAppraisal.state] ?? latestAppraisal.state}
                </Text>
              </View>
            ) : (
              <Text style={styles.noAppraisalHint}>No appraisal yet</Text>
            )}
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#6366f1" colors={['#6366f1']} />
        }
      >
        {/* Empty state */}
        {appraisals.length === 0 && (
          <View style={styles.emptyCard}>
            <AlertCircle color="#94a3b8" size={40} />
            <Text style={styles.emptyTitle}>No Appraisals Yet</Text>
            <Text style={styles.emptyBody}>
              Your manager hasn't created an appraisal for you in Odoo yet. Once they do, your AI performance score and career insights will appear here.
            </Text>
            <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh}>
              <RefreshCw color="#6366f1" size={16} />
              <Text style={styles.refreshBtnText}>Check Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* AI Summary — only shown when detail is loaded */}
        {appraisalDetail?.ai_summary ? (
          <View style={styles.section}>
            <View style={styles.aiCard}>
              <View style={styles.aiHeader}>
                <BrainCircuit color="#8b5cf6" size={22} />
                <Text style={styles.aiTitle}>Gemini AI Summary</Text>
                <View style={styles.aiBadge}>
                  <Text style={styles.aiBadgeText}>Powered by Gemini</Text>
                </View>
              </View>
              <Text style={styles.aiText}>{appraisalDetail.ai_summary}</Text>
              {appraisalDetail.ai_computed_on && (
                <Text style={styles.aiDate}>
                  Generated on {new Date(appraisalDetail.ai_computed_on).toLocaleDateString()}
                </Text>
              )}
            </View>
          </View>
        ) : appraisals.length > 0 && (
          <View style={styles.section}>
            <View style={styles.aiCard}>
              <View style={styles.aiHeader}>
                <BrainCircuit color="#8b5cf6" size={22} />
                <Text style={styles.aiTitle}>Gemini AI Summary</Text>
              </View>
              <View style={styles.aiLoading}>
                <ActivityIndicator color="#8b5cf6" />
                <Text style={styles.aiLoadingText}>AI summary not generated yet for this appraisal.</Text>
              </View>
            </View>
          </View>
        )}

        {/* Appraisal History */}
        {appraisals.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Appraisal History</Text>
            {appraisals.map((a) => {
              const aScore = a.ai_performance_score;
              const aColor = aScore >= 90 ? '#10b981' : aScore >= 75 ? '#f59e0b' : aScore > 0 ? '#ef4444' : '#94a3b8';
              return (
                <View key={a.id} style={styles.appraisalCard}>
                  <View style={styles.appraisalTop}>
                    <View style={styles.appraisalLeft}>
                      <Award color="#f59e0b" size={18} />
                      <Text style={styles.appraisalPeriod}>
                        {stateLabel[a.state] ?? a.state} — {a.employee}
                      </Text>
                    </View>
                    <View style={[styles.appraisalScoreBadge, { backgroundColor: aScore > 0 ? '#fef9c3' : '#f1f5f9' }]}>
                      <Text style={[styles.appraisalScore, { color: aColor }]}>
                        {aScore > 0 ? `${aScore}/100` : 'Pending'}
                      </Text>
                    </View>
                  </View>
                  {a.ai_high_potential && (
                    <View style={styles.hpRow}>
                      <Star color="#f59e0b" size={13} fill="#f59e0b" />
                      <Text style={styles.hpText}>Flagged as High Potential</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Quick Stats row */}
        {appraisals.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Overview</Text>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Zap color="#6366f1" size={22} />
                <Text style={styles.statValue}>{appraisals.length}</Text>
                <Text style={styles.statLabel}>Appraisals</Text>
              </View>
              <View style={styles.statCard}>
                <TrendingUp color="#10b981" size={22} />
                <Text style={styles.statValue}>{score > 0 ? score : '—'}</Text>
                <Text style={styles.statLabel}>AI Score</Text>
              </View>
              <View style={styles.statCard}>
                <Star color="#f59e0b" size={22} />
                <Text style={styles.statValue}>{isHighPotential ? 'Yes' : 'No'}</Text>
                <Text style={styles.statLabel}>High Potential</Text>
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
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 100 },
  headerTitle: { color: '#fff', fontSize: 28, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 4 },
  scoreCard: {
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 22, padding: 20,
    marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  scoreRingOuter: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center',
  },
  scoreRingInner: {
    width: 86, height: 86, borderRadius: 43, borderWidth: 5,
    alignItems: 'center', justifyContent: 'center',
  },
  scoreNum: { fontSize: 28, fontWeight: '800' },
  scoreOf: { color: '#94a3b8', fontSize: 11 },
  scoreDetails: { flex: 1, gap: 8 },
  scoreName: { color: '#f1f5f9', fontSize: 18, fontWeight: '800' },
  highPotentialBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: 99,
    paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start',
  },
  highPotentialText: { color: '#f59e0b', fontSize: 11, fontWeight: '700' },
  stateBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 99,
    paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start',
  },
  stateBadgeText: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600' },
  noAppraisalHint: { color: 'rgba(255,255,255,0.35)', fontSize: 12 },
  scroll: { flex: 1, marginTop: -60 },
  section: { paddingHorizontal: 20, marginTop: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  // Empty state
  emptyCard: {
    margin: 20, backgroundColor: '#fff', borderRadius: 20, padding: 32,
    alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginTop: 16, marginBottom: 8 },
  emptyBody: { color: '#64748b', fontSize: 14, lineHeight: 22, textAlign: 'center' },
  refreshBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20,
    backgroundColor: '#ede9fe', borderRadius: 99, paddingHorizontal: 20, paddingVertical: 10,
  },
  refreshBtnText: { color: '#6366f1', fontWeight: '700', fontSize: 14 },
  // AI Card
  aiCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  aiTitle: { color: '#0f172a', fontWeight: '700', fontSize: 15, flex: 1 },
  aiBadge: { backgroundColor: '#ede9fe', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 },
  aiBadgeText: { color: '#7c3aed', fontSize: 10, fontWeight: '700' },
  aiText: { color: '#475569', fontSize: 14, lineHeight: 22 },
  aiDate: { color: '#94a3b8', fontSize: 11, marginTop: 10 },
  aiLoading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  aiLoadingText: { color: '#94a3b8', fontSize: 13, flex: 1 },
  // Appraisal cards
  appraisalCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05,
    shadowRadius: 8, elevation: 2,
  },
  appraisalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  appraisalLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  appraisalPeriod: { color: '#0f172a', fontWeight: '700', fontSize: 14, flex: 1 },
  appraisalScoreBadge: { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  appraisalScore: { fontWeight: '800', fontSize: 13 },
  hpRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  hpText: { color: '#f59e0b', fontSize: 12, fontWeight: '600' },
  // Stats row
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 16,
    alignItems: 'center', gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05,
    shadowRadius: 8, elevation: 2,
  },
  statValue: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  statLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
});
