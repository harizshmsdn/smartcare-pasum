import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables.\n\n' +
    'Create a .env file in your project root (same folder as package.json) with:\n' +
    '  VITE_SUPABASE_URL=https://bvisritqzsnuflrdijmo.supabase.co/rest/v1/\n' +
    '  VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2aXNyaXRxenNudWZscmRpam1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyNjI1MDAsImV4cCI6MjA5OTgzODUwMH0.Nyz1-cfhCWi88YUJImwJdl-7ErNvdjXr3SEIddZAfAg\n\n' +
    'Then restart `npm run dev` — Vite does not hot-reload .env changes.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)