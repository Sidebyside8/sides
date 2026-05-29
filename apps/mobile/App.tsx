import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Session } from '@supabase/supabase-js'
import { supabase } from './src/lib/supabase'
import LoginScreen from './src/screens/LoginScreen'
import ProfileSetupScreen from './src/screens/ProfileSetupScreen'
import DiscoverScreen from './src/screens/DiscoverScreen'
import MatchesScreen from './src/screens/MatchesScreen'
import MessagesScreen from './src/screens/MessagesScreen'
import HomeScreen from './src/screens/HomeScreen'

type Tab = 'discover' | 'matches' | 'profile'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [hasProfile, setHasProfile] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('discover')
  const [activeMatch, setActiveMatch] = useState<{ matchId: string; otherUser: any } | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) checkProfile(session.user.id)
      else setInitialized(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) checkProfile(session.user.id)
      else { setHasProfile(false); setInitialized(true) }
    })
    return () => subscription.unsubscribe()
  }, [])

  const checkProfile = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .maybeSingle()
      setHasProfile(!!data)
    } catch (e) {
      setHasProfile(false)
    }
    setInitialized(true)
  }

  if (!initialized) return (
    <View style={styles.loading}>
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  )

  if (!session) return <LoginScreen />

  if (!hasProfile) return (
    <ProfileSetupScreen onComplete={() => setHasProfile(true)} />
  )

  if (activeMatch) return (
    <MessagesScreen
      matchId={activeMatch.matchId}
      otherUser={activeMatch.otherUser}
      onBack={() => setActiveMatch(null)}
    />
  )

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {activeTab === 'discover' && <DiscoverScreen />}
        {activeTab === 'matches' && (
          <MatchesScreen
            onSelectMatch={(matchId, otherUser) => setActiveMatch({ matchId, otherUser })}
          />
        )}
        {activeTab === 'profile' && <HomeScreen />}
      </View>
      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('discover')}>
          <Text style={[styles.tabText, activeTab === 'discover' && styles.tabActive]}>Discover</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('matches')}>
          <Text style={[styles.tabText, activeTab === 'matches' && styles.tabActive]}>Matches</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('profile')}>
          <Text style={[styles.tabText, activeTab === 'profile' && styles.tabActive]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  loading: {
    flex: 1, backgroundColor: '#0f0f0f',
    alignItems: 'center', justifyContent: 'center',
  },
  loadingText: { color: '#ffffff', fontSize: 18 },
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  content: { flex: 1 },
  tabBar: {
    flexDirection: 'row', backgroundColor: '#1a1a1a',
    borderTopWidth: 1, borderTopColor: '#333',
    paddingBottom: 24, paddingTop: 12,
  },
  tab: { flex: 1, alignItems: 'center' },
  tabText: { color: '#666666', fontSize: 14, fontWeight: '500' },
  tabActive: { color: '#6c47ff', fontWeight: '700' },
})
