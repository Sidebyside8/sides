import{useEffect,useState,useRef}from'react'
import{View,Text,TouchableOpacity,StyleSheet}from'react-native'
import{LinearGradient}from'expo-linear-gradient'
import{Session}from'@supabase/supabase-js'
import{supabase}from'./src/lib/supabase'
import LoginScreen from'./src/screens/LoginScreen'
import ProfileSetupScreen from'./src/screens/ProfileSetupScreen'
import DiscoverScreen from'./src/screens/DiscoverScreen'
import MatchesScreen from'./src/screens/MatchesScreen'
import MessagesScreen from'./src/screens/MessagesScreen'
import CommunityScreen from'./src/screens/CommunityScreen'
import ProfileScreen from'./src/screens/ProfileScreen'
import FavoritesScreen from'./src/screens/FavoritesScreen'
type Tab='discover'|'favorites'|'matches'|'community'|'profile'
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
<LinearGradient colors={['#B8D4E8','#E8C4A0']} start={{x:0,y:0}} end={{x:1,y:1}} style={{flex:1,alignItems:'center',justifyContent:'center'}}>
<Text style={{color:'#1a3a5a',fontSize:18}}>Loading...</Text>
</LinearGradient>
)
if(!session)return<LoginScreen/>
if(!hasProfile)return<ProfileSetupScreen onComplete={()=>setHasProfile(true)}/>
if(activeMatch)return<MessagesScreen matchId={activeMatch.matchId} otherUser={activeMatch.otherUser} onBack={()=>setActiveMatch(null)}/>
return(
<View style={s.container}>
<View style={s.content}>
{activeTab==='discover'&&<DiscoverScreen/>}
{activeTab==='favorites'&&<FavoritesScreen/>}
{activeTab==='matches'&&<MatchesScreen onSelectMatch={(matchId,otherUser)=>setActiveMatch({matchId,otherUser})}/>}
{activeTab==='community'&&<CommunityScreen/>}
{activeTab==='profile'&&<ProfileScreen/>}
</View>
<View style={s.tabBar}>
<TouchableOpacity style={s.tab} onPress={()=>setActiveTab('discover')}>
<Text style={[s.tabText,activeTab==='discover'&&s.tabActive]}>Discover</Text>
</TouchableOpacity>
<TouchableOpacity style={s.tab} onPress={()=>setActiveTab('favorites')}>
<Text style={[s.tabText,activeTab==='favorites'&&s.tabActive]}>★ Saved</Text>
</TouchableOpacity>
<TouchableOpacity style={s.tab} onPress={()=>setActiveTab('matches')}>
<Text style={[s.tabText,activeTab==='matches'&&s.tabActive]}>Matches</Text>
</TouchableOpacity>
<TouchableOpacity style={s.tab} onPress={()=>setActiveTab('community')}>
<Text style={[s.tabText,activeTab==='community'&&s.tabActive]}>Community</Text>
</TouchableOpacity>
<TouchableOpacity style={s.tab} onPress={()=>setActiveTab('profile')}>
<Text style={[s.tabText,activeTab==='profile'&&s.tabActive]}>Profile</Text>
</TouchableOpacity>
</View>
</View>
)
}
const s=StyleSheet.create({
container:{flex:1,backgroundColor:'#E8D5C0'},
content:{flex:1},
tabBar:{flexDirection:'row',backgroundColor:'rgba(232,196,160,0.95)',borderTopWidth:1,borderTopColor:'rgba(200,160,120,0.5)',paddingBottom:24,paddingTop:12},
tab:{flex:1,alignItems:'center'},
tabText:{color:'#8899AA',fontSize:10,fontWeight:'500'},
tabActive:{color:'#2196F3',fontWeight:'700'},
})
