import{useEffect,useState}from'react'
import{View,Text,TouchableOpacity,StyleSheet,FlatList,Image,Dimensions}from'react-native'
import{supabase}from'../lib/supabase'
import SydeHeader from'../components/SydeHeader'
import ProfileModal from'../components/ProfileModal'

const{width}=Dimensions.get('window')
const CARD_SIZE=(width-48)/3

type FavUser={id:string;username:string;display_name:string;bio:string;age:number;avatar_url?:string;location?:string;preferences?:string[];looking_for?:string;relationship_type?:string}

export default function FavoritesScreen({onClose}:{onClose?:()=>void}){
const[users,setUsers]=useState<FavUser[]>([])
const[loading,setLoading]=useState(true)
const[currentUserId,setCurrentUserId]=useState<string|null>(null)
const[selectedUser,setSelectedUser]=useState<FavUser|null>(null)
const[showModal,setShowModal]=useState(false)
const[favorites,setFavorites]=useState<Set<string>>(new Set())

useEffect(()=>{loadFavorites()},[])

const loadFavorites=async()=>{
const{data:{user}}=await supabase.auth.getUser()
if(!user)return
setCurrentUserId(user.id)
const{data:favData,error}=await supabase.from('favorites').select('favorited_id').eq('user_id',user.id)
if(error||!favData||favData.length===0){setUsers([]);setLoading(false);return}
const ids=favData.map((f:any)=>f.favorited_id)
setFavorites(new Set(ids))
const{data,error:usersError}=await supabase.from('users').select('id,username,display_name,bio,age,avatar_url,location,preferences,looking_for,relationship_type').in('id',ids)
if(!usersError)setUsers(data||[])
setLoading(false)
}

const handleUnfavorite=async(favId:string)=>{
await supabase.from('favorites').delete().eq('user_id',currentUserId).eq('favorited_id',favId)
setFavorites(prev=>{const n=new Set(prev);n.delete(favId);return n})
setUsers(prev=>prev.filter(u=>u.id!==favId))
setShowModal(false)
}

const handleCardPress=(user:FavUser)=>{
setSelectedUser(user)
setShowModal(true)
}

return(
<View style={s.container}>
<SydeHeader title="Saved Profiles" rightAction={onClose?(
<TouchableOpacity onPress={onClose} style={{width:36,height:36,borderRadius:18,backgroundColor:'rgba(255,255,255,0.2)',alignItems:'center',justifyContent:'center'}}>
<Text style={{color:'#ffffff',fontSize:18}}>✕</Text>
</TouchableOpacity>
):undefined}/>

{loading
?<View style={s.center}><Text style={s.loadingText}>Loading...</Text></View>
:users.length===0
?<View style={s.center}>
<Text style={s.loadingText}>No saved profiles yet</Text>
<Text style={s.subText}>Star profiles on Discover to save them here</Text>
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
{item.avatar_url
?<Image source={{uri:item.avatar_url}} style={s.cardImage}/>
:<View style={s.cardPlaceholder}>
<Text style={s.cardPlaceholderText}>{item.display_name?.[0]||'?'}</Text>
</View>}
<View style={s.starBadge}><Text style={s.starBadgeText}>⭐</Text></View>
</View>
<Text style={s.cardName} numberOfLines={1}>{item.display_name}</Text>
<Text style={s.cardAge}>{item.age}{item.location?' · '+item.location.split(',')[0]:''}</Text>
</TouchableOpacity>
)}
/>}

<ProfileModal
user={selectedUser}
visible={showModal}
onClose={()=>setShowModal(false)}
onChat={()=>{}}
isFavorite={selectedUser?favorites.has(selectedUser.id):false}
onToggleFavorite={handleUnfavorite}
onBlock={()=>{}}
viewerIsPremium={true}
/>
</View>
)
}

const s=StyleSheet.create({
container:{flex:1,backgroundColor:'transparent'},
center:{flex:1,alignItems:'center',justifyContent:'center'},
grid:{padding:12},
row:{gap:8,marginBottom:8},
card:{width:CARD_SIZE,alignItems:'center'},
cardInner:{width:CARD_SIZE,height:CARD_SIZE,borderRadius:12,overflow:'hidden',position:'relative'},
cardImage:{width:CARD_SIZE,height:CARD_SIZE},
cardPlaceholder:{width:CARD_SIZE,height:CARD_SIZE,backgroundColor:'rgba(33,150,243,0.4)',alignItems:'center',justifyContent:'center'},
cardPlaceholderText:{color:'#ffffff',fontSize:28,fontWeight:'bold'},
starBadge:{position:'absolute',top:4,right:4,backgroundColor:'rgba(0,0,0,0.5)',borderRadius:10,padding:2},
starBadgeText:{fontSize:12},
cardName:{color:'#ffffff',fontSize:11,marginTop:4,textAlign:'center',fontWeight:'500',width:CARD_SIZE},
cardAge:{color:'rgba(255,255,255,0.6)',fontSize:9,textAlign:'center',width:CARD_SIZE},
loadingText:{color:'#ffffff',fontSize:18,fontWeight:'600'},
subText:{color:'rgba(255,255,255,0.7)',fontSize:14,marginTop:8},
})