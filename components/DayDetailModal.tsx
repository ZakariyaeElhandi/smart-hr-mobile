import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { X, Clock, AlertTriangle, CheckCircle, Calendar, FileText, ArrowRight } from 'lucide-react-native';

export interface DayDetailData {
  date: string; // 'YYYY-MM-DD'
  status: 'present' | 'late' | 'absent' | 'leave' | 'weekend';
  statusLabel: string;
  checkIn?: string | null;
  checkOut?: string | null;
  workedHours?: number;
  isLate?: boolean;
  lateMinutes?: number;
  anomalyType?: string | null;
  leaveType?: string;
  attendanceId?: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  data: DayDetailData | null;
  onReportAnomaly: (data: DayDetailData) => void;
}

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const DAYS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

function formatLongDate(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  const dayName = DAYS_FR[d.getDay()];
  const dayNum = d.getDate();
  const monthName = MONTHS_FR[d.getMonth()];
  const year = d.getFullYear();
  return `${dayName} ${dayNum} ${monthName} ${year}`;
}

function formatTime(isoStr?: string | null): string {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatHours(h?: number): string {
  if (!h || h <= 0) return '0h 0m';
  const hrs = Math.floor(h);
  const mins = Math.round((h % 1) * 60);
  return `${hrs}h ${mins}m`;
}

export default function DayDetailModal({ visible, onClose, data, onReportAnomaly }: Props) {
  if (!data) return null;

  const isPresent = data.status === 'present';
  const isLate = data.status === 'late';
  const isAbsent = data.status === 'absent';
  const isLeave = data.status === 'leave';
  const isWeekend = data.status === 'weekend';

  const statusColor = isPresent ? '#10b981'
    : isLate ? '#f59e0b'
    : isAbsent ? '#ef4444'
    : isLeave ? '#3b82f6'
    : '#94a3b8';

  const statusBg = isPresent ? '#dcfce7'
    : isLate ? '#fef3c7'
    : isAbsent ? '#fee2e2'
    : isLeave ? '#dbeafe'
    : '#f1f5f9';

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Calendar color="#6366f1" size={20} />
              <Text style={styles.dateTitle}>{formatLongDate(data.date)}</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X color="#64748b" size={20} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Status Badge */}
            <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {data.statusLabel}
              </Text>
            </View>

            {/* Read-Only Notice */}
            <View style={styles.readOnlyBanner}>
              <Clock color="#6366f1" size={16} />
              <Text style={styles.readOnlyText}>
                Données de présence enregistrées sur votre espace RH (Lecture seule)
              </Text>
            </View>

            {/* Timings Info */}
            <View style={styles.infoGrid}>
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Arrivée (Check-in)</Text>
                <Text style={styles.infoValue}>{formatTime(data.checkIn)}</Text>
              </View>
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Départ (Check-out)</Text>
                <Text style={styles.infoValue}>{formatTime(data.checkOut)}</Text>
              </View>
            </View>

            {/* Hours worked & Lateness info */}
            <View style={styles.detailsList}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Durée travaillée :</Text>
                <Text style={styles.detailValue}>{formatHours(data.workedHours)}</Text>
              </View>

              {data.isLate && (
                <View style={[styles.detailRow, { backgroundColor: '#fffbeb', padding: 8, borderRadius: 8 }]}>
                  <Text style={[styles.detailLabel, { color: '#d97706', fontWeight: '700' }]}>
                    ⚠️ Retard détecté :
                  </Text>
                  <Text style={[styles.detailValue, { color: '#b45309', fontWeight: '800' }]}>
                    {data.lateMinutes ? `${Math.round(data.lateMinutes)} min` : 'Oui'}
                  </Text>
                </View>
              )}

              {isLeave && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Type de congé :</Text>
                  <Text style={[styles.detailValue, { color: '#2563eb' }]}>{data.leaveType || 'Congé approuvé'}</Text>
                </View>
              )}
            </View>

            {/* Anomaly Action Button */}
            {(isAbsent || isLate || !data.checkOut || data.anomalyType) && (
              <View style={styles.anomalySection}>
                <View style={styles.anomalyCallout}>
                  <AlertTriangle color="#dc2626" size={18} />
                  <Text style={styles.anomalyCalloutText}>
                    Une anomalie ou une absence non prévue apparaît sur ce jour ?
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.anomalyBtn}
                  onPress={() => {
                    onClose();
                    onReportAnomaly(data);
                  }}
                >
                  <FileText color="#fff" size={18} />
                  <Text style={styles.anomalyBtnText}>Signaler une anomalie</Text>
                  <ArrowRight color="#fff" size={16} />
                </TouchableOpacity>
              </View>
            )}

            {/* Close Button */}
            <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
              <Text style={styles.doneBtnText}>Fermer</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
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
  dateTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  closeBtn: {
    backgroundColor: '#f1f5f9',
    padding: 8,
    borderRadius: 99,
  },
  body: {
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 99,
    marginBottom: 16,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 99,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '800',
  },
  readOnlyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#e0e7ff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  readOnlyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3730a3',
    flex: 1,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  infoBox: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  detailsList: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#475569',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  anomalySection: {
    marginTop: 8,
    marginBottom: 20,
    gap: 12,
  },
  anomalyCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  anomalyCalloutText: {
    fontSize: 12,
    color: '#991b1b',
    fontWeight: '600',
    flex: 1,
  },
  anomalyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#dc2626',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  anomalyBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
  },
  doneBtn: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  doneBtnText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 14,
  },
});
