import{useEffect,useState}from'react'
import{View,Text,TouchableOpacity,StyleSheet,FlatList,Image}from'react-native'
import{supabase}from'../lib/supabase'
import{LinearGradient}from'expo-linear-gradient'
import SydeHeader from'../components/SydeHeader'

type Viewer={id:string;display_name:string;username:string;avatar_url?:string;viewed_at:string}

export default function WhoViewedMeScreen({onClose}:{onClose:()=>void}){
const[viewers,setViewers]=useState<Viewer[]>([])
const[loading,setLoading]=useState(true)
const[isPremium,setIsPremium]=useState(false)

useEffect(()=>{
loadViewers()
},[])

const loadViewers=async()=>{
const{data:{user}}=await supabase.auth.getUser()
if(!user)return
const{data:profile}=await supabase.from('users').select('is_premium').eq('id',user.id).single()
setIsPremium(profile?.is_premium||false)
if(profile?.is_premium){
const{data}=await supabase.from('profile_views').select('viewer_id,viewed_at').eq('viewed_id',user.id).order('viewed_at',{ascending:false}).limit(50)
if(data&&data.length>0){
const viewerIds=data.map((v:any)=>v.viewer_id)
const{data:users}=await supabase.from('users').select('id,display_name,username,avatar_url').in('id',viewerIds)
const merged=data.map((v:any)=>{
const u=users?.find((u:any)=>u.id===v.viewer_id)
return{...u,viewed_at:v.viewed_at}
}).filter((v:any)=>v.display_name)
setViewers(merged)
}
}
setLoading(false)
}

const formatTime=(dateStr:string)=>{
const d=new Date(dateStr)
const now=new Date()
const diff=Math.floor((now.getTime()-d.getTime())/1000/60)
if(diff<60)return diff+'m ago'
if(diff<1440)return Math.floor(diff/60)+'h ago'
return Math.floor(diff/1440)+'d ago'
}

return(
<LinearGradient colors={['#0A4A7A','#9A3A08']} start={{x:0,y:0}} end={{x:1,y:1}} style={{flex:1}}>
<SydeHeader title="Who Viewed Me"/>
{!isPremium?(
<View style={s.locked}>
<Text style={s.lockIcon}>👁️</Text>
<Text style={s.lockTitle}>Premium Feature</Text>
<Text style={s.lockText}>Upgrade to Premium to see who viewed your profile!</Text>
<TouchableOpacity style={s.upgradeBtn} onPress={onClose}>
<Text style={s.upgradeBtnText}>Upgrade to Premium 💎</Text>
</TouchableOpacity>
</View>
):(
<FlatList
data={viewers}
keyExtractor={item=>item.id}
contentContainerStyle={{padding:16}}
ListEmptyComponent={<View style={s.empty}><Text style={s.emptyText}>{loading?'Loading...':'No views yet — keep building your profile!'}</Text></View>}
renderItem={({item})=>(
<View style={s.card}>
{item.avatar_url?<Image source={{uri:item.avatar_url}} style={s.avatar}/>:<View style={s.avatarPlaceholder}><Text style={s.avatarText}>{item.display_name?.[0]||'?'}</Text></View>}
<View style={s.info}>
<Text style={s.name}>{item.display_name}</Text>
<Text style={s.username}>@{item.username}</Text>
</View>
<Text style={s.time}>{formatTime(item.viewed_at)}</Text>
</View>
)}
/>
)}
</LinearGradient>
)
}

const s=StyleSheet.create({
locked:{flex:1,alignItems:'center',justifyContent:'center',padding:40},
lockIcon:{fontSize:60,marginBottom:20},
lockTitle:{color:'#ffffff',fontSize:24,fontWeight:'800',marginBottom:12},
lockText:{color:'rgba(255,255,255,0.8)',fontSize:16,textAlign:'center',marginBottom:32,lineHeight:24},
upgradeBtn:{backgroundColor:'#F5A623',borderRadius:25,paddingHorizontal:32,paddingVertical:16},
upgradeBtnText:{color:'#0A1628',fontSize:16,fontWeight:'800'},
empty:{padding:40,alignItems:'center'},
emptyText:{color:'rgba(255,255,255,0.6)',fontSize:16,textAlign:'center'},
card:{flexDirection:'row',alignItems:'center',backgroundColor:'rgba(255,255,255,0.1)',borderRadius:16,padding:16,marginBottom:12,borderWidth:1,borderColor:'rgba(255,255,255,0.15)'},
avatar:{width:50,height:50,borderRadius:25,marginRight:12},
avatarPlaceholder:{width:50,height:50,borderRadius:25,backgroundColor:'#1B6CA8',alignItems:'center',justifyContent:'center',marginRight:12},
avatarText:{color:'#ffffff',fontSize:20,fontWeight:'bold'},
info:{flex:1},
name:{color:'#ffffff',fontSize:16,fontWeight:'700'},
username:{color:'rgba(255,255,255,0.6)',fontSize:13},
time:{color:'#F5A623',fontSize:12},
})