import{useState}from'react'
import DateTimePicker from'@react-native-community/datetimepicker'
import{View,Text,TextInput,TouchableOpacity,StyleSheet,ScrollView,Alert,Image,ActivityIndicator,KeyboardAvoidingView,Platform}from'react-native'
import{launchImageLibraryAsync,requestMediaLibraryPermissionsAsync,MediaTypeOptions}from'expo-image-picker'
import{supabase}from'../lib/supabase'
export default function CreateEventScreen({onBack,onCreated}:{onBack:()=>void;onCreated:()=>void}){
const[title,setTitle]=useState('')
const[description,setDescription]=useState('')
const[location,setLocation]=useState('')
const[date,setDate]=useState('')
const[time,setTime]=useState('')
const[imageUri,setImageUri]=useState<string|null>(null)
const[imageBase64,setImageBase64]=useState<string|null>(null)
const[saving,setSaving]=useState(false)
const[uploadingImage,setUploadingImage]=useState(false)
const handlePickImage=async()=>{
const perm=await requestMediaLibraryPermissionsAsync()
if(!perm.granted){Alert.alert('Permission needed','Please allow photo library access');return}
const result=await launchImageLibraryAsync({mediaTypes:MediaTypeOptions.Images,allowsEditing:true,aspect:[16,9],quality:0.7,base64:true})
if(!result.canceled){setImageUri(result.assets[0].uri);setImageBase64(result.assets[0].base64||null)}
}
const handleSave=async()=>{
if(!title.trim()){Alert.alert('Required','Please enter an event title');return}
if(!date.trim()){Alert.alert('Required','Please enter an event date');return}
const dateString=date.trim()+(time.trim()?' '+time.trim():' 00:00')
const parsedDate=new Date(dateString)
if(isNaN(parsedDate.getTime())){Alert.alert('Invalid Date','Please use format MM/DD/YYYY');return}
setSaving(true)
try{
const{data:{user}}=await supabase.auth.getUser()
if(!user)return
let imageUrl:string|null=null
if(imageBase64&&imageUri){
setUploadingImage(true)
const fileName=user.id+'-event-'+Date.now()+'.jpg'
const uploadData=Uint8Array.from(atob(imageBase64),c=>c.charCodeAt(0))
const{error:ue}=await supabase.storage.from('avatars').upload(fileName,uploadData,{contentType:'image/jpeg',upsert:true})
if(!ue){const{data:ud}=supabase.storage.from('avatars').getPublicUrl(fileName);imageUrl=ud.publicUrl}
setUploadingImage(false)
}
const{error}=await supabase.from('events').insert({user_id:user.id,title:title.trim(),description:description.trim(),location:location.trim(),event_date:new Date(date).toISOString(),image_url:imageUrl})
if(error){Alert.alert('Error',error.message);setSaving(false);return}
Alert.alert('Event Created!','Your event has been posted to the community.')
onCreated()
}catch(e:any){Alert.alert('Error',e.message)}
setSaving(false)
}
return(
<KeyboardAvoidingView style={s.container} behavior={Platform.OS==='ios'?'padding':'height'}>
<View style={s.header}>
<TouchableOpacity onPress={onBack} style={s.backBtn}><Text style={s.backText}>‹ Back</Text></TouchableOpacity>
<Text style={s.headerTitle}>Create Event</Text>
<TouchableOpacity onPress={handleSave} style={[s.saveBtn,saving&&s.saveBtnDisabled]} disabled={saving}>
{saving?<ActivityIndicator color="#ffffff" size="small"/>:<Text style={s.saveText}>Save</Text>}
</TouchableOpacity>
</View>
<ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
<TouchableOpacity style={s.imagePicker} onPress={handlePickImage}>
{imageUri?<Image source={{uri:imageUri}} style={s.imagePreview}/>
:<View style={s.imagePlaceholder}>
{uploadingImage?<ActivityIndicator color="#2196F3"/>:<>
<Text style={s.imageIcon}>🖼️</Text>
<Text style={s.imagePlaceholderText}>Add Event Photo</Text>
<Text style={s.imagePlaceholderSub}>Tap to choose from library</Text>
</>}
</View>}
{imageUri&&<View style={s.imageOverlay}><Text style={s.imageOverlayText}>Tap to change</Text></View>}
</TouchableOpacity>
<View style={s.form}>
<Text style={s.label}>Event Title *</Text>
<TextInput style={s.input} value={title} onChangeText={setTitle} placeholder="What's the event?" placeholderTextColor="rgba(255,255,255,0.4)" maxLength={60}/>
<Text style={s.label}>Date * (MM/DD/YYYY)</Text>
<TextInput style={s.input} value={date} onChangeText={setDate} placeholder="e.g. 12/25/2026" placeholderTextColor="rgba(255,255,255,0.4)" keyboardType="numbers-and-punctuation" maxLength={10}/>
<Text style={s.label}>Time (optional)</Text>
<TextInput style={s.input} value={time} onChangeText={setTime} placeholder="e.g. 7:00 PM" placeholderTextColor="rgba(255,255,255,0.4)" maxLength={10}/>
<Text style={s.label}>Location</Text>
<TextInput style={s.input} value={location} onChangeText={setLocation} placeholder="Where is it happening?" placeholderTextColor="rgba(255,255,255,0.4)"/>
<Text style={s.label}>Description</Text>
<TextInput style={[s.input,s.textArea]} value={description} onChangeText={setDescription} placeholder="Tell people about your event..." placeholderTextColor="rgba(255,255,255,0.4)" multiline numberOfLines={5} textAlignVertical="top" maxLength={500}/>
<Text style={s.charCount}>{description.length}/500 characters</Text>
</View>
</ScrollView>
</KeyboardAvoidingView>
)
}
const s=StyleSheet.create({
container:{flex:1},
header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingTop:60,paddingHorizontal:20,paddingBottom:16,backgroundColor:'rgba(0,0,0,0.3)'},
backBtn:{paddingVertical:4,paddingRight:12},
backText:{color:'#2196F3',fontSize:17,fontWeight:'600'},
headerTitle:{color:'#ffffff',fontSize:18,fontWeight:'700'},
saveBtn:{backgroundColor:'#2196F3',borderRadius:20,paddingHorizontal:16,paddingVertical:8},
saveBtnDisabled:{backgroundColor:'rgba(33,150,243,0.4)'},
saveText:{color:'#ffffff',fontWeight:'700',fontSize:15},
content:{padding:20,paddingBottom:60},
imagePicker:{width:'100%',height:200,borderRadius:16,overflow:'hidden',marginBottom:20,position:'relative'},
imagePreview:{width:'100%',height:'100%'},
imagePlaceholder:{flex:1,backgroundColor:'rgba(255,255,255,0.1)',alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:'rgba(255,255,255,0.2)',borderStyle:'dashed',borderRadius:16},
imageIcon:{fontSize:36,marginBottom:8},
imagePlaceholderText:{color:'rgba(255,255,255,0.8)',fontSize:16,fontWeight:'600'},
imagePlaceholderSub:{color:'rgba(255,255,255,0.5)',fontSize:13,marginTop:4},
imageOverlay:{position:'absolute',bottom:0,left:0,right:0,backgroundColor:'rgba(0,0,0,0.5)',padding:8,alignItems:'center'},
imageOverlayText:{color:'#ffffff',fontSize:13},
form:{gap:4},
label:{color:'rgba(255,255,255,0.9)',fontSize:14,fontWeight:'600',marginBottom:6,marginTop:12},
input:{backgroundColor:'rgba(255,255,255,0.15)',borderRadius:12,padding:14,color:'#ffffff',fontSize:15,borderWidth:1,borderColor:'rgba(255,255,255,0.25)'},
textArea:{height:120,textAlignVertical:'top'},
charCount:{color:'rgba(255,255,255,0.4)',fontSize:11,textAlign:'right',marginTop:4},
})
