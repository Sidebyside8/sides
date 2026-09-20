import Purchases, { LOG_LEVEL, PurchasesPackage } from 'react-native-purchases'
import { Platform } from 'react-native'
import { supabase } from './supabase'

export const PREMIUM_PRODUCT_ID = 'com.sidebyside8.syde.premium.monthly'
const API_KEY_IOS = 'appl_bsTgWJKXgiNSMfokFEqLKCsuXtn'
const API_KEY_ANDROID = 'appl_bsTgWJKXgiNSMfokFEqLKCsuXtn'

export async function setupPurchases() {
  try {
    Purchases.setLogLevel(LOG_LEVEL.VERBOSE)
    if (Platform.OS === 'ios') {
      Purchases.configure({ apiKey: API_KEY_IOS })
    } else {
      Purchases.configure({ apiKey: API_KEY_ANDROID })
    }
  } catch (e) {
    console.log('RevenueCat setup error:', e)
  }
}

export async function getPremiumProduct(): Promise<PurchasesPackage | null> {
  try {
    const offerings = await Purchases.getOfferings()
    if (offerings.current && offerings.current.monthly) {
      return offerings.current.monthly
    }
    return null
  } catch (e) {
    console.log('getPremiumProduct error:', e)
    return null
  }
}

export async function purchasePremium(): Promise<boolean> {
  try {
    const pkg = await getPremiumProduct()
    if (!pkg) return false
    const { customerInfo } = await Purchases.purchasePackage(pkg)
    const isPremium = customerInfo.entitlements.active['premium'] !== undefined
    if (isPremium) await savePremiumStatus(true)
    return isPremium
  } catch (e: any) {
    if (!e.userCancelled) console.log('purchasePremium error:', e)
    return false
  }
}

export async function restorePurchases(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.restorePurchases()
    const isPremium = customerInfo.entitlements.active['premium'] !== undefined
    if (isPremium) await savePremiumStatus(true)
    return isPremium
  } catch (e) {
    console.log('restorePurchases error:', e)
    return false
  }
}

export async function savePremiumStatus(isPremium: boolean) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('users').update({ is_premium: isPremium }).eq('id', user.id)
}

export async function checkPremiumStatus(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.getCustomerInfo()
    const isPremium = customerInfo.entitlements.active['premium'] !== undefined
    if (isPremium) await savePremiumStatus(true)
    return isPremium
  } catch (e) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const { data } = await supabase.from('users').select('is_premium').eq('id', user.id).single()
    return data?.is_premium || false
  }
}

export const BOOST_PRODUCT_ID = 'com.sidebyside8.syde.boost.3pack'

export async function purchaseBoost(): Promise<boolean> {
  try {
    const offerings = await Purchases.getOfferings()
    // Try to find boost product directly
    const products = await Purchases.getProducts([BOOST_PRODUCT_ID])
    if (!products || products.length === 0) return false
    const { customerInfo } = await Purchases.purchaseStoreProduct(products[0])
    return true
  } catch (e: any) {
    if (!e.userCancelled) console.log('purchaseBoost error:', e)
    return false
  }
}

export async function activateBoost(userId: string): Promise<boolean> {
  try {
    const boostedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const { error } = await supabase.from('users').update({ boosted_until: boostedUntil }).eq('id', userId)
    return !error
  } catch (e) {
    console.log('activateBoost error:', e)
    return false
  }
}

export async function getBoostStatus(userId: string): Promise<{ isBoosted: boolean; boostedUntil: string | null }> {
  try {
    const { data } = await supabase.from('users').select('boosted_until').eq('id', userId).single()
    if (!data?.boosted_until) return { isBoosted: false, boostedUntil: null }
    const boostedUntil = new Date(data.boosted_until)
    const isBoosted = boostedUntil > new Date()
    return { isBoosted, boostedUntil: data.boosted_until }
  } catch (e) {
    return { isBoosted: false, boostedUntil: null }
  }
}
