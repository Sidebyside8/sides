import{useEffect,useState}from'react'
import{View,Text,TouchableOpacity,StyleSheet,FlatList,Image}from'react-native'
import{supabase}from'../lib/supabase'
import SydeHeader from'../components/SydeHeader'
type Conversation={userId:string;otherUser:{id:string;display_name:string;username:string;avatar_url?:string};lastMessage:string;lastTime:string}
export default function MessagesListScreen({onDirectMessage}:{onDirectMessage:(user:any)=>void}){
const[convos,setConvos]=useState<Conversation[]>([])
const[loading,setLoading]=useState(true)
useEffect(()=>{loadConversations()},[])
const loadConversations=async()=>{
const{data:{user}}=await supabase.auth.getUser()
if(!user)return
const{data:messages}=await supabase.from('direct_messages').select('*').or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`).order('created_at',{ascending:false})
if(!messages||messages.length===0){setConvos([]);setLoading(false);return}
const userMap=new Map<string,any>()
messages.forEach((m:any)=>{
const otherId=m.sender_id===user.id?m.recipient_id:m.sender_id
if(!userMap.has(otherId)){userMap.set(otherId,{lastMessage:m.content,lastTime:m.created_at})}
})
const convosWithUsers=await Promise.all(Array.from(userMap.entries()).map(async([otherId,msgData])=>{
const{data:otherUser}=await supabase.from('users').select('id,display_name,username,avatar_url').eq('id',otherId).single()
return{userId:otherId,otherUser,lastMessage:msgData.lastMessage,lastTime:msgData.lastTime}
}))
convosWithUsers.sort((a,b)=>new Date(b.lastTime).getTime()-new Date(a.lastTime).getTime())
setConvos(convosWithUsers)
setLoading(false)
}
const timeAgo=(d:string)=>{
const m=Math.floor((Date.now()-new Date(d).getTime())/60000)
if(m<1)return'now'
if(m<60)return m+'m'
const h=Math.floor(m/60)
if(h<24)return h+'h'
const days=Math.floor(h/24)
if(days<7)return days+'d'
return new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric'})
}
return(
<View style={s.container}>
<SydeHeader title="Messages"/>
{loading?<View style={s.center}><Text style={s.loadingText}>Loading messages...</Text></View>
:convos.length===0?<View style={s.center}><Text style={s.loadingText}>No messages yet</Text><Text style={s.subText}>Discover people and start chatting!</Text></View>
:<FlatList data={convos} keyExtractor={i=>i.userId} contentContainerStyle={s.list} renderItem={({item})=>(
<TouchableOpacity style={s.card} onPress={()=>onDirectMessage(item.otherUser)}>
<View style={s.avatarContainer}>
{item.otherUser?.avatar_url?<Image source={{uri:item.otherUser.avatar_url}} style={s.avatar}/>
:<View style={s.avatarPlaceholder}><Text style={s.avatarText}>{item.otherUser?.display_name?.[0]||'?'}</Text></View>}
</View>
<View style={s.info}>
<View style={s.nameRow}>
<Text style={s.name}>{item.otherUser?.display_name}</Text>
<Text style={s.time}>{timeAgo(item.lastTime)}</Text>
</View>
<Text style={s.lastMessage} numberOfLines={1}>{item.lastMessage}</Text>
</View>
</TouchableOpacity>
)}/>}
</View>
)
}
const s=StyleSheet.create({
container:{flex:1},
center:{flex:1,alignItems:'center',justifyContent:'center'},
list:{paddingHorizontal:16,paddingBottom:24},
card:{backgroundColor:'rgba(255,255,255,0.15)',borderRadius:16,padding:16,marginBottom:8,flexDirection:'row',alignItems:'center',borderWidth:1,borderColor:'rgba(255,255,255,0.25)'},
avatarContainer:{marginRight:12},
avatar:{width:56,height:56,borderRadius:28},
avatarPlaceholder:{width:56,height:56,borderRadius:28,backgroundColor:'#2196F3',alignItems:'center',justifyContent:'center'},
avatarText:{color:'#ffffff',fontSize:22,fontWeight:'bold'},
info:{flex:1},
nameRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:4},
name:{color:'#ffffff',fontSize:16,fontWeight:'600'},
time:{color:'rgba(255,255,255,0.5)',fontSize:12},
lastMessage:{color:'rgba(255,255,255,0.7)',fontSize:14},
loadingText:{color:'#ffffff',fontSize:18,fontWeight:'600'},
subText:{color:'rgba(255,255,255,0.7)',fontSize:14,marginTop:8},
})
