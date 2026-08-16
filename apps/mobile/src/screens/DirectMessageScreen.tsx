import{useEffect,useState,useRef}from'react'
import{View,Text,TextInput,TouchableOpacity,StyleSheet,FlatList,KeyboardAvoidingView,Platform,Image,ActivityIndicator,Alert,Modal}from'react-native'
import{supabase}from'../lib/supabase'
import ProfileModal from'../components/ProfileModal'
import{launchImageLibraryAsync,launchCameraAsync,requestMediaLibraryPermissionsAsync,requestCameraPermissionsAsync,MediaTypeOptions}from'expo-image-picker'
import{notifyNewMessage}from'../lib/notifications'
import{checkPremiumStatus}from'../lib/subscription'
type Message={id:string;sender_id:string;recipient_id:string;content:string;created_at:string;read_at?:string;image_url?:string;is_disappearing?:boolean;disappears_at?:string;deleted_for_sender?:boolean;deleted_for_recipient?:boolean}
type OtherUser={id:string;display_name:string;username:string;avatar_url?:string}
export default function DirectMessageScreen({otherUser,onBack}:{otherUser:OtherUser;onBack:()=>void}){
const[messages,setMessages]=useState<Message[]>([])
const[newMessage,setNewMessage]=useState('')
const[currentUserId,setCurrentUserId]=useState<string|null>(null)
const[sending,setSending]=useState(false)
const[uploadingImage,setUploadingImage]=useState(false)
const[showOtherProfile,setShowOtherProfile]=useState(false)
const[isPremium,setIsPremium]=useState(false)
const[disappearingMode,setDisappearingMode]=useState(false)
const[viewingDisappearing,setViewingDisappearing]=useState<Message|null>(null)
const[disappearCountdown,setDisappearCountdown]=useState(30)
const flatListRef=useRef<FlatList>(null)
const countdownRef=useRef<any>(null)
useEffect(()=>{
loadMessages()
markMessagesRead()
checkPremiumStatus().then(p=>setIsPremium(p))
},[])
useEffect(()=>{
if(viewingDisappearing){
setDisappearCountdown(30)
countdownRef.current=setInterval(()=>{
setDisappearCountdown(prev=>{
if(prev<=1){clearInterval(countdownRef.current);setViewingDisappearing(null);return 0}
return prev-1
})
},1000)
}
return()=>{if(countdownRef.current)clearInterval(countdownRef.current)}
},[viewingDisappearing])
const markMessagesRead=async()=>{
const{data:{user}}=await supabase.auth.getUser()
if(!user)return
await supabase.from('direct_messages').update({read_at:new Date().toISOString()}).eq('recipient_id',user.id).eq('sender_id',otherUser.id).is('read_at',null)
}
const loadMessages=async()=>{
const{data:{user}}=await supabase.auth.getUser()
if(!user)return
setCurrentUserId(user.id)
const{data}=await supabase.from('direct_messages').select('*')
.or(`and(sender_id.eq.${user.id},recipient_id.eq.${otherUser.id}),and(sender_id.eq.${otherUser.id},recipient_id.eq.${user.id})`)
.order('created_at',{ascending:true})
const filtered=(data||[]).filter((m:Message)=>{
if(m.sender_id===user.id&&m.deleted_for_sender)return false
if(m.recipient_id===user.id&&m.deleted_for_recipient)return false
if(m.disappears_at&&new Date(m.disappears_at)<new Date())return false
return true
})
setMessages(filtered)
await supabase.from('direct_messages').update({read:true}).eq('sender_id',otherUser.id).eq('recipient_id',user.id).eq('read',false)
const channel=supabase.channel('direct-'+otherUser.id)
.on('postgres_changes',{event:'INSERT',schema:'public',table:'direct_messages'},payload=>{
const msg=payload.new as Message
if((msg.sender_id===user.id&&msg.recipient_id===otherUser.id)||(msg.sender_id===otherUser.id&&msg.recipient_id===user.id)){
setMessages(prev=>[...prev,msg])
if(msg.recipient_id===user.id)supabase.from('direct_messages').update({read_at:new Date().toISOString()}).eq('id',msg.id).then(()=>{})
}
}).on('postgres_changes',{event:'UPDATE',schema:'public',table:'direct_messages'},payload=>{
const msg=payload.new as Message
setMessages(prev=>prev.map(m=>m.id===msg.id?msg:m))
}).subscribe()
return()=>{supabase.removeChannel(channel)}
}
const uploadMessageImage=async(base64:string)=>{
setUploadingImage(true)
try{
const{data:{user}}=await supabase.auth.getUser()
if(!user)return
const fileName=user.id+'-msg-'+Date.now()+'.jpg'
const uploadData=Uint8Array.from(atob(base64),c=>c.charCodeAt(0))
const{error:ue}=await supabase.storage.from('avatars').upload(fileName,uploadData,{contentType:'image/jpeg',upsert:true})
if(ue){Alert.alert('Upload failed',ue.message);setUploadingImage(false);return}
const{data:ud}=supabase.storage.from('avatars').getPublicUrl(fileName)
const disappearsAt=disappearingMode?new Date(Date.now()+30000).toISOString():null
const{data,error}=await supabase.from('direct_messages').insert({
sender_id:currentUserId,
recipient_id:otherUser.id,
content:'📷 Photo',
image_url:ud.publicUrl,
is_disappearing:disappearingMode,
disappears_at:disappearsAt
}).select().single()
if(!error&&data)setMessages(prev=>[...prev,data])
flatListRef.current?.scrollToEnd({animated:true})
}catch(e:any){Alert.alert('Error',e.message)}
setUploadingImage(false)
}
const handleSendImage=async()=>{
Alert.alert('Send Photo','Choose how to add your photo',[
{text:'Take Photo',onPress:async()=>{
const perm=await requestCameraPermissionsAsync()
if(!perm.granted){Alert.alert('Permission needed','Please allow camera access');return}
const result=await launchCameraAsync({allowsEditing:true,quality:0.7,base64:true})
if(!result.canceled&&result.assets[0].base64)await uploadMessageImage(result.assets[0].base64)
}},
{text:'Choose from Library',onPress:async()=>{
const perm=await requestMediaLibraryPermissionsAsync()
if(!perm.granted){Alert.alert('Permission needed','Please allow photo library access');return}
const result=await launchImageLibraryAsync({mediaTypes:MediaTypeOptions.Images,allowsEditing:true,quality:0.7,base64:true})
if(!result.canceled&&result.assets[0].base64)await uploadMessageImage(result.assets[0].base64)
}},
{text:'Cancel',style:'cancel'}
])
}
const handleSend=async()=>{
if(!newMessage.trim()||!currentUserId)return
setSending(true)
const content=newMessage.trim()
setNewMessage('')
const{data,error}=await supabase.from('direct_messages').insert({
sender_id:currentUserId,
recipient_id:otherUser.id,
content
}).select().single()
if(!error&&data){
setMessages(prev=>[...prev,data])
try{
const{data:{user}}=await supabase.auth.getUser()
if(!user)return
const{data:myProfile}=await supabase.from('users').select('display_name').eq('id',user.id).single()
await notifyNewMessage(otherUser.id,myProfile?.display_name||'Someone',content)
}catch(e){}
}
setSending(false)
flatListRef.current?.scrollToEnd({animated:true})
}
const handleDeleteChat=async()=>{
if(!currentUserId)return
if(!isPremium){
const today=new Date().toISOString().split('T')[0]
const{count}=await supabase.from('chat_deletions').select('id',{count:'exact'}).eq('user_id',currentUserId).gte('deleted_at',today+'T00:00:00')
if((count||0)>=5){Alert.alert('Limit Reached','Free users can delete up to 5 chats per day. Upgrade to Premium for unlimited deletions.');return}
}
Alert.alert('Delete Chat','This will remove this conversation from your view only.',[
{text:'Cancel',style:'cancel'},
{text:'Delete',style:'destructive',onPress:async()=>{
await supabase.from('direct_messages').update({deleted_for_sender:true}).eq('sender_id',currentUserId).eq('recipient_id',otherUser.id)
await supabase.from('direct_messages').update({deleted_for_recipient:true}).eq('recipient_id',currentUserId).eq('sender_id',otherUser.id)
await supabase.from('chat_deletions').insert({user_id:currentUserId})
onBack()
}}
])
}
const handleViewDisappearing=(msg:Message)=>{
setViewingDisappearing(msg)
setTimeout(()=>{
supabase.from('direct_messages').update({disappears_at:new Date().toISOString()}).eq('id',msg.id).then(()=>{})
setMessages(prev=>prev.filter(m=>m.id!==msg.id))
},30000)
}
const timeAgo=(d:string)=>{
const m=Math.floor((Date.now()-new Date(d).getTime())/60000)
if(m<1)return'now'
if(m<60)return m+'m'
const h=Math.floor(m/60)
if(h<24)return h+'h'
return Math.floor(h/24)+'d'
}
return(
<KeyboardAvoidingView style={s.container} behavior={Platform.OS==='ios'?'padding':'height'}>
<View style={s.header}>
<TouchableOpacity onPress={onBack} style={s.backBtn}>
<Text style={s.backText}>‹ Back</Text>
</TouchableOpacity>
<View style={s.headerInfo}>
<TouchableOpacity onPress={()=>setShowOtherProfile(true)}>{otherUser.avatar_url?<Image source={{uri:otherUser.avatar_url}} style={s.headerAvatar}/>:<View style={s.headerAvatarPlaceholder}><Text style={s.headerAvatarText}>{otherUser.display_name?.[0]||'?'}</Text></View>}</TouchableOpacity>
<View style={{flex:1}}>
<TouchableOpacity onPress={()=>setShowOtherProfile(true)}><Text style={s.headerName}>{otherUser.display_name}</Text></TouchableOpacity>
<Text style={s.headerUsername}>@{otherUser.username}</Text>
</View>
<TouchableOpacity onPress={handleDeleteChat} style={{padding:8}}>
<Text style={{color:'rgba(255,100,100,0.8)',fontSize:13}}>🗑️ Delete</Text>
</TouchableOpacity>
</View>
</View>
<FlatList ref={flatListRef} data={messages} keyExtractor={i=>i.id}
contentContainerStyle={s.messagesList}
onContentSizeChange={()=>flatListRef.current?.scrollToEnd({animated:false})}
ListEmptyComponent={<View style={s.empty}><Text style={s.emptyText}>No messages yet{'\n'}Say hello! 👋</Text></View>}
renderItem={({item})=>{
const isMe=item.sender_id===currentUserId
const isRead=isMe&&!!item.read_at
return(
<View style={[s.bubble,isMe?s.myBubble:s.theirBubble]}>
{item.is_disappearing&&!isMe?(
<TouchableOpacity onPress={()=>handleViewDisappearing(item)} style={{alignItems:'center',padding:8}}>
<Text style={{fontSize:32}}>🔥</Text>
<Text style={{color:'#ffffff',fontSize:12,marginTop:4}}>Tap to view (disappears in 30s)</Text>
</TouchableOpacity>
):(
<>
{item.image_url?<Image source={{uri:item.image_url}} style={{width:200,height:200,borderRadius:12,marginBottom:4}}/>:null}
{item.content!=='📷 Photo'&&<Text style={[s.bubbleText,isMe?s.myText:s.theirText]}>{item.content}</Text>}
{item.is_disappearing&&isMe&&<Text style={{color:'rgba(255,255,255,0.6)',fontSize:10,marginTop:2}}>🔥 Disappearing</Text>}
</>
)}
<View style={{flexDirection:'row',justifyContent:'flex-end',alignItems:'center',gap:4}}>
<Text style={s.timeText}>{timeAgo(item.created_at)}</Text>
</View>
{isMe&&isPremium&&(
<Text style={{fontSize:10,color:'rgba(255,255,255,0.85)',fontStyle:'italic',alignSelf:'flex-end',marginTop:2}}>
{isRead?'Read':'✓ Sent'}
</Text>
)}
</View>
)
}}/>
<View style={s.inputRow}>
{isPremium&&(
<TouchableOpacity style={[s.disappearBtn,disappearingMode&&s.disappearBtnActive]} onPress={()=>setDisappearingMode(!disappearingMode)}>
<Text style={{fontSize:16}}>🔥</Text>
</TouchableOpacity>
)}
<TouchableOpacity style={s.imageBtn} onPress={handleSendImage} disabled={uploadingImage}>
{uploadingImage?<ActivityIndicator color="#ffffff" size="small"/>:<Text style={s.imageBtnText}>📷</Text>}
</TouchableOpacity>
<TextInput style={s.input} placeholder={disappearingMode?"Disappearing message...":'Message...'} placeholderTextColor="rgba(10,22,40,0.4)"
value={newMessage} onChangeText={setNewMessage} multiline
returnKeyType="send" onSubmitEditing={handleSend}/>
<TouchableOpacity style={[s.sendBtn,(!newMessage.trim()||sending)&&s.sendDisabled]}
onPress={handleSend} disabled={!newMessage.trim()||sending}>
<Text style={s.sendText}>Send</Text>
</TouchableOpacity>
</View>
<ProfileModal user={otherUser as any} visible={showOtherProfile} onClose={()=>setShowOtherProfile(false)} onChat={()=>{}} isFavorite={false} onToggleFavorite={()=>{}} onBlock={()=>{}}/>
<Modal visible={!!viewingDisappearing} transparent animationType="fade">
<View style={{flex:1,backgroundColor:'rgba(0,0,0,0.9)',alignItems:'center',justifyContent:'center'}}>
<Text style={{color:'#FF8C00',fontSize:48,fontWeight:'900',marginBottom:16}}>{disappearCountdown}s</Text>
{viewingDisappearing?.image_url&&<Image source={{uri:viewingDisappearing.image_url}} style={{width:300,height:300,borderRadius:12}}/>}
{viewingDisappearing?.content&&viewingDisappearing.content!=='📷 Photo'&&<Text style={{color:'#ffffff',fontSize:20,padding:24,textAlign:'center'}}>{viewingDisappearing.content}</Text>}
<TouchableOpacity onPress={()=>setViewingDisappearing(null)} style={{marginTop:24,padding:16,backgroundColor:'rgba(255,255,255,0.2)',borderRadius:12}}>
<Text style={{color:'#ffffff',fontSize:16}}>Close</Text>
</TouchableOpacity>
</View>
</Modal>
</KeyboardAvoidingView>
)
}
const s=StyleSheet.create({
container:{flex:1},
header:{flexDirection:'row',alignItems:'center',paddingTop:Platform.OS==='android'?40:60,paddingHorizontal:16,paddingBottom:16,backgroundColor:'rgba(0,0,0,0.3)'},
backBtn:{marginRight:12},
backText:{color:'#2196F3',fontSize:18,fontWeight:'600'},
headerInfo:{flexDirection:'row',alignItems:'center',flex:1},
headerAvatar:{width:40,height:40,borderRadius:20,marginRight:10},
headerAvatarPlaceholder:{width:40,height:40,borderRadius:20,backgroundColor:'#2196F3',alignItems:'center',justifyContent:'center',marginRight:10},
headerAvatarText:{color:'#fff',fontWeight:'bold'},
headerName:{color:'#ffffff',fontSize:16,fontWeight:'600'},
headerUsername:{color:'rgba(255,255,255,0.6)',fontSize:13},
messagesList:{padding:16,paddingBottom:8},
empty:{flex:1,alignItems:'center',justifyContent:'center',paddingTop:60},
emptyText:{color:'rgba(255,255,255,0.5)',fontSize:16,textAlign:'center',lineHeight:24},
bubble:{maxWidth:'75%',borderRadius:20,padding:12,marginBottom:8},
myBubble:{backgroundColor:'#FF8C00',alignSelf:'flex-end',borderBottomRightRadius:4},
theirBubble:{backgroundColor:'#1B6CA8',alignSelf:'flex-start',borderBottomLeftRadius:4},
bubbleText:{fontSize:15},
myText:{color:'#ffffff'},
theirText:{color:'#ffffff'},
timeText:{fontSize:10,color:'rgba(255,255,255,0.5)',marginTop:4,alignSelf:'flex-end'},
inputRow:{flexDirection:'row',padding:12,backgroundColor:'rgba(255,255,255,0.05)',borderTopWidth:1,borderTopColor:'rgba(255,255,255,0.1)'},
input:{flex:1,backgroundColor:'rgba(255,255,255,0.95)',borderRadius:20,paddingHorizontal:16,paddingVertical:10,color:'#0A1628',fontSize:15,maxHeight:100,marginRight:8,borderWidth:1,borderColor:'rgba(255,255,255,0.3)'},
imageBtn:{backgroundColor:'rgba(255,255,255,0.2)',borderRadius:20,width:40,height:40,alignItems:'center',justifyContent:'center',marginRight:8},
imageBtnText:{fontSize:20},
disappearBtn:{backgroundColor:'rgba(255,255,255,0.1)',borderRadius:20,width:40,height:40,alignItems:'center',justifyContent:'center',marginRight:8},
disappearBtnActive:{backgroundColor:'rgba(255,140,0,0.5)',borderWidth:1,borderColor:'#FF8C00'},
sendBtn:{backgroundColor:'#2196F3',borderRadius:20,paddingHorizontal:16,paddingVertical:10},
sendDisabled:{backgroundColor:'rgba(33,150,243,0.3)'},
sendText:{color:'#ffffff',fontWeight:'600'},
})
