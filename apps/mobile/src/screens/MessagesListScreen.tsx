import{useEffect,useState}from'react'
import{View,Text,TouchableOpacity,StyleSheet,FlatList,Image}from'react-native'
import{supabase}from'../lib/supabase'
import SydeHeader from'../components/SydeHeader'
type Conversation={matchId:string;otherUser:{id:string;display_name:string;username:string;avatar_url?:string};lastMessage:string;lastTime:string;unread:boolean}
export default function MessagesListScreen({onSelectMatch}:{onSelectMatch:(matchId:string,otherUser:any)=>void}){
const[convos,setConvos]=useState<Conversation[]>([])
const[loading,setLoading]=useState(true)
useEffect(()=>{loadConversations()},[])
const loadConversations=async()=>{
const{data:{user}}=await supabase.auth.getUser()
if(!user)return
const{data:matches}=await supabase.from('matches').select('*').or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
if(!matches||matches.length===0){setConvos([]);setLoading(false);return}
const convosWithData=await Promise.all(matches.map(async(match:any)=>{
const otherId=match.user1_id===user.id?match.user2_id:match.user1_id
const{data:otherUser}=await supabase.from('users').select('id,display_name,username,avatar_url').eq('id',otherId).single()
const{data:messages}=await supabase.from('messages').select('*').eq('match_id',match.id).order('created_at',{ascending:false}).limit(1)
const lastMsg=messages?.[0]
return{
matchId:match.id,
otherUser,
lastMessage:lastMsg?.content||'No messages yet',
lastTime:lastMsg?.created_at||match.created_at,
unread:false,
}
}))
convosWithData.sort((a,b)=>new Date(b.lastTime).getTime()-new Date(a.lastTime).getTime())
setConvos(convosWithData)
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
:convos.length===0?<View style={s.center}><Text style={s.loadingText}>No messages yet</Text><Text style={s.subText}>Match with someone to start chatting</Text></View>
:<FlatList data={convos} keyExtractor={i=>i.matchId} contentContainerStyle={s.list} renderItem={({item})=>(
<TouchableOpacity style={s.card} onPress={()=>onSelectMatch(item.matchId,item.otherUser)}>
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
container:{flex:1,backgroundColor:'#E8D5C0'},
center:{flex:1,alignItems:'center',justifyContent:'center'},
list:{paddingHorizontal:16,paddingBottom:24},
card:{backgroundColor:'rgba(255,255,255,0.6)',borderRadius:16,padding:16,marginBottom:8,flexDirection:'row',alignItems:'center',borderWidth:1,borderColor:'rgba(255,255,255,0.8)'},
avatarContainer:{marginRight:12},
avatar:{width:56,height:56,borderRadius:28},
avatarPlaceholder:{width:56,height:56,borderRadius:28,backgroundColor:'#2196F3',alignItems:'center',justifyContent:'center'},
avatarText:{color:'#ffffff',fontSize:22,fontWeight:'bold'},
info:{flex:1},
nameRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:4},
name:{color:'#1a2a3a',fontSize:16,fontWeight:'600'},
time:{color:'#888',fontSize:12},
lastMessage:{color:'#556677',fontSize:14},
loadingText:{color:'#1a2a3a',fontSize:18,fontWeight:'600'},
subText:{color:'#556677',fontSize:14,marginTop:8},
})
