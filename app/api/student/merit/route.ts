import { supabase } from '@/lib/supabaseClient';
import { NextRequest, NextResponse } from 'next/server';



export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentRegNo = searchParams.get('studentRegNo');
    const scholarshipId = searchParams.get('scholarshipId');

    console.log('🔍 [STUDENT MERIT API] Fetching for student:', studentRegNo);

    if (!studentRegNo) {
      return NextResponse.json(
        { error: 'Student registration number is required' },
        { status: 400 }
      );
    }

    // If scholarshipId is provided, get specific merit list
    if (scholarshipId) {
      // Get scholarship details
      const { data: scholarship, error: scholarshipError } = await supabase
        .from('scholarships')
        .select('id, title, number_of_awards, deadline')
        .eq('id', scholarshipId)
        .single();

      if (scholarshipError) {
        return NextResponse.json(
          { error: 'Scholarship not found' },
          { status: 404 }
        );
      }

      // Get merit list for this scholarship
      const { data: meritList, error: meritError } = await supabase
        .from('merit_lists')
        .select('*')
        .eq('scholarship_id', scholarshipId)
        .order('rank', { ascending: true });

      if (meritError) {
        return NextResponse.json(
          { error: 'Failed to fetch merit list' },
          { status: 500 }
        );
      }

      // Find student's position
      const studentEntry = meritList?.find(m => m.student_regno === studentRegNo) || null;

      return NextResponse.json({
        success: true,
        scholarship,
        meritList: meritList || [],
        studentEntry
      });
    }

    // Get all merit lists where student appears
    const { data: studentMeritEntries, error: entriesError } = await supabase
      .from('merit_lists')
      .select(`
        *,
        scholarships (
          id,
          title,
          number_of_awards,
          deadline
        )
      `)
      .eq('student_regno', studentRegNo)
      .order('created_at', { ascending: false });

    if (entriesError) {
      return NextResponse.json(
        { error: 'Failed to fetch student merit entries' },
        { status: 500 }
      );
    }

    // Group by scholarship
    const meritLists = studentMeritEntries?.map(entry => ({
      id: entry.id,
      scholarship_id: entry.scholarship_id,
      scholarship_title: entry.scholarships?.title || 'Unknown',
      rank: entry.rank,
      total_score: entry.total_score,
      status: entry.status,
      total_applicants: entry.scholarships?.number_of_awards || 0,
      generated_at: entry.created_at
    })) || [];

    return NextResponse.json({
      success: true,
      meritLists,
      count: meritLists.length
    });

  } catch (error: unknown) {
    console.error('❌ [STUDENT MERIT API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { scholarshipId, studentRegNo } = await request.json();

    if (!scholarshipId || !studentRegNo) {
      return NextResponse.json(
        { error: 'Scholarship ID and Student Reg No are required' },
        { status: 400 }
      );
    }

    // Check if student has applied to this scholarship
    const { data: application, error: appError } = await supabase
      .from('scholarship_applications')
      .select('id, status')
      .eq('scholarship_id', scholarshipId)
      .eq('student_regno', studentRegNo)
      .single();

    if (appError || !application) {
      return NextResponse.json(
        { error: 'You have not applied for this scholarship' },
        { status: 404 }
      );
    }

    if (application.status !== 'approved') {
      return NextResponse.json(
        { error: 'Your application is not approved yet' },
        { status: 400 }
      );
    }

    // Get student's position in merit list
    const { data: meritEntry, error: meritError } = await supabase
      .from('merit_lists')
      .select('*')
      .eq('scholarship_id', scholarshipId)
      .eq('student_regno', studentRegNo)
      .single();

    if (meritError || !meritEntry) {
      return NextResponse.json(
        { error: 'Merit list not generated yet for this scholarship' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      meritEntry
    });

  } catch (error: unknown) {
    console.error('❌ [STUDENT MERIT API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}