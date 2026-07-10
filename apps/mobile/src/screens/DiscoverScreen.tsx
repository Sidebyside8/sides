import { useEffect, useState } from 'react'
import * as Location from 'expo-location'
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert, Image, Dimensions } from 'react-native'
import { supabase } from '../lib/supabase'
import SydeHeader from '../components/SydeHeader'
import ProfileModal from '../components/ProfileModal'
import FavoritesScreen from './FavoritesScreen'
import { notifyNewMatch } from '../lib/notifications'

const { width } = Dimensions.get('window')
const CARD_SIZE = (width - 48) / 3

type User = {
  id: string
  username: string
  display_name: string
  title?: string
  bio?: string
  age: number
  avatar_url?: string
  location?: string
  preferences?: string[]
  looking_for?: string
  relationship_type?: string
  is_online?: boolean
  latitude?: number
  longitude?: number
  is_premium?: boolean
}

export default function DiscoverScreen({ onChat, setActiveTab, onUpgrade }: { onChat: (user: any) => void; setActiveTab?: (tab: string) => void; onUpgrade?: () => void }) {
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentLocation, setCurrentLocation] = useState<string | null>(null)
  const [filter, setFilter] = useState('global')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [minAge, setMinAge] = useState(18)
  const [maxAge, setMaxAge] = useState(99)
  const [maxDistance, setMaxDistance] = useState(200)
  const [filterRelType, setFilterRelType] = useState('')
  const [isPremiumUser, setIsPremiumUser] = useState(false)
  const [isIncognito, setIsIncognito] = useState(false)
  const [showFavorites, setShowFavorites] = useState(false)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [myCoords, setMyCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [myProfile, setMyProfile] = useState<User | null>(null)
  const [showMyProfile, setShowMyProfile] = useState(false)

  useEffect(() => { loadUsers() }, [filter])

  const applyFilters = (allUsers: any[], ageMin: number, ageMax: number, dist: number, rel: string) => {
    const result = allUsers.filter((u: any) => {
      if (u.age < ageMin || u.age > ageMax) return false
      if (dist < 200 && u._dist !== undefined && u._dist !== 9999 && u._dist > dist) return false
      if (rel && u.relationship_type !== rel) return false
      return true
    })
    setFilteredUsers(result)
  }

  const loadUsers = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setCurrentUserId(user.id)

    const { data: myProfileData } = await supabase
      .from('users')
      .select('id,username,display_name,title,bio,age,avatar_url,location,preferences,looking_for,relationship_type,latitude,longitude,is_online,is_premium,boosted_until,is_incognito')
      .eq('id', user.id)
      .single()

    if (myProfileData) {
      setMyProfile(myProfileData as User)
      setIsPremiumUser(!!myProfileData.is_premium)
      setIsIncognito(!!(myProfileData as any).is_incognito)
    }

    let localCoords: { lat: number; lng: number } | null = myCoords

    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        const lat = loc.coords.latitude
        const lng = loc.coords.longitude
        localCoords = { lat, lng }
        setMyCoords(localCoords)
        await supabase.from('users').update({ latitude: lat, longitude: lng }).eq('id', user.id)
      } else if (myProfileData?.latitude) {
        localCoords = { lat: myProfileData.latitude, lng: myProfileData.longitude }
        setMyCoords(localCoords)
      }
    } catch (e) {
      if (myProfileData?.latitude) {
        localCoords = { lat: myProfileData.latitude, lng: myProfileData.longitude }
      }
    }

    setCurrentLocation(myProfileData?.location || null)

    const { data: favData } = await supabase.from('favorites').select('favorited_id').eq('user_id', user.id)
    const favIds = favData ? favData.map((f: any) => f.favorited_id) : []
    if (favData) setFavorites(new Set(favIds))

    const { data: blockData } = await supabase.from('blocks').select('blocked_id').eq('blocker_id', user.id)
    const blockedIds = blockData ? blockData.map((b: any) => b.blocked_id) : []

    const { data, error } = await supabase
      .from('users')
      .select('id,username,display_name,title,bio,age,avatar_url,location,preferences,looking_for,relationship_type,latitude,longitude,is_online,is_premium')
      .neq('id', user.id)
      .eq('is_active', true)
      .limit(99)

    if (error) {
      Alert.alert('Error', error.message)
    } else {
      const filtered = (data || []).filter((u: User) => !blockedIds.includes(u.id))

      const withDist = filtered.map((u: User) => {
        if (localCoords && u.latitude && u.longitude) {
          const R = 3958.8
          const dLat = (u.latitude - localCoords.lat) * Math.PI / 180
          const dLon = (u.longitude - localCoords.lng) * Math.PI / 180
          const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(localCoords.lat * Math.PI / 180) * Math.cos(u.latitude * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
          const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
          return { ...u, _dist: dist }
        }
        return { ...u, _dist: 9999 }
      })

      const nearbyFiltered = filter === 'nearby'
        ? withDist.filter((u: any) => u._dist <= 200 || u._dist === 9999)
        : withDist

      nearbyFiltered.sort((a: any, b: any) => {
        if (b.is_premium !== a.is_premium) return (b.is_premium ? 1 : 0) - (a.is_premium ? 1 : 0)
        return a._dist - b._dist
      })

      setUsers(nearbyFiltered)
      setFilteredUsers(nearbyFiltered)
    }
    setLoading(false)
  }

  const handleApplyFilters = () => {
    applyFilters(users as any[], minAge, maxAge, maxDistance, filterRelType)
    setShowAdvancedFilters(false)
  }

  const handleResetFilters = () => {
    setMinAge(18)
    setMaxAge(99)
    setMaxDistance(200)
    setFilterRelType('')
    setFilteredUsers(users)
  }

  const handleToggleIncognito = async () => {
    if (!isPremiumUser) { onUpgrade && onUpgrade(); return }
    const next = !isIncognito
    setIsIncognito(next)
    const { error } = await supabase.from('users').update({ is_incognito: next }).eq('id', currentUserId)
    if (error) { setIsIncognito(!next); Alert.alert('Error', error.message) }
  }

  const handleToggleFavorite = async (favId: string) => {
    const isFav = favorites.has(favId)
    if (isFav) {
      await supabase.from('favorites').delete().eq('user_id', currentUserId).eq('favorited_id', favId)
      setFavorites(prev => { const n = new Set(prev); n.delete(favId); return n })
    } else {
      await supabase.from('favorites').insert({ user_id: currentUserId, favorited_id: favId })
      setFavorites(prev => new Set([...prev, favId]))
    }
  }

  const handleBlock = async (blockedId: string, name: string) => {
    Alert.alert('Block User', `Are you sure you want to block ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block', style: 'destructive', onPress: async () => {
          await supabase.from('blocks').insert({ blocker_id: currentUserId, blocked_id: blockedId })
          setUsers(prev => prev.filter(u => u.id !== blockedId))
          setFilteredUsers(prev => prev.filter(u => u.id !== blockedId))
          setShowModal(false)
        }
      }
    ])
  }

  const handleReport = (reportedId: string, name: string) => {
    Alert.alert('Report User', 'Why are you reporting ' + name + '?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Inappropriate Photos', onPress: () => submitReport(reportedId, 'Inappropriate Photos') },
      { text: 'Harassment', onPress: () => submitReport(reportedId, 'Harassment') },
      { text: 'Fake Profile', onPress: () => submitReport(reportedId, 'Fake Profile') },
      { text: 'Spam', onPress: () => submitReport(reportedId, 'Spam') },
      { text: 'Other', onPress: () => submitReport(reportedId, 'Other') },
    ])
  }

  const submitReport = async (reportedId: string, reason: string) => {
    await supabase.from('reports').insert({ reporter_id: currentUserId, reported_id: reportedId, reason })
    Alert.alert('Report Submitted', 'Thank you for helping keep Syde Vibe safe. Our team will review this report.')
    setShowModal(false)
  }

  const handleChat = (userId: string, user: any) => {
    setShowModal(false)
    setTimeout(() => onChat(user), 300)
  }

  const calcDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 3958.8
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const miles = R * c
    if (miles < 0.1) return 'nearby'
    if (miles < 1) return Math.round(miles * 5280) + 'ft'
    return miles.toFixed(1) + 'mi'
  }

  const getDistance = (user: User) => {
    if (!myCoords || (user as any).latitude == null) return null
    return calcDistance(myCoords.lat, myCoords.lng, (user as any).latitude, (user as any).longitude)
  }

  const handleCardPress = (user: User) => {
    setSelectedUser(user)
    setShowModal(true)
  }

  return (
    <View style={s.container}>
      <SydeHeader
        title="Discover"
        leftAction={
          <TouchableOpacity onPress={() => setShowMyProfile(true)} style={{ width: 36, height: 36, borderRadius: 18, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' }}>
            {myProfile?.avatar_url
              ? <Image source={{ uri: myProfile.avatar_url }} style={{ width: 32, height: 32, borderRadius: 16 }} />
              : <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#2196F3', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: 'bold' }}>{myProfile?.display_name?.[0] || '?'}</Text>
              </View>}
          </TouchableOpacity>
        }
        rightAction={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity onPress={() => setShowFavorites(true)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 18 }}>⭐</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveTab && setActiveTab('viewed')} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 18 }}>👁️</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={loadUsers} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#ffffff', fontSize: 16 }}>↻</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <View style={s.filterRow}>
        {isPremiumUser && (
          <TouchableOpacity onPress={() => setShowAdvancedFilters(true)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(245,166,35,0.3)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F5A623', marginRight: 4 }}>
            <Text style={{ fontSize: 16 }}>⚙️</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[s.filterTab, filter === 'nearby' && s.filterTabActive]} onPress={() => setFilter('nearby')}>
          <Text style={[s.filterText, filter === 'nearby' && s.filterTextActive]}>📍 Nearby</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.filterTab, filter === 'global' && s.filterTabActive]} onPress={() => setFilter('global')}>
          <Text style={[s.filterText, filter === 'global' && s.filterTextActive]}>🌍 Global</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.filterTab, isIncognito && s.incognitoActive]} onPress={handleToggleIncognito}>
          <Text style={[s.filterText, isIncognito && s.filterTextActive]}>🕶️ Incognito</Text>
        </TouchableOpacity>
      </View>

      {filter === 'nearby' && !currentLocation && (
        <View style={s.banner}>
          <Text style={s.bannerText}>Add your location in Profile to see nearby people</Text>
        </View>
      )}

      {loading
        ? <View style={s.center}><Text style={s.loadingText}>Finding people...</Text></View>
        : filteredUsers.length === 0
          ? <View style={s.center}>
            <Text style={s.loadingText}>
              {filter === 'nearby' ? 'No one within range — try Global!' : 'No one here yet'}
            </Text>
            <Text style={s.subText}>
              {filter === 'nearby' ? 'Try switching to Global' : 'Check back soon!'}
            </Text>
          </View>
          : <FlatList
            data={filteredUsers}
            keyExtractor={i => i.id}
            numColumns={3}
            contentContainerStyle={s.grid}
            columnWrapperStyle={s.row}
            renderItem={({ item }) => (
              <TouchableOpacity style={s.card} onPress={() => handleCardPress(item)}>
                <View style={s.cardInner}>
                  {item.avatar_url
                    ? <Image source={{ uri: item.avatar_url }} style={s.cardImage} />
                    : <View style={s.cardPlaceholder}>
                      <Text style={s.cardPlaceholderText}>{item.display_name?.[0] || '?'}</Text>
                    </View>}
                  {favorites.has(item.id) && <View style={s.favBadge}><Text style={s.favBadgeText}>⭐</Text></View>}
                  {item.is_online && <View style={s.onlineDot} />}
                  {item.is_premium && <View style={s.premiumBadge}><Text style={s.premiumBadgeText}>💎</Text></View>}
                  {(() => { const d = getDistance(item as any); return d ? <View style={s.distBadge}><Text style={s.distText}>{d}</Text></View> : null })()}
                </View>
                <Text style={s.cardTitle} numberOfLines={1}>{item.title || item.display_name}</Text>
                <Text style={s.cardAge} numberOfLines={1}>{item.age}{item.location ? ' · ' + item.location.split(',')[0] : ''}</Text>
              </TouchableOpacity>
            )}
          />}

      <ProfileModal
        user={myProfile}
        visible={showMyProfile}
        onClose={() => setShowMyProfile(false)}
        onChat={() => {}}
        isFavorite={false}
        onToggleFavorite={() => {}}
        onBlock={() => {}}
        viewerIsPremium={isPremiumUser}
      />
      <ProfileModal
        user={selectedUser}
        visible={showModal}
        onClose={() => setShowModal(false)}
        onChat={handleChat}
        isFavorite={selectedUser ? favorites.has(selectedUser.id) : false}
        onToggleFavorite={handleToggleFavorite}
        onBlock={handleBlock}
        onReport={handleReport}
        viewerIsPremium={isPremiumUser}
      />

      {showFavorites && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#0A2A4A', zIndex: 90 }}>
          <FavoritesScreen onClose={() => setShowFavorites(false)} />
        </View>
      )}

      {showAdvancedFilters && (
        <View style={{ position: 'absolute', top: 0,