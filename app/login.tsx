import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Eye, EyeOff, Lock, Mail, ShieldCheck, KeyRound } from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';
import { Theme } from '../constants/theme';
import { IconCircle } from '../components/ui/IconCircle';
import { PrimaryButton } from '../components/ui/PrimaryButton';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Change password modal state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const { login, changePassword, mustChangePassword, isAuthLoading, authError } = useAppStore();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Champs requis', 'Veuillez saisir votre adresse e-mail et mot de passe.');
      return;
    }
    try {
      await login(email.trim(), password);
      const state = useAppStore.getState();
      if (state.isLoggedIn && !state.mustChangePassword) {
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      // Handled in store / error display
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Mot de passe trop court', 'Le nouveau mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Erreur', 'Les deux mots de passe ne correspondent pas.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePassword(newPassword, password);
      Alert.alert('✅ Mot de passe mis à jour', 'Votre nouveau mot de passe a été enregistré avec succès.');
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Erreur', err.message ?? 'Impossible de modifier le mot de passe.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const formattedError =
    authError === 'invalid_credentials' || authError?.includes('Identifiants')
      ? 'Adresse e-mail ou mot de passe incorrect. Veuillez vérifier vos identifiants.'
      : authError
      ? 'Impossible de se connecter au serveur RH. Veuillez vérifier votre connexion réseau.'
      : null;

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Logo & Header */}
            <View style={styles.logoSection}>
              <IconCircle variant="coral" size={72} style={styles.logoCircle}>
                <ShieldCheck color={Theme.colors.primary} size={36} />
              </IconCircle>
              <Text style={styles.appName}>Smart HR</Text>
              <Text style={styles.tagline}>Portail Collaborateur & Ressources Humaines</Text>
            </View>

            {/* Login Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Connexion</Text>
              <Text style={styles.cardSubtitle}>Identifiez-vous pour accéder à votre espace RH</Text>

              {/* Email */}
              <View style={styles.inputRow}>
                <Mail color={Theme.colors.textSecondary} size={18} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Adresse e-mail professionnelle"
                  placeholderTextColor={Theme.colors.textTertiary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Password */}
              <View style={styles.inputRow}>
                <Lock color={Theme.colors.textSecondary} size={18} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.inputFlex]}
                  placeholder="Mot de passe"
                  placeholderTextColor={Theme.colors.textTertiary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
                  {showPassword ? (
                    <EyeOff color={Theme.colors.textSecondary} size={18} />
                  ) : (
                    <Eye color={Theme.colors.textSecondary} size={18} />
                  )}
                </TouchableOpacity>
              </View>

              {/* Error Display */}
              {formattedError ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>⚠️ {formattedError}</Text>
                </View>
              ) : null}

              {/* Login Button */}
              <PrimaryButton
                title="Se connecter"
                onPress={handleLogin}
                loading={isAuthLoading}
                variant="black"
                style={{ marginTop: 8 }}
              />

              <Text style={styles.hint}>
                Utilisez vos identifiants professionnels fournis par le service RH.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Mandatory Change Password Modal */}
        <Modal visible={mustChangePassword} animationType="slide" transparent>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <IconCircle variant="coral" size={56} style={{ marginBottom: 12 }}>
                    <KeyRound color={Theme.colors.primary} size={24} />
                  </IconCircle>
                  <Text style={styles.modalTitle}>Changement de mot de passe obligatoire</Text>
                  <Text style={styles.modalSub}>
                    Bienvenue ! Il s'agit de votre première connexion. Veuillez définir votre mot de passe personnel sécurisé.
                  </Text>
                </View>

                <Text style={styles.fieldLabel}>Nouveau mot de passe *</Text>
                <View style={styles.modalInputRow}>
                  <Lock color={Theme.colors.textSecondary} size={18} style={styles.inputIcon} />
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Au moins 6 caractères"
                    placeholderTextColor={Theme.colors.textTertiary}
                    secureTextEntry
                    value={newPassword}
                    onChangeText={setNewPassword}
                  />
                </View>

                <Text style={styles.fieldLabel}>Confirmer le mot de passe *</Text>
                <View style={styles.modalInputRow}>
                  <Lock color={Theme.colors.textSecondary} size={18} style={styles.inputIcon} />
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Répéter le mot de passe"
                    placeholderTextColor={Theme.colors.textTertiary}
                    secureTextEntry
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                </View>

                <PrimaryButton
                  title="Enregistrer le mot de passe"
                  onPress={handleChangePassword}
                  loading={isChangingPassword}
                  variant="black"
                  style={{ marginTop: 20 }}
                />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Theme.spacing.xl,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: Theme.spacing.xxl,
  },
  logoCircle: {
    marginBottom: Theme.spacing.md,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 13,
    color: Theme.colors.textSecondary,
    marginTop: 4,
    fontWeight: '600',
    textAlign: 'center',
  },
  card: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.xxl,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.xl,
    ...Theme.shadows.card,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.xl,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    paddingHorizontal: 14,
    marginBottom: 14,
    height: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: Theme.colors.textPrimary,
    fontSize: 15,
  },
  inputFlex: {
    flex: 1,
  },
  eyeBtn: {
    padding: 4,
  },
  errorBox: {
    backgroundColor: Theme.colors.status.danger.bg,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Theme.colors.status.danger.border,
  },
  errorText: {
    color: Theme.colors.status.danger.text,
    fontSize: 13,
    lineHeight: 18,
  },
  hint: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: Theme.spacing.lg,
    lineHeight: 16,
  },

  // Modal Change Password
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 26, 0.5)',
    justifyContent: 'center',
    padding: Theme.spacing.xl,
  },
  modalCard: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.xxl,
    padding: Theme.spacing.xl,
    ...Theme.shadows.card,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
    textAlign: 'center',
  },
  modalSub: {
    fontSize: 13,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
    marginBottom: 6,
    marginTop: 10,
  },
  modalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    paddingHorizontal: 14,
    height: 48,
  },
  modalInput: {
    flex: 1,
    color: Theme.colors.textPrimary,
    fontSize: 14,
  },
});
