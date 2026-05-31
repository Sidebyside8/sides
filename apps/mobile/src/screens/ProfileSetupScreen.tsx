import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { supabase } from '../lib/supabase'

export default function ProfileSetupScreen({ onComplete }: { onComplete: () => void }) {
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [age, setAge] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!username || !displayName || !age) {
      Alert.alert('Error', 'Please fill in username, name and age')
      return
    }
    if (parseInt(age) < 18) {
      Alert.alert('Error', 'You must be 18 or older')
      return
    }
    setLoading(true)
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (!user) { Alert.alert('Error', 'Not logged in'); setLoading(false); return }
      const { data, error } = await supabase
        .from('users')
        .upsert({ id: user.id, username, display_name: displayName, bio, age: parseInt(age) })
        .select()
      if (error) Alert.alert('Error saving', error.message)
      else onComplete()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    }
    setLoading(false)
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <LinearGradient colors={['#B8D4E8', '#E8C4A0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Set Up Your Profile</Text>
          <Text style={styles.subtitle}>Tell the community about yourself</Text>

          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. john_doe"
            placeholderTextColor="#888"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />

          <Text style={styles.label}>Display Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. John"
            placeholderTextColor="#888"
            value={displayName}
            onChangeText={setDisplayName}
          />

          <Text style={styles.label}>Age</Text>
          <TextInput
            style={styles.input}
            placeholder="Must be 18+"
            placeholderTextColor="#888"
            value={age}
            onChangeText={setAge}
            keyboardType="number-pad"
          />

          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            placeholder="Tell people about yourself..."
            placeholderTextColor="#888"
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={4}
          />

          <TouchableOpacity style={styles.button} onPress={handleSave} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Saving...' : 'Continue'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  content: { padding: 24, paddingTop: 80, paddingBottom: 40 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#1a2a3a', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#556677', marginBottom: 32 },
  label: { fontSize: 14, color: '#445566', marginBottom: 8, fontWeight: '600' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 12,
    padding: 16, color: '#1a2a3a', fontSize: 16, marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)',
  },
  bioInput: { height: 100, textAlignVertical: 'top' },
  button: {
    backgroundColor: '#2196F3', borderRadius: 12,
    padding: 16, alignItems: 'center', marginTop: 8,
  },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
})
