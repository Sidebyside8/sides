import{useEffect,useState}from'react'
import{View,Text,TextInput,TouchableOpacity,StyleSheet,FlatList,Alert,KeyboardAvoidingView,Platform,Modal,ScrollView,Image}from'react-native'
import{supabase}from'../lib/supabase'
import SydeHeader from'../components/SydeHeader'
import CreateEventScreen from'./CreateEventScreen'
type Post={id:string;content:string;user_id:string;created_at:string;author:{display_name:string;username:string}}
type Event={id:string;title:string;description:string;location:string;event_date:string;user_id:string;created_at:string;author:{display_name:string;username:string}}
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December']
const HOURS=Array.from({length:12},(_,i)=>String(i+1).padStart(2,'0'))
const MINUTES=['00','15','30','45']
const AMPM=['AM','PM']
export default function CommunityScreen(){
const[tab,setTab]=useState<'posts'|'events'>('posts')
const[posts,setPosts]=useState<Post[]>([])
const[events,setEvents]=useState<Event[]>([])
const[newPost,setNewPost]=useState('')
const[loading,setLoading]=useState(true)
const[posting,setPosting]=useState(false)
const[currentUserId,setCurrentUserId]=useState<string|null>(null)
const[showEventModal,setShowEventModal]=useState(false)
const[showCreateEvent,setShowCreateEvent]=useState(false)
const[eventTitle,setEventTitle]=useState('')
const[eventDesc,setEventDesc]=useState('')
const[eventLocation,setEventLocation]=useState('')
const now=new Date()
const[selMonth,setSelMonth]=useState(now.getMonth())
const[selDay,setSelDay]=useState(now.getDate())
const[selYear,setSelYear]=useState(now.getFullYear())
const[selHour,setSelHour]=useState('12')
const[selMinute,setSelMinute]=useState('00')
const[selAmpm,setSelAmpm]=useState('PM')
const years=Array.from({length:3},(_,i)=>now.getFullYear()+i)
const daysInMonth=new Date(selYear,selMonth+1,0).getDate()
const days=Array.from({length:daysInMonth},(_,i)=>i+1)
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
const getSelectedDate=()=>{
let hour=parseInt(selHour)
if(selAmpm==='PM'&&hour!==12)hour+=12
if(selAmpm==='AM'&&hour===12)hour=0
const d=new Date(selYear,selMonth,selDay,hour,parseInt(selMinute))
return d
}
const handleCreateEvent=async()=>{
if(!eventTitle.trim()){Alert.alert('Required','Please enter an event title');return}
const eventDateObj=getSelectedDate()
if(eventDateObj<new Date()){Alert.alert('Invalid Date','Please select a future date and time');return}
setPosting(true)
const{data,error}=await supabase.from('events').insert({
user_id:currentUserId,
title:eventTitle.trim(),
description:eventDesc.trim(),
location:eventLocation.trim(),
event_date:eventDateObj.toISOString(),
}).select().single()
if(error){Alert.alert('Error',error.message)}else{
const{data:author}=await supabase.from('users').select('display_name,username').eq('id',currentUserId).single()
setEvents(prev=>[...prev,{...data,author}].sort((a,b)=>new Date(a.event_date).getTime()-new Date(b.event_date).getTime()))
setShowEventModal(false)
setEventTitle('');setEventDesc('');setEventLocation('')
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
const ScrollPicker=({values,selected,onSelect}:{values:(string|number)[];selected:string|number;onSelect:(v:any)=>void})=>(
<ScrollView style={s.pickerCol} showsVerticalScrollIndicator={false}>
{values.map((v,i)=>(
<TouchableOpacity key={String(i)} onPress={()=>onSelect(v)} style={[s.pickerItem,String(selected)===String(v)&&s.pickerItemActive]}>
<Text style={[s.pickerText,String(selected)===String(v)&&s.pickerTextActive]}>{String(v)}</Text>
</TouchableOpacity>
))}
</ScrollView>
)
if(showCreateEvent)return<CreateEventScreen onBack={()=>setShowCreateEvent(false)} onCreated={()=>{setShowCreateEvent(false);if(tab==='events')loadContent()}}/>
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
{(item as any).image_url?<Image source={{uri:(item as any).image_url}} style={s.eventImage}/>:null}
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
<Modal visible={showEventModal} animationType="slide" transparent>
<View style={{flex:1,backgroundColor:'rgba(0,0,0,0.7)',justifyContent:'flex-end'}}>
<View style={{backgroundColor:'#0A2A4A',borderTopLeftRadius:24,borderTopRightRadius:24,padding:24,paddingBottom:40}}>
<View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
<Text style={{color:'#ffffff',fontSize:20,fontWeight:'800'}}>Create Event</Text>
<TouchableOpacity onPress={()=>setShowEventModal(false)}>
<Text style={{color:'rgba(255,255,255,0.7)',fontSize:20}}>✕</Text>
</TouchableOpacity>
</View>
<ScrollView showsVerticalScrollIndicator={false}>
<Text style={s.inputLabel}>Event Title *</Text>
<TextInput style={s.input} placeholder="e.g. Syde Meetup NYC" placeholderTextColor='rgba(255,255,255,0.5)' value={eventTitle} onChangeText={setEventTitle}/>
<Text style={s.inputLabel}>Date & Time</Text>
<View style={s.pickerContainer}>
<View style={{flex:2}}>
<Text style={s.pickerLabel}>Month</Text>
<ScrollPicker values={MONTHS} selected={MONTHS[selMonth]} onSelect={(v:string)=>setSelMonth(MONTHS.indexOf(v))}/>
</View>
<View style={{flex:1}}>
<Text style={s.pickerLabel}>Day</Text>
<ScrollPicker values={days} selected={selDay} onSelect={setSelDay}/>
</View>
<View style={{flex:1}}>
<Text style={s.pickerLabel}>Year</Text>
<ScrollPicker values={years} selected={selYear} onSelect={setSelYear}/>
</View>
<View style={{flex:1}}>
<Text style={s.pickerLabel}>Hour</Text>
<ScrollPicker values={HOURS} selected={selHour} onSelect={setSelHour}/>
</View>
<View style={{flex:1}}>
<Text style={s.pickerLabel}>Min</Text>
<ScrollPicker values={MINUTES} selected={selMinute} onSelect={setSelMinute}/>
</View>
<View style={{flex:1}}>
<Text style={s.pickerLabel}>AM/PM</Text>
<ScrollPicker values={AMPM} selected={selAmpm} onSelect={setSelAmpm}/>
</View>
</View>
<Text style={{color:'rgba(255,255,255,0.6)',fontSize:12,marginBottom:16,textAlign:'center'}}>Selected: {MONTHS[selMonth]} {selDay}, {selYear} at {selHour}:{selMinute} {selAmpm}</Text>
<Text style={s.inputLabel}>Location</Text>
<TextInput style={s.input} placeholder="e.g. New York, NY" placeholderTextColor='rgba(255,255,255,0.5)' value={eventLocation} onChangeText={setEventLocation}/>
<Text style={s.inputLabel}>Description</Text>
<TextInput style={[s.input,{height:80,textAlignVertical:'top'}]} placeholder="Tell people about your event..." placeholderTextColor='rgba(255,255,255,0.5)' value={eventDesc} onChangeText={setEventDesc} multiline/>
<TouchableOpacity style={[s.postButton,{width:'100%',alignSelf:'stretch'},posting&&s.postButtonDisabled]} onPress={handleCreateEvent} disabled={posting}>
<Text style={s.postButtonText}>{posting?'Creating...':'Create Event'}</Text>
</TouchableOpacity>
</ScrollView>
</View>
</View>
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
eventDate:{color:'#7EC8F5',fontSize:13,marginBottom:2},
eventLocation:{color:'rgba(255,255,255,0.7)',fontSize:13,marginBottom:2},
eventDesc:{color:'rgba(255,255,255,0.85)',fontSize:14,lineHeight:20,marginBottom:8},
eventAuthor:{color:'rgba(255,255,255,0.5)',fontSize:12},
center:{flex:1,alignItems:'center',justifyContent:'center'},
loadingText:{color:'rgba(255,255,255,0.7)',fontSize:16},
empty:{alignItems:'center',paddingTop:60},
emptyText:{color:'#ffffff',fontSize:18,fontWeight:'600'},
emptySubText:{color:'rgba(255,255,255,0.7)',fontSize:14,marginTop:8},
inputLabel:{fontSize:13,color:'rgba(255,255,255,0.8)',fontWeight:'600',marginBottom:6},
input:{backgroundColor:'rgba(255,255,255,0.15)',borderRadius:12,padding:14,color:'#ffffff',fontSize:15,marginBottom:16,borderWidth:1,borderColor:'rgba(255,255,255,0.3)'},
eventImage:{width:'100%',height:200,borderRadius:12,marginBottom:12},
pickerContainer:{flexDirection:'row',gap:4,marginBottom:8,height:150},
pickerCol:{flex:1},
pickerLabel:{color:'rgba(255,255,255,0.6)',fontSize:10,textAlign:'center',marginBottom:4},
pickerItem:{paddingVertical:8,alignItems:'center',borderRadius:8},
pickerItemActive:{backgroundColor:'#2196F3'},
pickerText:{color:'rgba(255,255,255,0.6)',fontSize:12},
pickerTextActive:{color:'#ffffff',fontWeight:'700',fontSize:13},
})
