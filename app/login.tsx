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
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Eye, EyeOff, Lock, Mail, ShieldCheck, KeyRound } from 'lucide-react-native';
import { useAppStore } from '../store/useAppStore';

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
      <LinearGradient colors={['#0f172a', '#1e1b4b', '#0f172a']} style={styles.gradient}>
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
              <View style={styles.logoCircle}>
                <ShieldCheck color="#818cf8" size={38} />
              </View>
              <Text style={styles.appName}>Smart HR</Text>
              <Text style={styles.tagline}>Portail Collaborateur & Ressources Humaines</Text>
            </View>

            {/* Login Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Connexion</Text>
              <Text style={styles.cardSubtitle}>Identifiez-vous pour accéder à votre espace RH</Text>

              {/* Email */}
              <View style={styles.inputRow}>
                <Mail color="#94a3b8" size={18} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Adresse e-mail professionnelle"
                  placeholderTextColor="#64748b"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Password */}
              <View style={styles.inputRow}>
                <Lock color="#94a3b8" size={18} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.inputFlex]}
                  placeholder="Mot de passe"
                  placeholderTextColor="#64748b"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
                  {showPassword ? (
                    <EyeOff color="#94a3b8" size={18} />
                  ) : (
                    <Eye color="#94a3b8" size={18} />
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
              <TouchableOpacity
                style={[styles.loginBtn, isAuthLoading && styles.loginBtnDisabled]}
                onPress={handleLogin}
                disabled={isAuthLoading}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#6366f1', '#4f46e5']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.loginGradient}
                >
                  {isAuthLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.loginBtnText}>Se connecter</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

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
                  <View style={styles.modalIconCircle}>
                    <KeyRound color="#6366f1" size={24} />
                  </View>
                  <Text style={styles.modalTitle}>Changement de mot de passe obligatoire</Text>
                  <Text style={styles.modalSub}>
                    Bienvenue ! Il s'agit de votre première connexion. Veuillez définir votre mot de passe personnel sécurisé.
                  </Text>
                </View>

                <Text style={styles.fieldLabel}>Nouveau mot de passe *</Text>
                <View style={styles.modalInputRow}>
                  <Lock color="#64748b" size={18} style={styles.inputIcon} />
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Au moins 6 caractères"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry
                    value={newPassword}
                    onChangeText={setNewPassword}
                  />
                </View>

                <Text style={styles.fieldLabel}>Confirmer le mot de passe *</Text>
                <View style={styles.modalInputRow}>
                  <Lock color="#64748b" size={18} style={styles.inputIcon} />
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Répéter le mot de passe"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                </View>

                <TouchableOpacity
                  style={styles.modalSubmitBtn}
                  onPress={handleChangePassword}
                  disabled={isChangingPassword}
                >
                  <LinearGradient colors={['#6366f1', '#4f46e5']} style={styles.modalSubmitGrad}>
                    {isChangingPassword ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.modalSubmitText}>Enregistrer le mot de passe</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </LinearGradient>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoSection: { alignItems: 'center', marginBottom: 36 },
  logoCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(129, 140, 248, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  appName: { fontSize: 32, fontWeight: '800', color: '#ffffff', letterSpacing: 0.5 },
  tagline: { fontSize: 13, color: '#94a3b8', marginTop: 6, fontWeight: '600', textAlign: 'center' },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 28,
  },
  cardTitle: { fontSize: 22, fontWeight: '800', color: '#ffffff', marginBottom: 6 },
  cardSubtitle: { fontSize: 13, color: '#94a3b8', marginBottom: 24 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 14,
    marginBottom: 14,
    height: 52,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: '#ffffff', fontSize: 15 },
  inputFlex: { flex: 1 },
  eyeBtn: { padding: 4 },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorText: { color: '#fca5a5', fontSize: 13, lineHeight: 18 },
  loginBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 6 },
  loginBtnDisabled: { opacity: 0.6 },
  loginGradient: { height: 52, alignItems: 'center', justifyContent: 'center' },
  loginBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 16 },
  hint: { color: '#64748b', fontSize: 12, textAlign: 'center', marginTop: 18, lineHeight: 16 },

  // Modal Change Password
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.75)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#ffffff', borderRadius: 24, padding: 24 },
  modalHeader: { alignItems: 'center', marginBottom: 20 },
  modalIconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#e0e7ff', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', textAlign: 'center' },
  modalSub: { fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 6, lineHeight: 18 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6, marginTop: 10 },
  modalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 14,
    height: 48,
  },
  modalInput: { flex: 1, color: '#0f172a', fontSize: 14 },
  modalSubmitBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 22 },
  modalSubmitGrad: { height: 50, alignItems: 'center', justifyContent: 'center' },
  modalSubmitText: { color: '#ffffff', fontWeight: '800', fontSize: 15 },
});
