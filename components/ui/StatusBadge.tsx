import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react-native';
import { Theme } from '../../constants/theme';

export type StatusType =
  | 'Approved' | 'validate' | 'ready' | 'delivered' | 'resolved' | 'Approuvé' | 'Traité / Validé'
  | 'Pending' | 'confirm' | 'pending' | 'processing' | 'En attente' | 'En cours'
  | 'Denied' | 'refuse' | 'rejected' | 'Refusé' | 'Rejeté';

interface StatusBadgeProps {
  status: StatusType | string;
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const statusStr = status?.toString().toLowerCase() || '';

  const isSuccess =
    statusStr.includes('approuv') ||
    statusStr.includes('validate') ||
    statusStr.includes('approved') ||
    statusStr.includes('ready') ||
    statusStr.includes('delivered') ||
    statusStr.includes('resolved') ||
    statusStr.includes('traité');

  const isDanger =
    statusStr.includes('refus') ||
    statusStr.includes('denied') ||
    statusStr.includes('rejected') ||
    statusStr.includes('rejet');

  const styleConfig = isSuccess
    ? Theme.colors.status.success
    : isDanger
    ? Theme.colors.status.danger
    : Theme.colors.status.warning;

  const displayLabel =
    label ??
    (isSuccess
      ? 'Approuvé'
      : isDanger
      ? 'Refusé'
      : 'En attente');

  return (
    <View style={[styles.badge, { backgroundColor: styleConfig.bg, borderColor: styleConfig.border }]}>
      {isSuccess ? (
        <CheckCircle color={styleConfig.text} size={13} />
      ) : isDanger ? (
        <XCircle color={styleConfig.text} size={13} />
      ) : (
        <Clock color={styleConfig.text} size={13} />
      )}
      <Text style={[styles.badgeText, { color: styleConfig.text }]}>{displayLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: Theme.radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
