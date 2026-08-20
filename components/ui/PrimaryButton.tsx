import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { Theme } from '../../constants/theme';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'black' | 'coral' | 'outline' | 'secondary';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function PrimaryButton({
  title,
  onPress,
  variant = 'black',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
}: PrimaryButtonProps) {
  const isCoral = variant === 'coral';
  const isOutline = variant === 'outline';
  const isSecondary = variant === 'secondary';

  const bgColor = disabled
    ? Theme.colors.borderDark
    : isCoral
    ? Theme.colors.primary
    : isOutline
    ? 'transparent'
    : isSecondary
    ? Theme.colors.pastelBg.purple
    : Theme.colors.ctaBlack;

  const textColor = isOutline
    ? Theme.colors.textPrimary
    : isSecondary
    ? Theme.colors.status.info.text
    : Theme.colors.textWhite;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        { backgroundColor: bgColor },
        isOutline && styles.outlineBorder,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, { color: textColor }, textStyle]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: Theme.radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Theme.spacing.lg,
    gap: 8,
  },
  outlineBorder: {
    borderWidth: 1.5,
    borderColor: Theme.colors.borderDark,
  },
  text: {
    fontSize: 15,
    fontWeight: '800',
  },
});
