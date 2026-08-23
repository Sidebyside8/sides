import{useEffect,useState}from'react'
import{View,Text,TouchableOpacity,StyleSheet,FlatList,Image,TextInput,Dimensions,ActivityIndicator,ScrollView}from'react-native'
import{supabase}from'../lib/supabase'
import SydeHeader from'../components/SydeHeader'
import ProfileModal from'../components/ProfileModal'

const{width}=Dimensions.get('window')
const CARD_SIZE=(width-48)/3

type User={id:string;username:string;display_name:string;title?:string;bio?:string;age:number;avatar_url?:string;location?:string;preferences?:string[];looking_for?:string;relationship_type?:string;is_online?:boolean;is_premium?:boolean}

export default function SearchScreen({onClose,onChat,isPremium,onUpgrade}:{onClose:()=>void;onChat:(user:any)=>void;isPremium:boolean;onUpgrade:()=>void}){
const[query,setQuery]=useState('')
const[location,setLocation]=useState('')
const[minAge,setMinAge]=useState(18)
const[maxAge,setMaxAge]=useState(99)
const[lookingFor,setLookingFor]=useState('')
const[relType,setRelType]=useState('')
const[results,setResults]=useState<User[]>([])
const[loading,setLoading]=useState(false)
const[searched,setSearched]=useState(false)
const[selectedUser,setSelectedUser]=useState<User|null>(null)
const[showModal,setShowModal]=useState(false)
const[favorites,setFavorites]=useState<Set<string>>(new Set())
const[currentUserId,setCurrentUserId]=useState<string|null>(null)

useEffect(()=>{
supabase.auth.getUser().then(({data:{user}})=>{
if(!user)return
setCurrentUserId(user.id)
supabase.from('favorites').select('favorited_id').eq('user_id',user.id).then(({data})=>{
if(data)setFavorites(new Set(data.map((f:any)=>f.favorited_id)))
})
})
},[])

const handleSearch=async()=>{
if(!query.trim()&&!location.trim()&&!lookingFor&&!relType)return
setLoading(true)
setSearched(true)
const{data:{user}}=await supabase.auth.getUser()
if(!user){setLoading(false);return}

let q=supabase.from('users').select('id,username,display_name,title,bio,age,avatar_url,location,looking_for,relationship_type,is_online,is_premium').neq('id',user.id).eq('is_active',true)

if(query.trim()){
q=q.or(`display_name.ilike.%${query.trim()}%,username.ilike.%${query.trim()}%`)
}
if(isPremium){
if(location.trim())q=q.ilike('location','%'+location.trim()+'%')
if(lookingFor)q=q.eq('looking_for',lookingFor)
if(relType)q=q.eq('relationship_type',relType)
q=q.gte('age',minAge).lte('age',maxAge)
}

const{data,error}=await q.limit(50)
if(!error)setResults(data||[])
setLoading(false)
}

const handleToggleFavorite=async(favId:string)=>{
const isFav=favorites.has(favId)
if(isFav){
await supabase.from('favorites').delete().eq('user_id',currentUserId).eq('favorited_id',favId)
setFavorites(prev=>{const n=new Set(prev);n.delete(favId);return n})
}else{
await supabase.from('favorites').insert({user_id:currentUserId,favorited_id:favId})
setFavorites(prev=>new Set([...prev,favId]))
}
}

const handleChat=(userId:string,user:any)=>{
setShowModal(false)
setTimeout(()=>onChat(user),300)
}

return(
<View style={s.container}>
<SydeHeader title="Search" rightAction={
<TouchableOpacity onPress={onClose} style={{width:36,height:36,borderRadius:18,backgroundColor:'rgba(255,255,255,0.2)',alignItems:'center',justifyContent:'center'}}>
<Text style={{color:'#ffffff',fontSize:18,fontWeight:'700'}}>✕</Text>
</TouchableOpacity>
}/>

<ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{paddingBottom:20}}>
<View style={s.searchBox}>
<TextInput
style={s.searchInput}
placeholder="Search by name or username..."
placeholderTextColor="rgba(255,255,255,0.5)"
value={query}
onChangeText={setQuery}
onSubmitEditing={handleSearch}
returnKeyType="search"
autoFocus
/>
<TouchableOpacity style={s.searchBtn} onPress={handleSearch}>
<Text style={{fontSize:18}}>🔍</Text>
</TouchableOpacity>
</View>

{!isPremium&&(
<TouchableOpacity style={s.premiumPrompt} onPress={onUpgrade}>
<Text style={s.premiumPromptText}>👑 Upgrade to search by location, age, and more</Text>
</TouchableOpacity>
)}

{isPremium&&(
<View style={s.filtersCard}>
<Text style={s.filtersTitle}>Advanced Search</Text>

<Text style={s.filterLabel}>Location</Text>
<TextInput style={s.filterInput} placeholder="e.g. Chicago, New York..." placeholderTextColor="rgba(255,255,255,0.4)" value={location} onChangeText={setLocation}/>

<Text style={s.filterLabel}>Age Range: {minAge} — {maxAge}</Text>
<View style={{flexDirection:'row',gap:8,marginBottom:12}}>
{[18,25,30,40,50].map(a=>(
<TouchableOpacity key={String(a)} onPress={()=>setMinAge(a)} style={{paddingHorizontal:10,paddingVertical:6,borderRadius:16,backgroundColor:minAge===a?'#2196F3':'rgba(255,255,255,0.1)'}}>
<Text style={{color:'#ffffff',fontSize:12}}>{String(a)}+</Text>
</TouchableOpacity>
))}
</View>
<View style={{flexDirection:'row',gap:8,marginBottom:12}}>
{[30,40,50,60,99].map(a=>(
<TouchableOpacity key={'max'+String(a)} onPress={()=>setMaxAge(a)} style={{paddingHorizontal:10,paddingVertical:6,borderRadius:16,backgroundColor:maxAge===a?'#2196F3':'rgba(255,255,255,0.1)'}}>
<Text style={{color:'#ffffff',fontSize:12}}>{'≤'+String(a)}</Text>
</TouchableOpacity>
))}
</View>

<Text style={s.filterLabel}>Looking For</Text>
<View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:12}}>
{['','Friends','Dating','Relationship','Hookup','Casual'].map(v=>(
<TouchableOpacity key={v} onPress={()=>setLookingFor(v)} style={{paddingHorizontal:10,paddingVertical:6,borderRadius:16,backgroundColor:lookingFor===v?'#2196F3':'rgba(255,255,255,0.1)'}}>
<Text style={{color:'#ffffff',fontSize:12}}>{v===''?'Any':v}</Text>
</TouchableOpacity>
))}
</View>

<Text style={s.filterLabel}>Relationship Type</Text>
<View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:12}}>
{['','Monogamous','Open','Casual','Friends'].map(v=>(
<TouchableOpacity key={v} onPress={()=>setRelType(v)} style={{paddingHorizontal:10,paddingVertical:6,borderRadius:16,backgroundColor:relType===v?'#2196F3':'rgba(255,255,255,0.1)'}}>
<Text style={{color:'#ffffff',fontSize:12}}>{v===''?'Any':v}</Text>
</TouchableOpacity>
))}
</View>

<TouchableOpacity style={s.applyBtn} onPress={handleSearch}>
<Text style={s.applyBtnText}>Search</Text>
</TouchableOpacity>
</View>
)}

{loading&&<View style={s.center}><ActivityIndicator color="#ffffff" size="large"/></View>}

{!loading&&searched&&results.length===0&&(
<View style={s.center}>
<Text style={s.emptyText}>No results found</Text>
<Text style={s.emptySubText}>Try a different name or filters</Text>
</View>
)}

{!loading&&results.length>0&&(
<View style={{paddingHorizontal:16,marginTop:8}}>
<Text style={{color:'rgba(255,255,255,0.6)',fontSize:12,marginBottom:12}}>{results.length} result{results.length!==1?'s':''} found</Text>
<FlatList
data={results}
keyExtractor={i=>i.id}
numColumns={3}
scrollEnabled={false}
contentContainerStyle={{gap:8}}
columnWrapperStyle={{gap:8}}
renderItem={({item})=>(
<TouchableOpacity style={s.card} onPress={()=>{setSelectedUser(item);setShowModal(true)}}>
<View style={s.cardInner}>
{item.avatar_url
?<Image source={{uri:item.avatar_url}} style={s.cardImage}/>
:<View style={s.cardPlaceholder}>
<Text style={s.cardPlaceholderText}>{item.display_name?.[0]||'?'}</Text>
</View>}
{item.is_online&&<View style={s.onlineDot}/>}
{item.is_premium&&<View style={s.premiumBadge}><Text style={{fontSize:10}}>💎</Text></View>}
{favorites.has(item.id)&&<View style={s.favBadge}><Text style={{fontSize:10}}>⭐</Text></View>}
</View>
<Text style={s.cardName} numberOfLines={1}>{item.display_name}</Text>
<Text style={s.cardAge}>{item.age}{item.location?' · '+item.location.split(',')[0]:''}</Text>
</TouchableOpacity>
)}
/>
</View>
)}
</ScrollView>

<ProfileModal
user={selectedUser}
visible={showModal}
onClose={()=>setShowModal(false)}
onChat={handleChat}
isFavorite={selectedUser?favorites.has(selectedUser.id):false}
onToggleFavorite={handleToggleFavorite}
onBlock={()=>{}}
onReport={()=>{}}
viewerIsPremium={isPremium}
/>
</View>
)
}

const s=StyleSheet.create({
container:{flex:1,backgroundColor:'transparent'},
searchBox:{flexDirection:'row',marginHorizontal:16,marginBottom:12,gap:8},
searchInput:{flex:1,backgroundColor:'rgba(255,255,255,0.15)',borderRadius:16,paddingHorizontal:16,paddingVertical:12,color:'#ffffff',fontSize:15,borderWidth:1,borderColor:'rgba(255,255,255,0.25)'},
searchBtn:{width:48,height:48,borderRadius:16,backgroundColor:'#2196F3',alignItems:'center',justifyContent:'center'},
premiumPrompt:{marginHorizontal:16,marginBottom:12,backgroundColor:'rgba(245,166,35,0.15)',borderRadius:12,padding:12,borderWidth:1,borderColor:'rgba(245,166,35,0.4)',alignItems:'center'},
premiumPromptText:{color:'#F5A623',fontSize:13,fontWeight:'700'},
filtersCard:{marginHorizontal:16,marginBottom:16,backgroundColor:'rgba(255,255,255,0.1)',borderRadius:16,padding:16,borderWidth:1,borderColor:'rgba(255,255,255,0.2)'},
filtersTitle:{color:'#ffffff',fontSize:16,fontWeight:'800',marginBottom:12},
filterLabel:{color:'rgba(255,255,255,0.7)',fontSize:12,fontWeight:'600',marginBottom:6},
filterInput:{backgroundColor:'rgba(255,255,255,0.1)',borderRadius:10,padding:10,color:'#ffffff',fontSize:14,marginBottom:12,borderWidth:1,borderColor:'rgba(255,255,255,0.2)'},
applyBtn:{backgroundColor:'#2196F3',borderRadius:12,padding:14,alignItems:'center',marginTop:4},
applyBtnText:{color:'#ffffff',fontWeight:'700',fontSize:15},
center:{alignItems:'center',justifyContent:'center',paddingTop:40},
emptyText:{color:'#ffffff',fontSize:18,fontWeight:'600'},
emptySubText:{color:'rgba(255,255,255,0.6)',fontSize:14,marginTop:8},
card:{width:CARD_SIZE,alignItems:'center'},
cardInner:{width:CARD_SIZE,height:CARD_SIZE,borderRadius:12,overflow:'hidden',position:'relative'},
cardImage:{width:CARD_SIZE,height:CARD_SIZE},
cardPlaceholder:{width:CARD_SIZE,height:CARD_SIZE,backgroundColor:'rgba(33,150,243,0.4)',alignItems:'center',justifyContent:'center'},
cardPlaceholderText:{color:'#ffffff',fontSize:28,fontWeight:'bold'},
cardName:{color:'#ffffff',fontSize:11,marginTop:4,textAlign:'center',fontWeight:'500',width:CARD_SIZE},
cardAge:{color:'rgba(255,255,255,0.6)',fontSize:9,textAlign:'center',width:CARD_SIZE},
onlineDot:{position:'absolute',top:6,left:6,width:10,height:10,borderRadius:5,backgroundColor:'#00E676',borderWidth:1.5,borderColor:'#ffffff'},
premiumBadge:{position:'absolute',bottom:4,right:4,backgroundColor:'rgba(245,166,35,0.9)',borderRadius:8,paddingHorizontal:4,paddingVertical:1},
favBadge:{position:'absolute',top:4,right:4,backgroundColor:'rgba(0,0,0,0.5)',borderRadius:10,padding:2},
})
