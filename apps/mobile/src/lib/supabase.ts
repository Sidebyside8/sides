import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ensuhiadkajoydjjlasm.supabase.co'
const supabaseAnonKey = 'sb_publishable_jl1Mg9QtGJsd6DFM8Nt2hg_C2khPz_M'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,
    detectSessionInUrl: false,
  },
})
