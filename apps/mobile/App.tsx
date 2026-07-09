import{useEffect,useState,useRef}from'react'
import{View,Text,TouchableOpacity,StyleSheet,Image}from'react-native'
import{LinearGradient}from'expo-linear-gradient'
import{Session}from'@supabase/supabase-js'
import{supabase}from'./src/lib/supabase'
import{GRADIENT,COLORS}from'./src/lib/theme'
import{registerForPushNotifications,savePushToken}from'./src/lib/notifications'
import{AppState}from'react-native'
import LoginScreen from'./src/screens/LoginScreen'
import ProfileSetupScreen from'./src/screens/ProfileSetupScreen'
import DiscoverScreen from'./src/screens/DiscoverScreen'
import MessagesScreen from'./src/screens/MessagesScreen'
import MessagesListScreen from'./src/screens/MessagesListScreen'
import DirectMessageScreen from'./src/screens/DirectMessageScreen'
import CommunityScreen from'./src/screens/CommunityScreen'
import ProfileScreen from'./src/screens/ProfileScreen'
import WhoViewedMeScreen from'./src/screens/WhoViewedMeScreen'
import PremiumScreen from'./src/screens/PremiumScreen'
type Tab='discover'|'messages'|'community'|'profile'|'viewed'
export default function App(){
const[session,setSession]=useState<Session|null>(null)
const[initialized,setInitialized]=useState(false)
const[hasProfile,setHasProfile]=useState<boolean|null>(null)
const[activeTab,setActiveTab]=useState<Tab>('discover')
const[activeDirectMessage,setActiveDirectMessage]=useState<any|null>(null)
const[unreadCount,setUnreadCount]=useState(0)
const[discoverKey,setDiscoverKey]=useState(0)
const[showPremium,setShowPremium]=useState(false)
const[isPremium,setIsPremium]=useState(false)
const profileChecked=useRef<string|null>(null)
useEffect(()=>{
supabase.auth.getSession().then(({data:{session}})=>{
setSession(session)
if(session){checkProfile(session.user.id)}
else{setHasProfile(false);setInitialized(true)}
})
const{data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
setSession(session)
if(session){if(profileChecked.current!==session.user.id){setHasProfile(null);checkProfile(session.user.id)}}
else{profileChecked.current=null;setHasProfile(false);setInitialized(true)}
})
return()=>subscription.unsubscribe()
},[])
const checkProfile=async(userId:string)=>{
if(profileChecked.current===userId)return
profileChecked.current=userId
try{
const{data}=await supabase.from('users').select('id').eq('id',userId).maybeSingle()
const hasP=!!data
setHasProfile(hasP)
if(hasP){
const{data:premiumData}=await supabase.from('users').select('is_premium').eq('id',userId).single()
setIsPremium(premiumData?.is_premium||false)
}
if(hasP){
registerForPushNotifications().then(token=>{if(token)savePushToken(token)})
supabase.from('users').update({is_online:true,last_seen:new Date().toISOString()}).eq('id',userId).then(()=>{})
const loadUnread=()=>{
supabase.from('direct_messages').select('id',{count:'exact'}).eq('recipient_id',userId).eq('read',false).then(({count})=>setUnreadCount(count||0))
}
loadUnread()
const msgChannel=supabase.channel('unread-'+userId)
.on('postgres_changes',{event:'*',schema:'public',table:'direct_messages'},()=>{loadUnread()})
.subscribe()
const sub=AppState.addEventListener('change',state=>{
supabase.from('users').update({is_online:state==='active',last_seen:new Date().toISOString()}).eq('id',userId).then(()=>{})
})
}
}catch(e){setHasProfile(false)}
setInitialized(true)
}
if(!initialized||hasProfile===null)return(
<LinearGradient colors={GRADIENT.colors} start={GRADIENT.start} end={GRADIENT.end} style={{flex:1,alignItems:'center',justifyContent:'center'}}>
<Image source={require('./assets/logo2.png')} style={{width:140,height:140,marginBottom:24}} resizeMode="contain"/>
<Text style={{color:'rgba(255,255,255,0.7)',fontSize:16,fontWeight:'500'}}>Loading...</Text>
</LinearGradient>
)
if(!session)return<LoginScreen/>
if(!hasProfile)return<ProfileSetupScreen onComplete={()=>setHasProfile(true)}/>
if(showPremium)return<PremiumScreen onClose={()=>setShowPremium(false)} onSuccess={()=>{setIsPremium(true);setShowPremium(false)}}/>
if(activeDirectMessage)return<DirectMessageScreen otherUser={activeDirectMessage} onBack={()=>setActiveDirectMessage(null)}/>
return(
<LinearGradient colors={GRADIENT.colors} start={GRADIENT.start} end={GRADIENT.end} style={s.container}>
<View style={s.content}>
{activeTab==='discover'&&<DiscoverScreen key={discoverKey} onChat={(user)=>setActiveDirectMessage(user)} setActiveTab={(tab:string)=>setActiveTab(tab as Tab)}/>}
{activeTab==='messages'&&<MessagesListScreen onDirectMessage={(user)=>setActiveDirectMessage(user)}/>}
{activeTab==='community'&&<CommunityScreen/>}
{activeTab==='profile'&&<ProfileScreen onUpgrade={()=>setShowPremium(true)} isPremium={isPremium}/>}
{activeTab==='viewed'&&<WhoViewedMeScreen onClose={()=>setActiveTab('profile')}/>}
</View>
<View style={s.tabBar}>
<TouchableOpacity style={s.tab} onPress={()=>{setActiveTab('discover');setDiscoverKey(k=>k+1)}}>
<Text style={[s.tabText,activeTab==='discover'&&s.tabActive]}>Discover</Text>
</TouchableOpacity>
<TouchableOpacity style={s.tab} onPress={()=>{setActiveTab('messages');setUnreadCount(0)}}>
<View style={{position:'relative'}}>
<Text style={[s.tabText,activeTab==='messages'&&s.tabActive]}>Messages</Text>
{unreadCount>0&&<View style={s.badge}><Text style={s.badgeText}>{unreadCount>9?'9+':unreadCount}</Text></View>}
</View>
</TouchableOpacity>
<TouchableOpacity style={s.tab} onPress={()=>setActiveTab('community')}>
<Text style={[s.tabText,activeTab==='community'&&s.tabActive]}>Community</Text>
</TouchableOpacity>
<TouchableOpacity style={s.tab} onPress={()=>setActiveTab('profile')}>
<Text style={[s.tabText,activeTab==='profile'&&s.tabActive]}>Profile</Text>
</TouchableOpacity>
</View>
</LinearGradient>
)
}
const s=StyleSheet.create({
container:{flex:1},
content:{flex:1},
tabBar:{flexDirection:'row',backgroundColor:COLORS.tabBar,borderTopWidth:1,borderTopColor:COLORS.tabBarBorder,paddingBottom:8,paddingTop:8},
badge:{position:'absolute',top:-6,right:-12,backgroundColor:'#FF8C00',borderRadius:9,minWidth:18,height:18,alignItems:'center',justifyContent:'center',paddingHorizontal:4},
badgeText:{color:'#ffffff',fontSize:10,fontWeight:'700'},
tab:{flex:1,alignItems:'center',justifyContent:'center',height:44},
tabText:{color:COLORS.tabInactive,fontSize:10,fontWeight:'500'},
tabActive:{color:COLORS.tabActive,fontWeight:'700'},
})
