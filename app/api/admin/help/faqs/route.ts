import { supabase } from '@/lib/supabaseClient';
import { NextRequest, NextResponse } from 'next/server'



// GET - Fetch all FAQs
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('faqs')
      .select('*')
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching FAQs:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ faqs: data || [] })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create a new FAQ
export async function POST(request: NextRequest) {
  try {
    const { question, answer, category, is_active, display_order } = await request.json()

    if (!question?.trim() || !answer?.trim()) {
      return NextResponse.json(
        { error: 'Question and answer are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('faqs')
      .insert({
        question: question.trim(),
        answer: answer.trim(),
        category: category || 'general',
        is_active: is_active !== undefined ? is_active : true,
        display_order: display_order || 0
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating FAQ:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      faq: data,
      message: 'FAQ created successfully'
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}