import { supabase } from '@/lib/supabaseClient';
import { NextRequest, NextResponse } from 'next/server'



export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Admin ID is required' },
        { status: 400 }
      )
    }

    // Check if admin exists
    const { data: existingAdmin, error: checkError } = await supabase
      .from('admins')
      .select('id, role')
      .eq('id', id)
      .single()

    if (checkError || !existingAdmin) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      )
    }

    // Prevent deleting super_admin
    if (existingAdmin.role === 'super_admin') {
      return NextResponse.json(
        { error: 'Cannot delete super admin' },
        { status: 403 }
      )
    }

    // Delete admin
    const { error } = await supabase
      .from('admins')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Delete error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Admin deleted successfully'
    })

  } catch (error) {
    console.error('Delete admin error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}