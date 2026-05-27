import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert } from 'react-native'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://ensuhiadkajoydjjlasm.supabase.co',
  'sb_publishable_jl1Mg9QtGJsd6DFM8Nt2hg_C2khPz_M'
)

type User = {
  id: string
  username: string
  display_name: string
  bio: string
  age: number
}

export default function DiscoverScreen() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setCurrentUserId(user.id)

    const { data, error } = await supabase
      .from('users')
      .select('id, username, display_name, bio, age')
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
    else {
      Alert.alert('Liked!', 'You liked this person')
      setUsers(prev => prev.filter(u => u.id !== likedId))
    }
  }

  if (loading) return (
    <View style={styles.loading}>
      <Text style={styles.loadingText}>Finding people...</Text>
    </View>
  )

  if (users.length === 0) return (
    <View style={styles.loading}>
      <Text style={styles.loadingText}>No one nearby yet</Text>
      <Text style={styles.subText}>Check back soon!</Text>
    </View>
  )

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Discover</Text>
      <FlatList
        data={users}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.display_name?.[0] || '?'}</Text>
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
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    padding: 24,
    paddingTop: 60,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#6c47ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  info: {
    flex: 1,
  },
  name: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  username: {
    color: '#888888',
    fontSize: 13,
    marginBottom: 4,
  },
  bio: {
    color: '#aaaaaa',
    fontSize: 13,
  },
  likeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2a1a4a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  likeText: {
    color: '#6c47ff',
    fontSize: 22,
  },
  loading: {
    flex: 1,
    backgroundColor: '#0f0f0f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  subText: {
    color: '#888888',
    fontSize: 14,
    marginTop: 8,
  },
})
