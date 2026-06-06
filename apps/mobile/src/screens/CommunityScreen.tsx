import{useEffect,useState}from'react'
import{View,Text,TextInput,TouchableOpacity,StyleSheet,FlatList,Alert,KeyboardAvoidingView,Platform,Modal,ScrollView}from'react-native'
import{supabase}from'../lib/supabase'
import SydeHeader from'../components/SydeHeader'
type Post={id:string;content:string;user_id:string;created_at:string;author:{display_name:string;username:string}}
type Event={id:string;title:string;description:string;location:string;event_date:string;user_id:string;created_at:string;author:{display_name:string;username:string}}
export default function CommunityScreen(){
const[tab,setTab]=useState<'posts'|'events'>('posts')
const[posts,setPosts]=useState<Post[]>([])
const[events,setEvents]=useState<Event[]>([])
const[newPost,setNewPost]=useState('')
const[loading,setLoading]=useState(true)
const[posting,setPosting]=useState(false)
const[currentUserId,setCurrentUserId]=useState<string|null>(null)
const[showEventModal,setShowEventModal]=useState(false)
const[eventTitle,setEventTitle]=useState('')
const[eventDesc,setEventDesc]=useState('')
const[eventLocation,setEventLocation]=useState('')
const[eventDate,setEventDate]=useState('')
useEffect(()=>{loadContent()},[tab])
const loadContent=async()=>{
setLoading(true)
const{data:{user}}=await supabase.auth.getUser()
if(user)setCurrentUserId(user.id)
if(tab==='posts'){
const{data,error}=await supabase.from('community_posts').select('*').order('created_at',{ascending:false}).limit(50)
if(error){Alert.alert('Error',error.message);setLoading(false);return}
if(!data||data.length===0){setPosts([]);setLoading(false);return}
const withAuthors=await Promise.all(data.map(async(post:any)=>{
const{data:author}=await supabase.from('users').select('display_name,username').eq('id',post.user_id).single()
return{...post,author}
}))
setPosts(withAuthors)
}else{
const{data,error}=await supabase.from('events').select('*').order('event_date',{ascending:true}).limit(50)
if(error){Alert.alert('Error',error.message);setLoading(false);return}
if(!data||data.length===0){setEvents([]);setLoading(false);return}
const withAuthors=await Promise.all(data.map(async(event:any)=>{
const{data:author}=await supabase.from('users').select('display_name,username').eq('id',event.user_id).single()
return{...event,author}
}))
setEvents(withAuthors)
}
setLoading(false)
}
const handlePost=async()=>{
if(!newPost.trim()||!currentUserId)return
setPosting(true)
const content=newPost.trim()
setNewPost('')
const{data,error}=await supabase.from('community_posts').insert({user_id:currentUserId,content}).select().single()
if(error){Alert.alert('Error',error.message)}else{
const{data:author}=await supabase.from('users').select('display_name,username').eq('id',currentUserId).single()
setPosts(prev=>[{...data,author},...prev])
}
setPosting(false)
}
const handleCreateEvent=async()=>{
if(!eventTitle.trim()||!eventDate.trim()){Alert.alert('Required','Please enter a title and date');return}
const parsedDate=new Date(eventDate)
if(isNaN(parsedDate.getTime())){Alert.alert('Invalid','Please enter a valid date (e.g. 2025-12-25)');return}
setPosting(true)
const{data,error}=await supabase.from('events').insert({
user_id:currentUserId,
title:eventTitle.trim(),
description:eventDesc.trim(),
location:eventLocation.trim(),
event_date:parsedDate.toISOString(),
}).select().single()
if(error){Alert.alert('Error',error.message)}else{
const{data:author}=await supabase.from('users').select('display_name,username').eq('id',currentUserId).single()
setEvents(prev=>[...prev,{...data,author}].sort((a,b)=>new Date(a.event_date).getTime()-new Date(b.event_date).getTime()))
setShowEventModal(false)
setEventTitle('');setEventDesc('');setEventLocation('');setEventDate('')
Alert.alert('Event Created!','Your event has been posted')
}
setPosting(false)
}
const timeAgo=(d:string)=>{
const m=Math.floor((Date.now()-new Date(d).getTime())/60000)
if(m<1)return'just now'
if(m<60)return m+'m ago'
const h=Math.floor(m/60)
if(h<24)return h+'h ago'
return Math.floor(h/24)+'d ago'
}
const formatEventDate=(d:string)=>{
const date=new Date(d)
return date.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'})
}
return(
<KeyboardAvoidingView style={s.container} behavior={Platform.OS==='ios'?'padding':'height'}>
<SydeHeader title="Community"/>
<View style={s.tabRow}>
<TouchableOpacity style={[s.tabBtn,tab==='posts'&&s.tabBtnActive]} onPress={()=>setTab('posts')}>
<Text style={[s.tabBtnText,tab==='posts'&&s.tabBtnTextActive]}>💬 Posts</Text>
</TouchableOpacity>
<TouchableOpacity style={[s.tabBtn,tab==='events'&&s.tabBtnActive]} onPress={()=>setTab('events')}>
<Text style={[s.tabBtnText,tab==='events'&&s.tabBtnTextActive]}>📅 Events</Text>
</TouchableOpacity>
</View>
{tab==='posts'?(
<>
<View style={s.postBox}>
<TextInput style={s.postInput} placeholder="Share something with the community..." placeholderTextColor='rgba(255,255,255,0.9)' value={newPost} onChangeText={setNewPost} multiline/>
<TouchableOpacity style={[s.postButton,(!newPost.trim()||posting)&&s.postButtonDisabled]} onPress={handlePost} disabled={!newPost.trim()||posting}>
<Text style={s.postButtonText}>{posting?'Posting...':'Post'}</Text>
</TouchableOpacity>
</View>
{loading?<View style={s.center}><Text style={s.loadingText}>Loading posts...</Text></View>
:<FlatList data={posts} keyExtractor={i=>i.id} contentContainerStyle={s.list}
ListEmptyComponent={<View style={s.empty}><Text style={s.emptyText}>No posts yet</Text><Text style={s.emptySubText}>Be the first to post!</Text></View>}
renderItem={({item})=>(
<View style={s.card}>
<View style={s.cardHeader}>
<View style={s.avatar}><Text style={s.avatarText}>{item.author?.display_name?.[0]||'?'}</Text></View>
<View style={s.authorInfo}>
<Text style={s.authorName}>{item.author?.display_name}</Text>
<Text style={s.authorMeta}>@{item.author?.username} · {timeAgo(item.created_at)}</Text>
</View>
</View>
<Text style={s.content}>{item.content}</Text>
</View>
)}/>}
</>
):(
<>
<TouchableOpacity style={s.createEventButton} onPress={()=>setShowEventModal(true)}>
<Text style={s.createEventText}>+ Create Event</Text>
</TouchableOpacity>
{loading?<View style={s.center}><Text style={s.loadingText}>Loading events...</Text></View>
:<FlatList data={events} keyExtractor={i=>i.id} contentContainerStyle={s.list}
ListEmptyComponent={<View style={s.empty}><Text style={s.emptyText}>No events yet</Text><Text style={s.emptySubText}>Be the first to create one!</Text></View>}
renderItem={({item})=>(
<View style={s.eventCard}>
<View style={s.eventHeader}>
<Text style={s.eventTitle}>{item.title}</Text>
<Text style={s.eventDate}>📅 {formatEventDate(item.event_date)}</Text>
{item.location?<Text style={s.eventLocation}>📍 {item.location}</Text>:null}
</View>
{item.description?<Text style={s.eventDesc}>{item.description}</Text>:null}
<Text style={s.eventAuthor}>Posted by {item.author?.display_name} · {timeAgo(item.created_at)}</Text>
</View>
)}/>}
</>
)}
<Modal visible={showEventModal} animationType="slide">
<KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':'height'}>
<View style={s.modalContainer}>
<View style={s.modalHeader}>
<Text style={s.modalTitle}>Create Event</Text>
<TouchableOpacity onPress={()=>setShowEventModal(false)}>
<Text style={s.modalClose}>✕</Text>
</TouchableOpacity>
</View>
<ScrollView contentContainerStyle={s.modalContent}>
<Text style={s.inputLabel}>Event Title *</Text>
<TextInput style={s.input} placeholder="e.g. Syde Meetup NYC" placeholderTextColor='rgba(255,255,255,0.9)' value={eventTitle} onChangeText={setEventTitle}/>
<Text style={s.inputLabel}>Date & Time * (YYYY-MM-DD HH:MM)</Text>
<TextInput style={s.input} placeholder="e.g. 2025-12-25 18:00" placeholderTextColor='rgba(255,255,255,0.9)' value={eventDate} onChangeText={setEventDate}/>
<Text style={s.inputLabel}>Location</Text>
<TextInput style={s.input} placeholder="e.g. New York, NY" placeholderTextColor='rgba(255,255,255,0.9)' value={eventLocation} onChangeText={setEventLocation}/>
<Text style={s.inputLabel}>Description</Text>
<TextInput style={[s.input,s.descInput]} placeholder="Tell people about your event..." placeholderTextColor='rgba(255,255,255,0.9)' value={eventDesc} onChangeText={setEventDesc} multiline/>
<TouchableOpacity style={[s.postButton,posting&&s.postButtonDisabled]} onPress={handleCreateEvent} disabled={posting}>
<Text style={s.postButtonText}>{posting?'Creating...':'Create Event'}</Text>
</TouchableOpacity>
</ScrollView>
</View>
</KeyboardAvoidingView>
</Modal>
</KeyboardAvoidingView>
)
}
const s=StyleSheet.create({
container:{flex:1,backgroundColor:'transparent'},
tabRow:{flexDirection:'row',marginHorizontal:16,marginBottom:12,backgroundColor:'rgba(255,255,255,0.4)',borderRadius:12,padding:4},
tabBtn:{flex:1,paddingVertical:8,alignItems:'center',borderRadius:10},
tabBtnActive:{backgroundColor:'#2196F3'},
tabBtnText:{fontSize:14,color:'rgba(255,255,255,0.7)',fontWeight:'500'},
tabBtnTextActive:{color:'#ffffff',fontWeight:'700'},
postBox:{marginHorizontal:16,marginBottom:12,backgroundColor:'rgba(255,255,255,0.15)',borderRadius:16,padding:16,borderWidth:1,borderColor:'rgba(255,255,255,0.25)'},
postInput:{color:'#ffffff',fontSize:15,minHeight:60,textAlignVertical:'top',marginBottom:12},
postButton:{backgroundColor:'#2196F3',borderRadius:10,padding:10,alignItems:'center',alignSelf:'flex-end',paddingHorizontal:20},
postButtonDisabled:{backgroundColor:'#aabbcc'},
postButtonText:{color:'#ffffff',fontWeight:'600',fontSize:14},
createEventButton:{marginHorizontal:16,marginBottom:12,backgroundColor:'#2196F3',borderRadius:12,padding:14,alignItems:'center'},
createEventText:{color:'#ffffff',fontWeight:'700',fontSize:15},
list:{paddingHorizontal:16,paddingBottom:24},
card:{backgroundColor:'rgba(255,255,255,0.15)',borderRadius:16,padding:16,marginBottom:12,borderWidth:1,borderColor:'rgba(255,255,255,0.25)'},
cardHeader:{flexDirection:'row',alignItems:'center',marginBottom:10},
avatar:{width:40,height:40,borderRadius:20,backgroundColor:'#2196F3',alignItems:'center',justifyContent:'center',marginRight:10},
avatarText:{color:'#ffffff',fontSize:16,fontWeight:'bold'},
authorInfo:{flex:1},
authorName:{color:'#ffffff',fontWeight:'600',fontSize:14},
authorMeta:{color:'rgba(255,255,255,0.7)',fontSize:12},
content:{color:'#ffffff',fontSize:15,lineHeight:22},
eventCard:{backgroundColor:'rgba(255,255,255,0.15)',borderRadius:16,padding:16,marginBottom:12,borderWidth:1,borderColor:'rgba(255,255,255,0.25)'},
eventHeader:{marginBottom:8},
eventTitle:{color:'#ffffff',fontSize:17,fontWeight:'700',marginBottom:4},
eventDate:{color:'#2196F3',fontSize:13,marginBottom:2},
eventLocation:{color:'rgba(255,255,255,0.7)',fontSize:13,marginBottom:2},
eventDesc:{color:'#334455',fontSize:14,lineHeight:20,marginBottom:8},
eventAuthor:{color:'#888',fontSize:12},
center:{flex:1,alignItems:'center',justifyContent:'center'},
loadingText:{color:'rgba(255,255,255,0.7)',fontSize:16},
empty:{alignItems:'center',paddingTop:60},
emptyText:{color:'#ffffff',fontSize:18,fontWeight:'600'},
emptySubText:{color:'rgba(255,255,255,0.7)',fontSize:14,marginTop:8},
modalContainer:{flex:1,backgroundColor:'transparent'},
modalHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingTop:60,paddingHorizontal:24,paddingBottom:16,borderBottomWidth:1,borderBottomColor:'rgba(0,0,0,0.1)'},
modalTitle:{fontSize:22,fontWeight:'700',color:'#ffffff'},
modalClose:{fontSize:20,color:'rgba(255,255,255,0.7)'},
modalContent:{padding:24},
inputLabel:{fontSize:13,color:'rgba(255,255,255,0.8)',fontWeight:'600',marginBottom:6},
input:{backgroundColor:'rgba(255,255,255,0.7)',borderRadius:12,padding:14,color:'#ffffff',fontSize:15,marginBottom:16,borderWidth:1,borderColor:'rgba(255,255,255,0.9)'},
descInput:{height:100,textAlignVertical:'top'},
})
