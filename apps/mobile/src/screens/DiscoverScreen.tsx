import{useEffect,useState}from'react'
import{View,Text,TouchableOpacity,StyleSheet,FlatList,Alert,Image}from'react-native'
import{supabase}from'../lib/supabase'
import SydeHeader from'../components/SydeHeader'
type User={id:string;username:string;display_name:string;bio:string;age:number;avatar_url?:string;location?:string}
export default function DiscoverScreen(){
const[users,setUsers]=useState<User[]>([])
const[loading,setLoading]=useState(true)
const[currentUserId,setCurrentUserId]=useState<string|null>(null)
const[currentLocation,setCurrentLocation]=useState<string|null>(null)
const[filter,setFilter]=useState<'nearby'|'global'|'favorites'>('global')
const[favorites,setFavorites]=useState<Set<string>>(new Set())
useEffect(()=>{loadUsers()},[filter])
const loadUsers=async()=>{
setLoading(true)
const{data:{user}}=await supabase.auth.getUser()
if(!user)return
setCurrentUserId(user.id)
const{data:myProfile}=await supabase.from('users').select('location').eq('id',user.id).single()
setCurrentLocation(myProfile?.location||null)
const{data:favData}=await supabase.from('favorites').select('favorited_id').eq('user_id',user.id)
const favIds=favData?favData.map((f:any)=>f.favorited_id):[]
if(favData)setFavorites(new Set(favIds))
const{data:blockData}=await supabase.from('blocks').select('blocked_id').eq('blocker_id',user.id)
const blockedIds=blockData?blockData.map((b:any)=>b.blocked_id):[]
if(filter==='favorites'){
if(favIds.length===0){setUsers([]);setLoading(false);return}
const{data,error}=await supabase.from('users').select('id,username,display_name,bio,age,avatar_url,location').in('id',favIds)
if(!error)setUsers((data||[]).filter((u:User)=>!blockedIds.includes(u.id)))
setLoading(false)
return
}
let query=supabase.from('users').select('id,username,display_name,bio,age,avatar_url,location').neq('id',user.id).eq('is_active',true).limit(50)
if(filter==='nearby'&&myProfile?.location){query=query.ilike('location',`%${myProfile.location.split(',')[0].trim()}%`)}
const{data,error}=await query
if(error)Alert.alert('Error',error.message)
else setUsers((data||[]).filter((u:User)=>!blockedIds.includes(u.id)))
setLoading(false)
}
const handleLike=async(likedId:string)=>{
const{error}=await supabase.from('likes').insert({liker_id:currentUserId,liked_id:likedId})
if(error)Alert.alert('Error',error.message)
else setUsers(prev=>prev.filter(u=>u.id!==likedId))
}
const handleFavorite=async(favId:string)=>{
const isFav=favorites.has(favId)
if(isFav){
await supabase.from('favorites').delete().eq('user_id',currentUserId).eq('favorited_id',favId)
setFavorites(prev=>{const n=new Set(prev);n.delete(favId);return n})
if(filter==='favorites')setUsers(prev=>prev.filter(u=>u.id!==favId))
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
}}
])
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
:<FlatList data={users} keyExtractor={i=>i.id} contentContainerStyle={s.list} renderItem={({item})=>(
<View style={s.card}>
<View style={s.cardLeft}>
{item.avatar_url?<Image source={{uri:item.avatar_url}} style={s.avatarImage}/>:<View style={s.avatar}><Text style={s.avatarText}>{item.display_name?.[0]||'?'}</Text></View>}
</View>
<View style={s.info}>
<Text style={s.name}>{item.display_name}</Text>
<Text style={s.username}>@{item.username} · {item.age}</Text>
{item.location?<Text style={s.location}>📍 {item.location}</Text>:null}
{item.bio?<Text style={s.bio} numberOfLines={2}>{item.bio}</Text>:null}
</View>
<View style={s.actions}>
<TouchableOpacity style={s.starButton} onPress={()=>handleFavorite(item.id)}>
<Text style={[s.starText,favorites.has(item.id)&&s.starActive]}>{favorites.has(item.id)?'★':'☆'}</Text>
</TouchableOpacity>
<TouchableOpacity style={s.likeButton} onPress={()=>handleLike(item.id)}>
<Text style={s.likeText}>♥</Text>
</TouchableOpacity>
<TouchableOpacity style={s.blockButton} onPress={()=>handleBlock(item.id,item.display_name)}>
<Text style={s.blockText}>🚫</Text>
</TouchableOpacity>
</View>
</View>
)}/>}
</View>
)
}
const s=StyleSheet.create({
container:{flex:1,backgroundColor:'transparent'},
filterRow:{flexDirection:'row',marginHorizontal:16,marginBottom:12,backgroundColor:'rgba(255,255,255,0.4)',borderRadius:12,padding:4},
filterTab:{flex:1,paddingVertical:8,alignItems:'center',borderRadius:10},
filterTabActive:{backgroundColor:'#2196F3'},
filterText:{fontSize:12,color:'rgba(255,255,255,0.7)',fontWeight:'500'},
filterTextActive:{color:'#ffffff',fontWeight:'700'},
banner:{marginHorizontal:16,marginBottom:12,backgroundColor:'rgba(241,90,34,0.1)',borderRadius:10,padding:12,borderWidth:1,borderColor:'rgba(241,90,34,0.3)'},
bannerText:{color:'#FF8C00',fontSize:13,textAlign:'center'},
center:{flex:1,alignItems:'center',justifyContent:'center'},
list:{paddingHorizontal:16,paddingBottom:24},
card:{backgroundColor:'rgba(255,255,255,0.15)',borderRadius:16,padding:16,marginBottom:12,flexDirection:'row',alignItems:'center',borderWidth:1,borderColor:'rgba(255,255,255,0.25)'},
cardLeft:{marginRight:12},
avatarImage:{width:52,height:52,borderRadius:26},
avatar:{width:52,height:52,borderRadius:26,backgroundColor:'#2196F3',alignItems:'center',justifyContent:'center'},
avatarText:{color:'#ffffff',fontSize:22,fontWeight:'bold'},
info:{flex:1},
name:{color:'#ffffff',fontSize:16,fontWeight:'600',marginBottom:2},
username:{color:'rgba(255,255,255,0.7)',fontSize:13,marginBottom:2},
location:{color:'#2196F3',fontSize:12,marginBottom:2},
bio:{color:'rgba(255,255,255,0.8)',fontSize:13},
actions:{flexDirection:'column',alignItems:'center',gap:4},
starButton:{width:32,height:32,alignItems:'center',justifyContent:'center'},
starText:{fontSize:20,color:'#aabbcc'},
starActive:{color:'#FF8C00'},
likeButton:{width:32,height:32,borderRadius:16,backgroundColor:'rgba(241,90,34,0.15)',alignItems:'center',justifyContent:'center'},
likeText:{color:'#FF8C00',fontSize:18},
blockButton:{width:32,height:32,alignItems:'center',justifyContent:'center'},
blockText:{fontSize:16},
loadingText:{color:'#ffffff',fontSize:18,fontWeight:'600'},
subText:{color:'rgba(255,255,255,0.7)',fontSize:14,marginTop:8},
})
