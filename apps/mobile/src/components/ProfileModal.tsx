import{useState,useEffect}from'react'
import{View,Text,TouchableOpacity,StyleSheet,Modal,ScrollView,Image,Platform}from'react-native'
import{supabase}from'../lib/supabase'
type User={id:string;username:string;display_name:string;title?:string;bio?:string;age:number;avatar_url?:string;location?:string;preferences?:string[];looking_for?:string;relationship_type?:string;is_online?:boolean;last_seen?:string}
export default function ProfileModal({user,visible,onClose,onChat,isFavorite,onToggleFavorite,onBlock,onReport,viewerIsPremium}:{user:User|null;visible:boolean;onClose:()=>void;onChat:(userId:string,user:User)=>void;isFavorite:boolean;onToggleFavorite:(userId:string)=>void;onBlock:(userId:string,name:string)=>void;onReport?:(userId:string,name:string)=>void;viewerIsPremium?:boolean}){
const[photos,setPhotos]=useState<{id:string;photo_url:string;is_profile:boolean}[]>([])
const[zoomPhoto,setZoomPhoto]=useState<string|null>(null)
const[lastSeen,setLastSeen]=useState<string|null>(null)

useEffect(()=>{
if(user&&visible){
supabase.from('user_photos').select('*').eq('user_id',user.id).order('created_at',{ascending:true}).then(({data})=>{
const all=data||[]
setPhotos(viewerIsPremium?all:all.slice(0,3))
})
supabase.from('users').select('last_seen,is_online').eq('id',user.id).single().then(({data})=>{
if(data)setLastSeen(data.last_seen)
})
}
},[user,visible,viewerIsPremium])

const getOnlineStatus=()=>{
if(!lastSeen&&!user?.is_online)return{dot:'#555555',label:'Offline'}
if(user?.is_online)return{dot:'#00E676',label:'Online now'}
const mins=Math.floor((Date.now()-new Date(lastSeen||0).getTime())/60000)
if(mins<60)return{dot:'#FFD600',label:`Last seen ${mins}m ago`}
const hrs=Math.floor(mins/60)
if(hrs<24)return{dot:'#555555',label:`Last seen ${hrs}h ago`}
return{dot:'#555555',label:`Last seen ${Math.floor(hrs/24)}d ago`}
}

if(!user)return null
const status=getOnlineStatus()

return(
<Modal visible={visible} animationType="slide" presentationStyle={Platform.OS==='ios'?'pageSheet':'fullScreen'} onRequestClose={onClose}>
<View style={s.container}>
<View style={s.header}>
<TouchableOpacity onPress={onClose} style={s.closeBtn}>
<Text style={s.closeBtnText}>✕</Text>
</TouchableOpacity>
<View style={s.headerActions}>
<TouchableOpacity style={[s.headerBtn,isFavorite&&s.headerBtnActive]} onPress={()=>onToggleFavorite(user.id)}>
<Text style={s.headerBtnText}>{isFavorite?'⭐':'☆'}</Text>
</TouchableOpacity>
{onReport&&(
<TouchableOpacity style={s.headerBtn} onPress={()=>onReport(user.id,user.display_name)}>
<Text style={s.headerBtnText}>🚩</Text>
</TouchableOpacity>
)}
<TouchableOpacity style={s.headerBtn} onPress={()=>onBlock(user.id,user.display_name)}>
<Text style={s.headerBtnText}>🚫</Text>
</TouchableOpacity>
</View>
</View>
<ScrollView contentContainerStyle={s.content}>
<View style={s.photoSection}>
{user.avatar_url
?<TouchableOpacity onPress={()=>setZoomPhoto(user.avatar_url||null)}>
<Image source={{uri:user.avatar_url}} style={s.photo}/>
</TouchableOpacity>
:<View style={s.photoPlaceholder}>
<Text style={s.photoPlaceholderText}>{user.display_name?.[0]||'?'}</Text>
</View>}
</View>
{photos.length>0&&(
<ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.photosStrip} contentContainerStyle={{gap:4,padding:8}}>
{photos.map(p=>(
<TouchableOpacity key={p.id} onPress={()=>setZoomPhoto(p.photo_url)}>
<Image source={{uri:p.photo_url}} style={s.stripPhoto}/>
</TouchableOpacity>
))}
{!viewerIsPremium&&(
<View style={s.lockedPhotos}>
<Text style={s.lockedIcon}>🔒</Text>
<Text style={s.lockedText}>Upgrade for more</Text>
</View>
)}
</ScrollView>
)}
<View style={s.info}>
<Text style={s.name}>{user.display_name}</Text>
{user.title?<Text style={s.title}>{user.title}</Text>:null}
<Text style={s.meta}>@{user.username} · {user.age}{user.location?' · '+user.location:''}</Text>
<View style={s.onlineRow}>
<View style={[s.onlineDot,{backgroundColor:status.dot}]}/>
<Text style={[s.onlineLabel,{color:status.dot==='#00E676'?'#00E676':status.dot==='#FFD600'?'#FFD600':'rgba(255,255,255,0.5)'}]}>{status.label}</Text>
</View>
</View>
<TouchableOpacity style={s.chatBtn} onPress={()=>onChat(user.id,user)}>
<Text style={s.chatBtnText}>💬 Send Message</Text>
</TouchableOpacity>
{(user.looking_for||user.relationship_type)&&(
<View style={s.card}>
{user.looking_for&&<View style={s.infoRow}><Text style={s.infoLabel}>LOOKING FOR</Text><Text style={s.infoValue}>{user.looking_for}</Text></View>}
{user.relationship_type&&<View style={s.infoRow}><Text style={s.infoLabel}>RELATIONSHIP TYPE</Text><Text style={s.infoValue}>{user.relationship_type}</Text></View>}
</View>
)}
{user.bio&&(
<View style={s.card}>
<Text style={s.infoLabel}>ABOUT</Text>
<Text style={s.bioText}>{user.bio}</Text>
</View>
)}
{user.preferences&&user.preferences.length>0&&(
<View style={s.card}>
<Text style={s.infoLabel}>INTERESTS</Text>
<View style={s.prefTags}>
{user.preferences.map(p=>(
<View key={p} style={s.prefTag}><Text style={s.prefTagText}>{p}</Text></View>
))}
</View>
</View>
)}
</ScrollView>
</View>
<Modal visible={!!zoomPhoto} transparent animationType="fade">
<TouchableOpacity style={{flex:1,backgroundColor:'rgba(0,0,0,0.95)',alignItems:'center',justifyContent:'center'}} onPress={()=>setZoomPhoto(null)}>
<Image source={{uri:zoomPhoto||''}} style={{width:'95%',height:'70%',resizeMode:'contain'}}/>
<Text style={{color:'rgba(255,255,255,0.5)',marginTop:20,fontSize:14}}>Tap to close</Text>
</TouchableOpacity>
</Modal>
</Modal>
)
}
const s=StyleSheet.create({
container:{flex:1,backgroundColor:'#0A2A4A'},
header:{paddingTop:Platform.OS==='android'?40:20,paddingHorizontal:20,paddingBottom:10,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
closeBtn:{width:36,height:36,borderRadius:18,backgroundColor:'rgba(255,255,255,0.15)',alignItems:'center',justifyContent:'center'},
closeBtnText:{color:'#ffffff',fontSize:18,fontWeight:'700'},
headerActions:{flexDirection:'row',gap:8},
headerBtn:{width:36,height:36,borderRadius:18,backgroundColor:'rgba(255,255,255,0.15)',alignItems:'center',justifyContent:'center'},
headerBtnActive:{backgroundColor:'rgba(245,166,35,0.4)'},
headerBtnText:{fontSize:16},
content:{paddingBottom:40},
photoSection:{position:'relative'},
photo:{width:'100%',height:400},
photoPlaceholder:{width:'100%',height:400,backgroundColor:'#1B6CA8',alignItems:'center',justifyContent:'center'},
photoPlaceholderText:{color:'#ffffff',fontSize:80,fontWeight:'bold'},
photosStrip:{backgroundColor:'rgba(0,0,0,0.3)'},
stripPhoto:{width:70,height:70,borderRadius:8},
lockedPhotos:{width:70,height:70,borderRadius:8,backgroundColor:'rgba(255,255,255,0.1)',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'rgba(255,255,255,0.2)'},
lockedIcon:{fontSize:20},
lockedText:{color:'rgba(255,255,255,0.6)',fontSize:9,textAlign:'center',marginTop:2},
info:{padding:20},
name:{color:'#ffffff',fontSize:26,fontWeight:'800',marginBottom:4},
title:{color:'#F5A623',fontSize:16,fontStyle:'italic',marginBottom:8},
meta:{color:'rgba(255,255,255,0.6)',fontSize:14,marginBottom:8},
onlineRow:{flexDirection:'row',alignItems:'center',gap:6,marginTop:4},
onlineDot:{width:10,height:10,borderRadius:5},
onlineLabel:{fontSize:13,fontWeight:'600'},
chatBtn:{backgroundColor:'#2196F3',borderRadius:16,padding:16,marginHorizontal:20,marginBottom:16,alignItems:'center'},
chatBtnText:{color:'#ffffff',fontSize:16,fontWeight:'700'},
card:{backgroundColor:'rgba(255,255,255,0.1)',borderRadius:16,padding:16,marginHorizontal:16,marginBottom:12,borderWidth:1,borderColor:'rgba(255,255,255,0.15)'},
infoRow:{marginBottom:12},
infoLabel:{color:'rgba(255,255,255,0.5)',fontSize:11,fontWeight:'700',letterSpacing:1,marginBottom:4},
infoValue:{color:'#ffffff',fontSize:15},
bioText:{color:'rgba(255,255,255,0.9)',fontSize:15,lineHeight:22},
prefTags:{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:8},
prefTag:{backgroundColor:'rgba(33,150,243,0.3)',borderRadius:20,paddingHorizontal:12,paddingVertical:6,borderWidth:1,borderColor:'rgba(33,150,243,0.5)'},
prefTagText:{color:'#ffffff',fontSize:12},
})
