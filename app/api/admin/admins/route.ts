import { supabase } from '@/lib/supabaseClient';
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'



// GET - Fetch all admins (Super Admin only)
export async function GET(request: NextRequest) {
  try {
    const adminId = request.headers.get('x-admin-id')
    
    if (!adminId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // ✅ FIX: Select all fields
const { data: admin, error: adminError } = await supabase
  .from('admins')
  .select('*')
  .eq('id', adminId)
  .single()

    if (adminError || !admin || admin.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Only super admin can view all admins' },
        { status: 403 }
      )
    }

    // Fetch all admins
    const { data: admins, error } = await supabase
      .from('admins')
      .select('id, email, full_name, role, is_active, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ admins: admins || [] })
  } catch (error) {
    console.error('Error fetching admins:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create new admin (Super Admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { full_name, email, password, role, adminId } = body

    // Validation
    if (!full_name || !email || !password || !role) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // Check if requester is super admin
const { data: admin, error: adminError } = await supabase
  .from('admins')
  .select('*')
  .eq('id', adminId)
  .single()

    if (adminError || !admin || admin.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Only super admin can create new admins' },
        { status: 403 }
      )
    }

    // Check if email already exists
    const { data: existingAdmin, error: checkError } = await supabase
      .from('admins')
      .select('email')
      .eq('email', email.toLowerCase())
      .single()

    if (existingAdmin) {
      return NextResponse.json(
        { error: 'Admin with this email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const salt = bcrypt.genSaltSync(10)
    const password_hash = bcrypt.hashSync(password, salt)

    // Insert new admin
    const { data: newAdmin, error: insertError } = await supabase
      .from('admins')
      .insert({
        name: full_name,
        full_name: full_name,
        email: email.toLowerCase(),
        password_hash: password_hash,
        role: role,
        is_active: true,
        created_at: new Date().toISOString()
      })
      .select('id, email, full_name, role, is_active, created_at')
      .single()

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      )
    }

    // Log the action
    await supabase
      .from('audit_logs')
      .insert({
        admin_id: adminId,
        admin_email: admin.email,
        action: 'admin_created',
        entity_type: 'admin',
        entity_id: newAdmin.id,
        details: {
          new_admin_email: newAdmin.email,
          new_admin_name: newAdmin.full_name,
          role: newAdmin.role
        }
      })

    return NextResponse.json({
      success: true,
      message: 'Admin created successfully',
      admin: newAdmin
    })

  } catch (error) {
    console.error('Error creating admin:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}