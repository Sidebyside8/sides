import*as Notifications from'expo-notifications'
import*as Device from'expo-device'
import{Platform}from'react-native'
import{supabase}from'./supabase'

Notifications.setNotificationHandler({
handleNotification:async()=>({
shouldShowBanner:true,
shouldShowList:true,
shouldShowAlert:true,
shouldPlaySound:true,
shouldSetBadge:true,
}),
})

export async function registerForPushNotifications():Promise<string|null>{
if(!Device.isDevice){
console.log('Push notifications only work on physical devices')
return null
}
const{status:existingStatus}=await Notifications.getPermissionsAsync()
let finalStatus=existingStatus
if(existingStatus!=='granted'){
const{status}=await Notifications.requestPermissionsAsync()
finalStatus=status
}
if(finalStatus!=='granted'){
console.log('Permission not granted for push notifications')
return null
}
if(Platform.OS==='android'){
await Notifications.setNotificationChannelAsync('default',{
name:'default',
importance:Notifications.AndroidImportance.MAX,
vibrationPattern:[0,250,250,250],
})
}
const token=(await Notifications.getExpoPushTokenAsync({
projectId:'9c6c46b9-81e7-44b2-985e-9c2af69b05ae'
})).data
return token
}

export async function savePushToken(token:string){
const{data:{user}}=await supabase.auth.getUser()
if(!user)return
await supabase.from('users').update({push_token:token}).eq('id',user.id)
}

export async function sendPushNotification(pushToken:string,title:string,body:string,data?:object){
const message={
to:pushToken,
sound:'default',
title,
body,
data:data||{},
}
await fetch('https://exp.host/--/api/v2/push/send',{
method:'POST',
headers:{
Accept:'application/json',
'Accept-encoding':'gzip, deflate',
'Content-Type':'application/json',
},
body:JSON.stringify(message),
})
}

async function sendPremiumNotification(toUserId:string,title:string,body:string,data?:object){
const{data:user}=await supabase.from('users').select('push_token,is_premium').eq('id',toUserId).single()
if(!user?.push_token||!user?.is_premium)return
await sendPushNotification(user.push_token,title,body,data)
}

export async function notifyNewMessage(otherUserId:string,myDisplayName:string,messagePreview:string){
const{data:otherUser}=await supabase.from('users').select('push_token').eq('id',otherUserId).single()
if(!otherUser?.push_token)return
await sendPushNotification(
otherUser.push_token,
`💬 ${myDisplayName}`,
messagePreview,
{type:'message'}
)
}

export async function notifyNewMatch(otherUserId:string,myDisplayName:string){
const{data:otherUser}=await supabase.from('users').select('push_token').eq('id',otherUserId).single()
if(!otherUser?.push_token)return
await sendPushNotification(
otherUser.push_token,
'New Match! 🎉',
`You matched with ${myDisplayName}!`,
{type:'match'}
)
}

export async function notifyProfileLiked(toUserId:string,fromDisplayName:string){
await sendPremiumNotification(
toUserId,
'❤️ Someone liked you!',
`${fromDisplayName} liked your profile`,
{type:'like'}
)
}

export async function notifyProfileViewed(toUserId:string,fromDisplayName:string){
await sendPremiumNotification(
toUserId,
'👁️ Someone viewed your profile',
`${fromDisplayName} checked out your profile`,
{type:'view'}
)
}

export async function notifyProfileSaved(toUserId:string,fromDisplayName:string){
await sendPremiumNotification(
toUserId,
'⭐ Someone saved your profile!',
`${fromDisplayName} added you to their favorites`,
{type:'favorite'}
)
}

export async function notifyAlbumRequest(toUserId:string,fromDisplayName:string){
await sendPremiumNotification(
toUserId,
'🔒 Private Album Request',
`${fromDisplayName} wants to see your private album`,
{type:'album_request'}
)
}

export async function notifyAlbumAccepted(toUserId:string,fromDisplayName:string){
await sendPremiumNotification(
toUserId,
'🔓 Album Access Granted!',
`${fromDisplayName} shared their private album with you`,
{type:'album_accepted'}
)
}

export async function notifyNewMembers(toUserId:string,count:number){
const{data:user}=await supabase.from('users').select('push_token').eq('id',toUserId).single()
if(!user?.push_token)return
await sendPushNotification(
user.push_token,
'🆕 New members joined!',
`${count} new people joined Syde Vibe today. Go check them out!`,
{type:'new_members'}
)
}

export async function scheduleDailyReminder(){
try{
await Notifications.cancelAllScheduledNotificationsAsync()
const tomorrow=new Date()
tomorrow.setDate(tomorrow.getDate()+1)
tomorrow.setHours(18+Math.floor(Math.random()*2),Math.floor(Math.random()*60),0,0)
const messages=[
{title:'Someone is checking you out!',body:'Log in to see who viewed your profile today.'},
{title:'New likes waiting for you!',body:'Someone liked your profile. Come see who!'},
{title:'Your community is active!',body:'New members joined Syde Vibe today. Go say hello!'},
{title:'Do not miss your connections!',body:'Check in to see who is online near you.'},
]
const msg=messages[Math.floor(Math.random()*messages.length)]
await Notifications.scheduleNotificationAsync({
content:{title:msg.title,body:msg.body,sound:true},
trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date:tomorrow}
})
}catch(e){console.log('scheduleDailyReminder error:',e)}
}
