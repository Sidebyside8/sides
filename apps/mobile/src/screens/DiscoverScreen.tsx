import{useEffect,useState}from'react'
import{View,Text,TouchableOpacity,StyleSheet,FlatList,Alert,Image,Modal,ScrollView}from'react-native'
import{supabase}from'../lib/supabase'
import SydeHeader from'../components/SydeHeader'
import{notifyNewMatch}from'../lib/notifications'

const PREFERENCES=['Kissing and making out','Cuddling and physical affection','Mutual masturbation','Oral sex (giving and/or receiving)','Frottage (body-to-body rubbing or grinding)','Nipple play','Erotic massage','Sensual touching and caressing','Hand jobs','Sexting or sharing fantasies','Using sex toys','Role-play and erotic play','Showering or bathing together','Intimate companionship and emotional connection']

type User={id:string;username:string;display_name:string;bio:string;age:number;avatar_url?:string;location?:string;preferences?:string[]}

export default function DiscoverScreen(){
const[users,setUsers]=useState<User[]>([])
const[loading,setLoading]=useState(true)
const[currentUserId,setCurrentUserId]=useState<string|null>(null)
const[currentLocation,setCurrentLocation]=useState<string|null>(null)
const[filter,setFilter]=useState<'nearby'|'global'|'favorites'>('global')
const[favorites,setFavorites]=useState<Set<string>>(new Set())
const[showFilters,setShowFilters]=useState(false)
const[minAge,setMinAge]=useState(18)
const[maxAge,setMaxAge]=useState(99)
const[selectedPrefs,setSelectedPrefs]=useState<string[]>([])

useEffect(()=>{loadUsers()},[filter])

const loadUsers=async()=>{
setLoading(true)
const{data:{user}}=await supabase.auth.getUser()
if(!user)return
setCurrentUserId(user.id)
const{data:myProfile}=await supabase.from('users').select('location').eq('id',user.id).single()
setCurrentLocation(myProfile?.location||null)
const{data:favData}=await supabase.from('favorites').select('favorited_id').eq('user_id',user.id)
const favIds=favData?favData.map((f:any)=>f.favorited_id):[]
if(favData)setFavorites(new Set(favIds))
const{data:blockData}=await supabase.from('blocks').select('blocked_id').eq('blocker_id',user.id)
const blockedIds=blockData?blockData.map((b:any)=>b.blocked_id):[]
if(filter==='favorites'){
if(favIds.length===0){setUsers([]);setLoading(false);return}
const{data}=await supabase.from('users').select('id,username,display_name,bio,age,avatar_url,location,preferences').in('id',favIds)
setUsers((data||[]).filter((u:User)=>!blockedIds.includes(u.id)))
setLoading(false)
return
}
let query=supabase.from('users').select('id,username,display_name,bio,age,avatar_url,location,preferences').neq('id',user.id).eq('is_active',true).limit(50)
if(filter==='nearby'&&myProfile?.location){query=query.ilike('location',`%${myProfile.location.split(',')[0].trim()}%`)}
const{data,error}=await query
if(error)Alert.alert('Error',error.message)
else setUsers((data||[]).filter((u:User)=>!blockedIds.includes(u.id)))
setLoading(false)
}

const applyFilters=(allUsers:User[])=>{
return allUsers.filter(u=>{
if(u.age<minAge||u.age>maxAge)return false
if(selectedPrefs.length>0){
const userPrefs=u.preferences||[]
const hasMatch=selectedPrefs.some(p=>userPrefs.includes(p))
if(!hasMatch)return false
}
return true
})
}

const handleLike=async(likedId:string)=>{
const{error}=await supabase.from('likes').insert({liker_id:currentUserId,liked_id:likedId})
if(error)Alert.alert('Error',error.message)
else{
setUsers(prev=>prev.filter(u=>u.id!==likedId))
const{data:mutualLike}=await supabase.from('likes').select('id').eq('liker_id',likedId).eq('liked_id',currentUserId).single()
if(mutualLike){
const{data:{user}}=await supabase.auth.getUser()
const{data:myProfile}=await supabase.from('users').select('display_name').eq('id',user.id).single()
await supabase.from('matches').insert({user1_id:currentUserId,user2_id:likedId})
await notifyNewMatch(likedId,myProfile?.display_name||'Someone')
}
}
}

const handleFavorite=async(favId:string)=>{
const isFav=favorites.has(favId)
if(isFav){
await supabase.from('favorites').delete().eq('user_id',currentUserId).eq('favorited_id',favId)
setFavorites(prev=>{const n=new Set(prev);n.delete(favId);return n})
if(filter==='favorites')setUsers(prev=>prev.filter(u=>u.id!==favId))
}else{
await supabase.from('favorites').insert({user_id:currentUserId,favorited_id:favId})
setFavorites(prev=>new Set([...prev,favId]))
}
}

const handleBlock=async(blockedId:string,name:string)=>{
Alert.alert('Block User',`Are you sure you want to block ${name}?`,[
{text:'Cancel',style:'cancel'},
{text:'Block',style:'destructive',onPress:async()=>{
await supabase.from('blocks').insert({blocker_id:currentUserId,blocked_id:blockedId})
setUsers(prev=>prev.filter(u=>u.id!==blockedId))
}}
])
}

const togglePref=(pref:string)=>{
setSelectedPrefs(prev=>prev.includes(pref)?prev.filter(p=>p!==pref):[...prev,pref])
}

const filteredUsers=applyFilters(users)
const activeFilterCount=(selectedPrefs.length>0?1:0)+((minAge>18||maxAge<99)?1:0)

const filterButton=(
<TouchableOpacity onPress={()=>setShowFilters(true)} style={s.filterIconBtn}>
<Text style={s.filterIconText}>⚙️{activeFilterCount>0?` ${activeFilterCount}`:''}</Text>
</TouchableOpacity>
)

return(
<View style={s.container}>
<SydeHeader title="Discover" rightAction={filterButton}/>
<View style={s.filterRow}>
<TouchableOpacity style={[s.filterTab,filter==='nearby'&&s.filterTabActive]} onPress={()=>setFilter('nearby')}>
<Text style={[s.filterText,filter==='nearby'&&s.filterTextActive]}>📍 Nearby</Text>
</TouchableOpacity>
<TouchableOpacity style={[s.filterTab,filter==='global'&&s.filterTabActive]} onPress={()=>setFilter('global')}>
<Text style={[s.filterText,filter==='global'&&s.filterTextActive]}>🌍 Global</Text>
</TouchableOpacity>
<TouchableOpacity style={[s.filterTab,filter==='favorites'&&s.filterTabActive]} onPress={()=>setFilter('favorites')}>
<Text style={[s.filterText,filter==='favorites'&&s.filterTextActive]}>★ Saved</Text>
</TouchableOpacity>
</View>
{filter==='nearby'&&!currentLocation&&<View style={s.banner}><Text style={s.bannerText}>Add your location in Profile to see nearby people</Text></View>}
{loading?<View style={s.center}><Text style={s.loadingText}>Finding people...</Text></View>
:filteredUsers.length===0?<View style={s.center}>
<Text style={s.loadingText}>{filter==='favorites'?'No saved profiles yet':filter==='nearby'?'No one nearby yet':'No one here yet'}</Text>
<Text style={s.subText}>{filter==='favorites'?'Star profiles to save them here':filter==='nearby'?'Try switching to Global':'Check back soon!'}</Text>
</View>
:<FlatList data={filteredUsers} keyExtractor={i=>i.id} contentContainerStyle={s.list} renderItem={({item})=>(
<View style={s.card}>
<View style={s.cardTop}>
{item.avatar_url?<Image source={{uri:item.avatar_url}} style={s.avatarImage}/>:<View style={s.avatar}><Text style={s.avatarText}>{item.display_name?.[0]||'?'}</Text></View>}
<View style={s.cardInfo}>
<Text style={s.name}>{item.display_name}</Text>
<Text style={s.username}>@{item.username} · {item.age}</Text>
{item.location?<Text style={s.location}>📍 {item.location}</Text>:null}
{item.bio?<Text style={s.bio} numberOfLines={2}>{item.bio}</Text>:null}
</View>
<View style={s.actions}>
<TouchableOpacity style={s.starButton} onPress={()=>handleFavorite(item.id)}>
<Text style={[s.starText,favorites.has(item.id)&&s.starActive]}>{favorites.has(item.id)?'★':'☆'}</Text>
</TouchableOpacity>
<TouchableOpacity style={s.likeButton} onPress={()=>handleLike(item.id)}>
<Text style={s.likeText}>♥</Text>
</TouchableOpacity>
<TouchableOpacity style={s.blockButton} onPress={()=>handleBlock(item.id,item.display_name)}>
<Text style={s.blockText}>🚫</Text>
</TouchableOpacity>
</View>
</View>
{item.preferences&&item.preferences.length>0&&<View style={s.prefTags}>
{item.preferences.slice(0,3).map(p=><View key={p} style={s.prefTag}><Text style={s.prefTagText}>{p}</Text></View>)}
{item.preferences.length>3&&<View style={s.prefTag}><Text style={s.prefTagText}>+{item.preferences.length-3} more</Text></View>}
</View>}
</View>
)}/>}

<Modal visible={showFilters} animationType="slide">
<View style={s.modalContainer}>
<View style={s.modalHeader}>
<Text style={s.modalTitle}>Filter Profiles</Text>
<TouchableOpacity onPress={()=>setShowFilters(false)}><Text style={s.modalClose}>✕</Text></TouchableOpacity>
</View>
<ScrollView contentContainerStyle={s.modalContent}>
<Text style={s.filterLabel}>Age Range: {minAge} - {maxAge}</Text>
<View style={s.ageRow}>
{[18,21,25,30,35,40,45,50].map(age=>(
<TouchableOpacity key={'min'+age} style={[s.ageBtn,minAge===age&&s.ageBtnActive]} onPress={()=>setMinAge(age)}>
<Text style={[s.ageBtnText,minAge===age&&s.ageBtnTextActive]}>{age}</Text>
</TouchableOpacity>
))}
</View>
<Text style={s.filterLabel}>Max Age</Text>
<View style={s.ageRow}>
{[30,35,40,45,50,55,60,99].map(age=>(
<TouchableOpacity key={'max'+age} style={[s.ageBtn,maxAge===age&&s.ageBtnActive]} onPress={()=>setMaxAge(age)}>
<Text style={[s.ageBtnText,maxAge===age&&s.ageBtnTextActive]}>{age===99?'Any':age}</Text>
</TouchableOpacity>
))}
</View>
<Text style={s.filterLabel}>Shared Preferences</Text>
<Text style={s.filterSubLabel}>Show people who share at least one of these</Text>
{PREFERENCES.map(pref=>(
<TouchableOpacity key={pref} style={s.prefFilterItem} onPress={()=>togglePref(pref)}>
<View style={[s.prefCheckbox,selectedPrefs.includes(pref)&&s.prefCheckboxSelected]}>
{selectedPrefs.includes(pref)&&<Text style={s.prefCheckmark}>✓</Text>}
</View>
<Text style={s.prefFilterText}>{pref}</Text>
</TouchableOpacity>
))}
<TouchableOpacity style={s.resetButton} onPress={()=>{setMinAge(18);setMaxAge(99);setSelectedPrefs([])}}>
<Text style={s.resetButtonText}>Reset Filters</Text>
</TouchableOpacity>
<TouchableOpacity style={s.applyButton} onPress={()=>setShowFilters(false)}>
<Text style={s.applyButtonText}>Apply Filters</Text>
</TouchableOpacity>
</ScrollView>
</View>
</Modal>
</View>
)
}

const s=StyleSheet.create({
container:{flex:1},
filterRow:{flexDirection:'row',marginHorizontal:16,marginBottom:12,backgroundColor:'rgba(255,255,255,0.15)',borderRadius:12,padding:4},
filterTab:{flex:1,paddingVertical:8,alignItems:'center',borderRadius:10},
filterTabActive:{backgroundColor:'#2196F3'},
filterText:{fontSize:12,color:'rgba(255,255,255,0.7)',fontWeight:'500'},
filterTextActive:{color:'#ffffff',fontWeight:'700'},
filterIconBtn:{padding:8},
filterIconText:{color:'#ffffff',fontSize:16},
banner:{marginHorizontal:16,marginBottom:12,backgroundColor:'rgba(241,90,34,0.2)',borderRadius:10,padding:12,borderWidth:1,borderColor:'rgba(255,140,0,0.4)'},
bannerText:{color:'#FF8C00',fontSize:13,textAlign:'center'},
center:{flex:1,alignItems:'center',justifyContent:'center'},
list:{paddingHorizontal:16,paddingBottom:24},
card:{backgroundColor:'rgba(255,255,255,0.15)',borderRadius:16,padding:16,marginBottom:12,borderWidth:1,borderColor:'rgba(255,255,255,0.25)'},
cardTop:{flexDirection:'row',alignItems:'center'},
avatarImage:{width:64,height:64,borderRadius:32,marginRight:12},
avatar:{width:64,height:64,borderRadius:32,backgroundColor:'#2196F3',alignItems:'center',justifyContent:'center',marginRight:12},
avatarText:{color:'#ffffff',fontSize:26,fontWeight:'bold'},
cardInfo:{flex:1},
name:{color:'#ffffff',fontSize:16,fontWeight:'600',marginBottom:2},
username:{color:'rgba(255,255,255,0.7)',fontSize:13,marginBottom:2},
location:{color:'#F5A623',fontSize:12,marginBottom:2},
bio:{color:'rgba(255,255,255,0.8)',fontSize:13},
actions:{flexDirection:'column',alignItems:'center',gap:4},
starButton:{width:32,height:32,alignItems:'center',justifyContent:'center'},
starText:{fontSize:20,color:'rgba(255,255,255,0.4)'},
starActive:{color:'#F5A623'},
likeButton:{width:32,height:32,borderRadius:16,backgroundColor:'rgba(255,140,0,0.2)',alignItems:'center',justifyContent:'center'},
likeText:{color:'#FF8C00',fontSize:18},
blockButton:{width:32,height:32,alignItems:'center',justifyContent:'center'},
blockText:{fontSize:16},
prefTags:{flexDirection:'row',flexWrap:'wrap',marginTop:10,gap:6},
prefTag:{backgroundColor:'rgba(33,150,243,0.3)',borderRadius:20,paddingHorizontal:10,paddingVertical:4,borderWidth:1,borderColor:'rgba(33,150,243,0.5)'},
prefTagText:{color:'#ffffff',fontSize:11},
loadingText:{color:'#ffffff',fontSize:18,fontWeight:'600'},
subText:{color:'rgba(255,255,255,0.7)',fontSize:14,marginTop:8},
modalContainer:{flex:1,backgroundColor:'#0A4A7A'},
modalHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingTop:60,paddingHorizontal:24,paddingBottom:16,borderBottomWidth:1,borderBottomColor:'rgba(255,255,255,0.2)'},
modalTitle:{fontSize:22,fontWeight:'700',color:'#ffffff'},
modalClose:{fontSize:20,color:'rgba(255,255,255,0.7)'},
modalContent:{padding:24},
filterLabel:{fontSize:15,fontWeight:'700',color:'#ffffff',marginBottom:10,marginTop:16},
filterSubLabel:{fontSize:12,color:'rgba(255,255,255,0.6)',marginBottom:10,marginTop:-6},
ageRow:{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:8},
ageBtn:{backgroundColor:'rgba(255,255,255,0.15)',borderRadius:20,paddingHorizontal:14,paddingVertical:8,borderWidth:1,borderColor:'rgba(255,255,255,0.2)'},
ageBtnActive:{backgroundColor:'#2196F3',borderColor:'#2196F3'},
ageBtnText:{color:'rgba(255,255,255,0.7)',fontSize:13},
ageBtnTextActive:{color:'#ffffff',fontWeight:'700'},
prefFilterItem:{flexDirection:'row',alignItems:'center',paddingVertical:10,borderBottomWidth:1,borderBottomColor:'rgba(255,255,255,0.1)'},
prefCheckbox:{width:22,height:22,borderRadius:6,borderWidth:2,borderColor:'#2196F3',marginRight:12,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(255,255,255,0.1)'},
prefCheckboxSelected:{backgroundColor:'#2196F3'},
prefCheckmark:{color:'#ffffff',fontSize:13,fontWeight:'bold'},
prefFilterText:{flex:1,fontSize:14,color:'rgba(255,255,255,0.8)'},
resetButton:{backgroundColor:'rgba(255,255,255,0.15)',borderRadius:12,padding:14,alignItems:'center',marginTop:24,marginBottom:8,borderWidth:1,borderColor:'rgba(255,255,255,0.2)'},
resetButtonText:{color:'rgba(255,255,255,0.8)',fontSize:15,fontWeight:'600'},
applyButton:{backgroundColor:'#2196F3',borderRadius:12,padding:14,alignItems:'center',marginBottom:24},
applyButtonText:{color:'#ffffff',fontSize:15,fontWeight:'700'},
})
