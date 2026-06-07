import*as InAppPurchases from'expo-in-app-purchases'
import{supabase}from'./supabase'

export const PREMIUM_PRODUCT_ID='com.sidebyside8.syde.premium.monthly'

export async function setupPurchases(){
try{
await InAppPurchases.connectAsync()
}catch(e){}
}

export async function getPremiumProduct(){
try{
const{results}=await InAppPurchases.getProductsAsync([PREMIUM_PRODUCT_ID])
return results?.[0]||null
}catch(e){return null}
}

export async function purchasePremium():Promise<boolean>{
try{
await InAppPurchases.purchaseItemAsync(PREMIUM_PRODUCT_ID)
return true
}catch(e){return false}
}

export async function restorePurchases():Promise<boolean>{
try{
const{results}=await InAppPurchases.getPurchaseHistoryAsync()
if(!results||results.length===0)return false
const premium=results.find(r=>r.productId===PREMIUM_PRODUCT_ID)
if(premium){
await savePremiumStatus(true)
return true
}
return false
}catch(e){return false}
}

export async function savePremiumStatus(isPremium:boolean){
const{data:{user}}=await supabase.auth.getUser()
if(!user)return
await supabase.from('users').update({is_premium:isPremium}).eq('id',user.id)
}

export async function checkPremiumStatus():Promise<boolean>{
const{data:{user}}=await supabase.auth.getUser()
if(!user)return false
const{data}=await supabase.from('users').select('is_premium').eq('id',user.id).single()
return data?.is_premium||false
}
