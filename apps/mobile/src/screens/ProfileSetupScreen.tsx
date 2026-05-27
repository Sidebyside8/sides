import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native'
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
      console.log('getUser result:', user?.id, userError?.message)
      if (!user) {
        Alert.alert('Error', 'Not logged in: ' + (userError?.message || 'no user'))
        setLoading(false)
        return
      }
      const { data, error } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          username,
          display_name: displayName,
          bio,
          age: parseInt(age),
        })
        .select()
      console.log('upsert result:', data, error?.message)
      if (error) {
        Alert.alert('Error saving', error.message)
      } else {
        onComplete()
      }
    } catch (e: any) {
      console.log('save error:', e.message)
      Alert.alert('Error', e.message)
    }
    setLoading(false)
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Set Up Your Profile</Text>
      <Text style={styles.subtitle}>Tell the community about yourself</Text>

      <Text style={styles.label}>Username</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. john_doe"
        placeholderTextColor="#666"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />

      <Text style={styles.label}>Display Name</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. John"
        placeholderTextColor="#666"
        value={displayName}
        onChangeText={setDisplayName}
      />

      <Text style={styles.label}>Age</Text>
      <TextInput
        style={styles.input}
        placeholder="Must be 18+"
        placeholderTextColor="#666"
        value={age}
        onChangeText={setAge}
        keyboardType="number-pad"
      />

      <Text style={styles.label}>Bio</Text>
      <TextInput
        style={[styles.input, styles.bioInput]}
        placeholder="Tell people about yourself..."
        placeholderTextColor="#666"
        value={bio}
        onChangeText={setBio}
        multiline
        numberOfLines={4}
      />

      <TouchableOpacity style={styles.button} onPress={handleSave} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Saving...' : 'Continue'}</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  content: {
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888888',
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    color: '#aaaaaa',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#6c47ff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
})
