import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { adminId, currentPassword, newPassword, targetAdminId } = body

    console.log('📝 Password change request:', { adminId, targetAdminId })

    // Check if adminId is provided
    if (!adminId) {
      return NextResponse.json(
        { error: 'Admin ID is required' },
        { status: 400 }
      )
    }

    // Check if newPassword is provided
    if (!newPassword) {
      return NextResponse.json(
        { error: 'New password is required' },
        { status: 400 }
      )
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // Get the admin making the request
    const { data: requestingAdmin, error: adminError } = await supabase
      .from('admins')
      .select('*')
      .eq('id', adminId)
      .single()

    if (adminError || !requestingAdmin) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      )
    }

    // Check if admin is active
    if (!requestingAdmin.is_active) {
      return NextResponse.json(
        { error: 'Account is deactivated' },
        { status: 403 }
      )
    }

    // Determine which admin's password to change
    const targetId = targetAdminId || adminId
    const isSelf = targetId === adminId

    // Only super_admin can change other admins' passwords
    if (!isSelf && requestingAdmin.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Only super admin can change other admins passwords' },
        { status: 403 }
      )
    }

    // Get the target admin
    const { data: targetAdmin, error: targetError } = await supabase
      .from('admins')
      .select('*')
      .eq('id', targetId)
      .single()

    if (targetError || !targetAdmin) {
      return NextResponse.json(
        { error: 'Target admin not found' },
        { status: 404 }
      )
    }

    // If changing own password, verify current password
    if (isSelf) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Current password is required' },
          { status: 400 }
        )
      }
      const isValid = await bcrypt.compare(currentPassword, requestingAdmin.password_hash)
      if (!isValid) {
        return NextResponse.json(
          { error: 'Current password is incorrect' },
          { status: 401 }
        )
      }
    }

    // Hash new password
    const salt = bcrypt.genSaltSync(10)
    const newHash = bcrypt.hashSync(newPassword, salt)

    // Update password
    const { error: updateError } = await supabase
      .from('admins')
      .update({
        password_hash: newHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', targetId)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update password' },
        { status: 500 }
      )
    }

    // Log the action
    await supabase
      .from('audit_logs')
      .insert({
        admin_id: requestingAdmin.id,
        admin_email: requestingAdmin.email,
        action: isSelf ? 'password_changed_self' : 'password_reset_by_super_admin',
        entity_type: 'admin',
        entity_id: targetId,
        details: {
          target_email: targetAdmin.email,
          target_name: targetAdmin.full_name
        }
      })

    return NextResponse.json({
      success: true,
      message: isSelf 
        ? 'Password changed successfully' 
        : `Password reset for ${targetAdmin.full_name} successfully`
    })

  } catch (error) {
    console.error('Password change error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}