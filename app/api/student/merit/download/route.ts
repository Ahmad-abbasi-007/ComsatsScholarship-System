import { supabase } from '@/lib/supabaseClient';
import { NextRequest, NextResponse } from 'next/server';



export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scholarshipId = searchParams.get('scholarshipId');

    if (!scholarshipId) {
      return NextResponse.json(
        { error: 'Scholarship ID is required' },
        { status: 400 }
      );
    }

    // Get merit list
    const { data: meritList, error: meritError } = await supabase
      .from('merit_lists')
      .select('*')
      .eq('scholarship_id', scholarshipId)
      .order('rank', { ascending: true });

    if (meritError) throw meritError;

    // Get student names for each entry
    const meritWithNames = await Promise.all(
      (meritList || []).map(async (entry) => {
        const { data: appData } = await supabase
          .from('scholarship_applications')
          .select('application_data')
          .eq('scholarship_id', scholarshipId)
          .eq('student_regno', entry.student_regno)
          .maybeSingle();
        
        return {
          ...entry,
          student_name: appData?.application_data?.student_name || entry.student_regno
        };
      })
    );

    return NextResponse.json({
      success: true,
      meritList: meritWithNames
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}