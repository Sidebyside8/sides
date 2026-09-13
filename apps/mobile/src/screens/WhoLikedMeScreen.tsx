import{useState,useEffect}from'react'
import{View,Text,TouchableOpacity,StyleSheet,ScrollView,Image,Dimensions}from'react-native'
import{supabase}from'../lib/supabase'
import SydeHeader from'../components/SydeHeader'
import ProfileModal from'../components/ProfileModal'

const{width}=Dimensions.get('window')
const CARD_SIZE=(width-48)/3

export default function WhoLikedMeScreen({onClose,isPremium,onUpgrade,onChat}:{onClose:()=>void;whoLikedMe?:any[];isPremium:boolean;onUpgrade:()=>void;onChat:(user:any)=>void}){
const[whoLikedMe,setWhoLikedMe]=useState<any[]>([])
const[loading,setLoading]=useState(true)
const[selectedUser,setSelectedUser]=useState<any>(null)
const[showModal,setShowModal]=useState(false)

useEffect(()=>{loadWhoLikedMe()},[])

const loadWhoLikedMe=async()=>{
const{data:{user}}=await supabase.auth.getUser()
if(!user)return
const{data:whoLikedData}=await supabase.from('likes').select('liker_id').eq('liked_id',user.id)
if(whoLikedData&&whoLikedData.length>0){
const likerIds=whoLikedData.map((l:any)=>l.liker_id)
const{data:likerProfiles}=await supabase.from('users').select('id,username,display_name,age,avatar_url,is_premium,bio,looking_for,relationship_type,preferences').in('id',likerIds)
if(likerProfiles){
const profiles=isPremium?likerProfiles:likerProfiles.map((_:any,i:number)=>i<3?_:{..._,avatar_url:undefined,display_name:'???',isBlurred:true})
setWhoLikedMe(profiles)
}
}
setLoading(false)
}

const handleChat=(userId:string,user:any)=>{
setShowModal(false)
onClose()
setTimeout(()=>onChat(user),400)
}

return(
<View style={s.container}>
<SydeHeader title="❤️ Who Liked You" rightAction={
<TouchableOpacity onPress={onClose} style={{width:36,height:36,borderRadius:18,backgroundColor:'rgba(255,255,255,0.2)',alignItems:'center',justifyContent:'center'}}>
<Text style={{color:'#ffffff',fontSize:18,fontWeight:'700'}}>✕</Text>
</TouchableOpacity>
}/>

{!isPremium&&whoLikedMe.length>0&&(
<TouchableOpacity style={s.upgradeBanner} onPress={onUpgrade}>
<Text style={s.upgradeBannerText}>👑 Upgrade to see everyone who liked you</Text>
</TouchableOpacity>
)}

{loading
?<View style={s.center}><Text style={s.emptyText}>Loading...</Text></View>
:whoLikedMe.length===0
?<View style={s.center}>
<Text style={{fontSize:60,marginBottom:16}}>🤍</Text>
<Text style={s.lockTitle}>No likes yet</Text>
<Text style={s.lockText}>Start liking profiles and they may like you back!</Text>
</View>
:<ScrollView contentContainerStyle={s.grid}>
<Text style={{color:'rgba(255,255,255,0.6)',fontSize:13,marginBottom:16,textAlign:'center'}}>
{isPremium?`${whoLikedMe.length} people liked your profile`:`${whoLikedMe.length}+ people liked you — upgrade to see all`}
</Text>
<View style={s.row}>
{whoLikedMe.map((u:any,i:number)=>(
<TouchableOpacity key={u.id+i} style={s.card} onPress={()=>{
if(u.isBlurred){onUpgrade();return}
setSelectedUser(u);setShowModal(true)
}}>
<View style={s.cardInner}>
{u.avatar_url&&!u.isBlurred
?<Image source={{uri:u.avatar_url}} style={s.cardImage}/>
:<View style={[s.cardImage,{backgroundColor:u.isBlurred?'rgba(0,0,0,0.6)':'rgba(255,100,100,0.3)',alignItems:'center',justifyContent:'center'}]}>
{u.isBlurred?<Text style={{fontSize:28}}>🔒</Text>:<Text style={{color:'#fff',fontSize:28,fontWeight:'bold'}}>{u.display_name?.[0]||'?'}</Text>}
</View>}
{!u.isBlurred&&u.is_premium&&<View style={s.premiumBadge}><Text style={{fontSize:10}}>💎</Text></View>}
</View>
<Text style={[s.cardName,u.isBlurred&&{color:'#F5A623'}]} numberOfLines={1}>
{u.isBlurred?'👑 Upgrade':u.display_name}
</Text>
</TouchableOpacity>
))}
</View>
</ScrollView>}

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
</View>
)
}

const s=StyleSheet.create({
container:{flex:1,backgroundColor:'#0A2A4A'},
upgradeBanner:{marginHorizontal:16,marginBottom:12,backgroundColor:'rgba(245,166,35,0.2)',borderRadius:12,padding:12,borderWidth:1,borderColor:'rgba(245,166,35,0.5)',alignItems:'center'},
upgradeBannerText:{color:'#F5A623',fontSize:13,fontWeight:'700'},
center:{flex:1,alignItems:'center',justifyContent:'center',padding:40},
lockTitle:{color:'#ffffff',fontSize:22,fontWeight:'800',marginBottom:12,textAlign:'center'},
lockText:{color:'rgba(255,255,255,0.7)',fontSize:15,textAlign:'center',lineHeight:22},
emptyText:{color:'rgba(255,255,255,0.6)',fontSize:16},
grid:{padding:16},
row:{flexDirection:'row',flexWrap:'wrap',gap:8},
card:{width:CARD_SIZE,alignItems:'center'},
cardInner:{width:CARD_SIZE,height:CARD_SIZE,borderRadius:12,overflow:'hidden',position:'relative'},
cardImage:{width:CARD_SIZE,height:CARD_SIZE},
premiumBadge:{position:'absolute',bottom:4,right:4,backgroundColor:'rgba(245,166,35,0.9)',borderRadius:8,paddingHorizontal:4,paddingVertical:1},
cardName:{color:'#ffffff',fontSize:11,marginTop:4,textAlign:'center',fontWeight:'500',width:CARD_SIZE},
})
