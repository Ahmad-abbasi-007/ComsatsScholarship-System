import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ygsftxuehtolqpoqytyw.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlnc2Z0eHVlaHRvbHFwb3F5dHl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyMTMxNDMsImV4cCI6MjEwNDc4OTE0M30.HXx1VQto98ZLz4-77WdmtObk3Pbot4sx7k7jToc_iWc'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)