import { useEffect, useState, useRef } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Image } from 'react-native'
import { supabase } from '../lib/supabase'

type Message = {
  id: string
  content: string
  sender_id: string
  created_at: string
}

export default function MessagesScreen({
  matchId,
  otherUser,
  onBack,
}: {
  matchId: string
  otherUser: { display_name: string; username: string; avatar_url?: string }
  onBack: () => void
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const flatListRef = useRef<FlatList>(null)

  useEffect(() => { loadMessages() }, [])

  const loadMessages = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setCurrentUserId(user.id)
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true })
    if (!error) setMessages(data || [])
    setLoading(false)
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUserId) return
    const content = newMessage.trim()
    setNewMessage('')
    const { data, error } = await supabase
      .from('messages')
      .insert({ match_id: matchId, sender_id: currentUserId, content })
      .select().single()
    if (!error && data) {
      setMessages(prev => [...prev, data])
      setTimeout(() => flatListRef.current?.scrollToEnd(), 100)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          {otherUser?.avatar_url ? (
            <Image source={{ uri: otherUser.avatar_url }} style={styles.headerAvatar} />
          ) : (
            <View style={styles.headerAvatarPlaceholder}>
              <Text style={styles.headerAvatarText}>{otherUser?.display_name?.[0] || '?'}</Text>
            </View>
          )}
          <View>
            <Text style={styles.headerName}>{otherUser?.display_name}</Text>
            <Text style={styles.headerUsername}>@{otherUser?.username}</Text>
          </View>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Say hello! 👋</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isMe = item.sender_id === currentUserId
          return (
            <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.theirBubble]}>
              <Text style={[styles.messageText, isMe ? styles.myText : styles.theirText]}>
                {item.content}
              </Text>
            </View>
          )
        }}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor="#888"
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, !newMessage.trim() && styles.sendDisabled]}
          onPress={sendMessage}
          disabled={!newMessage.trim()}
        >
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 60, paddingHorizontal: 16, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.1)',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  backButton: { marginRight: 12 },
  backText: { color: '#2196F3', fontSize: 18, fontWeight: '600' },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  headerAvatarPlaceholder: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2196F3', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  headerAvatarText: { color: '#fff', fontWeight: 'bold' },
  headerName: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  headerUsername: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  messageList: { padding: 16, flexGrow: 1 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { color: 'rgba(255,255,255,0.7)', fontSize: 16 },
  messageBubble: { maxWidth: '75%', padding: 12, borderRadius: 16, marginBottom: 8 },
  myBubble: { backgroundColor: '#2196F3', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  theirBubble: { backgroundColor: 'rgba(255,255,255,0.95)', alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  messageText: { fontSize: 15 },
  myText: { color: '#ffffff' },
  theirText: { color: '#0A1628' },
  inputRow: {
    flexDirection: 'row', padding: 12,
    borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.1)',
    alignItems: 'flex-end', backgroundColor: 'rgba(255,255,255,0.5)',
  },
  input: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10,
    color: '#ffffff', fontSize: 15, maxHeight: 100,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)', marginRight: 8,
  },
  sendButton: { backgroundColor: '#2196F3', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 },
  sendDisabled: { backgroundColor: '#aabbcc' },
  sendText: { color: '#ffffff', fontWeight: '600' },
})
