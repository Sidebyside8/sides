import{useEffect,useState}from'react'
import*as Location from'expo-location'
import{View,Text,TouchableOpacity,StyleSheet,FlatList,Alert,Image,Dimensions,ScrollView,Linking,Modal}from'react-native'
import{supabase}from'../lib/supabase'
import{purchaseBoost,activateBoost,getBoostStatus}from'../lib/subscription'
import SydeHeader from'../components/SydeHeader'
import ProfileModal from'../components/ProfileModal'
import FavoritesScreen from'./FavoritesScreen'
import{notifyProfileLiked,notifyProfileSaved,notifyProfileViewed,notifyNewMatch}from'../lib/notifications'
import SearchScreen from'./SearchScreen'
import WhoLikedMeScreen from'./WhoLikedMeScreen'

const{width}=Dimensions.get('window')
const CARD_SIZE=(width-48)/3
const NEW_CARD_SIZE=100
const LIKE_LIMIT=10
const VIEW_LIMIT=50
const FREE_NEW_MEMBERS=5

type User={id:string;username:string;display_name:string;title?:string;bio?:string;age:number;avatar_url?:string;location?:string;preferences?:string[];looking_for?:string;relationship_type?:string;is_online?:boolean;latitude?:number;longitude?:number;is_premium?:boolean;created_at?:string}

const AFFILIATE_PROMOS=[
{id:'1',label:'🌈 LGBTQ+ Travel',text:'Find queer-friendly hotels & getaways',cta:'Explore',url:'https://www.orbitz.com'},
{id:'2',label:'💊 PrEP Made Easy',text:'Get PrEP delivered to your door',cta:'Learn More',url:'https://www.nurx.com'},
{id:'3',label:'👕 Queer Fashion',text:'Shop LGBTQ+ owned brands',cta:'Shop Now',url:'https://www.asos.com'},
]

export default function DiscoverScreen({onChat,setActiveTab,onUpgrade}:{onChat:(user:any)=>void;setActiveTab?:(tab:string)=>void;onUpgrade?:()=>void}){
const[users,setUsers]=useState<User[]>([])
const[filteredUsers,setFilteredUsers]=useState<User[]>([])
const[newUsers,setNewUsers]=useState<User[]>([])
const[whoLikedMe,setWhoLikedMe]=useState<User[]>([])
const[likedIds,setLikedIds]=useState<Set<string>>(new Set())
const[likesUsedToday,setLikesUsedToday]=useState(0)
const[viewsUsedToday,setViewsUsedToday]=useState(0)
const[chatCount,setChatCount]=useState(0)
const[loading,setLoading]=useState(true)
const[currentUserId,setCurrentUserId]=useState<string|null>(null)
const[currentLocation,setCurrentLocation]=useState<string|null>(null)
const[filter,setFilter]=useState('global')
const[showAdvancedFilters,setShowAdvancedFilters]=useState(false)
const[showWhoLikedMe,setShowWhoLikedMe]=useState(false)
const[showSearch,setShowSearch]=useState(false)
const[minAge,setMinAge]=useState(18)
const[maxAge,setMaxAge]=useState(99)
const[maxDistance,setMaxDistance]=useState(200)
const[filterRelType,setFilterRelType]=useState('')
const[isPremiumUser,setIsPremiumUser]=useState(false)
const[isIncognito,setIsIncognito]=useState(false)
const[showFavorites,setShowFavorites]=useState(false)
const[favorites,setFavorites]=useState<Set<string>>(new Set())
const[selectedUser,setSelectedUser]=useState<User|null>(null)
const[showModal,setShowModal]=useState(false)
const[myCoords,setMyCoords]=useState<{lat:number;lng:number}|null>(null)
const[myProfile,setMyProfile]=useState<User|null>(null)
const[showMyProfile,setShowMyProfile]=useState(false)
const[promoIndex,setPromoIndex]=useState(0)
const[showViewLimit,setShowViewLimit]=useState(false)
const[showTravelMode,setShowTravelMode]=useState(false)
const[travelCity,setTravelCity]=useState<string|null>(null)
const[showOnlineOnly,setShowOnlineOnly]=useState(false)
const[isBoosted,setIsBoosted]=useState(false)
const[showBoostModal,setShowBoostModal]=useState(false)
const[boostingNow,setBoostingNow]=useState(false)

useEffect(()=>{loadUsers()},[filter])
useEffect(()=>{
if(users.length>0){
const base=showOnlineOnly?users.filter((u:any)=>u.is_online):users
setFilteredUsers(base)
}
},[showOnlineOnly,users])
useEffect(()=>{
const t=setInterval(()=>setPromoIndex(i=>(i+1)%AFFILIATE_PROMOS.length),5000)
return()=>clearInterval(t)
},[])

const applyFilters=(allUsers:any[],ageMin:number,ageMax:number,dist:number,rel:string)=>{
const result=allUsers.filter((u:any)=>{
if(u.age<ageMin||u.age>ageMax)return false
if(dist<200&&u._dist!==undefined&&u._dist!==9999&&u._dist>dist)return false
if(rel&&u.relationship_type!==rel)return false
return true
})
setFilteredUsers(result)
}

const loadUsers=async()=>{
setLoading(true)
const{data:{user}}=await supabase.auth.getUser()
if(!user)return
setCurrentUserId(user.id)

const{data:myProfileData}=await supabase.from('users').select('id,username,display_name,title,bio,age,avatar_url,location,preferences,looking_for,relationship_type,latitude,longitude,is_online,is_premium,boosted_until,is_incognito').eq('id',user.id).single()
if(myProfileData){
setMyProfile(myProfileData as User)
setIsPremiumUser(!!myProfileData.is_premium)
setIsIncognito(!!(myProfileData as any).is_incognito)
}

const isPrem=!!myProfileData?.is_premium
if(user)getBoostStatus(user.id).then(({isBoosted})=>setIsBoosted(isBoosted))

let localCoords:{lat:number;lng:number}|null=myCoords
try{
const{status}=await Location.requestForegroundPermissionsAsync()
if(status==='granted'){
const loc=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced})
localCoords={lat:loc.coords.latitude,lng:loc.coords.longitude}
setMyCoords(localCoords)
await supabase.from('users').update({latitude:localCoords.lat,longitude:localCoords.lng}).eq('id',user.id)
}else if(myProfileData?.latitude){
localCoords={lat:myProfileData.latitude,lng:myProfileData.longitude}
setMyCoords(localCoords)
}
}catch(e){
if(myProfileData?.latitude)localCoords={lat:myProfileData.latitude,lng:myProfileData.longitude}
}

setCurrentLocation(myProfileData?.location||null)

const{data:favData}=await supabase.from('favorites').select('favorited_id').eq('user_id',user.id)
const favIds=favData?favData.map((f:any)=>f.favorited_id):[]
if(favData)setFavorites(new Set(favIds))

const{data:blockData}=await supabase.from('blocks').select('blocked_id').eq('blocker_id',user.id)
const blockedIds=blockData?blockData.map((b:any)=>b.blocked_id):[]

const today=new Date().toISOString().split('T')[0]
const{data:likedData}=await supabase.from('likes').select('liked_id,created_at').eq('liker_id',user.id)
const todayLikes=(likedData||[]).filter((l:any)=>l.created_at.startsWith(today))
setLikesUsedToday(todayLikes.length)
setLikedIds(new Set((likedData||[]).map((l:any)=>l.liked_id)))

const{data:viewData}=await supabase.from('profile_views').select('id,created_at').eq('viewer_id',user.id)
const todayViews=(viewData||[]).filter((v:any)=>v.created_at.startsWith(today))
setViewsUsedToday(todayViews.length)

const{data:whoLikedData}=await supabase.from('likes').select('liker_id').eq('liked_id',user.id)
if(whoLikedData&&whoLikedData.length>0){
const likerIds=whoLikedData.map((l:any)=>l.liker_id).filter((id:string)=>!blockedIds.includes(id))
const{data:likerProfiles}=await supabase.from('users').select('id,username,display_name,age,avatar_url,is_premium').in('id',likerIds)
if(likerProfiles){
setWhoLikedMe(isPrem?likerProfiles:likerProfiles.map((_:any,i:number)=>i<3?_:{..._,avatar_url:undefined,display_name:'???',isBlurred:true}))
}
}

const{data:newData}=await supabase.from('users').select('id,username,display_name,age,avatar_url,location,is_premium,created_at').neq('id',user.id).eq('is_active',true).gte('created_at',new Date(Date.now()-7*24*60*60*1000).toISOString()).order('created_at',{ascending:false}).limit(20)
const newFiltered=(newData||[]).filter((u:any)=>!blockedIds.includes(u.id))
if(isPrem){
setNewUsers(newFiltered)
}else{
const visible=newFiltered.slice(0,FREE_NEW_MEMBERS)
const blurred=newFiltered.slice(FREE_NEW_MEMBERS).map((u:any)=>({...u,isBlurred:true,avatar_url:undefined,display_name:'???'}))
setNewUsers([...visible,...blurred])
}

const{data,error}=await supabase.from('users').select('id,username,display_name,title,bio,age,avatar_url,location,preferences,looking_for,relationship_type,latitude,longitude,is_online,is_premium,boosted_until').neq('id',user.id).eq('is_active',true).limit(99)
if(error){Alert.alert('Error',error.message)}else{
const filtered=(data||[]).filter((u:User)=>!blockedIds.includes(u.id))
const withDist=filtered.map((u:User)=>{
if(localCoords&&u.latitude&&u.longitude){
const R=3958.8
const dLat=(u.latitude-localCoords.lat)*Math.PI/180
const dLon=(u.longitude-localCoords.lng)*Math.PI/180
const a=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(localCoords.lat*Math.PI/180)*Math.cos(u.latitude*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2)
return{...u,_dist:R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))}
}
return{...u,_dist:9999}
})
const onlineFiltered=showOnlineOnly?withDist.filter((u:any)=>u.is_online):withDist
const nearbyFiltered=filter==='nearby'?onlineFiltered.filter((u:any)=>u._dist<=200):onlineFiltered
nearbyFiltered.sort((a:any,b:any)=>{
const aBoost=a.boosted_until&&new Date(a.boosted_until)>new Date()?1:0
const bBoost=b.boosted_until&&new Date(b.boosted_until)>new Date()?1:0
if(bBoost!==aBoost)return bBoost-aBoost
if(b.is_premium!==a.is_premium)return(b.is_premium?1:0)-(a.is_premium?1:0)
return a._dist-b._dist
})
setUsers(nearbyFiltered)
setFilteredUsers(nearbyFiltered)
}
setLoading(false)
}

const handleViewProfile=(user:User)=>{
if(!isPremiumUser&&viewsUsedToday>=VIEW_LIMIT){
setShowViewLimit(true)
return
}
setSelectedUser(user)
setShowModal(true)
if(!isPremiumUser){
setViewsUsedToday(c=>c+1)
supabase.from('profile_views').insert({viewer_id:currentUserId,viewed_id:user.id}).then(()=>{})
}
}

const handleBoost=async()=>{
const{data:{user}}=await supabase.auth.getUser()
if(!user)return
setBoostingNow(true)
try{
let success=false
if(isPremiumUser){
success=await activateBoost(user.id)
}else{
const purchased=await purchaseBoost()
if(purchased)success=await activateBoost(user.id)
}
if(success){
setIsBoosted(true)
setShowBoostModal(false)
Alert.alert('Profile Boosted!','Your profile is now at the top of Discover for 24 hours!')
loadUsers()
}else{
Alert.alert('Error','Could not activate boost. Please try again.')
}
}catch(e){
Alert.alert('Error','Something went wrong. Please try again.')
}
setBoostingNow(false)
}

const handleLike=async(likedId:string)=>{
if(!currentUserId)return
if(!isPremiumUser&&likesUsedToday>=LIKE_LIMIT){
Alert.alert('Daily Limit Reached',`Free users can send ${LIKE_LIMIT} likes per day. Upgrade to Premium for unlimited!`,[
{text:'Upgrade 👑',onPress:()=>onUpgrade&&onUpgrade()},
{text:'OK',style:'cancel'}
])
return
}
if(likedIds.has(likedId)){
await supabase.from('likes').delete().eq('liker_id',currentUserId).eq('liked_id',likedId)
setLikedIds(prev=>{const n=new Set(prev);n.delete(likedId);return n})
setLikesUsedToday(c=>Math.max(0,c-1))
}else{
const{error}=await supabase.from('likes').insert({liker_id:currentUserId,liked_id:likedId})
if(!error){
setLikedIds(prev=>new Set([...prev,likedId]));try{const{data:{user}}=await supabase.auth.getUser();if(user){const{data:myProf}=await supabase.from('users').select('display_name').eq('id',user.id).single();if(myProf){
notifyProfileLiked(likedId,myProf.display_name).catch(()=>{})
// Check for mutual match
const{data:mutualLike}=await supabase.from('likes').select('id').eq('liker_id',likedId).eq('liked_id',user.id).maybeSingle()
if(mutualLike){
// It's a match! Notify both users
notifyNewMatch(likedId,myProf.display_name).catch(()=>{})
Alert.alert('Its a Match!','You and this person liked each other! Say hello!',[
{text:'Send Message',onPress:()=>{
const matchedUser=users.find((u:any)=>u.id===likedId)
if(matchedUser)onChat(matchedUser)
}},
{text:'Later',style:'cancel'}
])
}
}}}catch(e){}
if(!isPremiumUser)setLikesUsedToday(c=>c+1)
}
}
}

const handleApplyFilters=()=>{applyFilters(users as any[],minAge,maxAge,maxDistance,filterRelType);setShowAdvancedFilters(false)}
const handleResetFilters=()=>{setMinAge(18);setMaxAge(99);setMaxDistance(200);setFilterRelType('');setFilteredUsers(users)}

const handleToggleIncognito=async()=>{
if(!isPremiumUser){onUpgrade&&onUpgrade();return}
const next=!isIncognito
setIsIncognito(next)
const{error}=await supabase.from('users').update({is_incognito:next}).eq('id',currentUserId)
if(error){setIsIncognito(!next);Alert.alert('Error',error.message)}
}

const handleToggleFavorite=async(favId:string)=>{
const isFav=favorites.has(favId)
if(isFav){
await supabase.from('favorites').delete().eq('user_id',currentUserId).eq('favorited_id',favId)
setFavorites(prev=>{const n=new Set(prev);n.delete(favId);return n})
}else{
await supabase.from('favorites').insert({user_id:currentUserId,favorited_id:favId});try{const{data:{user}}=await supabase.auth.getUser();if(user){const{data:myProf}=await supabase.from('users').select('display_name').eq('id',user.id).single();if(myProf)await notifyProfileSaved(favId,myProf.display_name)}}catch(e){}
setFavorites(prev=>new Set([...prev,favId]))
}
}

const handleBlock=async(blockedId:string,name:string)=>{
Alert.alert('Block User',`Are you sure you want to block ${name}?`,[
{text:'Cancel',style:'cancel'},
{text:'Block',style:'destructive',onPress:async()=>{
await supabase.from('blocks').insert({blocker_id:currentUserId,blocked_id:blockedId})
setUsers(prev=>prev.filter(u=>u.id!==blockedId))
setFilteredUsers(prev=>prev.filter(u=>u.id!==blockedId))
setShowModal(false)
}}
])
}

const handleReport=(reportedId:string,name:string)=>{
Alert.alert('Report User','Why are you reporting '+name+'?',[
{text:'Cancel',style:'cancel'},
{text:'Inappropriate Photos',onPress:()=>submitReport(reportedId,'Inappropriate Photos')},
{text:'Harassment',onPress:()=>submitReport(reportedId,'Harassment')},
{text:'Fake Profile',onPress:()=>submitReport(reportedId,'Fake Profile')},
{text:'Spam',onPress:()=>submitReport(reportedId,'Spam')},
{text:'Other',onPress:()=>submitReport(reportedId,'Other')},
])
}

const submitReport=async(reportedId:string,reason:string)=>{
await supabase.from('reports').insert({reporter_id:currentUserId,reported_id:reportedId,reason})
Alert.alert('Report Submitted','Thank you for helping keep Syde Vibe safe.')
setShowModal(false)
}

const handleChat=(userId:string,user:any)=>{
setShowModal(false)
setTimeout(()=>onChat(user),300)
}

const handleNewUserChat=(user:User)=>{
if((user as any).isBlurred){onUpgrade&&onUpgrade();return}
if(!isPremiumUser&&chatCount>=2){
Alert.alert('Upgrade to Premium','Free users can message 2 new members per day. Upgrade for unlimited!',
[{text:'Upgrade',onPress:()=>onUpgrade&&onUpgrade()},{text:'Cancel',style:'cancel'}])
return
}
if(!isPremiumUser)setChatCount(c=>c+1)
onChat(user)
}

const calcDistance=(lat1:number,lng1:number,lat2:number,lng2:number)=>{
const R=3958.8
const dLat=(lat2-lat1)*Math.PI/180
const dLng=(lng2-lng1)*Math.PI/180
const a=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)*Math.sin(dLng/2)
const miles=R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))
if(miles<0.1)return'nearby'
if(miles<1)return Math.round(miles*5280)+'ft'
return miles.toFixed(1)+'mi'
}

const getDistance=(user:User)=>{
if(!myCoords||(user as any).latitude==null)return null
return calcDistance(myCoords.lat,myCoords.lng,(user as any).latitude,(user as any).longitude)
}

const promo=AFFILIATE_PROMOS[promoIndex]
const advancedFilterStyle={position:'absolute' as const,top:0,left:0,right:0,bottom:0,backgroundColor:'rgba(0,0,0,0.85)',zIndex:100,justifyContent:'center' as const,padding:24}
const favOverlayStyle={position:'absolute' as const,top:0,left:0,right:0,bottom:0,backgroundColor:'#0A2A4A',zIndex:90}
const searchOverlayStyle={position:'absolute' as const,top:0,left:0,right:0,bottom:0,backgroundColor:'#0A2A4A',zIndex:95}

return(
<View style={s.container}>
<SydeHeader
title="Discover"
leftAction={
<TouchableOpacity onPress={()=>setShowMyProfile(true)} style={{width:36,height:36,borderRadius:18,overflow:'hidden',borderWidth:2,borderColor:'rgba(255,255,255,0.5)'}}>
{myProfile?.avatar_url
?<Image source={{uri:myProfile.avatar_url}} style={{width:32,height:32,borderRadius:16}}/>
:<View style={{width:32,height:32,borderRadius:16,backgroundColor:'#2196F3',alignItems:'center',justifyContent:'center'}}>
<Text style={{color:'#ffffff',fontSize:14,fontWeight:'bold'}}>{myProfile?.display_name?.[0]||'?'}</Text>
</View>}
</TouchableOpacity>
}
rightAction={
<View style={{flexDirection:'row',alignItems:'center',gap:8}}>
{isPremiumUser&&<TouchableOpacity onPress={()=>setShowTravelMode(true)} style={{width:36,height:36,borderRadius:18,backgroundColor:travelCity?'rgba(33,150,243,0.5)':'rgba(255,255,255,0.2)',alignItems:'center',justifyContent:'center'}}>
<Text style={{fontSize:18}}>✈️</Text>
</TouchableOpacity>}
<TouchableOpacity onPress={()=>setShowSearch(true)} style={{width:36,height:36,borderRadius:18,backgroundColor:'rgba(255,255,255,0.2)',alignItems:'center',justifyContent:'center'}}>
<Text style={{fontSize:18}}>🔍</Text>
</TouchableOpacity>
<TouchableOpacity onPress={()=>setShowFavorites(true)} style={{width:36,height:36,borderRadius:18,backgroundColor:'rgba(255,255,255,0.2)',alignItems:'center',justifyContent:'center'}}>
<Text style={{fontSize:18}}>⭐</Text>
</TouchableOpacity>
<TouchableOpacity onPress={()=>setActiveTab&&setActiveTab('viewed')} style={{width:36,height:36,borderRadius:18,backgroundColor:'rgba(255,255,255,0.2)',alignItems:'center',justifyContent:'center'}}>
<Text style={{fontSize:18}}>👁️</Text>
</TouchableOpacity>
<TouchableOpacity onPress={loadUsers} style={{width:36,height:36,borderRadius:18,backgroundColor:'rgba(255,255,255,0.2)',alignItems:'center',justifyContent:'center'}}>
<Text style={{color:'#ffffff',fontSize:16}}>↻</Text>
</TouchableOpacity>
</View>
}
/>

<TouchableOpacity style={s.boostBannerFull} onPress={()=>setShowBoostModal(true)}>
<Text style={s.boostBannerIcon}>⚡</Text>
<View style={{flex:1}}>
<Text style={s.boostBannerTitle}>{isBoosted?'Profile Boosted!':'Boost Now'}</Text>
<Text style={s.boostBannerSub}>{isBoosted?'You are at the top of Discover':'Appear at the top of everyones feed'}</Text>
</View>
<View style={[s.boostBannerBtn,isBoosted&&{backgroundColor:'rgba(0,230,118,0.3)'}]}>
<Text style={s.boostBannerBtnText}>{isBoosted?'Active':'⚡ Boost'}</Text>
</View>
</TouchableOpacity>
<TouchableOpacity style={s.affiliateBanner} onPress={()=>Linking.openURL(promo.url)}>
<View style={{flex:1}}>
<Text style={s.affiliateLabel}>{promo.label}</Text>
<Text style={s.affiliateText}>{promo.text}</Text>
</View>
<View style={s.affiliateCta}>
<Text style={s.affiliateCtaText}>{promo.cta} →</Text>
</View>
</TouchableOpacity>

{newUsers.length>0&&(
<View style={s.newSection}>
<View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:16,marginBottom:8}}>
<Text style={s.newTitle}>🆕 New Members</Text>
{!isPremiumUser&&<TouchableOpacity onPress={()=>onUpgrade&&onUpgrade()}><Text style={{color:'#F5A623',fontSize:12,fontWeight:'700'}}>See all 👑</Text></TouchableOpacity>}
</View>
<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal:16,gap:10}}>
{newUsers.map((u,idx)=>(
<TouchableOpacity key={u.id+idx} style={s.newCard} onPress={()=>{
if((u as any).isBlurred){onUpgrade&&onUpgrade();return}
handleViewProfile(u)
}}>
<View style={s.newCardInner}>
{u.avatar_url&&!(u as any).isBlurred
?<Image source={{uri:u.avatar_url}} style={s.newCardImage}/>
:<View style={[s.newCardImage,{backgroundColor:(u as any).isBlurred?'rgba(0,0,0,0.5)':'rgba(33,150,243,0.4)',alignItems:'center',justifyContent:'center'}]}>
{(u as any).isBlurred
?<Text style={{fontSize:24}}>🔒</Text>
:<Text style={{color:'#fff',fontSize:22,fontWeight:'bold'}}>{u.display_name?.[0]||'?'}</Text>}
</View>}
{u.is_premium&&!(u as any).isBlurred&&<View style={s.newPremiumBadge}><Text style={{fontSize:8}}>💎</Text></View>}
<View style={s.newCardNameOverlay}>
<Text style={s.newCardNameInner} numberOfLines={1}>{(u as any).isBlurred?'👑':u.display_name}</Text>
</View>
</View>
</TouchableOpacity>
))}
</ScrollView>
<TouchableOpacity style={s.newBoostBanner} onPress={()=>setShowBoostModal(true)}>
<Text style={{fontSize:16,marginRight:8}}>⚡</Text>
<View style={{flex:1}}>
<Text style={{color:'#ffffff',fontSize:13,fontWeight:'800'}}>{isBoosted?'Profile Boosted!':'Boost Now'}</Text>
<Text style={{color:'rgba(255,255,255,0.6)',fontSize:11}}>{isBoosted?'You are at the top':'Get seen by more people'}</Text>
</View>
<View style={{backgroundColor:isBoosted?'rgba(0,230,118,0.3)':'#F5A623',borderRadius:8,paddingHorizontal:10,paddingVertical:5}}>
<Text style={{color:isBoosted?'#ffffff':'#0A1628',fontSize:12,fontWeight:'800'}}>{isBoosted?'Active':'⚡ Boost'}</Text>
</View>
</TouchableOpacity>
</View>
)}

{!isPremiumUser&&(
<View style={{paddingHorizontal:16,marginBottom:4,flexDirection:'row',justifyContent:'flex-end'}}>
<Text style={{color:'rgba(255,255,255,0.5)',fontSize:11}}>❤️ {likesUsedToday}/{LIKE_LIMIT} likes used today</Text>
</View>
)}

<View style={s.filterRow}>
{isPremiumUser&&(
<TouchableOpacity onPress={()=>setShowAdvancedFilters(true)} style={{width:36,height:36,borderRadius:18,backgroundColor:'rgba(245,166,35,0.3)',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#F5A623',marginRight:4}}>
<Text style={{fontSize:16}}>⚙️</Text>
</TouchableOpacity>
)}
<TouchableOpacity style={[s.filterTab,filter==='nearby'&&s.filterTabActive]} onPress={()=>setFilter('nearby')}>
<Text style={[s.filterText,filter==='nearby'&&s.filterTextActive]}>📍 Nearby</Text>
</TouchableOpacity>
<TouchableOpacity style={[s.filterTab,filter==='global'&&s.filterTabActive]} onPress={()=>setFilter('global')}>
<Text style={[s.filterText,filter==='global'&&s.filterTextActive]}>🌍 Global</Text>
</TouchableOpacity>
<TouchableOpacity style={[s.filterTab,isIncognito&&s.incognitoActive]} onPress={handleToggleIncognito}>
<Text style={[s.filterText,isIncognito&&s.filterTextActive]}>🕶️ Incognito</Text>
</TouchableOpacity>
<TouchableOpacity style={[s.filterTab,showOnlineOnly&&s.onlineActive]} onPress={()=>setShowOnlineOnly(!showOnlineOnly)}>
<Text style={[s.filterText,showOnlineOnly&&s.filterTextActive]}>🟢 Online</Text>
</TouchableOpacity>
</View>

{filter==='nearby'&&!currentLocation&&(
<View style={s.banner}>
<Text style={s.bannerText}>Add your location in Profile to see nearby people</Text>
</View>
)}

{showWhoLikedMe&&(
<View style={{backgroundColor:'rgba(255,100,100,0.1)',marginHorizontal:16,marginBottom:12,borderRadius:16,padding:12,borderWidth:1,borderColor:'rgba(255,100,100,0.3)'}}>
<View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
<Text style={{color:'#ffffff',fontSize:14,fontWeight:'800'}}>❤️ Who Liked You</Text>
{!isPremiumUser&&<TouchableOpacity onPress={()=>onUpgrade&&onUpgrade()}>
<Text style={{color:'#F5A623',fontSize:12,fontWeight:'700'}}>Unlock all 👑</Text>
</TouchableOpacity>}
</View>
{whoLikedMe.length===0
?<Text style={{color:'rgba(255,255,255,0.6)',fontSize:13,textAlign:'center',paddingVertical:8}}>No likes yet — keep discovering!</Text>
:<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:10}}>
{whoLikedMe.map((u:any,i:number)=>(
<TouchableOpacity key={u.id+i} style={{alignItems:'center',width:70}} onPress={()=>{
if(u.isBlurred){onUpgrade&&onUpgrade();return}
setShowWhoLikedMe(false);setSelectedUser(u);setShowModal(true)
}}>
<View style={{width:60,height:60,borderRadius:30,overflow:'hidden',borderWidth:2,borderColor:'#ff6b6b'}}>
{u.avatar_url&&!u.isBlurred
?<Image source={{uri:u.avatar_url}} style={{width:60,height:60}}/>
:<View style={{width:60,height:60,backgroundColor:'rgba(255,100,100,0.3)',alignItems:'center',justifyContent:'center'}}>
{u.isBlurred?<Text style={{fontSize:20}}>🔒</Text>:<Text style={{color:'#fff',fontSize:20,fontWeight:'bold'}}>{u.display_name?.[0]||'?'}</Text>}
</View>}
</View>
<Text style={{color:'#ffffff',fontSize:9,marginTop:4,textAlign:'center'}} numberOfLines={1}>{u.isBlurred?'???':u.display_name}</Text>
</TouchableOpacity>
))}
</ScrollView>}
</View>
)}

{loading
?<View style={s.center}><Text style={s.loadingText}>Finding people...</Text></View>
:filteredUsers.length===0
?<View style={s.center}>
<Text style={s.loadingText}>{filter==='nearby'?'No one within range — try Global!':'No one here yet'}</Text>
<Text style={s.subText}>{filter==='nearby'?'Try switching to Global':'Check back soon!'}</Text>
</View>
:<FlatList
data={filteredUsers}
keyExtractor={i=>i.id}
numColumns={3}
contentContainerStyle={s.grid}
columnWrapperStyle={s.row}

renderItem={({item,index})=>{
const isLocked=!isPremiumUser&&index>=VIEW_LIMIT
return(<>
<TouchableOpacity style={s.card} onPress={()=>isLocked?setShowViewLimit(true):handleViewProfile(item)}>
<View style={s.cardInner}>
{item.avatar_url?(
<Image source={{uri:item.avatar_url}} style={s.cardImage}/>
):(
<View style={s.cardPlaceholder}>
<Text style={s.cardPlaceholderText}>{item.display_name?.[0]||'?'}</Text>
</View>
)}
{!isLocked&&favorites.has(item.id)&&<View style={s.favBadge}><Text style={s.favBadgeText}>⭐</Text></View>}
{!isLocked&&item.is_online&&<View style={s.onlineDot}/>}
{!isLocked&&item.is_premium&&<View style={s.premiumBadge}><Text style={s.premiumBadgeText}>💎</Text></View>}
{!isLocked&&(item as any).boosted_until&&new Date((item as any).boosted_until)>new Date()&&<View style={s.boostBadge}><Text style={{fontSize:10}}>⚡</Text></View>}
{!isLocked&&likedIds.has(item.id)&&<View style={s.likedBadge}><Text style={{fontSize:10}}>❤️</Text></View>}
{!isLocked&&(()=>{const d=getDistance(item as any);return d?<View style={s.distBadge}><Text style={s.distText}>{d}</Text></View>:null})()}
</View>
<Text style={s.cardTitle} numberOfLines={1}>{item.title||item.display_name}</Text>
{!isLocked&&<TouchableOpacity style={[s.likeBtn,likedIds.has(item.id)&&s.likeBtnActive]} onPress={()=>handleLike(item.id)}>
<Text style={{fontSize:12}}>{likedIds.has(item.id)?'❤️':'🤍'}</Text>
</TouchableOpacity>}
</TouchableOpacity>

</>)
}}
/>}

<ProfileModal user={myProfile} visible={showMyProfile} onClose={()=>setShowMyProfile(false)} onChat={()=>{}} isFavorite={false} onToggleFavorite={()=>{}} onBlock={()=>{}} viewerIsPremium={isPremiumUser}/>
<ProfileModal user={selectedUser} visible={showModal} onClose={()=>setShowModal(false)} onChat={handleChat} isFavorite={selectedUser?favorites.has(selectedUser.id):false} onToggleFavorite={handleToggleFavorite} onBlock={handleBlock} onReport={handleReport} viewerIsPremium={isPremiumUser}/>

{showFavorites&&(
<View style={favOverlayStyle}>
<FavoritesScreen onClose={()=>setShowFavorites(false)} onChat={(user)=>{setShowFavorites(false);setTimeout(()=>onChat(user),400)}}/>
</View>
)}

{showWhoLikedMe&&(<View style={{position:'absolute',top:0,left:0,right:0,bottom:0,backgroundColor:'#0A2A4A',zIndex:92}}><WhoLikedMeScreen onClose={()=>setShowWhoLikedMe(false)} whoLikedMe={whoLikedMe} isPremium={isPremiumUser} onUpgrade={()=>{setShowWhoLikedMe(false);onUpgrade&&onUpgrade()}} onChat={(user)=>{setShowWhoLikedMe(false);setTimeout(()=>onChat(user),400)}}/></View>)}{showSearch&&(
<View style={searchOverlayStyle}>
<SearchScreen onClose={()=>setShowSearch(false)} onChat={onChat} isPremium={isPremiumUser} onUpgrade={()=>{setShowSearch(false);onUpgrade&&onUpgrade()}}/>
</View>
)}

<Modal visible={showBoostModal} transparent animationType="fade">
<View style={{flex:1,backgroundColor:'rgba(0,0,0,0.85)',alignItems:'center',justifyContent:'center',padding:32}}>
<View style={{backgroundColor:'#0A2A4A',borderRadius:24,padding:28,width:'100%',borderWidth:1,borderColor:'rgba(245,166,35,0.5)'}}>
<Text style={{fontSize:48,textAlign:'center',marginBottom:12}}>⚡</Text>
<Text style={{color:'#ffffff',fontSize:22,fontWeight:'900',marginBottom:8,textAlign:'center'}}>Profile Boost</Text>
<Text style={{color:'rgba(255,255,255,0.7)',fontSize:14,textAlign:'center',marginBottom:20,lineHeight:22}}>Boost your profile to the top of Discover for 24 hours. Get seen by more people and get more matches!</Text>
<View style={{backgroundColor:'rgba(245,166,35,0.15)',borderRadius:12,padding:16,marginBottom:20,borderWidth:1,borderColor:'rgba(245,166,35,0.3)'}}>
<Text style={{color:'#F5A623',fontSize:18,fontWeight:'900',textAlign:'center'}}>{isPremiumUser?'Free with Premium':'3 Boosts — $2.99'}</Text>
<Text style={{color:'rgba(255,255,255,0.6)',fontSize:12,textAlign:'center',marginTop:4}}>{isPremiumUser?'1 free boost per week included':'$1.00 per boost'}</Text>
</View>
<TouchableOpacity style={{backgroundColor:'#F5A623',borderRadius:12,padding:16,alignItems:'center',marginBottom:12}} onPress={handleBoost} disabled={boostingNow}>
<Text style={{color:'#0A1628',fontSize:17,fontWeight:'900'}}>{boostingNow?'Boosting...':(isPremiumUser?'Activate Free Boost':'Buy 3 Boosts — $2.99')}</Text>
</TouchableOpacity>
<TouchableOpacity onPress={()=>setShowBoostModal(false)} style={{padding:12,alignItems:'center'}}>
<Text style={{color:'rgba(255,255,255,0.5)',fontSize:14}}>Maybe later</Text>
</TouchableOpacity>
</View>
</View>
</Modal>
<Modal visible={showViewLimit} transparent animationType="fade">
<View style={{flex:1,backgroundColor:'rgba(0,0,0,0.85)',alignItems:'center',justifyContent:'center',padding:32}}>
<View style={{backgroundColor:'#0A2A4A',borderRadius:24,padding:28,alignItems:'center',borderWidth:1,borderColor:'rgba(245,166,35,0.5)'}}>
<Text style={{fontSize:48,marginBottom:12}}>👑</Text>
<Text style={{color:'#ffffff',fontSize:22,fontWeight:'900',marginBottom:8,textAlign:'center'}}>You've seen {VIEW_LIMIT} profiles today!</Text>
<Text style={{color:'rgba(255,255,255,0.7)',fontSize:15,textAlign:'center',marginBottom:24,lineHeight:22}}>Free users can view {VIEW_LIMIT} profiles per day. Upgrade to Premium for unlimited profile views and much more!</Text>
<TouchableOpacity style={{backgroundColor:'#F5A623',borderRadius:16,padding:16,width:'100%',alignItems:'center',marginBottom:12}} onPress={()=>{setShowViewLimit(false);onUpgrade&&onUpgrade()}}>
<Text style={{color:'#0A1628',fontSize:17,fontWeight:'900'}}>Upgrade to Premium — $9.99/mo</Text>
</TouchableOpacity>
<TouchableOpacity onPress={()=>setShowViewLimit(false)} style={{padding:12}}>
<Text style={{color:'rgba(255,255,255,0.5)',fontSize:14}}>Maybe later</Text>
</TouchableOpacity>
</View>
</View>
</Modal>

{showAdvancedFilters&&(
<View style={advancedFilterStyle}>
<View style={{backgroundColor:'#0A2A4A',borderRadius:24,padding:24}}>
<Text style={{color:'#ffffff',fontSize:20,fontWeight:'800',marginBottom:20}}>Advanced Filters</Text>
<Text style={{color:'rgba(255,255,255,0.7)',fontSize:14,marginBottom:8}}>Min Age: {minAge}</Text>
<View style={{flexDirection:'row',gap:8,marginBottom:16}}>
{[18,25,30,40,50].map(age=>(
<TouchableOpacity key={String(age)} onPress={()=>setMinAge(age)} style={{paddingHorizontal:10,paddingVertical:6,borderRadius:16,backgroundColor:minAge===age?'#2196F3':'rgba(255,255,255,0.1)'}}>
<Text style={{color:'#ffffff',fontSize:12}}>{String(age)}+</Text>
</TouchableOpacity>
))}
</View>
<Text style={{color:'rgba(255,255,255,0.7)',fontSize:14,marginBottom:8}}>Max Distance: {maxDistance===200?'Any':maxDistance+' mi'}</Text>
<View style={{flexDirection:'row',gap:8,marginBottom:16}}>
{[25,50,100,200].map(d=>(
<TouchableOpacity key={String(d)} onPress={()=>setMaxDistance(d)} style={{paddingHorizontal:10,paddingVertical:6,borderRadius:16,backgroundColor:maxDistance===d?'#2196F3':'rgba(255,255,255,0.1)'}}>
<Text style={{color:'#ffffff',fontSize:12}}>{d===200?'Any':d+'mi'}</Text>
</TouchableOpacity>
))}
</View>
<Text style={{color:'rgba(255,255,255,0.7)',fontSize:14,marginBottom:8}}>Relationship Type</Text>
<View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:20}}>
{['','Monogamous','Open','Casual','Friends'].map(rt=>(
<TouchableOpacity key={rt} onPress={()=>setFilterRelType(rt)} style={{paddingHorizontal:10,paddingVertical:6,borderRadius:16,backgroundColor:filterRelType===rt?'#2196F3':'rgba(255,255,255,0.1)'}}>
<Text style={{color:'#ffffff',fontSize:12}}>{rt===''?'Any':rt}</Text>
</TouchableOpacity>
))}
</View>
<TouchableOpacity onPress={()=>{setShowAdvancedFilters(false);setShowFavorites(true)}} style={{flexDirection:'row',alignItems:'center',justifyContent:'center',paddingVertical:12,borderRadius:16,backgroundColor:'rgba(241,90,34,0.2)',borderWidth:1,borderColor:'rgba(255,140,0,0.4)',marginBottom:16}}>
<Text style={{color:'#FF8C00',fontSize:15,fontWeight:'700'}}>❤️  View Saved Profiles</Text>
</TouchableOpacity>
<View style={{flexDirection:'row',gap:12}}>
<TouchableOpacity onPress={handleResetFilters} style={{flex:1,paddingVertical:12,borderRadius:20,backgroundColor:'rgba(255,255,255,0.1)',alignItems:'center'}}>
<Text style={{color:'#ffffff',fontWeight:'600'}}>Reset</Text>
</TouchableOpacity>
<TouchableOpacity onPress={handleApplyFilters} style={{flex:1,paddingVertical:12,borderRadius:20,backgroundColor:'#2196F3',alignItems:'center'}}>
<Text style={{color:'#ffffff',fontWeight:'700'}}>Apply</Text>
</TouchableOpacity>
</View>
</View>
</View>
)}
</View>
)
}

const s=StyleSheet.create({
container:{flex:1},
affiliateBanner:{flexDirection:'row',alignItems:'center',marginHorizontal:16,marginBottom:10,backgroundColor:'rgba(245,166,35,0.15)',borderRadius:12,padding:12,borderWidth:1,borderColor:'rgba(245,166,35,0.4)'},
affiliateLabel:{color:'#F5A623',fontSize:11,fontWeight:'800',marginBottom:2},
affiliateText:{color:'rgba(255,255,255,0.8)',fontSize:12},
affiliateCta:{backgroundColor:'#F5A623',borderRadius:8,paddingHorizontal:10,paddingVertical:6,marginLeft:8},
affiliateCtaText:{color:'#0A1628',fontSize:11,fontWeight:'800'},
newSection:{marginBottom:12},
newTitle:{color:'#ffffff',fontSize:14,fontWeight:'800'},
newCard:{width:NEW_CARD_SIZE,alignItems:'center'},
newCardInner:{width:NEW_CARD_SIZE,height:NEW_CARD_SIZE,borderRadius:16,overflow:'hidden',position:'relative',marginBottom:4},
newCardImage:{width:NEW_CARD_SIZE,height:NEW_CARD_SIZE},
newPremiumBadge:{position:'absolute',top:4,right:4,backgroundColor:'rgba(245,166,35,0.9)',borderRadius:6,padding:2},
newCardName:{color:'#ffffff',fontSize:10,fontWeight:'600',textAlign:'center',width:NEW_CARD_SIZE},
newCardNameOverlay:{position:'absolute',bottom:0,left:0,right:0,backgroundColor:'rgba(0,0,0,0.5)',paddingVertical:4,paddingHorizontal:4},
newCardNameInner:{color:'#ffffff',fontSize:9,fontWeight:'700',textAlign:'center'},
newBoostBanner:{flexDirection:'row',alignItems:'center',marginHorizontal:16,marginTop:8,backgroundColor:'rgba(245,166,35,0.15)',borderRadius:12,padding:10,borderWidth:1,borderColor:'rgba(245,166,35,0.4)'},
newChatBtn:{marginTop:4,backgroundColor:'rgba(33,150,243,0.4)',borderRadius:12,paddingHorizontal:10,paddingVertical:4,borderWidth:1,borderColor:'#2196F3'},
newChatBtnText:{fontSize:12},
filterRow:{flexDirection:'row',marginHorizontal:16,marginBottom:12,backgroundColor:'rgba(255,255,255,0.15)',borderRadius:12,padding:4},
filterTab:{flex:1,paddingVertical:8,alignItems:'center',borderRadius:10},
filterTabActive:{backgroundColor:'#2196F3'},
incognitoActive:{backgroundColor:'#5E35B1'},
likesActive:{backgroundColor:'rgba(255,100,100,0.5)'},
onlineActive:{backgroundColor:'rgba(0,230,118,0.3)'},
filterText:{fontSize:12,color:'rgba(255,255,255,0.7)',fontWeight:'500'},
filterTextActive:{color:'#ffffff',fontWeight:'700'},
banner:{marginHorizontal:16,marginBottom:12,backgroundColor:'rgba(241,90,34,0.2)',borderRadius:10,padding:12,borderWidth:1,borderColor:'rgba(255,140,0,0.4)'},
bannerText:{color:'#FF8C00',fontSize:13,textAlign:'center'},
center:{flex:1,alignItems:'center',justifyContent:'center'},
grid:{padding:12},
row:{gap:8,marginBottom:8},
card:{width:CARD_SIZE,alignItems:'center'},
cardInner:{width:CARD_SIZE,height:CARD_SIZE,borderRadius:12,overflow:'hidden',position:'relative'},
cardImage:{width:CARD_SIZE,height:CARD_SIZE},
cardPlaceholder:{width:CARD_SIZE,height:CARD_SIZE,backgroundColor:'rgba(33,150,243,0.4)',alignItems:'center',justifyContent:'center'},
cardPlaceholderText:{color:'#ffffff',fontSize:28,fontWeight:'bold'},
favBadge:{position:'absolute',top:4,right:4,backgroundColor:'rgba(0,0,0,0.5)',borderRadius:10,padding:2},
favBadgeText:{fontSize:12},
likedBadge:{position:'absolute',top:4,left:4,backgroundColor:'rgba(0,0,0,0.5)',borderRadius:10,padding:2},
likeBtn:{marginTop:4,backgroundColor:'rgba(255,255,255,0.1)',borderRadius:10,paddingHorizontal:8,paddingVertical:3,borderWidth:1,borderColor:'rgba(255,255,255,0.2)'},
likeBtnActive:{backgroundColor:'rgba(255,100,100,0.3)',borderColor:'#ff6b6b'},
cardTitle:{color:'#ffffff',fontSize:11,marginTop:4,textAlign:'center',fontWeight:'500',width:CARD_SIZE},
loadingText:{color:'#ffffff',fontSize:18,fontWeight:'600'},
subText:{color:'rgba(255,255,255,0.7)',fontSize:14,marginTop:8},
distBadge:{position:'absolute',bottom:4,left:4,backgroundColor:'rgba(0,0,0,0.65)',borderRadius:8,paddingHorizontal:5,paddingVertical:2},
distText:{color:'#ffffff',fontSize:9,fontWeight:'700'},
onlineDot:{position:'absolute',top:6,left:6,width:10,height:10,borderRadius:5,backgroundColor:'#00E676',borderWidth:1.5,borderColor:'#ffffff'},
premiumBadge:{position:'absolute',bottom:4,right:4,backgroundColor:'rgba(245,166,35,0.9)',borderRadius:8,paddingHorizontal:4,paddingVertical:1},
boostBadge:{position:'absolute',top:4,right:4,backgroundColor:'rgba(245,166,35,0.9)',borderRadius:8,paddingHorizontal:4,paddingVertical:1},
boostBanner:{flexDirection:'row',alignItems:'center',backgroundColor:'rgba(245,166,35,0.15)',borderRadius:16,padding:16,marginTop:8,marginHorizontal:0,borderWidth:1,borderColor:'rgba(245,166,35,0.4)'},
boostBannerFull:{flexDirection:'row',alignItems:'center',marginHorizontal:16,marginBottom:10,backgroundColor:'rgba(245,166,35,0.15)',borderRadius:12,padding:12,borderWidth:1,borderColor:'rgba(245,166,35,0.4)'},
boostBannerIcon:{fontSize:28,marginRight:12},
boostBannerTitle:{color:'#ffffff',fontSize:15,fontWeight:'800'},
boostBannerSub:{color:'rgba(255,255,255,0.6)',fontSize:12,marginTop:2},
boostBannerBtn:{backgroundColor:'#F5A623',borderRadius:10,paddingHorizontal:14,paddingVertical:8,marginLeft:8},
boostBannerBtnText:{color:'#0A1628',fontSize:13,fontWeight:'800'},
premiumBadgeText:{fontSize:10},
cardAge:{color:'rgba(255,255,255,0.6)',fontSize:9,textAlign:'center',width:CARD_SIZE},
})
