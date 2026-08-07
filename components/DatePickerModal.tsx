import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { X, ChevronUp, ChevronDown } from 'lucide-react-native';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

interface Props {
  visible: boolean;
  onClose: () => void;
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
}

const ITEM_HEIGHT = 48;

function Drum({ items, selectedIndex, onSelect }: {
  items: string[];
  selectedIndex: number;
  onSelect: (i: number) => void;
}) {
  return (
    <View style={styles.drumCol}>
      <TouchableOpacity
        onPress={() => selectedIndex > 0 && onSelect(selectedIndex - 1)}
        style={styles.drumArrow}
      >
        <ChevronUp color="#64748b" size={20} />
      </TouchableOpacity>
      <View style={styles.drumWindow}>
        <Text style={styles.drumText}>{items[selectedIndex]}</Text>
      </View>
      <TouchableOpacity
        onPress={() => selectedIndex < items.length - 1 && onSelect(selectedIndex + 1)}
        style={styles.drumArrow}
      >
        <ChevronDown color="#64748b" size={20} />
      </TouchableOpacity>
    </View>
  );
}

export default function DatePickerModal({ visible, onClose, label, value, onChange, minimumDate }: Props) {
  const today = new Date();
  const [day, setDay] = useState(value.getDate());
  const [month, setMonth] = useState(value.getMonth());
  const [year, setYear] = useState(value.getFullYear());

  const currentYear = today.getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear + i);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handleConfirm = () => {
    const safeDay = Math.min(day, daysInMonth);
    const selected = new Date(year, month, safeDay);
    onChange(selected);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{label}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X color="#64748b" size={20} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>Select a date</Text>

          <View style={styles.drumRow}>
            {/* Day */}
            <View style={styles.drumSection}>
              <Text style={styles.drumLabel}>Day</Text>
              <Drum
                items={days.map(String)}
                selectedIndex={Math.min(day - 1, daysInMonth - 1)}
                onSelect={(i) => setDay(i + 1)}
              />
            </View>

            <View style={styles.sep} />

            {/* Month */}
            <View style={styles.drumSection}>
              <Text style={styles.drumLabel}>Month</Text>
              <Drum
                items={MONTHS.map((m) => m.slice(0, 3))}
                selectedIndex={month}
                onSelect={setMonth}
              />
            </View>

            <View style={styles.sep} />

            {/* Year */}
            <View style={styles.drumSection}>
              <Text style={styles.drumLabel}>Year</Text>
              <Drum
                items={years.map(String)}
                selectedIndex={years.indexOf(year) >= 0 ? years.indexOf(year) : 0}
                onSelect={(i) => setYear(years[i])}
              />
            </View>
          </View>

          {/* Preview */}
          <View style={styles.preview}>
            <Text style={styles.previewText}>
              {String(Math.min(day, daysInMonth)).padStart(2,'0')} {MONTHS[month]} {year}
            </Text>
          </View>

          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
            <Text style={styles.confirmText}>Confirm Date</Text>
          </TouchableOpacity>

          <View style={{ height: 20 }} />
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
    padding: 24,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  closeBtn: { backgroundColor: '#f1f5f9', padding: 8, borderRadius: 99 },
  subtitle: { fontSize: 13, color: '#94a3b8', marginBottom: 28 },
  drumRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 0,
    marginBottom: 24,
  },
  drumSection: { flex: 1, alignItems: 'center' },
  drumLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  drumCol: { alignItems: 'center', gap: 4 },
  drumArrow: { padding: 8, borderRadius: 12, backgroundColor: '#f8fafc' },
  drumWindow: {
    width: 72,
    height: 52,
    backgroundColor: '#eff6ff',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#bfdbfe',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  drumText: { fontSize: 17, fontWeight: '800', color: '#1d4ed8' },
  sep: { width: 1, height: 120, backgroundColor: '#e2e8f0', marginHorizontal: 8 },
  preview: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  previewText: { fontSize: 16, fontWeight: '700', color: '#334155', letterSpacing: 0.5 },
  confirmBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
