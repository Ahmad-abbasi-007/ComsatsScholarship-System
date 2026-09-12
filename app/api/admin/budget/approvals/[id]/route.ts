import { supabase } from '@/lib/supabaseClient';
import { NextRequest, NextResponse } from 'next/server'



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

    console.log('📌 [Budget Approve] ID:', id)
    console.log('📌 [Budget Approve] Action:', action)

    // Get scholarship details
    const { data: scholarship, error: fetchError } = await supabase
      .from('scholarships')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !scholarship) {
      console.error('❌ Scholarship not found:', fetchError)
      return NextResponse.json(
        { error: 'Scholarship not found' },
        { status: 404 }
      )
    }

    console.log('📌 [Budget Approve] Scholarship:', scholarship.title)

    // ============ APPROVE ============
    if (action === 'approve') {
      const amountToApprove = scholarship.budget_allocated || scholarship.budget_required || 0
      
      // Update scholarship
      const { error: updateError } = await supabase
        .from('scholarships')
        .update({
          budget_status: 'approved',
          budget_allocated: amountToApprove,
          budget_required: amountToApprove,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (updateError) {
        console.error('❌ Error approving budget:', updateError)
        return NextResponse.json(
          { error: updateError.message || 'Failed to approve budget' },
          { status: 500 }
        )
      }

      // ✅ INSERT INTO budget_approvals TABLE
      const { error: approvalError } = await supabase
        .from('budget_approvals')
        .insert({
          scholarship_id: id,
          total_required: scholarship.budget_required || 0,
          approved_amount: amountToApprove,
          status: 'approved',
          approved_date: new Date().toISOString(),
          notes: 'Budget approved by admin',
          created_at: new Date().toISOString()
        })

      if (approvalError) {
        console.error('❌ Error saving budget approval:', approvalError)
      }

      console.log('✅ Budget approved for:', scholarship.title)

      // Get selected students from merit list
      const { data: meritEntries } = await supabase
        .from('merit_lists')
        .select('*')
        .eq('scholarship_id', id)
        .neq('status', 'waitlist')

      if (meritEntries && meritEntries.length > 0) {
        const studentRegnos = meritEntries.map((m: any) => m.student_regno)

        await supabase
          .from('scholarship_applications')
          .update({
            status: 'awarded',
            updated_at: new Date().toISOString()
          })
          .eq('scholarship_id', id)
          .in('student_regno', studentRegnos)

        await supabase
          .from('merit_lists')
          .update({
            status: 'awarded',
            updated_at: new Date().toISOString()
          })
          .eq('scholarship_id', id)
          .in('student_regno', studentRegnos)

        try {
          const notifications = studentRegnos.map((regno: string) => ({
            user_id: regno,
            user_type: 'student',
            type: 'budget_approved',
            title: 'Scholarship Awarded',
            message: `Your scholarship for "${scholarship.title}" has been approved and awarded.`,
            data: {
              scholarshipId: id,
              scholarshipTitle: scholarship.title
            },
            is_read: false,
            created_at: new Date().toISOString()
          }))

          await supabase.from('notifications').insert(notifications)
        } catch (notifError) {
          console.error('Notification error:', notifError)
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Budget approved successfully',
        awarded_students: meritEntries?.length || 0
      })

    // ============ ADJUST ============
    } else if (action === 'adjust') {
      const { adjustedAmount } = await request.json()
      
      if (!adjustedAmount || adjustedAmount <= 0) {
        return NextResponse.json(
          { error: 'Valid adjusted amount is required' },
          { status: 400 }
        )
      }

      console.log('📌 [Budget Adjust] New Amount:', adjustedAmount)

      // Update scholarship with new budget
      const { error: updateError } = await supabase
        .from('scholarships')
        .update({
          budget_allocated: adjustedAmount,
          budget_required: adjustedAmount,
          budget_status: 'approved',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (updateError) {
        console.error('❌ Error adjusting budget:', updateError)
        return NextResponse.json(
          { error: updateError.message || 'Failed to adjust budget' },
          { status: 500 }
        )
      }

      // ✅ INSERT INTO budget_approvals TABLE
      const { error: approvalError } = await supabase
        .from('budget_approvals')
        .insert({
          scholarship_id: id,
          total_required: adjustedAmount,
          approved_amount: adjustedAmount,
          status: 'adjusted',
          approved_date: new Date().toISOString(),
          notes: `Budget adjusted from ${scholarship.budget_required || 0} to ${adjustedAmount}`,
          created_at: new Date().toISOString()
        })

      if (approvalError) {
        console.error('❌ Error saving budget approval:', approvalError)
      }

      console.log('✅ Budget adjusted for:', scholarship.title)

      return NextResponse.json({
        success: true,
        message: 'Budget adjusted successfully',
        new_budget: adjustedAmount
      })

    // ============ REJECT ============
    } else if (action === 'reject') {
      const { error: updateError } = await supabase
        .from('scholarships')
        .update({
          budget_status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (updateError) {
        console.error('❌ Error rejecting budget:', updateError)
        return NextResponse.json(
          { error: updateError.message || 'Failed to reject budget' },
          { status: 500 }
        )
      }

      // ✅ INSERT INTO budget_approvals TABLE
      const { error: approvalError } = await supabase
        .from('budget_approvals')
        .insert({
          scholarship_id: id,
          total_required: scholarship.budget_required || 0,
          approved_amount: 0,
          status: 'rejected',
          approved_date: new Date().toISOString(),
          notes: 'Budget rejected by admin',
          created_at: new Date().toISOString()
        })

      if (approvalError) {
        console.error('❌ Error saving budget approval:', approvalError)
      }

      const { data: meritEntries } = await supabase
        .from('merit_lists')
        .select('*')
        .eq('scholarship_id', id)
        .neq('status', 'waitlist')

      if (meritEntries && meritEntries.length > 0) {
        const studentRegnos = meritEntries.map((m: any) => m.student_regno)

        await supabase
          .from('scholarship_applications')
          .update({
            status: 'rejected',
            updated_at: new Date().toISOString()
          })
          .eq('scholarship_id', id)
          .in('student_regno', studentRegnos)

        try {
          const notifications = studentRegnos.map((regno: string) => ({
            user_id: regno,
            user_type: 'student',
            type: 'budget_rejected',
            title: 'Scholarship Update',
            message: `Your application for "${scholarship.title}" has been rejected due to budget constraints.`,
            data: {
              scholarshipId: id,
              scholarshipTitle: scholarship.title
            },
            is_read: false,
            created_at: new Date().toISOString()
          }))

          await supabase.from('notifications').insert(notifications)
        } catch (notifError) {
          console.error('Notification error:', notifError)
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Budget rejected',
        affected_students: meritEntries?.length || 0
      })

    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "approve", "adjust", or "reject"' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('❌ Error in budget approval PUT:', error)
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    )
  }
}