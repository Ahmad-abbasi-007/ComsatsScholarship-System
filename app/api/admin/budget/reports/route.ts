import { supabase } from '@/lib/supabaseClient';
import { NextRequest, NextResponse } from 'next/server'



interface ReportItem {
  [key: string]: string | number
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'overview'

    let query = supabase
      .from('scholarships')
      .select('*')
      .eq('merit_list_generated', true)

    const { data: scholarships, error } = await query.order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    let stats = {
      totalBudget: 0,
      utilized: 0,
      remaining: 0,
      utilizationRate: 0
    }

    let items: ReportItem[] = []

    // ============ Calculate Stats for ALL Report Types ============
    // First calculate total budget and utilized from ALL scholarships
    for (const sch of scholarships || []) {
      const displayAmount = sch.budget_allocated || sch.budget_required || 0
      stats.totalBudget += displayAmount
      if (sch.budget_status === 'approved') {
        stats.utilized += displayAmount
      }
    }
    stats.remaining = stats.totalBudget - stats.utilized
    stats.utilizationRate = stats.totalBudget > 0 
      ? Math.round((stats.utilized / stats.totalBudget) * 100) 
      : 0

    // ============ OVERVIEW ============
    if (type === 'overview') {
      for (const sch of scholarships || []) {
        const { data: meritEntries } = await supabase
          .from('merit_lists')
          .select('*')
          .eq('scholarship_id', sch.id)
        
        const selectedCount = meritEntries?.filter((m: any) => m.status !== 'waitlist').length || 0
        const awardedCount = meritEntries?.filter((m: any) => m.status === 'awarded').length || 0

        items.push({
          Scholarship: sch.title || 'Unknown',
          Mode: sch.scholarship_mode || 'single',
          Budget: sch.budget_allocated || sch.budget_required || 0,
          Students: selectedCount,
          Awarded: awardedCount,
          Status: sch.budget_status || 'pending'
        })
      }

    // ============ SCHOLARSHIP-WISE ============
    } else if (type === 'scholarship') {
      for (const sch of scholarships || []) {
        const { data: meritEntries } = await supabase
          .from('merit_lists')
          .select('*')
          .eq('scholarship_id', sch.id)
        
        const selectedCount = meritEntries?.filter((m: any) => m.status !== 'waitlist').length || 0
        const awardedCount = meritEntries?.filter((m: any) => m.status === 'awarded').length || 0

        items.push({
          Scholarship: sch.title || 'Unknown',
          Mode: sch.scholarship_mode || 'single',
          Required: sch.budget_required || 0,
          Approved: sch.budget_allocated || 0,
          Students: selectedCount,
          Awarded: awardedCount,
          Status: sch.budget_status || 'pending'
        })
      }

    // ============ UTILIZATION ============
    } else if (type === 'utilization') {
      for (const sch of scholarships || []) {
        const required = sch.budget_required || 0
        const allocated = sch.budget_allocated || 0
        const utilization = required > 0 ? Math.round((allocated / required) * 100) : 0
        
        const { data: meritEntries } = await supabase
          .from('merit_lists')
          .select('*')
          .eq('scholarship_id', sch.id)
        
        const selectedCount = meritEntries?.filter((m: any) => m.status !== 'waitlist').length || 0
        const awardedCount = meritEntries?.filter((m: any) => m.status === 'awarded').length || 0

        items.push({
          Scholarship: sch.title || 'Unknown',
          Required: required,
          Approved: allocated,
          Students: selectedCount,
          Awarded: awardedCount,
          Utilization: `${utilization}%`,
          Status: sch.budget_status || 'pending'
        })
      }

    // ============ STUDENT-WISE ============
    } else if (type === 'students') {
      // Get all merit entries with student info
      const { data: allMerit } = await supabase
        .from('merit_lists')
        .select(`
          *,
          scholarships (title)
        `)
        .neq('status', 'waitlist')

      // Group by student
      const studentMap: Record<string, any> = {}
      for (const entry of allMerit || []) {
        const regno = entry.student_regno
        if (!studentMap[regno]) {
          studentMap[regno] = {
            Student: regno,
            Scholarships: [],
            TotalAwarded: 0,
            Status: []
          }
        }
        studentMap[regno].Scholarships.push(entry.scholarships?.title || 'Unknown')
        studentMap[regno].TotalAwarded += 1
        if (!studentMap[regno].Status.includes(entry.status)) {
          studentMap[regno].Status.push(entry.status)
        }
      }

      for (const key of Object.keys(studentMap)) {
        const s = studentMap[key]
        items.push({
          Student: s.Student,
          Scholarships: s.Scholarships.join(', '),
          TotalAwarded: s.TotalAwarded,
          Status: s.Status.join(', ')
        })
      }
    }

    return NextResponse.json({ stats, items })

  } catch (error) {
    console.error('Error in budget reports API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}