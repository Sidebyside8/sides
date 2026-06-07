import{useEffect,useState,useRef}from'react'
import{View,Text,TouchableOpacity,StyleSheet,Image}from'react-native'
import{LinearGradient}from'expo-linear-gradient'
import{Session}from'@supabase/supabase-js'
import{supabase}from'./src/lib/supabase'
import{GRADIENT,COLORS}from'./src/lib/theme'
import LoginScreen from'./src/screens/LoginScreen'
import ProfileSetupScreen from'./src/screens/ProfileSetupScreen'
import DiscoverScreen from'./src/screens/DiscoverScreen'
import MatchesScreen from'./src/screens/MatchesScreen'
import MessagesScreen from'./src/screens/MessagesScreen'
import MessagesListScreen from'./src/screens/MessagesListScreen'
import CommunityScreen from'./src/screens/CommunityScreen'
import ProfileScreen from'./src/screens/ProfileScreen'
type Tab='discover'|'matches'|'messages'|'community'|'profile'
export default function App(){
const[session,setSession]=useState<Session|null>(null)
const[initialized,setInitialized]=useState(false)
const[hasProfile,setHasProfile]=useState<boolean|null>(null)
const[activeTab,setActiveTab]=useState<Tab>('discover')
const[activeMatch,setActiveMatch]=useState<{matchId:string;otherUser:any}|null>(null)
const profileChecked=useRef<string|null>(null)
useEffect(()=>{
supabase.auth.getSession().then(({data:{session}})=>{
setSession(session)
if(session){checkProfile(session.user.id)}
else{setHasProfile(false);setInitialized(true)}
})
const{data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
setSession(session)
if(session){if(profileChecked.current!==session.user.id){checkProfile(session.user.id)}}
else{profileChecked.current=null;setHasProfile(false);setInitialized(true)}
})
return()=>subscription.unsubscribe()
},[])
const checkProfile=async(userId:string)=>{
if(profileChecked.current===userId)return
profileChecked.current=userId
try{
const{data}=await supabase.from('users').select('id').eq('id',userId).maybeSingle()
setHasProfile(!!data)
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
if(activeMatch)return<MessagesScreen matchId={activeMatch.matchId} otherUser={activeMatch.otherUser} onBack={()=>setActiveMatch(null)}/>
return(
<LinearGradient colors={GRADIENT.colors} start={GRADIENT.start} end={GRADIENT.end} style={s.container}>
<View style={s.content}>
{activeTab==='discover'&&<DiscoverScreen/>}
{activeTab==='matches'&&<MatchesScreen onSelectMatch={(matchId,otherUser)=>setActiveMatch({matchId,otherUser})}/>}
{activeTab==='messages'&&<MessagesListScreen onSelectMatch={(matchId,otherUser)=>setActiveMatch({matchId,otherUser})}/>}
{activeTab==='community'&&<CommunityScreen/>}
{activeTab==='profile'&&<ProfileScreen/>}
</View>
<View style={s.tabBar}>
<TouchableOpacity style={s.tab} onPress={()=>setActiveTab('discover')}>
<Text style={[s.tabText,activeTab==='discover'&&s.tabActive]}>Discover</Text>
</TouchableOpacity>
<TouchableOpacity style={s.tab} onPress={()=>setActiveTab('matches')}>
<Text style={[s.tabText,activeTab==='matches'&&s.tabActive]}>Matches</Text>
</TouchableOpacity>
<TouchableOpacity style={s.tab} onPress={()=>setActiveTab('messages')}>
<Text style={[s.tabText,activeTab==='messages'&&s.tabActive]}>Messages</Text>
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
tabBar:{flexDirection:'row',backgroundColor:COLORS.tabBar,borderTopWidth:1,borderTopColor:COLORS.tabBarBorder,paddingBottom:24,paddingTop:12},
tab:{flex:1,alignItems:'center'},
tabText:{color:COLORS.tabInactive,fontSize:10,fontWeight:'500'},
tabActive:{color:COLORS.tabActive,fontWeight:'700'},
})
