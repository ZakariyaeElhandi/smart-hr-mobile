import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
} from 'react-native';
import { X, CheckCircle, XCircle, Info } from 'lucide-react-native';
import { Notification } from '../store/useAppStore';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface Props {
  visible: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkRead: () => void;
}

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "À l'instant";
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
  return `Il y a ${Math.floor(diff / 86400)} j`;
}

export default function NotificationsModal({ visible, onClose, notifications, onMarkRead }: Props) {
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.title}>Notifications</Text>
              {unread > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unread}</Text>
                </View>
              )}
            </View>
            <View style={styles.headerRight}>
              {unread > 0 && (
                <TouchableOpacity onPress={onMarkRead} style={styles.markReadBtn}>
                  <Text style={styles.markReadText}>Tout marquer lu</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <X color="#64748b" size={20} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {notifications.length === 0 ? (
              <View style={styles.empty}>
                <Info color="#94a3b8" size={40} />
                <Text style={styles.emptyTitle}>Tout est à jour !</Text>
                <Text style={styles.emptyText}>
                  Vous n'avez aucune notification. L'avancement de vos demandes d'absence et réclamations apparaîtra ici.
                </Text>
              </View>
            ) : (
              notifications.map((notif) => {
                const isApproved = notif.type === 'approved';
                const isRefused = notif.type === 'refused';
                return (
                  <View key={notif.id} style={[styles.card, !notif.read && styles.cardUnread]}>
                    <View
                      style={[
                        styles.iconBox,
                        isApproved ? styles.iconApproved : isRefused ? styles.iconRefused : styles.iconInfo,
                      ]}
                    >
                      {isApproved ? (
                        <CheckCircle color="#16a34a" size={20} />
                      ) : isRefused ? (
                        <XCircle color="#dc2626" size={20} />
                      ) : (
                        <Info color="#2563eb" size={20} />
                      )}
                    </View>
                    <View style={styles.cardBody}>
                      <View style={styles.cardTop}>
                        <Text style={styles.cardTitle}>{notif.title}</Text>
                        {!notif.read && <View style={styles.unreadDot} />}
                      </View>
                      <Text style={styles.cardMessage}>{notif.message}</Text>
                      <Text style={styles.cardTime}>{timeAgo(notif.timestamp)}</Text>
                    </View>
                  </View>
                );
              })
            )}
            <View style={{ height: 32 }} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    height: SCREEN_HEIGHT * 0.65,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  badge: {
    backgroundColor: '#ef4444',
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { color: '#ffffff', fontSize: 11, fontWeight: '800' },
  markReadBtn: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  markReadText: { color: '#4338ca', fontSize: 12, fontWeight: '700' },
  closeBtn: { backgroundColor: '#f1f5f9', padding: 8, borderRadius: 99 },
  list: { flex: 1 },
  listContent: { paddingBottom: 16 },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  emptyText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    gap: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardUnread: { backgroundColor: '#e0e7ff', borderColor: '#c7d2fe' },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconApproved: { backgroundColor: '#dcfce7' },
  iconRefused: { backgroundColor: '#fee2e2' },
  iconInfo: { backgroundColor: '#e0e7ff' },
  cardBody: { flex: 1 },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a', flex: 1 },
  unreadDot: {
    width: 8,
    height: 8,
    backgroundColor: '#4f46e5',
    borderRadius: 99,
    marginLeft: 6,
  },
  cardMessage: { fontSize: 13, color: '#334155', lineHeight: 18 },
  cardTime: { fontSize: 11, color: '#64748b', marginTop: 6, fontWeight: '600' },
});
