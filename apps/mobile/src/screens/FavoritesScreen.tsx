import{useEffect,useState}from'react'
import{View,Text,TouchableOpacity,StyleSheet,FlatList,Alert,Image}from'react-native'
import{supabase}from'../lib/supabase'
import SydeHeader from'../components/SydeHeader'
type FavUser={id:string;username:string;display_name:string;bio:string;age:number;avatar_url?:string;location?:string}
export default function FavoritesScreen(){
const[users,setUsers]=useState<FavUser[]>([])
const[loading,setLoading]=useState(true)
const[currentUserId,setCurrentUserId]=useState<string|null>(null)
useEffect(()=>{loadFavorites()},[])
const loadFavorites=async()=>{
const{data:{user}}=await supabase.auth.getUser()
if(!user)return
setCurrentUserId(user.id)
const{data:favData,error}=await supabase.from('favorites').select('favorited_id').eq('user_id',user.id)
if(error||!favData||favData.length===0){setUsers([]);setLoading(false);return}
const ids=favData.map((f:any)=>f.favorited_id)
const{data,error:usersError}=await supabase.from('users').select('id,username,display_name,bio,age,avatar_url,location').in('id',ids)
if(!usersError)setUsers(data||[])
setLoading(false)
}
const handleUnfavorite=async(favId:string)=>{
await supabase.from('favorites').delete().eq('user_id',currentUserId).eq('favorited_id',favId)
setUsers(prev=>prev.filter(u=>u.id!==favId))
}
const handleLike=async(likedId:string)=>{
const{error}=await supabase.from('likes').insert({liker_id:currentUserId,liked_id:likedId})
if(error)Alert.alert('Error',error.message)
else Alert.alert('Liked!','You liked this person')
}
return(
<View style={s.container}>
<SydeHeader title="Favorites"/>
{loading?<View style={s.center}><Text style={s.loadingText}>Loading favorites...</Text></View>
:users.length===0?<View style={s.center}><Text style={s.loadingText}>No favorites yet</Text><Text style={s.subText}>Star profiles on Discover to save them here</Text></View>
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
<TouchableOpacity style={s.starButton} onPress={()=>handleUnfavorite(item.id)}>
<Text style={s.starActive}>★</Text>
</TouchableOpacity>
<TouchableOpacity style={s.likeButton} onPress={()=>handleLike(item.id)}>
<Text style={s.likeText}>♥</Text>
</TouchableOpacity>
</View>
</View>
)}/>}
</View>
)
}
const s=StyleSheet.create({
container:{flex:1,backgroundColor:'transparent'},
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
actions:{flexDirection:'column',alignItems:'center',gap:6},
starButton:{width:36,height:36,alignItems:'center',justifyContent:'center'},
starActive:{fontSize:22,color:'#FF8C00'},
likeButton:{width:36,height:36,borderRadius:18,backgroundColor:'rgba(241,90,34,0.15)',alignItems:'center',justifyContent:'center'},
likeText:{color:'#FF8C00',fontSize:20},
loadingText:{color:'#ffffff',fontSize:18,fontWeight:'600'},
subText:{color:'rgba(255,255,255,0.7)',fontSize:14,marginTop:8},
})
