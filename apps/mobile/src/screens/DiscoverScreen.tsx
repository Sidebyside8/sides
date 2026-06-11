import{useEffect,useState}from'react'
import*as Location from'expo-location'
import{View,Text,TouchableOpacity,StyleSheet,FlatList,Alert,Image,Dimensions}from'react-native'
import{supabase}from'../lib/supabase'
import SydeHeader from'../components/SydeHeader'
import ProfileModal from'../components/ProfileModal'
import{notifyNewMatch}from'../lib/notifications'

const{width}=Dimensions.get('window')
const CARD_SIZE=(width-48)/3

type User={id:string;username:string;display_name:string;title?:string;bio?:string;age:number;avatar_url?:string;location?:string;preferences?:string[];looking_for?:string;relationship_type?:string}

export default function DiscoverScreen({onChat}:{onChat:(user:any)=>void}){
const[users,setUsers]=useState<User[]>([])
const[loading,setLoading]=useState(true)
const[currentUserId,setCurrentUserId]=useState<string|null>(null)
const[currentLocation,setCurrentLocation]=useState<string|null>(null)
const[filter,setFilter]=useState<'nearby'|'global'|'favorites'>('global')
const[favorites,setFavorites]=useState<Set<string>>(new Set())
const[selectedUser,setSelectedUser]=useState<User|null>(null)
const[showModal,setShowModal]=useState(false)
const[myCoords,setMyCoords]=useState<{lat:number;lng:number}|null>(null)

useEffect(()=>{loadUsers()},[filter])

const loadUsers=async()=>{
setLoading(true)
const{data:{user}}=await supabase.auth.getUser()
if(!user)return
setCurrentUserId(user.id)
const{data:myProfile}=await supabase.from('users').select('location,latitude,longitude').eq('id',user.id).single()
try{
const{status}=await Location.requestForegroundPermissionsAsync()
if(status==='granted'){
const loc=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced})
const lat=loc.coords.latitude
const lng=loc.coords.longitude
setMyCoords({lat,lng})
await supabase.from('users').update({latitude:lat,longitude:lng}).eq('id',user.id)
}else if(myProfile?.latitude){
setMyCoords({lat:myProfile.latitude,lng:myProfile.longitude})
}
}catch(e){if(myProfile?.latitude)setMyCoords({lat:myProfile.latitude,lng:myProfile.longitude})}
setCurrentLocation(myProfile?.location||null)
const{data:favData}=await supabase.from('favorites').select('favorited_id').eq('user_id',user.id)
const favIds=favData?favData.map((f:any)=>f.favorited_id):[]
if(favData)setFavorites(new Set(favIds))
const{data:blockData}=await supabase.from('blocks').select('blocked_id').eq('blocker_id',user.id)
const blockedIds=blockData?blockData.map((b:any)=>b.blocked_id):[]
if(filter==='favorites'){
if(favIds.length===0){setUsers([]);setLoading(false);return}
const{data}=await supabase.from('users').select('id,username,display_name,title,bio,age,avatar_url,location,preferences,looking_for,relationship_type,latitude,longitude').in('id',favIds)
setUsers((data||[]).filter((u:User)=>!blockedIds.includes(u.id)))
setLoading(false)
return
}
let query=supabase.from('users').select('id,username,display_name,title,bio,age,avatar_url,location,preferences,looking_for,relationship_type,latitude,longitude').neq('id',user.id).eq('is_active',true).limit(99)
if(filter==='nearby'&&myProfile?.location){query=query.ilike('location',`%${myProfile.location.split(',')[0].trim()}%`)}
const{data,error}=await query
if(error)Alert.alert('Error',error.message)
else setUsers((data||[]).filter((u:User)=>!blockedIds.includes(u.id)))
setLoading(false)
}

const handleToggleFavorite=async(favId:string)=>{
const isFav=favorites.has(favId)
if(isFav){
await supabase.from('favorites').delete().eq('user_id',currentUserId).eq('favorited_id',favId)
setFavorites(prev=>{const n=new Set(prev);n.delete(favId);return n})
}else{
await supabase.from('favorites').insert({user_id:currentUserId,favorited_id:favId})
setFavorites(prev=>new Set([...prev,favId]))
}
}

const handleBlock=async(blockedId:string,name:string)=>{
Alert.alert('Block User',`Are you sure you want to block ${name}?`,[
{text:'Cancel',style:'cancel'},
{text:'Block',style:'destructive',onPress:async()=>{
await supabase.from('blocks').insert({blocker_id:currentUserId,blocked_id:blockedId})
setUsers(prev=>prev.filter(u=>u.id!==blockedId))
setShowModal(false)
}}
])
}

const handleChat=(userId:string,user:any)=>{
setShowModal(false)
setTimeout(()=>onChat(user),300)
}

const calcDistance=(lat1:number,lng1:number,lat2:number,lng2:number)=>{
const R=3958.8
const dLat=(lat2-lat1)*Math.PI/180
const dLng=(lng2-lng1)*Math.PI/180
const a=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)*Math.sin(dLng/2)
const c=2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))
const miles=R*c
if(miles<0.1)return'nearby'
if(miles<1)return Math.round(miles*5280)+'ft'
return miles.toFixed(1)+'mi'
}
const getDistance=(user:User)=>{
if(!myCoords||(user as any).latitude==null)return null
return calcDistance(myCoords.lat,myCoords.lng,(user as any).latitude,(user as any).longitude)
}
const handleCardPress=(user:User)=>{
setSelectedUser(user)
setShowModal(true)
}

return(
<View style={s.container}>
<SydeHeader title="Discover"/>
<View style={s.filterRow}>
<TouchableOpacity style={[s.filterTab,filter==='nearby'&&s.filterTabActive]} onPress={()=>setFilter('nearby')}>
<Text style={[s.filterText,filter==='nearby'&&s.filterTextActive]}>📍 Nearby</Text>
</TouchableOpacity>
<TouchableOpacity style={[s.filterTab,filter==='global'&&s.filterTabActive]} onPress={()=>setFilter('global')}>
<Text style={[s.filterText,filter==='global'&&s.filterTextActive]}>🌍 Global</Text>
</TouchableOpacity>
<TouchableOpacity style={[s.filterTab,filter==='favorites'&&s.filterTabActive]} onPress={()=>setFilter('favorites')}>
<Text style={[s.filterText,filter==='favorites'&&s.filterTextActive]}>★ Saved</Text>
</TouchableOpacity>
</View>
{filter==='nearby'&&!currentLocation&&<View style={s.banner}><Text style={s.bannerText}>Add your location in Profile to see nearby people</Text></View>}
{loading?<View style={s.center}><Text style={s.loadingText}>Finding people...</Text></View>
:users.length===0?<View style={s.center}>
<Text style={s.loadingText}>{filter==='favorites'?'No saved profiles yet':filter==='nearby'?'No one nearby yet':'No one here yet'}</Text>
<Text style={s.subText}>{filter==='favorites'?'Star profiles to save them here':filter==='nearby'?'Try switching to Global':'Check back soon!'}</Text>
</View>
:<FlatList
data={users}
keyExtractor={i=>i.id}
numColumns={3}
contentContainerStyle={s.grid}
columnWrapperStyle={s.row}
renderItem={({item})=>(
<TouchableOpacity style={s.card} onPress={()=>handleCardPress(item)}>
<View style={s.cardInner}>
{item.avatar_url?<Image source={{uri:item.avatar_url}} style={s.cardImage}/>
:<View style={s.cardPlaceholder}><Text style={s.cardPlaceholderText}>{item.display_name?.[0]||'?'}</Text></View>}
{favorites.has(item.id)&&<View style={s.favBadge}><Text style={s.favBadgeText}>⭐</Text></View>}
{(()=>{const d=getDistance(item as any);return d?<View style={s.distBadge}><Text style={s.distText}>{d}</Text></View>:null})()}
</View>
<Text style={s.cardTitle} numberOfLines={1}>{item.title||item.display_name}</Text>
</TouchableOpacity>
)}
/>}
<ProfileModal
user={selectedUser}
visible={showModal}
onClose={()=>setShowModal(false)}
onChat={handleChat}
isFavorite={selectedUser?favorites.has(selectedUser.id):false}
onToggleFavorite={handleToggleFavorite}
onBlock={handleBlock}
/>
</View>
)
}
const s=StyleSheet.create({
container:{flex:1},
filterRow:{flexDirection:'row',marginHorizontal:16,marginBottom:12,backgroundColor:'rgba(255,255,255,0.15)',borderRadius:12,padding:4},
filterTab:{flex:1,paddingVertical:8,alignItems:'center',borderRadius:10},
filterTabActive:{backgroundColor:'#2196F3'},
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
cardTitle:{color:'#ffffff',fontSize:11,marginTop:4,textAlign:'center',fontWeight:'500',width:CARD_SIZE},
loadingText:{color:'#ffffff',fontSize:18,fontWeight:'600'},
subText:{color:'rgba(255,255,255,0.7)',fontSize:14,marginTop:8},
distBadge:{position:'absolute',bottom:4,left:4,backgroundColor:'rgba(0,0,0,0.65)',borderRadius:8,paddingHorizontal:5,paddingVertical:2},
distText:{color:'#ffffff',fontSize:9,fontWeight:'700'},
})
