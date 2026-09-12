import { supabase } from '@/lib/supabaseClient'
import { NextRequest, NextResponse } from 'next/server'

// PUT - Restore or Reset a scholarship
export async function PUT(
  request: NextRequest,
 { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Scholarship ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { action } = body

    if (action === 'restore') {
      // Restore - Keep all data, just set to active
      const { data, error } = await supabase
        .from('scholarships')
        .update({ 
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error restoring:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true, 
        message: `"${data.title}" restored with all applications intact!`,
        scholarship: data
      })
    }

    if (action === 'reset') {
      // Reset - Restore but delete all applications and merit lists
      
      // First get the scholarship title
      const { data: existing } = await supabase
        .from('scholarships')
        .select('title')
        .eq('id', id)
        .single()

      const title = existing?.title || 'Scholarship'

      // Delete all applications for this scholarship
      const { error: appError } = await supabase
        .from('scholarship_applications')
        .delete()
        .eq('scholarship_id', id)

      if (appError) {
        console.error('Error deleting applications:', appError)
      }

      // Delete all merit lists for this scholarship
      const { error: meritError } = await supabase
        .from('merit_lists')
        .delete()
        .eq('scholarship_id', id)

      if (meritError) {
        console.error('Error deleting merit lists:', meritError)
      }

      // Now set to active
      const { data, error } = await supabase
        .from('scholarships')
        .update({ 
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error resetting:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true, 
        message: `"${title}" reset successfully! All applications cleared.`,
        scholarship: data
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error in archive PUT:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Permanently delete a scholarship
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Scholarship ID is required' },
        { status: 400 }
      )
    }

    // First get the title
    const { data: existing } = await supabase
      .from('scholarships')
      .select('title')
      .eq('id', id)
      .single()

    const title = existing?.title || 'Scholarship'

    // Delete related applications
    await supabase
      .from('scholarship_applications')
      .delete()
      .eq('scholarship_id', id)

    // Delete related tiers
    await supabase
      .from('scholarship_tiers')
      .delete()
      .eq('scholarship_id', id)

    // Delete merit lists
    await supabase
      .from('merit_lists')
      .delete()
      .eq('scholarship_id', id)

    // Delete the scholarship
    const { error } = await supabase
      .from('scholarships')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting scholarship:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: `"${title}" permanently deleted`
    })
  } catch (error) {
    console.error('Error in archive DELETE:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}