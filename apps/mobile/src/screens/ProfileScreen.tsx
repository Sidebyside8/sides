import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Image, TextInput } from 'react-native'
import { supabase } from '../lib/supabase'
import SydeHeader from '../components/SydeHeader'

type Profile = {
  id: string
  username: string
  display_name: string
  bio: string
  age: number
  avatar_url?: string
  location?: string
  looking_for?: string
  relationship_type?: string
}

type Stats = {
  likes: number
  matches: number
  posts: number
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<Stats>({ likes: 0, matches: 0, posts: 0 })
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState<Partial<Profile>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadProfile() }, [])

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('users').select('*').eq('id', user.id).single()
    if (data) { setProfile(data); setEditData(data) }
    const [likesRes, matchesRes, postsRes] = await Promise.all([
      supabase.from('likes').select('id', { count: 'exact' }).eq('liker_id', user.id),
      supabase.from('matches').select('id', { count: 'exact' }).or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`),
      supabase.from('community_posts').select('id', { count: 'exact' }).eq('user_id', user.id),
    ])
    setStats({ likes: likesRes.count || 0, matches: matchesRes.count || 0, posts: postsRes.count || 0 })
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('users').update({
      display_name: editData.display_name,
      bio: editData.bio,
      location: editData.location,
      looking_for: editData.looking_for,
      relationship_type: editData.relationship_type,
    }).eq('id', user.id)
    if (error) Alert.alert('Error', error.message)
    else { setProfile(prev => prev ? { ...prev, ...editData } : prev); setEditing(false); Alert.alert('Saved!', 'Profile updated') }
    setSaving(false)
  }

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ])
  }

  if (loading) return (
    <View style={styles.loading}><Text style={styles.loadingText}>Loading profile...</Text></View>
  )

  const editButton = (
    <TouchableOpacity onPress={() => editing ? handleSave() : setEditing(true)} style={styles.editButton}>
      <Text style={styles.editButtonText}>{editing ? (saving ? 'Saving...' : 'Save') : 'Edit'}</Text>
    </TouchableOpacity>
  )

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <SydeHeader title="Profile" rightAction={editButton} />

      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{profile?.display_name?.[0] || '?'}</Text>
          )}
        </View>
        {editing ? (
          <TextInput
            style={styles.editNameInput}
            value={editData.display_name}
            onChangeText={v => setEditData(prev => ({ ...prev, display_name: v }))}
            placeholder="Display name"
            placeholderTextColor="#888"
          />
        ) : (
          <Text style={styles.displayName}>{profile?.display_name}</Text>
        )}
        <Text style={styles.username}>@{profile?.username}</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{stats.likes}</Text>
          <Text style={styles.statLabel}>Likes Sent</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{stats.matches}</Text>
          <Text style={styles.statLabel}>Matches</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{stats.posts}</Text>
          <Text style={styles.statLabel}>Posts</Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>About Me</Text>

        <Text style={styles.infoLabel}>Bio</Text>
        {editing ? (
          <TextInput style={[styles.editInput, styles.bioInput]} value={editData.bio}
            onChangeText={v => setEditData(prev => ({ ...prev, bio: v }))}
            placeholder="Tell people about yourself..." placeholderTextColor="#888" multiline />
        ) : <Text style={styles.infoValue}>{profile?.bio || 'No bio yet'}</Text>}

        <Text style={styles.infoLabel}>Age</Text>
        <Text style={styles.infoValue}>{profile?.age}</Text>

        <Text style={styles.infoLabel}>Location</Text>
        {editing ? (
          <TextInput style={styles.editInput} value={editData.location}
            onChangeText={v => setEditData(prev => ({ ...prev, location: v }))}
            placeholder="e.g. New York, NY" placeholderTextColor="#888" />
        ) : <Text style={styles.infoValue}>{profile?.location || 'Not set'}</Text>}

        <Text style={styles.infoLabel}>Looking For</Text>
        {editing ? (
          <TextInput style={styles.editInput} value={editData.looking_for}
            onChangeText={v => setEditData(prev => ({ ...prev, looking_for: v }))}
            placeholder="e.g. Friends, Dating, Relationship" placeholderTextColor="#888" />
        ) : <Text style={styles.infoValue}>{profile?.looking_for || 'Not set'}</Text>}

        <Text style={styles.infoLabel}>Relationship Type</Text>
        {editing ? (
          <TextInput style={styles.editInput} value={editData.relationship_type}
            onChangeText={v => setEditData(prev => ({ ...prev, relationship_type: v }))}
            placeholder="e.g. Monogamous, Open, Casual" placeholderTextColor="#888" />
        ) : <Text style={styles.infoValue}>{profile?.relationship_type || 'Not set'}</Text>}
      </View>

      {editing && (
        <TouchableOpacity style={styles.cancelButton} onPress={() => { setEditing(false); setEditData(profile || {}) }}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8D5C0' },
  content: { paddingBottom: 40 },
  editButton: { backgroundColor: '#2196F3', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  editButtonText: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
  avatarContainer: { alignItems: 'center', marginBottom: 24, paddingHorizontal: 24 },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#2196F3', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarImage: { width: 100, height: 100, borderRadius: 50 },
  avatarText: { color: '#ffffff', fontSize: 40, fontWeight: 'bold' },
  editNameInput: {
    backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 10, padding: 10,
    color: '#1a2a3a', fontSize: 20, fontWeight: '700', textAlign: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', marginBottom: 4, width: '80%',
  },
  displayName: { color: '#1a2a3a', fontSize: 22, fontWeight: '700', marginBottom: 4 },
  username: { color: '#556677', fontSize: 15 },
  statsRow: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 16, padding: 16, marginHorizontal: 24, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)',
  },
  statBox: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: '#2196F3' },
  statLabel: { fontSize: 11, color: '#556677', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: 'rgba(0,0,0,0.1)' },
  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 16,
    padding: 16, marginHorizontal: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', marginBottom: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1a2a3a', marginBottom: 16 },
  infoLabel: { fontSize: 12, color: '#556677', fontWeight: '600', marginBottom: 4, textTransform: 'uppercase' },
  infoValue: { fontSize: 15, color: '#1a2a3a', marginBottom: 16, lineHeight: 22 },
  editInput: {
    backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 10, padding: 12,
    color: '#1a2a3a', fontSize: 15, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)',
  },
  bioInput: { height: 80, textAlignVertical: 'top' },
  cancelButton: {
    backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 12,
    padding: 16, alignItems: 'center', marginHorizontal: 24, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)',
  },
  cancelButtonText: { color: '#556677', fontSize: 16, fontWeight: '600' },
  signOutButton: {
    backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 12,
    padding: 16, alignItems: 'center', marginHorizontal: 24, borderWidth: 1, borderColor: '#F15A22',
  },
  signOutText: { color: '#F15A22', fontSize: 16, fontWeight: '600' },
  loading: { flex: 1, backgroundColor: '#E8D5C0', alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#556677', fontSize: 16 },
})
