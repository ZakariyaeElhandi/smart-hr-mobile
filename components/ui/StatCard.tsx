import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Theme } from '../../constants/theme';
import { IconCircle, PastelVariant } from './IconCircle';
import { Card } from './Card';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  variant?: PastelVariant;
  subtitle?: string;
  valueColor?: string;
}

export function StatCard({
  title,
  value,
  icon,
  variant = 'purple',
  subtitle,
  valueColor = Theme.colors.textPrimary,
}: StatCardProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <IconCircle variant={variant} size={40}>
          {icon}
        </IconCircle>
      </View>
      <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: Theme.spacing.md,
  },
  headerRow: {
    marginBottom: Theme.spacing.sm,
  },
  value: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
    marginTop: 2,
  },
  subtitle: {
    fontSize: 10,
    fontWeight: '500',
    color: Theme.colors.textTertiary,
    marginTop: 2,
  },
});
