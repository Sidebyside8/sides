import{useEffect,useState}from'react'
import{View,Text,TouchableOpacity,StyleSheet,FlatList,Image,Dimensions}from'react-native'
import{supabase}from'../lib/supabase'
import{LinearGradient}from'expo-linear-gradient'
import SydeHeader from'../components/SydeHeader'
import ProfileModal from'../components/ProfileModal'

const{width}=Dimensions.get('window')
const CARD_SIZE=(width-48)/3

type Viewer={id:string;display_name:string;username:string;avatar_url?:string;viewed_at:string;isBlurred?:boolean}

export default function WhoViewedMeScreen({onClose,onChat,onUpgrade}:{onClose:()=>void;onChat?:(user:any)=>void;onUpgrade?:()=>void}){
const[viewers,setViewers]=useState<Viewer[]>([])
const[loading,setLoading]=useState(true)
const[isPremium,setIsPremium]=useState(false)
const[selectedUser,setSelectedUser]=useState<any>(null)
const[showModal,setShowModal]=useState(false)

useEffect(()=>{loadViewers()},[])

const loadViewers=async()=>{
const{data:{user}}=await supabase.auth.getUser()
if(!user)return
const{data:profile}=await supabase.from('users').select('is_premium').eq('id',user.id).single()
const isPrem=profile?.is_premium||false
setIsPremium(isPrem)

const{data}=await supabase.from('profile_views').select('viewer_id,viewed_at').eq('viewed_id',user.id).order('viewed_at',{ascending:false}).limit(50)
if(data&&data.length>0){
const viewerIds=data.map((v:any)=>v.viewer_id)
const{data:users}=await supabase.from('users').select('id,display_name,username,avatar_url,age,bio,looking_for,relationship_type,preferences').in('id',viewerIds)
const merged=data.map((v:any)=>{
const u=users?.find((u:any)=>u.id===v.viewer_id)
if(!u)return null
return{id:u.id,display_name:u.display_name,username:u.username,avatar_url:u.avatar_url,age:u.age,bio:u.bio,looking_for:u.looking_for,relationship_type:u.relationship_type,preferences:u.preferences,viewed_at:v.viewed_at}
}).filter((v:any)=>v&&v.display_name) as Viewer[]

if(isPrem){
setViewers(merged)
}else{
const visible=merged.slice(0,3)
const blurred=merged.slice(3).map((v:any)=>({...v,avatar_url:undefined,display_name:'???',username:'???',isBlurred:true}))
setViewers([...visible,...blurred])
}
}
setLoading(false)
}

const formatTime=(dateStr:string)=>{
const d=new Date(dateStr)
const now=new Date()
const diff=Math.floor((now.getTime()-d.getTime())/1000/60)
if(diff<60)return diff+'m ago'
if(diff<1440)return Math.floor(diff/60)+'h ago'
return Math.floor(diff/1440)+'d ago'
}

const handleChat=(userId:string,user:any)=>{
setShowModal(false)
onClose()
setTimeout(()=>onChat&&onChat(user),400)
}

return(
<LinearGradient colors={['#0A2A4A','#0A1628']} start={{x:0,y:0}} end={{x:1,y:1}} style={{flex:1}}>
<SydeHeader title="👁️ Who Viewed Me" rightAction={
<TouchableOpacity onPress={onClose} style={{width:36,height:36,borderRadius:18,backgroundColor:'rgba(255,255,255,0.2)',alignItems:'center',justifyContent:'center'}}>
<Text style={{color:'#ffffff',fontSize:18,fontWeight:'700'}}>✕</Text>
</TouchableOpacity>
}/>

{!isPremium&&viewers.length>0&&(
<TouchableOpacity style={s.upgradeBanner} onPress={()=>onUpgrade&&onUpgrade()}>
<Text style={s.upgradeBannerText}>👑 Upgrade to see all {viewers.length}+ viewers</Text>
</TouchableOpacity>
)}

{loading
?<View style={s.center}><Text style={s.emptyText}>Loading...</Text></View>
:viewers.length===0
?<View style={s.center}>
<Text style={{fontSize:60,marginBottom:16}}>👁️</Text>
<Text style={s.lockTitle}>No views yet</Text>
<Text style={s.lockText}>When someone views your profile it will show up here. Keep your profile updated to get more views!</Text>
</View>
:<FlatList
data={viewers}
keyExtractor={(item,i)=>item.id+i}
numColumns={3}
contentContainerStyle={s.grid}
columnWrapperStyle={s.row}
ListHeaderComponent={
<Text style={{color:'rgba(255,255,255,0.6)',fontSize:13,marginBottom:16,textAlign:'center'}}>
{isPremium?`${viewers.length} people viewed your profile`:`${viewers.length}+ people viewed your profile — upgrade to see all`}
</Text>
}
renderItem={({item})=>(
<TouchableOpacity style={s.card} onPress={()=>{
if(item.isBlurred){onUpgrade&&onUpgrade();return}
setSelectedUser(item);setShowModal(true)
}}>
<View style={s.cardInner}>
{item.avatar_url&&!item.isBlurred
?<Image source={{uri:item.avatar_url}} style={s.cardImage}/>
:<View style={[s.cardImage,{backgroundColor:item.isBlurred?'rgba(0,0,0,0.6)':'rgba(33,150,243,0.4)',alignItems:'center',justifyContent:'center'}]}>
{item.isBlurred
?<Text style={{fontSize:28}}>🔒</Text>
:<Text style={{color:'#fff',fontSize:28,fontWeight:'bold'}}>{item.display_name?.[0]||'?'}</Text>}
</View>}
{!item.isBlurred&&<View style={s.timeBadge}><Text style={s.timeText}>{formatTime(item.viewed_at)}</Text></View>}
</View>
<Text style={[s.cardName,item.isBlurred&&{color:'#F5A623'}]} numberOfLines={1}>
{item.isBlurred?'👑 Upgrade':item.display_name}
</Text>
{!item.isBlurred&&<TouchableOpacity style={s.chatBtn} onPress={()=>{
setSelectedUser(item);setShowModal(true)
}}>
<Text style={{fontSize:12}}>💬</Text>
</TouchableOpacity>}
</TouchableOpacity>
)}
/>}

<ProfileModal
user={selectedUser}
visible={showModal}
onClose={()=>setShowModal(false)}
onChat={handleChat}
isFavorite={false}
onToggleFavorite={()=>{}}
onBlock={()=>{}}
viewerIsPremium={isPremium}
/>
</LinearGradient>
)
}

const s=StyleSheet.create({
upgradeBanner:{marginHorizontal:16,marginBottom:12,backgroundColor:'rgba(245,166,35,0.2)',borderRadius:12,padding:12,borderWidth:1,borderColor:'rgba(245,166,35,0.5)',alignItems:'center'},
upgradeBannerText:{color:'#F5A623',fontSize:13,fontWeight:'700'},
center:{flex:1,alignItems:'center',justifyContent:'center',padding:40},
lockTitle:{color:'#ffffff',fontSize:22,fontWeight:'800',marginBottom:12,textAlign:'center'},
lockText:{color:'rgba(255,255,255,0.7)',fontSize:15,textAlign:'center',lineHeight:22},
emptyText:{color:'rgba(255,255,255,0.6)',fontSize:16},
grid:{padding:16},
row:{gap:8,marginBottom:8},
card:{width:CARD_SIZE,alignItems:'center'},
cardInner:{width:CARD_SIZE,height:CARD_SIZE,borderRadius:12,overflow:'hidden',position:'relative'},
cardImage:{width:CARD_SIZE,height:CARD_SIZE},
timeBadge:{position:'absolute',bottom:4,left:4,backgroundColor:'rgba(0,0,0,0.65)',borderRadius:8,paddingHorizontal:5,paddingVertical:2},
timeText:{color:'#F5A623',fontSize:9,fontWeight:'700'},
cardName:{color:'#ffffff',fontSize:11,marginTop:4,textAlign:'center',fontWeight:'500',width:CARD_SIZE},
chatBtn:{marginTop:4,backgroundColor:'rgba(33,150,243,0.4)',borderRadius:10,paddingHorizontal:8,paddingVertical:3,borderWidth:1,borderColor:'#2196F3'},
})
