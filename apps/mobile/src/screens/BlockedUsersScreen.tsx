import{useEffect,useState}from'react'
import{View,Text,TouchableOpacity,StyleSheet,FlatList,Alert,Image}from'react-native'
import{supabase}from'../lib/supabase'
import SydeHeader from'../components/SydeHeader'
type BlockedUser={id:string;username:string;display_name:string;avatar_url?:string}
export default function BlockedUsersScreen({onBack}:{onBack:()=>void}){
const[users,setUsers]=useState<BlockedUser[]>([])
const[loading,setLoading]=useState(true)
const[currentUserId,setCurrentUserId]=useState<string|null>(null)
useEffect(()=>{loadBlocked()},[])
const loadBlocked=async()=>{
const{data:{user}}=await supabase.auth.getUser()
if(!user)return
setCurrentUserId(user.id)
const{data:blockData}=await supabase.from('blocks').select('blocked_id').eq('blocker_id',user.id)
if(!blockData||blockData.length===0){setUsers([]);setLoading(false);return}
const ids=blockData.map((b:any)=>b.blocked_id)
const{data}=await supabase.from('users').select('id,username,display_name,avatar_url').in('id',ids)
if(data)setUsers(data)
setLoading(false)
}
const handleUnblock=async(blockedId:string)=>{
Alert.alert('Unblock','Are you sure you want to unblock this person?',[
{text:'Cancel',style:'cancel'},
{text:'Unblock',onPress:async()=>{
await supabase.from('blocks').delete().eq('blocker_id',currentUserId).eq('blocked_id',blockedId)
setUsers(prev=>prev.filter(u=>u.id!==blockedId))
}}
])
}
return(
<View style={s.container}>
<View style={s.header}>
<TouchableOpacity onPress={onBack} style={s.backButton}>
<Text style={s.backText}>‹ Back</Text>
</TouchableOpacity>
<Text style={s.title}>Blocked Users</Text>
</View>
{loading?<View style={s.center}><Text style={s.loadingText}>Loading...</Text></View>
:users.length===0?<View style={s.center}><Text style={s.loadingText}>No blocked users</Text><Text style={s.subText}>People you block will appear here</Text></View>
:<FlatList data={users} keyExtractor={i=>i.id} contentContainerStyle={s.list} renderItem={({item})=>(
<View style={s.card}>
{item.avatar_url?<Image source={{uri:item.avatar_url}} style={s.avatar}/>:<View style={s.avatarPlaceholder}><Text style={s.avatarText}>{item.display_name?.[0]||'?'}</Text></View>}
<View style={s.info}>
<Text style={s.name}>{item.display_name}</Text>
<Text style={s.username}>@{item.username}</Text>
</View>
<TouchableOpacity style={s.unblockButton} onPress={()=>handleUnblock(item.id)}>
<Text style={s.unblockText}>Unblock</Text>
</TouchableOpacity>
</View>
)}/>}
</View>
)
}
const s=StyleSheet.create({
container:{flex:1,backgroundColor:'transparent'},
header:{flexDirection:'row',alignItems:'center',paddingTop:60,paddingHorizontal:24,paddingBottom:16,borderBottomWidth:1,borderBottomColor:'rgba(0,0,0,0.1)'},
backButton:{marginRight:16},
backText:{color:'#2196F3',fontSize:18,fontWeight:'600'},
title:{fontSize:20,fontWeight:'700',color:'#ffffff'},
center:{flex:1,alignItems:'center',justifyContent:'center'},
list:{paddingHorizontal:16,paddingTop:16,paddingBottom:24},
card:{backgroundColor:'rgba(255,255,255,0.15)',borderRadius:16,padding:16,marginBottom:12,flexDirection:'row',alignItems:'center',borderWidth:1,borderColor:'rgba(255,255,255,0.25)'},
avatar:{width:48,height:48,borderRadius:24,marginRight:12},
avatarPlaceholder:{width:48,height:48,borderRadius:24,backgroundColor:'#2196F3',alignItems:'center',justifyContent:'center',marginRight:12},
avatarText:{color:'#fff',fontSize:20,fontWeight:'bold'},
info:{flex:1},
name:{color:'#ffffff',fontSize:15,fontWeight:'600'},
username:{color:'rgba(255,255,255,0.7)',fontSize:13},
unblockButton:{backgroundColor:'rgba(33,150,243,0.15)',borderRadius:10,paddingHorizontal:14,paddingVertical:8,borderWidth:1,borderColor:'#2196F3'},
unblockText:{color:'#2196F3',fontSize:13,fontWeight:'600'},
loadingText:{color:'#ffffff',fontSize:18,fontWeight:'600'},
subText:{color:'rgba(255,255,255,0.7)',fontSize:14,marginTop:8},
})
