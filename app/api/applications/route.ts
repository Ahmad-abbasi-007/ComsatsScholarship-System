import { supabase } from '@/lib/supabaseClient';
// app/api/applications/route.ts
import { NextRequest, NextResponse } from 'next/server'; 



export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const student_regno = searchParams.get('student_regno');

    if (!student_regno) {
      return NextResponse.json(
        { error: 'Student registration number is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Fetching applications for student:', student_regno);

    //----------------------------This is for Get full application data with scholarship details-------------------------------
    const { data: applications, error } = await supabase
      .from('scholarship_applications')
      .select(`
        *,
        scholarships (
          title,
          deadline
        )
      `)
      .eq('student_regno', student_regno)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Database error:', error);
      return NextResponse.json(
        { error: 'Database error: ' + error.message },
        { status: 500 }
      );
    }

    console.log('✅ Found applications:', applications?.length);

    //----------------------------This is for Transform the data to match our interface-------------------------------------
    const transformedApplications = applications?.map(app => ({
      id: app.id,
      scholarship_id: app.scholarship_id,
      student_regno: app.student_regno,
      status: app.status,
      applied_at: app.created_at,
      notes: app.notes,
      scholarship: {
        title: app.scholarships?.title || 'Unknown Scholarship',
        deadline: app.scholarships?.deadline || '2024-12-31'
      }
    })) || [];

    return NextResponse.json({
      applications: transformedApplications,
      count: transformedApplications.length
    });

  } catch (error: unknown) {
    console.error('❌ API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}