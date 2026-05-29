import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert } from 'react-native'
import { supabase } from '../lib/supabase'

type Match = {
  id: string
  user1_id: string
  user2_id: string
  created_at: string
  other_user: {
    id: string
    display_name: string
    username: string
    bio: string
  }
}

export default function MatchesScreen({ onSelectMatch }: { onSelectMatch: (matchId: string, otherUser: any) => void }) {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    loadMatches()
  }, [])

  const loadMatches = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setCurrentUserId(user.id)

    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order('created_at', { ascending: false })

    if (error) {
      Alert.alert('Error', error.message)
      setLoading(false)
      return
    }

    if (!data || data.length === 0) {
      setMatches([])
      setLoading(false)
      return
    }

    const matchesWithUsers = await Promise.all(data.map(async (match) => {
      const otherId = match.user1_id === user.id ? match.user2_id : match.user1_id
      const { data: otherUser } = await supabase
        .from('users')
        .select('id, display_name, username, bio')
        .eq('id', otherId)
        .single()
      return { ...match, other_user: otherUser }
    }))

    setMatches(matchesWithUsers)
    setLoading(false)
  }

  if (loading) return (
    <View style={styles.loading}>
      <Text style={styles.loadingText}>Loading matches...</Text>
    </View>
  )

  if (matches.length === 0) return (
    <View style={styles.loading}>
      <Text style={styles.loadingText}>No matches yet</Text>
      <Text style={styles.subText}>Keep liking people to get matches!</Text>
    </View>
  )

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Matches</Text>
      <FlatList
        data={matches}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => onSelectMatch(item.id, item.other_user)}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.other_user?.display_name?.[0] || '?'}
              </Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{item.other_user?.display_name}</Text>
              <Text style={styles.username}>@{item.other_user?.username}</Text>
              <Text style={styles.tap}>Tap to message</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  header: {
    fontSize: 28, fontWeight: 'bold', color: '#ffffff',
    padding: 24, paddingTop: 60,
  },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  card: {
    backgroundColor: '#1a1a1a', borderRadius: 16, padding: 16,
    marginBottom: 12, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#333',
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#6c47ff', alignItems: 'center',
    justifyContent: 'center', marginRight: 12,
  },
  avatarText: { color: '#ffffff', fontSize: 22, fontWeight: 'bold' },
  info: { flex: 1 },
  name: { color: '#ffffff', fontSize: 16, fontWeight: '600', marginBottom: 2 },
  username: { color: '#888888', fontSize: 13, marginBottom: 2 },
  tap: { color: '#6c47ff', fontSize: 12 },
  arrow: { color: '#666', fontSize: 24 },
  loading: { flex: 1, backgroundColor: '#0f0f0f', alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#ffffff', fontSize: 18, fontWeight: '600' },
  subText: { color: '#888888', fontSize: 14, marginTop: 8 },
})
