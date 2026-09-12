import { supabase } from '@/lib/supabaseClient';
import { NextRequest, NextResponse } from 'next/server'



// GET - Fetch all policies
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('help_content')
      .select('*')
      .eq('type', 'policies')
      .order('display_order', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ items: data || [] })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new policy
export async function POST(request: NextRequest) {
  try {
    const { title, content, category, is_active, display_order } = await request.json()

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('help_content')
      .insert({
        type: 'policies',
        title: title.trim(),
        content: content.trim(),
        category: category || 'general',
        is_active: is_active !== undefined ? is_active : true,
        display_order: display_order || 0
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      item: data,
      message: 'Policy created successfully'
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}