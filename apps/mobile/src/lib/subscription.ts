import { supabase } from './supabase'

export const PREMIUM_PRODUCT_ID = 'com.sidebyside8.syde.premium.monthly'

export async function setupPurchases() {}

export async function getPremiumProduct() {
  return null
}

export async function purchasePremium(): Promise<boolean> {
  return false
}

export async function restorePurchases(): Promise<boolean> {
  return false
}

export async function savePremiumStatus(isPremium: boolean) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('users').update({ is_premium: isPremium }).eq('id', user.id)
}

export async function checkPremiumStatus(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await supabase.from('users').select('is_premium').eq('id', user.id).single()
  return data?.is_premium || false
}