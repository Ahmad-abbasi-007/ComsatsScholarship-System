import { supabase } from '@/lib/supabaseClient';
import { NextRequest, NextResponse } from 'next/server';



export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [ADMIN API] Fetching all applications...');

    const { data: applications, error } = await supabase
      .from('scholarship_applications')
      .select(`
        *,
        scholarships (
          title
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ [ADMIN API] Database error:', error);
      return NextResponse.json(
        { error: 'Database error: ' + error.message },
        { status: 500 }
      );
    }

    console.log('✅ [ADMIN API] Found applications:', applications?.length);

    //------------------------------This is for Transform the data------------------------------
    const transformedApplications = applications?.map(app => ({
      id: app.id,
      scholarship_id: app.scholarship_id,
      student_regno: app.student_regno,
      status: app.status,
      applied_at: app.created_at,
      notes: app.notes,
      application_data: app.application_data,
      scholarship: {
        title: app.scholarships?.title || 'Unknown Scholarship'
      },
      student_name: app.application_data?.student_name || 'Student',
      student_email: `${app.student_regno}@edu.pk`
    })) || [];

    return NextResponse.json({
      applications: transformedApplications,
      count: transformedApplications.length
    });

  } catch (error: unknown) {
    console.error('❌ [ADMIN API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}