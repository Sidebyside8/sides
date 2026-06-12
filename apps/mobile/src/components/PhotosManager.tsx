import{useEffect,useState}from'react'
import{View,Text,TouchableOpacity,StyleSheet,Image,Alert,ScrollView,ActivityIndicator}from'react-native'
import{launchImageLibraryAsync,launchCameraAsync,requestMediaLibraryPermissionsAsync,requestCameraPermissionsAsync,MediaTypeOptions}from'expo-image-picker'
import{supabase}from'../lib/supabase'

type Photo={id:string;photo_url:string;is_profile:boolean}

export default function PhotosManager({isPremium}:{isPremium:boolean}){
const[photos,setPhotos]=useState<Photo[]>([])
const[loading,setLoading]=useState(true)
const[uploading,setUploading]=useState(false)
const maxPhotos=isPremium?6:3

useEffect(()=>{loadPhotos()},[])

const loadPhotos=async()=>{
const{data:{user}}=await supabase.auth.getUser()
if(!user)return
const{data}=await supabase.from('user_photos').select('*').eq('user_id',user.id).order('created_at',{ascending:true})
setPhotos(data||[])
setLoading(false)
}

const uploadPhoto=async(uri:string,base64?:string)=>{
setUploading(true)
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
if(ue){Alert.alert('Upload failed',ue.message);setUploading(false);return}
const{data:ud}=supabase.storage.from('avatars').getPublicUrl(fileName)
const isFirst=photos.length===0
const{data:newPhoto}=await supabase.from('user_photos').insert({
user_id:user.id,
photo_url:ud.publicUrl,
is_profile:isFirst
}).select().single()
if(newPhoto){
setPhotos(prev=>[...prev,newPhoto])
if(isFirst){
await supabase.from('users').update({avatar_url:ud.publicUrl}).eq('id',user.id)
}
}
}catch(e:any){Alert.alert('Error',e.message)}
setUploading(false)
}

const handleAddPhoto=()=>{
if(photos.length>=maxPhotos){
Alert.alert('Photo limit reached',isPremium?'Premium users can have up to 6 photos':'Free users can have up to 3 photos. Upgrade to Premium for 6 photos!')
return
}
Alert.alert('Add Photo','Choose how to add your photo',[
{text:'Take Photo',onPress:async()=>{
const perm=await requestCameraPermissionsAsync()
if(perm.granted===false){Alert.alert('Permission needed','Please allow camera access');return}
const result=await launchCameraAsync({allowsEditing:true,aspect:[1,1],quality:0.7,base64:true})
if(!result.canceled)await uploadPhoto(result.assets[0].uri,result.assets[0].base64||undefined)
}},
{text:'Choose from Library',onPress:async()=>{
const perm=await requestMediaLibraryPermissionsAsync()
if(perm.granted===false){Alert.alert('Permission needed','Please allow photo library access');return}
const result=await launchImageLibraryAsync({mediaTypes:MediaTypeOptions.Images,allowsEditing:true,aspect:[1,1],quality:0.7,base64:true})
if(!result.canceled)await uploadPhoto(result.assets[0].uri,result.assets[0].base64||undefined)
}},
{text:'Cancel',style:'cancel'}
])
}

const handleSetProfile=async(photo:Photo)=>{
const{data:{user}}=await supabase.auth.getUser()
if(!user)return
await supabase.from('user_photos').update({is_profile:false}).eq('user_id',user.id)
await supabase.from('user_photos').update({is_profile:true}).eq('id',photo.id)
await supabase.from('users').update({avatar_url:photo.photo_url}).eq('id',user.id)
setPhotos(prev=>prev.map(p=>({...p,is_profile:p.id===photo.id})))
Alert.alert('Profile photo updated!')
}

const handleDeletePhoto=async(photo:Photo)=>{
Alert.alert('Delete Photo','Are you sure you want to delete this photo?',[
{text:'Cancel',style:'cancel'},
{text:'Delete',style:'destructive',onPress:async()=>{
await supabase.from('user_photos').delete().eq('id',photo.id)
setPhotos(prev=>prev.filter(p=>p.id!==photo.id))
if(photo.is_profile){
const remaining=photos.filter(p=>p.id!==photo.id)
if(remaining.length>0){
await supabase.from('user_photos').update({is_profile:true}).eq('id',remaining[0].id)
await supabase.from('users').update({avatar_url:remaining[0].photo_url}).eq('id',(await supabase.auth.getUser()).data.user?.id)
setPhotos(prev=>prev.map((p,i)=>({...p,is_profile:p.id===remaining[0].id})))
}
}
}}
])
}

if(loading)return<ActivityIndicator color="#2196F3" style={{marginVertical:20}}/>

return(
<View style={s.container}>
<View style={s.header}>
<Text style={s.title}>My Photos</Text>
<Text style={s.subtitle}>{photos.length}/{maxPhotos} photos{!isPremium?' · Upgrade for 6':''}</Text>
</View>
<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.photosRow}>
{photos.map(photo=>(
<TouchableOpacity key={photo.id} style={s.photoContainer} onLongPress={()=>{
Alert.alert(photo.is_profile?'Profile Photo':'Photo','What would you like to do?',[
{text:'Cancel',style:'cancel'},
...(!photo.is_profile?[{text:'Set as Profile Photo',onPress:()=>handleSetProfile(photo)}]:[]),
{text:'Delete',style:'destructive',onPress:()=>handleDeletePhoto(photo)},
])
}}>
<Image source={{uri:photo.photo_url}} style={s.photo}/>
{photo.is_profile&&<View style={s.profileBadge}><Text style={s.profileBadgeText}>Profile</Text></View>}
</TouchableOpacity>
))}
{photos.length<maxPhotos&&(
<TouchableOpacity style={s.addButton} onPress={handleAddPhoto} disabled={uploading}>
{uploading?<ActivityIndicator color="#2196F3"/>:<Text style={s.addButtonText}>+</Text>}
</TouchableOpacity>
)}
</ScrollView>
<Text style={s.hint}>Long press a photo to set as profile or delete</Text>
</View>
)
}

const s=StyleSheet.create({
container:{backgroundColor:'rgba(255,255,255,0.1)',borderRadius:16,padding:16,marginHorizontal:24,marginBottom:16,borderWidth:1,borderColor:'rgba(255,255,255,0.2)'},
header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:12},
title:{color:'#ffffff',fontSize:16,fontWeight:'700'},
subtitle:{color:'rgba(255,255,255,0.6)',fontSize:12},
photosRow:{gap:8,paddingBottom:4},
photoContainer:{position:'relative'},
photo:{width:80,height:80,borderRadius:10},
profileBadge:{position:'absolute',bottom:0,left:0,right:0,backgroundColor:'rgba(33,150,243,0.8)',borderBottomLeftRadius:10,borderBottomRightRadius:10,paddingVertical:2,alignItems:'center'},
profileBadgeText:{color:'#ffffff',fontSize:9,fontWeight:'700'},
addButton:{width:80,height:80,borderRadius:10,backgroundColor:'rgba(255,255,255,0.15)',alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:'rgba(255,255,255,0.3)',borderStyle:'dashed'},
addButtonText:{color:'rgba(255,255,255,0.7)',fontSize:32,fontWeight:'300'},
hint:{color:'rgba(255,255,255,0.4)',fontSize:11,marginTop:8,textAlign:'center'},
})
