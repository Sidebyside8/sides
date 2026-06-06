import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert, Image } from 'react-native'
import { supabase } from '../lib/supabase'
import SydeHeader from '../components/SydeHeader'

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
    avatar_url?: string
  }
}

export default function MatchesScreen({ onSelectMatch }: { onSelectMatch: (matchId: string, otherUser: any) => void }) {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadMatches() }, [])

  const loadMatches = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
    if (error) { Alert.alert('Error', error.message); setLoading(false); return }
    if (!data || data.length === 0) { setMatches([]); setLoading(false); return }
    const matchesWithUsers = await Promise.all(data.map(async (match) => {
      const otherId = match.user1_id === user.id ? match.user2_id : match.user1_id
      const { data: otherUser } = await supabase
        .from('users')
        .select('id, display_name, username, bio, avatar_url')
        .eq('id', otherId)
        .single()
      return { ...match, other_user: otherUser }
    }))
    setMatches(matchesWithUsers)
    setLoading(false)
  }

  return (
    <View style={styles.container}>
      <SydeHeader title="Matches" />
      {loading ? (
        <View style={styles.center}>
          <Text style={styles.loadingText}>Loading matches...</Text>
        </View>
      ) : matches.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.loadingText}>No matches yet</Text>
          <Text style={styles.subText}>Keep liking people to get matches!</Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => onSelectMatch(item.id, item.other_user)}>
              {item.other_user?.avatar_url ? (
                <Image source={{ uri: item.other_user.avatar_url }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.other_user?.display_name?.[0] || '?'}</Text>
                </View>
              )}
              <View style={styles.info}>
                <Text style={styles.name}>{item.other_user?.display_name}</Text>
                <Text style={styles.username}>@{item.other_user?.username}</Text>
                <Text style={styles.tap}>Tap to message</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 16, padding: 16,
    marginBottom: 12, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)',
  },
  avatarImage: { width: 52, height: 52, borderRadius: 26, marginRight: 12 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#2196F3', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { color: '#ffffff', fontSize: 22, fontWeight: 'bold' },
  info: { flex: 1 },
  name: { color: '#ffffff', fontSize: 16, fontWeight: '600', marginBottom: 2 },
  username: { color: '#556677', fontSize: 13, marginBottom: 2 },
  tap: { color: '#F15A22', fontSize: 12 },
  arrow: { color: '#556677', fontSize: 24 },
  loadingText: { color: '#ffffff', fontSize: 18, fontWeight: '600' },
  subText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 8 },
})
