import { createClient } from '@supabase/supabase-js'

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!rawSupabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables.\n\n' +
    'Create a .env file in your project root (same folder as package.json) with:\n' +
    '  VITE_SUPABASE_URL=https://bvisritqzsnuflrdijmo.supabase.co/rest/v1/\n' +
    '  VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2aXNyaXRxenNudWZscmRpam1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyNjI1MDAsImV4cCI6MjA5OTgzODUwMH0.Nyz1-cfhCWi88YUJImwJdl-7ErNvdjXr3SEIddZAfAg\n\n' +
    'Then restart `npm run dev` — Vite does not hot-reload .env changes.'
  )
}

// Dynamically resolve Supabase URL to match the current window location host if running on a remote/local network IP.
let supabaseUrl = rawSupabaseUrl
if (typeof window !== 'undefined' && window.location) {
  try {
    const urlObj = new URL(rawSupabaseUrl)
    // If Supabase URL is pointing to localhost/127.0.0.1
    if (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1') {
      if (window.location.protocol === 'https:') {
        // If accessed via HTTPS, use proxy on same origin to avoid Mixed Content block
        supabaseUrl = window.location.origin
        console.log(`[SupabaseClient] Dynamic resolution: HTTPS detected. Routing via proxy: ${supabaseUrl}`)
      } else if (window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        // If accessed via HTTP but on network IP, rewrite target IP
        urlObj.hostname = window.location.hostname
        supabaseUrl = urlObj.toString()
        console.log(`[SupabaseClient] Dynamic resolution: HTTP IP detected. Routing directly to IP: ${supabaseUrl}`)
      }
    }
  } catch (e) {
    console.error('[SupabaseClient] Error resolving dynamic host:', e)
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)