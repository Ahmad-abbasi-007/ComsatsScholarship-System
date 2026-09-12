import { supabase } from '@/lib/supabaseClient';
import { NextResponse } from 'next/server'



export async function GET() {
  try {
    const { data, error } = await supabase
      .from('help_content')
      .select('*')
      .eq('type', 'guidelines')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching guidelines:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ items: data || [] })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}