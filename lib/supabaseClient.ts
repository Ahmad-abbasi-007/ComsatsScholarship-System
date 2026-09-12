import { createClient } from '@supabase/supabase-js'

// Fallback to project defaults so build/static collection never crashes
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zctnavbodugieyeeylvl.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjdG5hdmJvZHVnaWV5ZWV5bHZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzOTk1NzcsImV4cCI6MjA3ODk3NTU3N30.EBjsJ7LthS1wQNgbPO8BIsJQ5Pt9Jqe5fOxmbxKh9q8'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)