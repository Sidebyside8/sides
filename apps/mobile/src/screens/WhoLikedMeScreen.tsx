import{useState}from'react'
import{View,Text,TouchableOpacity,StyleSheet,ScrollView,Image,Dimensions}from'react-native'
import SydeHeader from'../components/SydeHeader'
import ProfileModal from'../components/ProfileModal'

const{width}=Dimensions.get('window')
const CARD_SIZE=(width-48)/3

export default function WhoLikedMeScreen({onClose,whoLikedMe,isPremium,onUpgrade,onChat}:{onClose:()=>void;whoLikedMe:any[];isPremium:boolean;onUpgrade:()=>void;onChat:(user:any)=>void}){
const[selectedUser,setSelectedUser]=useState<any>(null)
const[showModal,setShowModal]=useState(false)

const handleChat=(userId:string,user:any)=>{
setShowModal(false)
onClose()
setTimeout(()=>onChat(user),400)
}

return(
<View style={s.container}>
<SydeHeader title="❤️ Who Liked You" rightAction={
<TouchableOpacity onPress={onClose} style={{width:36,height:36,borderRadius:18,backgroundColor:'rgba(255,255,255,0.2)',alignItems:'center',justifyContent:'center'}}>
<Text style={{color:'#ffffff',fontSize:18,fontWeight:'700'}}>✕</Text>
</TouchableOpacity>
}/>

{!isPremium&&(
<TouchableOpacity style={s.premiumPrompt} onPress={onUpgrade}>
<Text style={s.premiumPromptText}>👑 Upgrade to see everyone who liked you</Text>
</TouchableOpacity>
)}

{whoLikedMe.length===0
?<View style={s.center}>
<Text style={{fontSize:48,marginBottom:16}}>🤍</Text>
<Text style={s.emptyText}>No likes yet</Text>
<Text style={s.emptySubText}>Keep discovering and liking profiles!</Text>
</View>
:<ScrollView contentContainerStyle={s.grid}>
<View style={s.row}>
{whoLikedMe.map((u:any,i:number)=>(
<TouchableOpacity key={u.id+i} style={s.card} onPress={()=>{
if(u.isBlurred){onUpgrade();return}
setSelectedUser(u);setShowModal(true)
}}>
<View style={s.cardInner}>
{u.avatar_url&&!u.isBlurred
?<Image source={{uri:u.avatar_url}} style={s.cardImage}/>
:<View style={[s.cardImage,{backgroundColor:'rgba(255,100,100,0.3)',alignItems:'center',justifyContent:'center'}]}>
{u.isBlurred
?<Text style={{fontSize:28}}>🔒</Text>
:<Text style={{color:'#fff',fontSize:28,fontWeight:'bold'}}>{u.display_name?.[0]||'?'}</Text>}
</View>}
{u.isBlurred&&(
<View style={{position:'absolute',top:0,left:0,right:0,bottom:0,backgroundColor:'rgba(0,0,0,0.4)',alignItems:'center',justifyContent:'center',borderRadius:12}}>
<Text style={{fontSize:24}}>🔒</Text>
</View>
)}
{u.is_premium&&!u.isBlurred&&<View style={s.premiumBadge}><Text style={{fontSize:10}}>💎</Text></View>}
</View>
<Text style={s.cardName} numberOfLines={1}>{u.isBlurred?'???':u.display_name}</Text>
<Text style={s.cardAge}>{u.isBlurred?'Upgrade to see':u.age}</Text>
</TouchableOpacity>
))}
</View>
</ScrollView>}

<ProfileModal
user={selectedUser}
visible={showModal}
onClose={()=>setShowModal(false)}
onChat={handleChat}
isFavorite={false}
onToggleFavorite={()=>{}}
onBlock={()=>{}}
viewerIsPremium={isPremium}
/>
</View>
)
}

const s=StyleSheet.create({
container:{flex:1,backgroundColor:'transparent'},
premiumPrompt:{marginHorizontal:16,marginBottom:12,backgroundColor:'rgba(245,166,35,0.15)',borderRadius:12,padding:12,borderWidth:1,borderColor:'rgba(245,166,35,0.4)',alignItems:'center'},
premiumPromptText:{color:'#F5A623',fontSize:13,fontWeight:'700'},
center:{flex:1,alignItems:'center',justifyContent:'center'},
emptyText:{color:'#ffffff',fontSize:20,fontWeight:'700'},
emptySubText:{color:'rgba(255,255,255,0.6)',fontSize:14,marginTop:8},
grid:{padding:16},
row:{flexDirection:'row',flexWrap:'wrap',gap:8},
card:{width:CARD_SIZE,alignItems:'center'},
cardInner:{width:CARD_SIZE,height:CARD_SIZE,borderRadius:12,overflow:'hidden',position:'relative'},
cardImage:{width:CARD_SIZE,height:CARD_SIZE},
premiumBadge:{position:'absolute',bottom:4,right:4,backgroundColor:'rgba(245,166,35,0.9)',borderRadius:8,paddingHorizontal:4,paddingVertical:1},
cardName:{color:'#ffffff',fontSize:11,marginTop:4,textAlign:'center',fontWeight:'500',width:CARD_SIZE},
cardAge:{color:'rgba(255,255,255,0.6)',fontSize:9,textAlign:'center',width:CARD_SIZE},
})
