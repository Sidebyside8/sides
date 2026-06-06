import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Modal, Alert } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { supabase } from '../lib/supabase'
import TermsScreen from './TermsScreen'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showTerms, setShowTerms] = useState(false)
  const [showAgeCheck, setShowAgeCheck] = useState(false)
  const [dob, setDob] = useState('')
  const [confirmedAge, setConfirmedAge] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) { setError('Please enter email and password'); return }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  const handleSignUpPress = () => {
    if (!email || !password) { setError('Please enter email and password first'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setError('')
    setDob('')
    setConfirmedAge(false)
    setShowAgeCheck(true)
  }

  const handleAgeConfirm = () => {
    Keyboard.dismiss()
    if (!dob) { Alert.alert('Required', 'Please enter your date of birth'); return }
    if (!confirmedAge) { Alert.alert('Required', 'Please confirm you are 18 or older'); return }
    const parts = dob.split('/')
    if (parts.length !== 3) { Alert.alert('Invalid', 'Please use MM/DD/YYYY format'); return }
    const month = parseInt(parts[0]) - 1
    const day = parseInt(parts[1])
    const year = parseInt(parts[2])
    const birthDate = new Date(year, month, day)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const m = today.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--
    if (isNaN(age) || age < 0 || age > 120) { Alert.alert('Invalid', 'Please enter a valid date of birth'); return }
    if (age < 18) {
      Alert.alert('Age Requirement', 'You must be 18 or older to use Syde.')
      setShowAgeCheck(false)
      return
    }
    setShowAgeCheck(false)
    setShowTerms(true)
  }

  const handleTermsAccept = async () => {
    setShowTerms(false)
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) setError(error.message)
    else Alert.alert('Account Created!', 'Welcome to Syde!')
    setLoading(false)
  }

  const handleTermsDecline = () => {
    setShowTerms(false)
    Alert.alert('Terms Declined', 'You must accept the terms to create an account.')
  }

  return (
    <>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <LinearGradient colors={['#B8D4E8', '#E8C4A0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.inner}>
              <Image source={require('../../assets/logo2.png')} style={styles.logo} resizeMode="contain" />
              <Text style={styles.tagline}>Find your people</Text>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#888"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#888"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
              <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
                <Text style={styles.buttonText}>{loading ? 'Loading...' : 'Log In'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={handleSignUpPress} disabled={loading}>
                <Text style={styles.secondaryButtonText}>Create Account</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </LinearGradient>
      </KeyboardAvoidingView>

      <Modal visible={showAgeCheck} animationType="slide">
        <LinearGradient colors={['#B8D4E8', '#E8C4A0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.modalContainer}>
                <Image source={require('../../assets/logo2.png')} style={styles.modalLogo} resizeMode="contain" />
                <Text style={styles.modalTitle}>Age Verification</Text>
                <Text style={styles.modalSubtitle}>You must be 18 or older to use Syde</Text>

                <Text style={styles.dobLabel}>Date of Birth (MM/DD/YYYY)</Text>
                <TextInput
                  style={styles.dobInput}
                  placeholder="MM/DD/YYYY"
                  placeholderTextColor="#888"
                  value={dob}
                  onChangeText={setDob}
                  keyboardType="numbers-and-punctuation"
                  maxLength={10}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />

                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setConfirmedAge(!confirmedAge)}
                >
                  <View style={[styles.checkbox, confirmedAge && styles.checkboxChecked]}>
                    {confirmedAge && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.checkboxLabel}>I confirm that I am 18 years of age or older</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, (!dob || !confirmedAge) && styles.buttonDisabled]}
                  onPress={handleAgeConfirm}
                >
                  <Text style={styles.buttonText}>Continue</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowAgeCheck(false)}>
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </LinearGradient>
      </Modal>

      <Modal visible={showTerms} animationType="slide">
        <TermsScreen onAccept={handleTermsAccept} onDecline={handleTermsDecline} />
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  inner: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  logo: { width: 160, height: 160, marginBottom: 12 },
  tagline: { fontSize: 16, color: '#1a3a5a', marginBottom: 40, fontWeight: '500' },
  error: { color: '#cc2200', marginBottom: 12, fontSize: 14, textAlign: 'center' },
  input: {
    width: '100%', backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 12,
    padding: 16, color: '#ffffff', fontSize: 16, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)',
  },
  button: { width: '100%', backgroundColor: '#2196F3', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { backgroundColor: '#aabbcc' },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  secondaryButton: { width: '100%', padding: 16, alignItems: 'center', marginTop: 8 },
  secondaryButtonText: { color: '#F15A22', fontSize: 16, fontWeight: '600' },
  modalContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalLogo: { width: 100, height: 100, marginBottom: 24 },
  modalTitle: { fontSize: 26, fontWeight: 'bold', color: '#ffffff', marginBottom: 8 },
  modalSubtitle: { fontSize: 15, color: '#556677', marginBottom: 32, textAlign: 'center' },
  dobLabel: { fontSize: 14, color: '#445566', fontWeight: '600', marginBottom: 8, alignSelf: 'flex-start', width: '100%' },
  dobInput: {
    width: '100%', backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 12,
    padding: 16, color: '#ffffff', fontSize: 18, marginBottom: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', textAlign: 'center', letterSpacing: 2,
  },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 24 },
  checkbox: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 2,
    borderColor: '#2196F3', marginRight: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  checkboxChecked: { backgroundColor: '#2196F3' },
  checkmark: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },
  checkboxLabel: { flex: 1, fontSize: 14, color: '#ffffff', lineHeight: 20 },
})
