import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const { width } = Dimensions.get('window');

export interface DayMark {
  date: string; // 'YYYY-MM-DD'
  color: string; // dot color
  label?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  marks: DayMark[];
  legend?: { color: string; label: string }[];
}

export default function CalendarModal({ visible, onClose, title, marks, legend }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const markMap = useMemo(() => {
    const m: Record<string, DayMark[]> = {};
    marks.forEach((mark) => {
      if (!m[mark.date]) m[mark.date] = [];
      m[mark.date].push(mark);
    });
    return m;
  }, [marks]);

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const cells: (number | null)[] = [
    ...Array(firstDayOfMonth).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  return (
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
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const dayMarks = markMap[dateStr] ?? [];
                  const isToday = dateStr === todayStr;
                  return (
                    <View key={idx} style={[styles.cell, isToday && styles.todayCell]}>
                      <Text style={[styles.dayNum, isToday && styles.todayNum]}>{day}</Text>
                      <View style={styles.dotsRow}>
                        {dayMarks.slice(0, 3).map((m, i) => (
                          <View key={i} style={[styles.dot, { backgroundColor: m.color }]} />
                        ))}
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}

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
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  closeBtn: {
    backgroundColor: '#f1f5f9',
    padding: 8,
    borderRadius: 99,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  navBtn: {
    backgroundColor: '#f1f5f9',
    padding: 8,
    borderRadius: 12,
  },
  monthLabel: { fontSize: 17, fontWeight: '700', color: '#1e293b' },
  dayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
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
  cell: {
    flex: 1,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  todayCell: { backgroundColor: '#eff6ff' },
  dayNum: { fontSize: 14, fontWeight: '600', color: '#334155' },
  todayNum: { color: '#2563eb', fontWeight: '800' },
  dotsRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 99 },
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
});
