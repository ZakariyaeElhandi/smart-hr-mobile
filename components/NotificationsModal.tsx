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
import { X, CheckCircle, XCircle, Info, Bell } from 'lucide-react-native';
import { router } from 'expo-router';
import { Notification, useAppStore } from '../store/useAppStore';
import { Theme } from '../constants/theme';
import { Card } from './ui/Card';
import { IconCircle } from './ui/IconCircle';

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
  const markSingleNotificationRead = useAppStore((s) => s.markSingleNotificationRead);

  const handleNotificationPress = (notif: Notification) => {
    // 1. Optimistic update: mark read
    markSingleNotificationRead(notif.id);

    // 2. Close modal
    onClose();

    // 3. Contextual Navigation with Expo Router
    const targetId = notif.relatedId;
    if (notif.category === 'leave') {
      router.push(`/(tabs)/leaves?highlightId=${targetId}`);
    } else if (notif.category === 'document') {
      router.push(`/(tabs)/documents?highlightId=${targetId}`);
    } else if (notif.category === 'anomaly') {
      router.push(`/(tabs)?highlightId=${targetId}`);
    }
  };

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
                <X color={Theme.colors.textSecondary} size={20} />
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
              <Card style={styles.empty}>
                <IconCircle variant="purple" size={54}>
                  <Info color={Theme.colors.status.info.text} size={28} />
                </IconCircle>
                <Text style={styles.emptyTitle}>Tout est à jour !</Text>
                <Text style={styles.emptyText}>
                  Vous n'avez aucune notification. L'avancement de vos demandes d'absence et réclamations apparaîtra ici.
                </Text>
              </Card>
            ) : (
              notifications.map((notif) => {
                const isApproved = notif.type === 'approved';
                const isRefused = notif.type === 'refused';
                const iconVariant =
                  notif.category === 'leave'
                    ? 'purple'
                    : notif.category === 'document'
                    ? 'blue'
                    : 'coral';

                return (
                  <TouchableOpacity
                    key={notif.id}
                    activeOpacity={0.7}
                    onPress={() => handleNotificationPress(notif)}
                    style={[styles.cardWrapper, !notif.read && styles.cardUnread]}
                  >
                    <Card style={styles.cardInner}>
                      <View style={styles.cardRow}>
                        <IconCircle variant={iconVariant} size={42}>
                          {isApproved ? (
                            <CheckCircle color={Theme.colors.status.success.text} size={20} />
                          ) : isRefused ? (
                            <XCircle color={Theme.colors.status.danger.text} size={20} />
                          ) : (
                            <Bell color={Theme.colors.status.info.text} size={20} />
                          )}
                        </IconCircle>
                        <View style={styles.cardBody}>
                          <View style={styles.cardTop}>
                            <Text style={styles.cardTitle}>{notif.title}</Text>
                            {!notif.read && <View style={styles.unreadDot} />}
                          </View>
                          <Text style={styles.cardMessage}>{notif.message}</Text>
                          <Text style={styles.cardTime}>{timeAgo(notif.timestamp)}</Text>
                        </View>
                      </View>
                    </Card>
                  </TouchableOpacity>
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
    backgroundColor: 'rgba(26, 26, 26, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.lg,
    height: SCREEN_HEIGHT * 0.7,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 18, fontWeight: '800', color: Theme.colors.textPrimary },
  badge: {
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { color: Theme.colors.textWhite, fontSize: 11, fontWeight: '800' },
  markReadBtn: {
    backgroundColor: Theme.colors.pastelBg.coral,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Theme.radius.md,
  },
  markReadText: { color: Theme.colors.primary, fontSize: 12, fontWeight: '700' },
  closeBtn: { backgroundColor: Theme.colors.background, padding: 8, borderRadius: Theme.radius.full },
  list: { flex: 1 },
  listContent: { paddingBottom: 16 },
  empty: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: Theme.colors.textPrimary },
  emptyText: {
    fontSize: 13,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  cardWrapper: {
    marginBottom: 10,
    borderRadius: Theme.radius.xl,
  },
  cardUnread: {
    borderWidth: 1.5,
    borderColor: Theme.colors.primary,
    borderRadius: Theme.radius.xl,
  },
  cardInner: {
    padding: Theme.spacing.md,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cardBody: { flex: 1 },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardTitle: { fontSize: 14, fontWeight: '800', color: Theme.colors.textPrimary, flex: 1 },
  unreadDot: {
    width: 8,
    height: 8,
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.radius.full,
    marginLeft: 6,
  },
  cardMessage: { fontSize: 13, color: Theme.colors.textSecondary, lineHeight: 18 },
  cardTime: { fontSize: 11, color: Theme.colors.textTertiary, marginTop: 6, fontWeight: '600' },
});
