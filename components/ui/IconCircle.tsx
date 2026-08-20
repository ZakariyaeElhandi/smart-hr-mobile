import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Theme } from '../../constants/theme';

export type PastelVariant = 'purple' | 'blue' | 'coral' | 'green' | 'yellow';

interface IconCircleProps {
  children: React.ReactNode;
  variant?: PastelVariant;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export function IconCircle({
  children,
  variant = 'purple',
  size = 42,
  style,
}: IconCircleProps) {
  const bg = Theme.colors.pastelBg[variant] || Theme.colors.pastelBg.purple;

  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
