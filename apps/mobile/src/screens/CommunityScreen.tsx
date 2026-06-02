import { useEffect, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { supabase } from '../lib/supabase'
import SydeHeader from '../components/SydeHeader'

type Post = {
  id: string
  content: string
  user_id: string
  created_at: string
  author: { display_name: string; username: string }
}

export default function CommunityScreen() {
  const [posts, setPosts] = useState<Post[]>([])
  const [newPost, setNewPost] = useState('')
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => { loadPosts() }, [])

  const loadPosts = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setCurrentUserId(user.id)
    const { data, error } = await supabase
      .from('community_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) { Alert.alert('Error', error.message); setLoading(false); return }
    if (!data || data.length === 0) { setPosts([]); setLoading(false); return }
    const postsWithAuthors = await Promise.all(data.map(async (post) => {
      const { data: author } = await supabase
        .from('users').select('display_name, username').eq('id', post.user_id).single()
      return { ...post, author }
    }))
    setPosts(postsWithAuthors)
    setLoading(false)
  }

  const handlePost = async () => {
    if (!newPost.trim() || !currentUserId) return
    setPosting(true)
    const content = newPost.trim()
    setNewPost('')
    const { data, error } = await supabase
      .from('community_posts')
      .insert({ user_id: currentUserId, content })
      .select().single()
    if (error) { Alert.alert('Error', error.message) } else {
      const { data: author } = await supabase
        .from('users').select('display_name, username').eq('id', currentUserId).single()
      setPosts(prev => [{ ...data, author }, ...prev])
    }
    setPosting(false)
  }

  const timeAgo = (d: string) => {
    const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return m + 'm ago'
    const h = Math.floor(m / 60)
    if (h < 24) return h + 'h ago'
    return Math.floor(h / 24) + 'd ago'
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <SydeHeader title="Community" />
      <View style={styles.postBox}>
        <TextInput
          style={styles.postInput}
          placeholder="Share something with the community..."
          placeholderTextColor="#888"
          value={newPost}
          onChangeText={setNewPost}
          multiline
        />
        <TouchableOpacity
          style={[styles.postButton, (!newPost.trim() || posting) && styles.postButtonDisabled]}
          onPress={handlePost}
          disabled={!newPost.trim() || posting}
        >
          <Text style={styles.postButtonText}>{posting ? 'Posting...' : 'Post'}</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <View style={styles.loading}><Text style={styles.loadingText}>Loading posts...</Text></View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No posts yet</Text>
              <Text style={styles.emptySubText}>Be the first to post!</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.author?.display_name?.[0] || '?'}</Text>
                </View>
                <View style={styles.authorInfo}>
                  <Text style={styles.authorName}>{item.author?.display_name}</Text>
                  <Text style={styles.authorMeta}>@{item.author?.username} · {timeAgo(item.created_at)}</Text>
                </View>
              </View>
              <Text style={styles.content}>{item.content}</Text>
            </View>
          )}
        />
      )}
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8D5C0' },
  header: { fontSize: 28, fontWeight: 'bold', color: '#1a2a3a', padding: 24, paddingTop: 60, paddingBottom: 12 },
  postBox: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)',
  },
  postInput: { color: '#1a2a3a', fontSize: 15, minHeight: 60, textAlignVertical: 'top', marginBottom: 12 },
  postButton: {
    backgroundColor: '#2196F3', borderRadius: 10,
    padding: 10, alignItems: 'center', alignSelf: 'flex-end', paddingHorizontal: 20,
  },
  postButtonDisabled: { backgroundColor: '#aabbcc' },
  postButtonText: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#2196F3', alignItems: 'center',
    justifyContent: 'center', marginRight: 10,
  },
  avatarText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  authorInfo: { flex: 1 },
  authorName: { color: '#1a2a3a', fontWeight: '600', fontSize: 14 },
  authorMeta: { color: '#556677', fontSize: 12 },
  content: { color: '#1a2a3a', fontSize: 15, lineHeight: 22 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#556677', fontSize: 16 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#1a2a3a', fontSize: 18, fontWeight: '600' },
  emptySubText: { color: '#556677', fontSize: 14, marginTop: 8 },
})
