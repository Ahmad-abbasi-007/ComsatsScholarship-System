import { supabase } from '@/lib/supabaseClient';
import { NextRequest, NextResponse } from 'next/server'



export async function GET() {
  try {
    // Get all scholarships with merit list generated
    const { data: scholarships, error } = await supabase
      .from('scholarships')
      .select('*')
      .eq('merit_list_generated', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching scholarships:', error)
      return NextResponse.json(
        { error: 'Failed to fetch scholarships' },
        { status: 500 }
      )
    }

    let totalBudget = 0
    let approvedBudget = 0
    let pendingBudget = 0
    let totalStudents = 0
    let approvedCount = 0
    let pendingCount = 0
    const scholarshipList = []

    for (const sch of scholarships || []) {
      // Get merit list entries
      const { data: meritEntries } = await supabase
        .from('merit_lists')
        .select('*')
        .eq('scholarship_id', sch.id)

      const selectedEntries = meritEntries?.filter((m: any) => 
        m.status !== 'waitlist'
      ) || []

      // ✅ Use budget_allocated if available, otherwise budget_required
      const required = sch.budget_allocated || sch.budget_required || 0
      const allocated = sch.budget_allocated || 0

      totalBudget += required

      if (sch.budget_status === 'approved' || sch.budget_status === 'adjusted') {
        approvedBudget += allocated
        approvedCount++
      } else {
        pendingBudget += required
        pendingCount++
      }

      totalStudents += selectedEntries.length

      scholarshipList.push({
        id: sch.id,
        title: sch.title,
        scholarship_mode: sch.scholarship_mode,
        budget_status: sch.budget_status || 'pending',
        budget_required: required,
        budget_allocated: allocated,
        selected_count: selectedEntries.length,
        total_applications: meritEntries?.length || 0
      })
    }

    const remainingBudget = totalBudget - approvedBudget

    return NextResponse.json({
      stats: {
        totalBudget,
        approvedBudget,
        pendingBudget,
        remainingBudget,
        totalStudents,
        approvedCount,
        pendingCount,
        totalScholarships: scholarships?.length || 0
      },
      scholarships: scholarshipList
    })

  } catch (error) {
    console.error('Error in budget overview GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}