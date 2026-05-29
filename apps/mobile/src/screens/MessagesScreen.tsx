import { useEffect, useState, useRef } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from 'react-native'
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
  otherUser: { display_name: string; username: string }
  onBack: () => void
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const flatListRef = useRef<FlatList>(null)

  useEffect(() => {
    loadMessages()
  }, [])

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
      .insert({
        match_id: matchId,
        sender_id: currentUserId,
        content,
      })
      .select()
      .single()

    if (!error && data) {
      setMessages(prev => [...prev, data])
      setTimeout(() => flatListRef.current?.scrollToEnd(), 100)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{otherUser?.display_name}</Text>
          <Text style={styles.headerUsername}>@{otherUser?.username}</Text>
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
          placeholderTextColor="#666"
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
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 60, paddingHorizontal: 16, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#333',
  },
  backButton: { marginRight: 12 },
  backText: { color: '#6c47ff', fontSize: 18 },
  headerInfo: { flex: 1 },
  headerName: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  headerUsername: { color: '#888', fontSize: 13 },
  messageList: { padding: 16, flexGrow: 1 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { color: '#888', fontSize: 16 },
  messageBubble: {
    maxWidth: '75%', padding: 12, borderRadius: 16, marginBottom: 8,
  },
  myBubble: { backgroundColor: '#6c47ff', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  theirBubble: { backgroundColor: '#1a1a1a', alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  messageText: { fontSize: 15 },
  myText: { color: '#ffffff' },
  theirText: { color: '#ffffff' },
  inputRow: {
    flexDirection: 'row', padding: 12,
    borderTopWidth: 1, borderTopColor: '#333',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1, backgroundColor: '#1a1a1a', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10,
    color: '#ffffff', fontSize: 15, maxHeight: 100,
    borderWidth: 1, borderColor: '#333', marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#6c47ff', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  sendDisabled: { backgroundColor: '#333' },
  sendText: { color: '#ffffff', fontWeight: '600' },
})
