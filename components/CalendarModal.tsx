import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { ChevronLeft, ChevronRight, X, Clock, AlertTriangle, CheckCircle } from 'lucide-react-native';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

export interface DayMark {
  date: string; // 'YYYY-MM-DD'
  color: string;
  label?: string;
  // Optional detail data for the day detail sheet
  detail?: DayDetail;
}

export interface DayDetail {
  checkIn?: string;
  checkOut?: string;
  workedHours?: number;
  isLate?: boolean;
  lateMinutes?: number;
  anomalyType?: string | null;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  marks: DayMark[];
  legend?: { color: string; label: string }[];
}

function formatTime(isoStr?: string): string {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function formatDate(isoStr?: string): string {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  return `${String(d.getDate()).padStart(2,'0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function formatHours(h?: number): string {
  if (!h) return '0h 0m';
  const hrs  = Math.floor(h);
  const mins = Math.round((h % 1) * 60);
  return `${hrs}h ${mins}m`;
}

export default function CalendarModal({ visible, onClose, title, marks, legend }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<DayMark[] | null>(null);
  const [selectedDateLabel, setSelectedDateLabel] = useState('');

  const markMap = useMemo(() => {
    const m: Record<string, DayMark[]> = {};
    marks.forEach((mark) => {
      if (!m[mark.date]) m[mark.date] = [];
      m[mark.date].push(mark);
    });
    return m;
  }, [marks]);

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth     = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  const cells: (number | null)[] = [
    ...Array(firstDayOfMonth).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const handleDayPress = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const dayMarks = markMap[dateStr];
    if (dayMarks && dayMarks.length > 0) {
      setSelectedDay(dayMarks);
      setSelectedDateLabel(`${DAYS[new Date(year, month, day).getDay()]}, ${day} ${MONTHS[month]} ${year}`);
    }
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            {/* Header */}
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{title}</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <X color="#64748b" size={20} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Month nav */}
              <View style={styles.monthNav}>
                <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
                  <ChevronLeft color="#334155" size={22} />
                </TouchableOpacity>
                <Text style={styles.monthLabel}>{MONTHS[month]} {year}</Text>
                <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
                  <ChevronRight color="#334155" size={22} />
                </TouchableOpacity>
              </View>

              {/* Day headers */}
              <View style={styles.dayRow}>
                {DAYS.map((d) => (
                  <Text key={d} style={styles.dayHeader}>{d}</Text>
                ))}
              </View>

              {/* Calendar grid */}
              {Array.from({ length: cells.length / 7 }, (_, week) => (
                <View key={week} style={styles.weekRow}>
                  {cells.slice(week * 7, week * 7 + 7).map((day, idx) => {
                    if (!day) return <View key={idx} style={styles.cell} />;
                    const dateStr  = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                    const dayMarks = markMap[dateStr] ?? [];
                    const isToday  = dateStr === todayStr;
                    const hasData  = dayMarks.length > 0;
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[
                          styles.cell,
                          isToday && styles.todayCell,
                          hasData && styles.markedCell,
                        ]}
                        onPress={() => handleDayPress(day)}
                        activeOpacity={hasData ? 0.6 : 1}
                      >
                        <Text style={[styles.dayNum, isToday && styles.todayNum]}>{day}</Text>
                        <View style={styles.dotsRow}>
                          {dayMarks.slice(0, 3).map((m, i) => (
                            <View key={i} style={[styles.dot, { backgroundColor: m.color }]} />
                          ))}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}

              {/* Tap hint */}
              <Text style={styles.tapHint}>Tap a marked day to see details</Text>

              {/* Legend */}
              {legend && legend.length > 0 && (
                <View style={styles.legend}>
                  {legend.map((item, i) => (
                    <View key={i} style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                      <Text style={styles.legendLabel}>{item.label}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={{ height: 32 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Day Detail Bottom Sheet */}
      <Modal
        visible={!!selectedDay}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedDay(null)}
      >
        <View style={styles.overlay}>
          <View style={styles.detailSheet}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.detailDateLabel}>{selectedDateLabel}</Text>
                <Text style={styles.detailSub}>Attendance Detail</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedDay(null)} style={styles.closeBtn}>
                <X color="#64748b" size={20} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedDay?.map((mark, i) => {
                const d = mark.detail;
                const hasAnomaly = !!d?.anomalyType;
                const noCheckout = !d?.checkOut;
                const isLate     = !!d?.isLate;

                return (
                  <View key={i} style={styles.detailCard}>
                    {/* Status Banner */}
                    <View style={[styles.statusBanner, { backgroundColor: mark.color + '22' }]}>
                      <View style={[styles.statusDot, { backgroundColor: mark.color }]} />
                      <Text style={[styles.statusLabel, { color: mark.color }]}>
                        {mark.label ?? 'Attendance Record'}
                      </Text>
                    </View>

                    {/* Time Row */}
                    <View style={styles.timeRow}>
                      <View style={styles.timeBox}>
                        <Text style={styles.timeBoxLabel}>CHECK IN</Text>
                        <Text style={styles.timeBoxValue}>{formatTime(d?.checkIn ?? undefined)}</Text>
                        <Text style={styles.timeBoxDate}>{formatDate(d?.checkIn ?? undefined)}</Text>
                      </View>
                      <View style={styles.timeSep}>
                        <View style={styles.timeLine} />
                        <Clock color="#94a3b8" size={18} />
                        <View style={styles.timeLine} />
                      </View>
                      <View style={styles.timeBox}>
                        <Text style={styles.timeBoxLabel}>CHECK OUT</Text>
                        <Text style={[styles.timeBoxValue, noCheckout && { color: '#ef4444' }]}>
                          {noCheckout ? 'Missing' : formatTime(d?.checkOut ?? undefined)}
                        </Text>
                        <Text style={styles.timeBoxDate}>{noCheckout ? '—' : formatDate(d?.checkOut ?? undefined)}</Text>
                      </View>
                    </View>

                    {/* Worked Hours */}
                    <View style={styles.detailRow}>
                      <Text style={styles.detailKey}>⏱ Worked</Text>
                      <Text style={styles.detailVal}>{formatHours(d?.workedHours)}</Text>
                    </View>

                    {/* Late */}
                    {isLate && (
                      <View style={[styles.detailRow, styles.lateRow]}>
                        <View style={styles.detailRowLeft}>
                          <AlertTriangle color="#d97706" size={14} />
                          <Text style={[styles.detailKey, { color: '#d97706' }]}>Late arrival</Text>
                        </View>
                        <Text style={[styles.detailVal, { color: '#d97706' }]}>
                          +{Math.round(d?.lateMinutes ?? 0)} min
                        </Text>
                      </View>
                    )}

                    {/* Anomaly */}
                    {hasAnomaly && (
                      <View style={[styles.detailRow, styles.anomalyRow]}>
                        <View style={styles.detailRowLeft}>
                          <AlertTriangle color="#dc2626" size={14} />
                          <Text style={[styles.detailKey, { color: '#dc2626' }]}>Anomaly</Text>
                        </View>
                        <Text style={[styles.detailVal, { color: '#dc2626' }]}>{d?.anomalyType}</Text>
                      </View>
                    )}

                    {/* No checkout warning */}
                    {noCheckout && (
                      <View style={styles.warningBox}>
                        <AlertTriangle color="#dc2626" size={16} />
                        <Text style={styles.warningText}>
                          No check-out recorded for this day. This may appear as an anomaly in Odoo.
                        </Text>
                      </View>
                    )}

                    {/* All good */}
                    {!hasAnomaly && !noCheckout && !isLate && (
                      <View style={styles.goodBox}>
                        <CheckCircle color="#16a34a" size={16} />
                        <Text style={styles.goodText}>All clear — no issues recorded for this day.</Text>
                      </View>
                    )}
                  </View>
                );
              })}
              <View style={{ height: 32 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    maxHeight: '90%',
  },
  detailSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    maxHeight: '85%',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  closeBtn: { backgroundColor: '#f1f5f9', padding: 8, borderRadius: 99 },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  navBtn: { backgroundColor: '#f1f5f9', padding: 8, borderRadius: 12 },
  monthLabel: { fontSize: 17, fontWeight: '700', color: '#1e293b' },
  dayRow: { flexDirection: 'row', marginBottom: 8 },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  cell: { flex: 1, height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  todayCell: { backgroundColor: '#eff6ff' },
  markedCell: { backgroundColor: '#f8fafc' },
  dayNum: { fontSize: 14, fontWeight: '600', color: '#334155' },
  todayNum: { color: '#2563eb', fontWeight: '800' },
  dotsRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 99 },
  tapHint: { textAlign: 'center', fontSize: 11, color: '#cbd5e1', fontStyle: 'italic', marginTop: 8, marginBottom: 4 },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingTop: 16,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginTop: 12,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 99 },
  legendLabel: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  // Detail sheet
  detailDateLabel: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  detailSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  detailCard: { backgroundColor: '#f8fafc', borderRadius: 18, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#f1f5f9' },
  statusBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, padding: 10, marginBottom: 16 },
  statusDot: { width: 10, height: 10, borderRadius: 99 },
  statusLabel: { fontSize: 13, fontWeight: '700' },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  timeBox: { flex: 1, alignItems: 'center' },
  timeBoxLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8', letterSpacing: 1, marginBottom: 4 },
  timeBoxValue: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  timeBoxDate: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  timeSep: { alignItems: 'center', gap: 4, paddingHorizontal: 8 },
  timeLine: { width: 1, height: 18, backgroundColor: '#e2e8f0' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  detailRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailKey: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  detailVal: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  lateRow: {},
  anomalyRow: {},
  warningBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#fee2e2', borderRadius: 12, padding: 12, marginTop: 12 },
  warningText: { flex: 1, fontSize: 12, color: '#991b1b', lineHeight: 17 },
  goodBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#dcfce7', borderRadius: 12, padding: 12, marginTop: 12 },
  goodText: { flex: 1, fontSize: 12, color: '#166534', lineHeight: 17 },
});
