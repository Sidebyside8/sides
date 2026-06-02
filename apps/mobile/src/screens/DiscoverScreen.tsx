import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert, Image } from 'react-native'
import { supabase } from '../lib/supabase'
import SydeHeader from '../components/SydeHeader'

type User = {
  id: string
  username: string
  display_name: string
  bio: string
  age: number
  avatar_url?: string
}

export default function DiscoverScreen() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => { loadUsers() }, [])

  const loadUsers = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setCurrentUserId(user.id)
    const { data, error } = await supabase
      .from('users')
      .select('id, username, display_name, bio, age, avatar_url')
      .neq('id', user.id)
      .eq('is_active', true)
      .limit(20)
    if (error) Alert.alert('Error', error.message)
    else setUsers(data || [])
    setLoading(false)
  }

  const handleLike = async (likedId: string) => {
    const { error } = await supabase
      .from('likes')
      .insert({ liker_id: currentUserId, liked_id: likedId })
    if (error) Alert.alert('Error', error.message)
    else setUsers(prev => prev.filter(u => u.id !== likedId))
  }

  if (loading) return (
    <View style={styles.loading}>
      <Text style={styles.loadingText}>Finding people...</Text>
    </View>
  )

  if (users.length === 0) return (
    <View style={styles.loading}>
      <Text style={styles.loadingText}>No one here yet</Text>
      <Text style={styles.subText}>Check back soon!</Text>
    </View>
  )

  return (
    <View style={styles.container}>
      <SydeHeader title="Discover" />
      <FlatList
        data={users}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardLeft}>
              {item.avatar_url ? (
                <Image source={{ uri: item.avatar_url }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.display_name?.[0] || '?'}</Text>
                </View>
              )}
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{item.display_name}</Text>
              <Text style={styles.username}>@{item.username} · {item.age}</Text>
              {item.bio ? <Text style={styles.bio} numberOfLines={2}>{item.bio}</Text> : null}
            </View>
            <TouchableOpacity style={styles.likeButton} onPress={() => handleLike(item.id)}>
              <Text style={styles.likeText}>♥</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8D5C0' },
  header: {
    fontSize: 28, fontWeight: 'bold', color: '#1a2a3a',
    padding: 24, paddingTop: 60,
  },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 16, padding: 16,
    marginBottom: 12, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)',
  },
  cardLeft: { marginRight: 12 },
  avatarImage: { width: 52, height: 52, borderRadius: 26 },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#2196F3', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#ffffff', fontSize: 22, fontWeight: 'bold' },
  info: { flex: 1 },
  name: { color: '#1a2a3a', fontSize: 16, fontWeight: '600', marginBottom: 2 },
  username: { color: '#556677', fontSize: 13, marginBottom: 4 },
  bio: { color: '#445566', fontSize: 13 },
  likeButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(241,90,34,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  likeText: { color: '#F15A22', fontSize: 22 },
  loading: { flex: 1, backgroundColor: '#E8D5C0', alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#1a2a3a', fontSize: 18, fontWeight: '600' },
  subText: { color: '#556677', fontSize: 14, marginTop: 8 },
})
