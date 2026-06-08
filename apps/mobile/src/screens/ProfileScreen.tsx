import{useEffect,useState}from'react'
import{View,Text,TouchableOpacity,StyleSheet,ScrollView,Alert,Image,TextInput}from'react-native'
import{supabase}from'../lib/supabase'
import{launchImageLibraryAsync,requestMediaLibraryPermissionsAsync,MediaTypeOptions}from'expo-image-picker'
import SydeHeader from'../components/SydeHeader'
import BlockedUsersScreen from'./BlockedUsersScreen'

const PREFERENCES=[
'Kissing and making out',
'Cuddling and physical affection',
'Mutual masturbation',
'Oral sex (giving and/or receiving)',
'Frottage (body-to-body rubbing or grinding)',
'Nipple play',
'Erotic massage',
'Sensual touching and caressing',
'Hand jobs',
'Sexting or sharing fantasies',
'Using sex toys',
'Role-play and erotic play',
'Showering or bathing together',
'Intimate companionship and emotional connection',
]

type Profile={id:string;username:string;display_name:string;bio:string;age:number;avatar_url?:string;location?:string;looking_for?:string;relationship_type?:string;preferences?:string[]}
type Stats={likes:number;matches:number;posts:number}

export default function ProfileScreen({onUpgrade,isPremium}:{onUpgrade?:()=>void;isPremium?:boolean}){
const[profile,setProfile]=useState<Profile|null>(null)
const[stats,setStats]=useState<Stats>({likes:0,matches:0,posts:0})
const[loading,setLoading]=useState(true)
const[editing,setEditing]=useState(false)
const[editData,setEditData]=useState<Partial<Profile>>({})
const[saving,setSaving]=useState(false)
const[showBlocked,setShowBlocked]=useState(false)
const[uploadingPhoto,setUploadingPhoto]=useState(false)

useEffect(()=>{loadProfile()},[])

const loadProfile=async()=>{
const{data:{user}}=await supabase.auth.getUser()
if(!user)return
const{data}=await supabase.from('users').select('*').eq('id',user.id).single()
if(data){setProfile(data);setEditData(data)}
const[likesRes,matchesRes,postsRes]=await Promise.all([
supabase.from('likes').select('id',{count:'exact'}).eq('liker_id',user.id),
supabase.from('matches').select('id',{count:'exact'}).or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`),
supabase.from('community_posts').select('id',{count:'exact'}).eq('user_id',user.id),
])
setStats({likes:likesRes.count||0,matches:matchesRes.count||0,posts:postsRes.count||0})
setLoading(false)
}

const handlePickPhoto=async()=>{
const perm=await requestMediaLibraryPermissionsAsync()
if(perm.granted===false){Alert.alert("Permission needed","Please allow photo access");return}
const result=await launchImageLibraryAsync({mediaTypes:MediaTypeOptions.Images,allowsEditing:true,aspect:[1,1],quality:0.7})
if(result.canceled)return
setUploadingPhoto(true)
try{
const{data:{user}}=await supabase.auth.getUser()
if(!user)return
const uri=result.assets[0].uri
const fileName=user.id+"-"+Date.now()+".jpg"
const formData=new FormData()
formData.append("file",{uri,name:fileName,type:"image/jpeg"} as any)
const{error:ue}=await supabase.storage.from("avatars").upload(fileName,formData,{contentType:"multipart/form-data",upsert:true})
if(ue){Alert.alert("Upload failed",ue.message);setUploadingPhoto(false);return}
const{data:ud}=supabase.storage.from("avatars").getPublicUrl(fileName)
await supabase.from("users").update({avatar_url:ud.publicUrl}).eq("id",user.id)
setProfile(prev=>prev?{...prev,avatar_url:ud.publicUrl}:prev)
Alert.alert("Photo updated!","Profile photo updated")
}catch(e){}
setUploadingPhoto(false)
}
const handleSave=async()=>{
setSaving(true)
const{data:{user}}=await supabase.auth.getUser()
if(!user)return
const{error}=await supabase.from('users').update({
display_name:editData.display_name,
bio:editData.bio,
location:editData.location,
looking_for:editData.looking_for,
relationship_type:editData.relationship_type,
preferences:editData.preferences||[],
}).eq('id',user.id)
if(error)Alert.alert('Error',error.message)
else{setProfile(prev=>prev?{...prev,...editData}:prev);setEditing(false);Alert.alert('Saved!','Profile updated')}
setSaving(false)
}

const togglePreference=(pref:string)=>{
const current=editData.preferences||[]
const updated=current.includes(pref)?current.filter(p=>p!==pref):[...current,pref]
setEditData(prev=>({...prev,preferences:updated}))
}

const handleSignOut=async()=>{
Alert.alert('Sign Out','Are you sure?',[
{text:'Cancel',style:'cancel'},
{text:'Sign Out',style:'destructive',onPress:()=>supabase.auth.signOut()},
])
}

if(showBlocked)return<BlockedUsersScreen onBack={()=>setShowBlocked(false)}/>
if(loading)return<View style={s.loading}><Text style={s.loadingText}>Loading profile...</Text></View>

const editButton=(
<TouchableOpacity onPress={()=>editing?handleSave():setEditing(true)} style={s.editButton}>
<Text style={s.editButtonText}>{editing?(saving?'Saving...':'Save'):'Edit'}</Text>
</TouchableOpacity>
)

return(
<ScrollView style={s.container} contentContainerStyle={s.content}>
<SydeHeader title="Profile" rightAction={editButton}/>

<View style={s.avatarContainer}>
<TouchableOpacity onPress={handlePickPhoto} disabled={uploadingPhoto}>
<View style={s.avatar}>
{profile?.avatar_url?<Image source={{uri:profile.avatar_url}} style={s.avatarImage}/>:<Text style={s.avatarText}>{profile?.display_name?.[0]||'?'}</Text>}
</View>
<View style={s.cameraButton}><Text style={s.cameraIcon}>{uploadingPhoto?"⏳":"📷"}</Text></View>
</TouchableOpacity>
{editing?<TextInput style={s.editNameInput} value={editData.display_name} onChangeText={v=>setEditData(prev=>({...prev,display_name:v}))} placeholder="Display name" placeholderTextColor="#888"/>
:<Text style={s.displayName}>{profile?.display_name}</Text>}
<Text style={s.username}>@{profile?.username}</Text>
</View>

<View style={s.statsRow}>
<View style={s.statBox}><Text style={s.statNumber}>{stats.likes}</Text><Text style={s.statLabel}>Likes Sent</Text></View>
<View style={s.statDivider}/>
<View style={s.statBox}><Text style={s.statNumber}>{stats.matches}</Text><Text style={s.statLabel}>Matches</Text></View>
<View style={s.statDivider}/>
<View style={s.statBox}><Text style={s.statNumber}>{stats.posts}</Text><Text style={s.statLabel}>Posts</Text></View>
</View>

<View style={s.infoCard}>
<Text style={s.sectionTitle}>About Me</Text>
<Text style={s.infoLabel}>Bio</Text>
{editing?<TextInput style={[s.editInput,s.bioInput]} value={editData.bio} onChangeText={v=>setEditData(prev=>({...prev,bio:v}))} placeholder="Tell people about yourself..." placeholderTextColor="#888" multiline/>
:<Text style={s.infoValue}>{profile?.bio||'No bio yet'}</Text>}
<Text style={s.infoLabel}>Age</Text>
<Text style={s.infoValue}>{profile?.age}</Text>
<Text style={s.infoLabel}>Location</Text>
{editing?<TextInput style={s.editInput} value={editData.location} onChangeText={v=>setEditData(prev=>({...prev,location:v}))} placeholder="e.g. New York, NY" placeholderTextColor="#888"/>
:<Text style={s.infoValue}>{profile?.location||'Not set'}</Text>}
<Text style={s.infoLabel}>Looking For</Text>
{editing?<TextInput style={s.editInput} value={editData.looking_for} onChangeText={v=>setEditData(prev=>({...prev,looking_for:v}))} placeholder="e.g. Friends, Dating, Relationship" placeholderTextColor="#888"/>
:<Text style={s.infoValue}>{profile?.looking_for||'Not set'}</Text>}
<Text style={s.infoLabel}>Relationship Type</Text>
{editing?<TextInput style={s.editInput} value={editData.relationship_type} onChangeText={v=>setEditData(prev=>({...prev,relationship_type:v}))} placeholder="e.g. Monogamous, Open, Casual" placeholderTextColor="#888"/>
:<Text style={s.infoValue}>{profile?.relationship_type||'Not set'}</Text>}
</View>

<View style={s.infoCard}>
<Text style={s.sectionTitle}>My Preferences</Text>
<Text style={s.prefSubtitle}>{editing?'Tap to select your preferences':'Your selected preferences'}</Text>
{PREFERENCES.map(pref=>{
const selected=(editing?editData.preferences:profile?.preferences)||[]
const isSelected=selected.includes(pref)
if(!editing&&!isSelected)return null
return(
<TouchableOpacity
key={pref}
style={[s.prefItem,isSelected&&s.prefItemSelected]}
onPress={()=>editing&&togglePreference(pref)}
activeOpacity={editing?0.7:1}
>
<View style={[s.prefCheckbox,isSelected&&s.prefCheckboxSelected]}>
{isSelected&&<Text style={s.prefCheckmark}>✓</Text>}
</View>
<Text style={[s.prefText,isSelected&&s.prefTextSelected]}>{pref}</Text>
</TouchableOpacity>
)
})}
{!editing&&(!profile?.preferences||profile.preferences.length===0)&&<Text style={s.infoValue}>No preferences set</Text>}
</View>

{editing&&<TouchableOpacity style={s.cancelButton} onPress={()=>{setEditing(false);setEditData(profile||{})}}>
<Text style={s.cancelButtonText}>Cancel</Text>
</TouchableOpacity>}

{!isPremium&&<TouchableOpacity style={s.premiumButton} onPress={onUpgrade}>
<Text style={s.premiumButtonText}>👑 Upgrade to Premium — $9.99/mo</Text>
</TouchableOpacity>}
<TouchableOpacity style={s.blockedButton} onPress={()=>setShowBlocked(true)}>
<Text style={s.blockedButtonText}>🚫 Manage Blocked Users</Text>
</TouchableOpacity>

<TouchableOpacity style={s.signOutButton} onPress={handleSignOut}>
<Text style={s.signOutText}>Sign Out</Text>
</TouchableOpacity>
</ScrollView>
)
}

const s=StyleSheet.create({
container:{flex:1,backgroundColor:'transparent'},
content:{paddingBottom:40},
editButton:{backgroundColor:'#2196F3',borderRadius:20,paddingHorizontal:16,paddingVertical:8},
editButtonText:{color:'#ffffff',fontWeight:'600',fontSize:14},
avatarContainer:{alignItems:'center',marginBottom:24,paddingHorizontal:24},
avatar:{width:100,height:100,borderRadius:50,backgroundColor:'#2196F3',alignItems:'center',justifyContent:'center',marginBottom:12},
avatarImage:{width:100,height:100,borderRadius:50},
avatarText:{color:'#ffffff',fontSize:40,fontWeight:'bold'},
cameraButton:{position:'absolute',bottom:0,right:0,backgroundColor:'rgba(0,0,0,0.6)',borderRadius:15,width:30,height:30,alignItems:'center',justifyContent:'center'},
cameraIcon:{fontSize:14},
editNameInput:{backgroundColor:'rgba(255,255,255,0.15)',borderRadius:10,padding:10,color:'#ffffff',fontSize:20,fontWeight:'700',textAlign:'center',borderWidth:1,borderColor:'rgba(255,255,255,0.25)',marginBottom:4,width:'80%'},
displayName:{color:'#ffffff',fontSize:22,fontWeight:'700',marginBottom:4},
username:{color:'rgba(255,255,255,0.7)',fontSize:15},
statsRow:{flexDirection:'row',backgroundColor:'rgba(255,255,255,0.15)',borderRadius:16,padding:16,marginHorizontal:24,marginBottom:16,borderWidth:1,borderColor:'rgba(255,255,255,0.25)'},
statBox:{flex:1,alignItems:'center'},
statNumber:{fontSize:24,fontWeight:'bold',color:'#2196F3'},
statLabel:{fontSize:11,color:'rgba(255,255,255,0.7)',marginTop:2},
statDivider:{width:1,backgroundColor:'rgba(0,0,0,0.1)'},
infoCard:{backgroundColor:'rgba(255,255,255,0.15)',borderRadius:16,padding:16,marginHorizontal:24,borderWidth:1,borderColor:'rgba(255,255,255,0.25)',marginBottom:16},
sectionTitle:{fontSize:16,fontWeight:'700',color:'#ffffff',marginBottom:4},
prefSubtitle:{fontSize:12,color:'#778899',marginBottom:12},
infoLabel:{fontSize:12,color:'rgba(255,255,255,0.7)',fontWeight:'600',marginBottom:4,textTransform:'uppercase'},
infoValue:{fontSize:15,color:'#ffffff',marginBottom:16,lineHeight:22},
editInput:{backgroundColor:'rgba(255,255,255,0.8)',borderRadius:10,padding:12,color:'#ffffff',fontSize:15,marginBottom:16,borderWidth:1,borderColor:'rgba(255,255,255,0.9)'},
bioInput:{height:80,textAlignVertical:'top'},
prefItem:{flexDirection:'row',alignItems:'center',paddingVertical:10,borderBottomWidth:1,borderBottomColor:'rgba(0,0,0,0.05)'},
prefItemSelected:{},
prefCheckbox:{width:22,height:22,borderRadius:6,borderWidth:2,borderColor:'#2196F3',marginRight:12,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(255,255,255,0.15)'},
prefCheckboxSelected:{backgroundColor:'#2196F3'},
prefCheckmark:{color:'#ffffff',fontSize:13,fontWeight:'bold'},
prefText:{flex:1,fontSize:14,color:'rgba(255,255,255,0.7)'},
prefTextSelected:{color:'#ffffff',fontWeight:'500'},
cancelButton:{backgroundColor:'rgba(255,255,255,0.15)',borderRadius:12,padding:16,alignItems:'center',marginHorizontal:24,marginBottom:12,borderWidth:1,borderColor:'rgba(0,0,0,0.1)'},
cancelButtonText:{color:'rgba(255,255,255,0.7)',fontSize:16,fontWeight:'600'},
premiumButton:{backgroundColor:'#F5A623',borderRadius:12,padding:16,alignItems:'center',marginHorizontal:24,marginBottom:12},
premiumButtonText:{color:'#0A1628',fontSize:16,fontWeight:'700'},
blockedButton:{backgroundColor:'rgba(255,255,255,0.15)',borderRadius:12,padding:16,alignItems:'center',marginHorizontal:24,marginBottom:12,borderWidth:1,borderColor:'rgba(0,0,0,0.15)'},
blockedButtonText:{color:'rgba(255,255,255,0.7)',fontSize:16,fontWeight:'600'},
signOutButton:{backgroundColor:'rgba(255,255,255,0.15)',borderRadius:12,padding:16,alignItems:'center',marginHorizontal:24,borderWidth:1,borderColor:'#FF6B00'},
signOutText:{color:'#FF8C00',fontSize:16,fontWeight:'600'},
loading:{flex:1,backgroundColor:'transparent',alignItems:'center',justifyContent:'center'},
loadingText:{color:'rgba(255,255,255,0.7)',fontSize:16},
})
