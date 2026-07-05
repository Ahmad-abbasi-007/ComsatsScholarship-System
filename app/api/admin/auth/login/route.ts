import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    console.log('🔐 Login attempt:', { email })

    // Check database for admin
    const { data: admin, error } = await supabase
      .from('admins')
      .select('*')
      .eq('email', email.toLowerCase())
      .single()

    if (error || !admin) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Check if admin is active
    if (!admin.is_active) {
      return NextResponse.json(
        { error: 'Account is deactivated. Contact super admin.' },
        { status: 403 }
      )
    }

    // ✅ Verify password using bcrypt
    const isPasswordValid = await bcrypt.compare(password, admin.password_hash)
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Log the login
    await supabase
      .from('audit_logs')
      .insert({
        admin_id: admin.id,
        admin_email: admin.email,
        action: 'login',
        entity_type: 'admin',
        ip_address: request.headers.get('x-forwarded-for') || 'unknown'
      })

    // Return admin data without password
    const { password_hash, ...adminData } = admin

    return NextResponse.json({
      success: true,
      message: 'Admin login successful',
      admin: {
        id: adminData.id,
        email: adminData.email,
        name: adminData.full_name || adminData.name,
        role: adminData.role || 'admin',
        is_active: adminData.is_active,
        created_at: adminData.created_at
      },
      token: `admin-${adminData.id}`
    })

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}