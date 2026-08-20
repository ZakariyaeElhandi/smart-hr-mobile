export const Theme = {
  colors: {
    background: '#FAFAFA',
    surface: '#FFFFFF',
    primary: '#FF6B4A',         // Accent Corail Principal (Kit UI)
    primaryPressed: '#E85A3A',
    ctaBlack: '#1A1A1A',        // Noir profond pour boutons d'action principaux

    textPrimary: '#1A1A1A',
    textSecondary: '#8E8E93',
    textTertiary: '#C7C7CC',
    textWhite: '#FFFFFF',

    border: '#F0F0F0',
    borderDark: '#E5E5EA',

    // Statuts métier
    status: {
      success: { text: '#34C759', bg: '#E8F9EC', border: '#C7F4D2' }, // Validé, Prêt, Approuvé
      warning: { text: '#FF9500', bg: '#FFF4E5', border: '#FFE2B8' }, // En attente, En cours
      danger: { text: '#FF3B30', bg: '#FFEBEA', border: '#FFC5C2' },  // Refusé, Rejeté, Absent
      info: { text: '#5E5CE6', bg: '#EDECFC', border: '#D2D0FA' },    // Demandes, Notifications, IA
    },

    // Cercles pastel pour icônes
    pastelBg: {
      purple: '#EDECFC',
      blue: '#E5F1FF',
      coral: '#FFEDE8',
      green: '#E8F9EC',
      yellow: '#FFF4E5',
    },
  },

  typography: {
    screenTitle: { fontSize: 24, fontWeight: '800' as const, color: '#1A1A1A', lineHeight: 30 },
    sectionTitle: { fontSize: 18, fontWeight: '800' as const, color: '#1A1A1A', lineHeight: 24 },
    cardTitle: { fontSize: 15, fontWeight: '700' as const, color: '#1A1A1A', lineHeight: 20 },
    statValue: { fontSize: 28, fontWeight: '800' as const, color: '#1A1A1A', lineHeight: 34 },
    body: { fontSize: 14, fontWeight: '500' as const, color: '#1A1A1A', lineHeight: 20 },
    subText: { fontSize: 13, fontWeight: '500' as const, color: '#8E8E93', lineHeight: 18 },
    caption: { fontSize: 11, fontWeight: '600' as const, color: '#8E8E93', lineHeight: 15 },
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },

  radius: {
    sm: 10,
    md: 14,
    lg: 16,
    xl: 20,
    xxl: 24,
    full: 9999,
  },

  shadows: {
    soft: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 10,
      elevation: 2,
    },
    card: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 16,
      elevation: 3,
    },
  },
};
