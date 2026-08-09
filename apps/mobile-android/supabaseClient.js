import { createClient } from '@supabase/supabase-js'

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!rawSupabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables.\n\n' +
    'Create a .env file in your project root (same folder as package.json) with:\n' +
    '  VITE_SUPABASE_URL=https://your-project-ref.supabase.co\n' +
    '  VITE_SUPABASE_ANON_KEY=your-anon-key-from-the-supabase-dashboard\n\n' +
    'Find both under Project Settings → API in your Supabase dashboard.\n' +
    'Never put the service_role key here or anywhere else in client code —\n' +
    'only the anon key belongs in a browser bundle.\n\n' +
    'Then restart `npm run dev` — Vite does not hot-reload .env changes.'
  )
}

let supabaseUrl = rawSupabaseUrl
if (typeof window !== 'undefined' && window.location) {
  try {
    const urlObj = new URL(rawSupabaseUrl)
    if (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1') {
      if (window.location.protocol === 'https:') {
        supabaseUrl = window.location.origin
      } else if (window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        urlObj.hostname = window.location.hostname
        supabaseUrl = urlObj.toString()
      }
    }
  } catch (e) {
    console.error('[SupabaseClient] Error resolving dynamic host:', e)
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)