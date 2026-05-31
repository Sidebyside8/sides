import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Image } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '../lib/supabase'

type Profile = {
  id: string
  username: string
  display_name: string
  bio: string
  age: number
  avatar_url?: string
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [photoUri, setPhotoUri] = useState<string | null>(null)

  useEffect(() => { loadProfile() }, [])

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('users').select('*').eq('id', user.id).single()
    if (data) setProfile(data)
    setLoading(false)
  }

  const handlePickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    })
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri)
      Alert.alert('Photo selected!', 'Upload coming soon')
    }
  }

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ])
  }

  if (loading) return (
    <View style={styles.loading}><Text style={styles.loadingText}>Loading...</Text></View>
  )

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>Profile</Text>
      <View style={styles.avatarContainer}>
        <TouchableOpacity onPress={handlePickPhoto}>
          {photoUri || profile?.avatar_url ? (
            <Image source={{ uri: photoUri || profile?.avatar_url }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{profile?.display_name?.[0] || '?'}</Text>
            </View>
          )}
          <View style={styles.editBadge}>
            <Text style={styles.editBadgeText}>📷</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.displayName}>{profile?.display_name}</Text>
        <Text style={styles.username}>@{profile?.username}</Text>
      </View>
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8D5C0' },
  content: { padding: 24, paddingTop: 60 },
  header: { fontSize: 28, fontWeight: 'bold', color: '#1a2a3a', marginBottom: 32 },
  avatarContainer: { alignItems: 'center', marginBottom: 32 },
  avatarImage: { width: 100, height: 100, borderRadius: 50 },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#2196F3', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#ffffff', fontSize: 40, fontWeight: 'bold' },
  editBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#F15A22', borderRadius: 14, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  editBadgeText: { fontSize: 14 },
  displayName: { color: '#1a2a3a', fontSize: 22, fontWeight: '700', marginTop: 12, marginBottom: 4 },
  username: { color: '#556677', fontSize: 15 },
  signOutButton: { backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#F15A22', marginTop: 24 },
  signOutText: { color: '#F15A22', fontSize: 16, fontWeight: '600' },
  loading: { flex: 1, backgroundColor: '#E8D5C0', alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#556677', fontSize: 16 },
})
