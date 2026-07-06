import{useState,useEffect}from'react'
import{View,Text,TouchableOpacity,StyleSheet,Modal,ScrollView,Image,Alert,Modal as RNModal}from'react-native'
import{supabase}from'../lib/supabase'

type User={id:string;username:string;display_name:string;title?:string;bio?:string;age:number;avatar_url?:string;location?:string;preferences?:string[];looking_for?:string;relationship_type?:string}

export default function ProfileModal({user,visible,onClose,onChat,isFavorite,onToggleFavorite,onBlock,onReport}:{
user:User|null;visible:boolean;onClose:()=>void;onChat:(userId:string,user:User)=>void;
isFavorite:boolean;onToggleFavorite:(userId:string)=>void;onBlock:(userId:string,name:string)=>void;onReport?:(userId:string,name:string)=>void
}){
const[photos,setPhotos]=useState<{id:string;photo_url:string;is_profile:boolean}[]>([])
useEffect(()=>{
if(user&&visible){
supabase.from('user_photos').select('*').eq('user_id',user.id).order('created_at',{ascending:true}).then(({data})=>setPhotos(data||[]))
}
},[user,visible])
if(!user)return null
return(
<Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
<View style={s.container}>
<View style={s.header}>
<TouchableOpacity onPress={onClose} style={s.closeBtn}>
<Text style={s.closeBtnText}>✕</Text>
</TouchableOpacity>
</View>
<ScrollView contentContainerStyle={s.content}>
<View style={s.photoSection}>
{user.avatar_url?<TouchableOpacity onPress={()=>setZoomPhoto(user.avatar_url||null)}><Image source={{uri:user.avatar_url}} style={s.photo}/></TouchableOpacity>:<View style={s.photoPlaceholder}><Text style={s.photoPlaceholderText}>{user.display_name?.[0]||'?'}</Text></View>}
<View style={s.actions}>
<TouchableOpacity style={[s.actionBtn,isFavorite&&s.actionBtnActive]} onPress={()=>onToggleFavorite(user.id)}>
<Text style={s.actionIcon}>⭐</Text>
</TouchableOpacity>
<TouchableOpacity style={s.actionBtn} onPress={()=>onBlock(user.id,user.display_name)}>
<Text style={s.actionIcon}>🚫</Text>
</TouchableOpacity>
{onReport&&<TouchableOpacity style={s.actionBtn} onPress={()=>onReport(user.id,user.display_name)}>
<Text style={s.actionIcon}>⚠️</Text>
</TouchableOpacity>}
<TouchableOpacity style={[s.actionBtn,s.chatBtn]} onPress={()=>onChat(user.id,user)}>
<Text style={s.actionIcon}>💬</Text>
</TouchableOpacity>
</View>
</View>
{photos.length>1&&<ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.photosStrip} contentContainerStyle={{gap:4,padding:8}}>
{photos.map(p=><TouchableOpacity key={p.id} onPress={()=>setZoomPhoto(p.photo_url)}><Image source={{uri:p.photo_url}} style={s.stripPhoto}/></TouchableOpacity>)}
</ScrollView>}
<View style={s.info}>
<Text style={s.name}>{user.display_name}</Text>
{user.title?<Text style={s.title}>"{user.title}"</Text>:null}
<Text style={s.meta}>@{user.username} · {user.age}{user.location?` · 📍${user.location}`:''}</Text>
</View>
{user.looking_for||user.relationship_type?<View style={s.card}>
{user.looking_for?<View style={s.infoRow}><Text style={s.infoLabel}>LOOKING FOR</Text><Text style={s.infoValue}>{user.looking_for}</Text></View>:null}
{user.relationship_type?<View style={s.infoRow}><Text style={s.infoLabel}>RELATIONSHIP TYPE</Text><Text style={s.infoValue}>{user.relationship_type}</Text></View>:null}
</View>:null}
{user.bio?<View style={s.card}>
<Text style={s.infoLabel}>ABOUT</Text>
<Text style={s.bioText}>{user.bio}</Text>
</View>:null}
{user.preferences&&user.preferences.length>0?<View style={s.card}>
<Text style={s.infoLabel}>PREFERENCES</Text>
<View style={s.prefTags}>
{user.preferences.map(p=><View key={p} style={s.prefTag}><Text style={s.prefTagText}>{p}</Text></View>)}
</View>
</View>:null}
</ScrollView>
</View>
</Modal>
)
}
const s=StyleSheet.create({
container:{flex:1,backgroundColor:'#0A2A4A'},
header:{paddingTop:20,paddingHorizontal:20,paddingBottom:10,flexDirection:'row',justifyContent:'flex-end'},
closeBtn:{width:36,height:36,borderRadius:18,backgroundColor:'rgba(255,255,255,0.15)',alignItems:'center',justifyContent:'center'},
closeBtnText:{color:'#ffffff',fontSize:18},
content:{paddingBottom:40},
photoSection:{position:'relative'},
photo:{width:'100%',height:400},
photoPlaceholder:{width:'100%',height:400,backgroundColor:'#1B6CA8',alignItems:'center',justifyContent:'center'},
photoPlaceholderText:{color:'#ffffff',fontSize:80,fontWeight:'bold'},
actions:{position:'absolute',right:16,top:16,gap:12},
actionBtn:{width:48,height:48,borderRadius:24,backgroundColor:'rgba(0,0,0,0.5)',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'rgba(255,255,255,0.3)'},
actionBtnActive:{backgroundColor:'rgba(245,166,35,0.5)',borderColor:'#F5A623'},
chatBtn:{backgroundColor:'rgba(33,150,243,0.6)',borderColor:'#2196F3'},
actionIcon:{fontSize:22},
info:{padding:20},
photosStrip:{backgroundColor:'rgba(0,0,0,0.3)'},
stripPhoto:{width:70,height:70,borderRadius:8},
name:{color:'#ffffff',fontSize:26,fontWeight:'800',marginBottom:4},
title:{color:'#F5A623',fontSize:16,fontStyle:'italic',marginBottom:8},
meta:{color:'rgba(255,255,255,0.6)',fontSize:14},
card:{backgroundColor:'rgba(255,255,255,0.1)',borderRadius:16,padding:16,marginHorizontal:16,marginBottom:12,borderWidth:1,borderColor:'rgba(255,255,255,0.15)'},
infoRow:{marginBottom:12},
infoLabel:{color:'rgba(255,255,255,0.5)',fontSize:11,fontWeight:'700',letterSpacing:1,marginBottom:4},
infoValue:{color:'#ffffff',fontSize:15},
bioText:{color:'rgba(255,255,255,0.9)',fontSize:15,lineHeight:22},
prefTags:{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:8},
prefTag:{backgroundColor:'rgba(33,150,243,0.3)',borderRadius:20,paddingHorizontal:12,paddingVertical:6,borderWidth:1,borderColor:'rgba(33,150,243,0.5)'},
prefTagText:{color:'#ffffff',fontSize:12},
})
