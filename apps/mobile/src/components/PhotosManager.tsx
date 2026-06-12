import{useEffect,useState}from'react'
import{View,Text,TouchableOpacity,StyleSheet,Image,Alert,ActivityIndicator}from'react-native'
import{launchImageLibraryAsync,launchCameraAsync,requestMediaLibraryPermissionsAsync,requestCameraPermissionsAsync,MediaTypeOptions}from'expo-image-picker'
import{supabase}from'../lib/supabase'

type Photo={id:string;photo_url:string;is_profile:boolean}

export default function PhotosManager({isPremium}:{isPremium:boolean}){
const[photos,setPhotos]=useState<Photo[]>([])
const[loading,setLoading]=useState(true)
const[uploading,setUploading]=useState<number|null>(null)

useEffect(()=>{loadPhotos()},[])

const loadPhotos=async()=>{
const{data:{user}}=await supabase.auth.getUser()
if(!user)return
const{data}=await supabase.from('user_photos').select('*').eq('user_id',user.id).order('created_at',{ascending:true})
setPhotos(data||[])
setLoading(false)
}

const uploadPhoto=async(uri:string,base64:string|undefined,slot:number)=>{
setUploading(slot)
try{
const{data:{user}}=await supabase.auth.getUser()
if(!user)return
const fileName=user.id+'-photo-'+Date.now()+'.jpg'
let uploadData:any
if(base64){
uploadData=Uint8Array.from(atob(base64),c=>c.charCodeAt(0))
}else{
const response=await fetch(uri)
uploadData=await response.arrayBuffer()
}
const{error:ue}=await supabase.storage.from('avatars').upload(fileName,uploadData,{contentType:'image/jpeg',upsert:true})
if(ue){Alert.alert('Upload failed',ue.message);setUploading(null);return}
const{data:ud}=supabase.storage.from('avatars').getPublicUrl(fileName)
const isFirst=photos.length===0
const{data:newPhoto}=await supabase.from('user_photos').insert({
user_id:user.id,photo_url:ud.publicUrl,is_profile:isFirst
}).select().single()
if(newPhoto){
setPhotos(prev=>[...prev,newPhoto])
if(isFirst)await supabase.from('users').update({avatar_url:ud.publicUrl}).eq('id',user.id)
}
}catch(e:any){Alert.alert('Error',e.message)}
setUploading(null)
}

const handleSlotPress=async(slot:number,existingPhoto:Photo|null)=>{
if(existingPhoto){
Alert.alert('Photo Options','What would you like to do?',[
{text:'Cancel',style:'cancel'},
...(!existingPhoto.is_profile?[{text:'Set as Profile Photo',onPress:async()=>{
const{data:{user}}=await supabase.auth.getUser()
if(!user)return
await supabase.from('user_photos').update({is_profile:false}).eq('user_id',user.id)
await supabase.from('user_photos').update({is_profile:true}).eq('id',existingPhoto.id)
await supabase.from('users').update({avatar_url:existingPhoto.photo_url}).eq('id',user.id)
setPhotos(prev=>prev.map(p=>({...p,is_profile:p.id===existingPhoto.id})))
Alert.alert('Profile photo updated!')
}}]:[]),
{text:'Delete',style:'destructive',onPress:async()=>{
await supabase.from('user_photos').delete().eq('id',existingPhoto.id)
const remaining=photos.filter(p=>p.id!==existingPhoto.id)
setPhotos(remaining)
if(existingPhoto.is_profile&&remaining.length>0){
const{data:{user}}=await supabase.auth.getUser()
if(user){
await supabase.from('user_photos').update({is_profile:true}).eq('id',remaining[0].id)
await supabase.from('users').update({avatar_url:remaining[0].photo_url}).eq('id',user.id)
setPhotos(remaining.map((p,i)=>({...p,is_profile:i===0})))
}
}
}}
])
return
}
Alert.alert('Add Photo','Choose how to add your photo',[
{text:'Take Photo',onPress:async()=>{
const perm=await requestCameraPermissionsAsync()
if(!perm.granted){Alert.alert('Permission needed','Please allow camera access');return}
const result=await launchCameraAsync({allowsEditing:true,aspect:[1,1],quality:0.7,base64:true})
if(!result.canceled)await uploadPhoto(result.assets[0].uri,result.assets[0].base64||undefined,slot)
}},
{text:'Choose from Library',onPress:async()=>{
const perm=await requestMediaLibraryPermissionsAsync()
if(!perm.granted){Alert.alert('Permission needed','Please allow photo library access');return}
const result=await launchImageLibraryAsync({mediaTypes:MediaTypeOptions.Images,allowsEditing:true,aspect:[1,1],quality:0.7,base64:true})
if(!result.canceled)await uploadPhoto(result.assets[0].uri,result.assets[0].base64||undefined,slot)
}},
{text:'Cancel',style:'cancel'}
])
}

if(loading)return<ActivityIndicator color="#2196F3" style={{marginVertical:20}}/>

const freeSlots=[0,1,2]
const premiumSlots=[3,4,5]

return(
<View style={s.container}>
<Text style={s.title}>My Photos</Text>
<Text style={s.subtitle}>Tap to add · Long press existing photo for options</Text>
<View style={s.grid}>
{freeSlots.map(slot=>{
const photo=photos[slot]
return(
<TouchableOpacity key={slot} style={s.slot} onPress={()=>handleSlotPress(slot,photo||null)}>
{uploading===slot?<ActivityIndicator color="#2196F3"/>
:photo?<>
<Image source={{uri:photo.photo_url}} style={s.photo}/>
{photo.is_profile&&<View style={s.profileBadge}><Text style={s.profileBadgeText}>Profile</Text></View>}
</>
:<View style={s.emptySlot}><Text style={s.plusText}>+</Text><Text style={s.slotLabel}>Add Photo</Text></View>}
</TouchableOpacity>
)
})}
{premiumSlots.map(slot=>{
const photo=photos[slot]
const locked=!isPremium
return(
<TouchableOpacity key={slot} style={[s.slot,locked&&s.lockedSlot]}
onPress={()=>locked?Alert.alert('Premium Feature','Upgrade to Premium to add up to 6 photos! 💎'):handleSlotPress(slot,photo||null)}>
{locked?<View style={s.lockedContent}><Text style={s.lockIcon}>💎</Text><Text style={s.lockedText}>Premium</Text></View>
:uploading===slot?<ActivityIndicator color="#2196F3"/>
:photo?<>
<Image source={{uri:photo.photo_url}} style={s.photo}/>
{photo.is_profile&&<View style={s.profileBadge}><Text style={s.profileBadgeText}>Profile</Text></View>}
</>
:<View style={s.emptySlot}><Text style={s.plusText}>+</Text><Text style={s.slotLabel}>Add Photo</Text></View>}
</TouchableOpacity>
)
})}
</View>
</View>
)
}

const s=StyleSheet.create({
container:{backgroundColor:'rgba(255,255,255,0.1)',borderRadius:16,padding:16,marginHorizontal:24,marginBottom:16,borderWidth:1,borderColor:'rgba(255,255,255,0.2)'},
title:{color:'#ffffff',fontSize:16,fontWeight:'700',marginBottom:4},
subtitle:{color:'rgba(255,255,255,0.5)',fontSize:11,marginBottom:12},
grid:{flexDirection:'row',flexWrap:'wrap',gap:8},
slot:{width:'31%',aspectRatio:1,borderRadius:10,overflow:'hidden'},
photo:{width:'100%',height:'100%'},
emptySlot:{flex:1,backgroundColor:'rgba(255,255,255,0.1)',alignItems:'center',justifyContent:'center',borderWidth:1.5,borderColor:'rgba(255,255,255,0.2)',borderStyle:'dashed',borderRadius:10},
plusText:{color:'rgba(255,255,255,0.5)',fontSize:28,fontWeight:'300'},
slotLabel:{color:'rgba(255,255,255,0.4)',fontSize:9,marginTop:2},
profileBadge:{position:'absolute',bottom:0,left:0,right:0,backgroundColor:'rgba(33,150,243,0.85)',paddingVertical:3,alignItems:'center'},
profileBadgeText:{color:'#ffffff',fontSize:9,fontWeight:'700'},
lockedSlot:{opacity:0.7},
lockedContent:{flex:1,backgroundColor:'rgba(245,166,35,0.1)',alignItems:'center',justifyContent:'center',borderWidth:1.5,borderColor:'rgba(245,166,35,0.3)',borderRadius:10},
lockIcon:{fontSize:20,marginBottom:2},
lockedText:{color:'#F5A623',fontSize:10,fontWeight:'600'},
})
