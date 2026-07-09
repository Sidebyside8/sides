import*as Notifications from'expo-notifications'
import*as Device from'expo-device'
import{Platform}from'react-native'
import{supabase}from'./supabase'

Notifications.setNotificationHandler({
handleNotification:async()=>({shouldShowBanner:true,shouldShowList:true,
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

export async function notifyNewMatch(otherUserId:string,myDisplayName:string){
const{data:otherUser}=await supabase.from('users').select('push_token,display_name').eq('id',otherUserId).single()
if(!otherUser?.push_token)return
await sendPushNotification(
otherUser.push_token,
'New Match! 🎉',
`You matched with ${myDisplayName}!`,
{type:'match'}
)
}

export async function notifyNewMessage(otherUserId:string,myDisplayName:string,messagePreview:string){
const{data:otherUser}=await supabase.from('users').select('push_token').eq('id',otherUserId).single()
if(!otherUser?.push_token)return
await sendPushNotification(
otherUser.push_token,
`${myDisplayName}`,
messagePreview,
{type:'message'}
)
}
