import { supabase } from '@/lib/supabaseClient';
import { NextRequest, NextResponse } from 'next/server'



export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'

    // First get all scholarships with budget status filter
    let query = supabase
      .from('scholarships')
      .select('*')
      .eq('merit_list_generated', true)

    if (status !== 'all') {
      query = query.eq('budget_status', status)
    } else {
      query = query.not('budget_status', 'eq', 'null')
    }

    const { data: scholarships, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching scholarships:', error)
      return NextResponse.json(
        { error: 'Failed to fetch scholarships' },
        { status: 500 }
      )
    }

    // For each scholarship, get merit list entries separately
    const formattedScholarships = []
    
    for (const sch of scholarships || []) {
      // Get merit list entries for this scholarship
      const { data: meritEntries, error: meritError } = await supabase
        .from('merit_lists')
        .select('*')
        .eq('scholarship_id', sch.id)

      if (meritError) {
        console.error('Error fetching merit entries:', meritError)
        continue
      }

      // Count selected students (status !== 'waitlist')
      const selectedEntries = meritEntries?.filter((m: any) => 
        m.status !== 'waitlist'
      ) || []

      // Get tier breakdown for tiered mode
      let tiers = []
      if (sch.scholarship_mode === 'tiered') {
        const { data: tierData } = await supabase
          .from('scholarship_tiers')
          .select('*')
          .eq('scholarship_id', sch.id)

        if (tierData) {
          tiers = tierData.map((tier: any) => ({
            ...tier,
            count: selectedEntries.filter((m: any) => 
              m.award_tier === tier.tier_name
            ).length
          }))
        }
      }

      // ✅ FIX: Use budget_allocated if available, otherwise use budget_required
      const displayAmount = sch.budget_allocated || sch.budget_required || 0

      formattedScholarships.push({
        id: sch.id,
        title: sch.title,
        scholarship_mode: sch.scholarship_mode,
        budget_status: sch.budget_status || 'pending',
        budget_required: displayAmount,
        budget_allocated: displayAmount,
        selected_count: selectedEntries.length,
        total_applications: meritEntries?.length || 0,
        tiers: tiers,
        created_at: sch.created_at,
        updated_at: sch.updated_at
      })
    }

    return NextResponse.json({
      scholarships: formattedScholarships,
      count: formattedScholarships.length
    })

  } catch (error) {
    console.error('Error in budget approvals GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}