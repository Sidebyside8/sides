import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native'
import { supabase } from '../lib/supabase'

type Profile = {
  id: string
  username: string
  display_name: string
  bio: string
  age: number
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()
    if (!error) setProfile(data)
    setLoading(false)
  }

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ])
  }

  if (loading) return (
    <View style={styles.loading}>
      <Text style={styles.loadingText}>Loading profile...</Text>
    </View>
  )

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>Profile</Text>
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{profile?.display_name?.[0] || '?'}</Text>
        </View>
        <Text style={styles.displayName}>{profile?.display_name}</Text>
        <Text style={styles.username}>@{profile?.username}</Text>
      </View>
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Age</Text>
          <Text style={styles.infoValue}>{profile?.age}</Text>
        </View>
        {profile?.bio ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Bio</Text>
            <Text style={styles.infoValue}>{profile?.bio}</Text>
          </View>
        ) : null}
      </View>
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  content: { padding: 24, paddingTop: 60 },
  header: { fontSize: 28, fontWeight: 'bold', color: '#ffffff', marginBottom: 32 },
  avatarContainer: { alignItems: 'center', marginBottom: 32 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#6c47ff', alignItems: 'center',
    justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { color: '#ffffff', fontSize: 32, fontWeight: 'bold' },
  displayName: { color: '#ffffff', fontSize: 22, fontWeight: '700', marginBottom: 4 },
  username: { color: '#888', fontSize: 15 },
  infoCard: {
    backgroundColor: '#1a1a1a', borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: '#333', marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#2a2a2a',
  },
  infoLabel: { color: '#888', fontSize: 14 },
  infoValue: { color: '#ffffff', fontSize: 14, fontWeight: '500', flex: 1, textAlign: 'right' },
  signOutButton: {
    backgroundColor: '#1a1a1a', borderRadius: 12,
    padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: '#ff4444',
  },
  signOutText: { color: '#ff4444', fontSize: 16, fontWeight: '600' },
  loading: { flex: 1, backgroundColor: '#0f0f0f', alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#888', fontSize: 16 },
})
