import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TrendingUp, BrainCircuit, BookOpen, ChevronRight, Award, Star } from 'lucide-react-native';
import { useAppStore } from '../../store/useAppStore';

const SKILLS = [
  { name: 'React Native', level: 88, color: '#3b82f6' },
  { name: 'TypeScript', level: 82, color: '#8b5cf6' },
  { name: 'Odoo RPC', level: 65, color: '#f59e0b' },
  { name: 'Python', level: 55, color: '#10b981' },
];

const APPRAISALS = [
  { period: 'Q2 2026', score: 92, comment: 'Exceptional delivery, ahead of sprint goals.', reviewer: 'Ahmed K.' },
  { period: 'Q1 2026', score: 85, comment: 'Great progress on backend skills.', reviewer: 'Ahmed K.' },
];

export default function PerformanceScreen() {
  const { user, performanceScore } = useAppStore();

  const scoreColor = performanceScore >= 90 ? '#10b981' : performanceScore >= 75 ? '#f59e0b' : '#ef4444';

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0f172a', '#1e1b4b']} style={styles.header}>
        <Text style={styles.headerTitle}>Performance</Text>
        <Text style={styles.headerSub}>Appraisals & AI Career Insights</Text>

        {/* Score Ring */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreRingOuter}>
            <View style={[styles.scoreRingInner, { borderColor: scoreColor }]}>
              <Text style={[styles.scoreNum, { color: scoreColor }]}>{performanceScore}</Text>
              <Text style={styles.scoreOf}>/100</Text>
            </View>
          </View>
          <View style={styles.scoreDetails}>
            <Text style={styles.scoreName}>{user.name}</Text>
            <Text style={styles.scoreRole}>{user.department}</Text>
            <View style={styles.trendRow}>
              <TrendingUp color="#10b981" size={14} />
              <Text style={styles.trendText}>+7 pts from last quarter</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* AI Summary */}
        <View style={styles.section}>
          <View style={styles.aiCard}>
            <View style={styles.aiHeader}>
              <BrainCircuit color="#8b5cf6" size={22} />
              <Text style={styles.aiTitle}>Gemini AI Summary</Text>
              <View style={styles.aiBadge}><Text style={styles.aiBadgeText}>Powered by Gemini</Text></View>
            </View>
            <Text style={styles.aiText}>
              {user.name} has demonstrated strong technical growth in React Native and TypeScript this quarter. 
              Sprint completion rate improved by 15%. AI recommends focusing on <Text style={styles.aiHighlight}>Odoo Architecture</Text> and <Text style={styles.aiHighlight}>Python backend</Text> to qualify for the Senior Developer track within 6 months.
            </Text>
          </View>
        </View>

        {/* Skills */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Skill Breakdown</Text>
          {SKILLS.map(skill => (
            <View key={skill.name} style={styles.skillRow}>
              <View style={styles.skillInfo}>
                <Text style={styles.skillName}>{skill.name}</Text>
                <Text style={[styles.skillPct, { color: skill.color }]}>{skill.level}%</Text>
              </View>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${skill.level}%` as any, backgroundColor: skill.color }]} />
              </View>
            </View>
          ))}
        </View>

        {/* Recommended Courses */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Recommendations</Text>
          <TouchableOpacity style={styles.courseCard}>
            <View style={[styles.courseIcon, { backgroundColor: '#ede9fe' }]}>
              <BookOpen color="#7c3aed" size={20} />
            </View>
            <View style={styles.courseBody}>
              <Text style={styles.courseName}>Advanced Odoo Architecture</Text>
              <Text style={styles.courseSub}>Recommended • 8h course • Senior track</Text>
            </View>
            <ChevronRight color="#94a3b8" size={18} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.courseCard}>
            <View style={[styles.courseIcon, { backgroundColor: '#fef9c3' }]}>
              <Star color="#ca8a04" size={20} />
            </View>
            <View style={styles.courseBody}>
              <Text style={styles.courseName}>Python REST API Mastery</Text>
              <Text style={styles.courseSub}>Recommended • 12h course • Backend skills</Text>
            </View>
            <ChevronRight color="#94a3b8" size={18} />
          </TouchableOpacity>
        </View>

        {/* Appraisal History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appraisal History</Text>
          {APPRAISALS.map(a => (
            <View key={a.period} style={styles.appraisalCard}>
              <View style={styles.appraisalTop}>
                <View style={styles.appraisalLeft}>
                  <Award color="#f59e0b" size={18} />
                  <Text style={styles.appraisalPeriod}>{a.period} Review</Text>
                </View>
                <View style={styles.appraisalScoreBadge}>
                  <Text style={styles.appraisalScore}>{a.score}/100</Text>
                </View>
              </View>
              <Text style={styles.appraisalComment}>"{a.comment}"</Text>
              <Text style={styles.appraisalReviewer}>— {a.reviewer}</Text>
            </View>
          ))}
        </View>
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
  scoreCard: { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 22, padding: 20, marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  scoreRingOuter: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  scoreRingInner: { width: 86, height: 86, borderRadius: 43, borderWidth: 5, alignItems: 'center', justifyContent: 'center' },
  scoreNum: { fontSize: 28, fontWeight: '800' },
  scoreOf: { color: '#94a3b8', fontSize: 11 },
  scoreDetails: { flex: 1 },
  scoreName: { color: '#f1f5f9', fontSize: 18, fontWeight: '800' },
  scoreRole: { color: '#64748b', fontSize: 13, marginTop: 2 },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  trendText: { color: '#10b981', fontSize: 13, fontWeight: '600' },
  scroll: { flex: 1, marginTop: -60 },
  section: { paddingHorizontal: 20, marginTop: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  aiCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  aiTitle: { color: '#0f172a', fontWeight: '700', fontSize: 15, flex: 1 },
  aiBadge: { backgroundColor: '#ede9fe', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 },
  aiBadgeText: { color: '#7c3aed', fontSize: 10, fontWeight: '700' },
  aiText: { color: '#475569', fontSize: 14, lineHeight: 22 },
  aiHighlight: { color: '#7c3aed', fontWeight: '700' },
  skillRow: { marginBottom: 16 },
  skillInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  skillName: { color: '#374151', fontWeight: '600', fontSize: 14 },
  skillPct: { fontWeight: '700', fontSize: 14 },
  barTrack: { height: 8, backgroundColor: '#f1f5f9', borderRadius: 99, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 99 },
  courseCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  courseIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  courseBody: { flex: 1 },
  courseName: { color: '#0f172a', fontWeight: '700', fontSize: 14 },
  courseSub: { color: '#94a3b8', fontSize: 12, marginTop: 3 },
  appraisalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  appraisalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  appraisalLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  appraisalPeriod: { color: '#0f172a', fontWeight: '700', fontSize: 15 },
  appraisalScoreBadge: { backgroundColor: '#fef9c3', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  appraisalScore: { color: '#92400e', fontWeight: '800', fontSize: 13 },
  appraisalComment: { color: '#475569', fontSize: 14, fontStyle: 'italic', lineHeight: 20 },
  appraisalReviewer: { color: '#94a3b8', fontSize: 12, marginTop: 6 },
});
