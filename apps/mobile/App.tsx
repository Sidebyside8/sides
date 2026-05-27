import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Session } from '@supabase/supabase-js'
import { supabase } from './src/lib/supabase'
import LoginScreen from './src/screens/LoginScreen'
import ProfileSetupScreen from './src/screens/ProfileSetupScreen'
import DiscoverScreen from './src/screens/DiscoverScreen'
import HomeScreen from './src/screens/HomeScreen'

type Tab = 'discover' | 'home'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [hasProfile, setHasProfile] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('discover')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('getSession result:', session?.user?.id, error?.message)
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
      console.log('checking profile for:', userId)
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .maybeSingle()
      console.log('profile check result:', data, error?.message)
      setHasProfile(!!data)
    } catch (e: any) {
      console.log('profile check error:', e.message)
      setError(e.message)
      setHasProfile(false)
    }
    setInitialized(true)
  }

  if (error) return (
    <View style={styles.loading}>
      <Text style={styles.loadingText}>Error: {error}</Text>
    </View>
  )

  if (!initialized) return (
    <View style={styles.loading}>
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  )

  if (!session) return <LoginScreen />

  if (!hasProfile) return (
    <ProfileSetupScreen onComplete={() => setHasProfile(true)} />
  )

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {activeTab === 'discover' ? <DiscoverScreen /> : <HomeScreen />}
      </View>
      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('discover')}>
          <Text style={[styles.tabText, activeTab === 'discover' && styles.tabActive]}>
            Discover
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab} onPress={() => setActiveTab('home')}>
          <Text style={[styles.tabText, activeTab === 'home' && styles.tabActive]}>
            Profile
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#0f0f0f',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingBottom: 24,
    paddingTop: 12,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
  },
  tabText: {
    color: '#666666',
    fontSize: 14,
    fontWeight: '500',
  },
  tabActive: {
    color: '#6c47ff',
    fontWeight: '700',
  },
})
