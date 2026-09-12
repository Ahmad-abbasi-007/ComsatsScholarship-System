import { supabase } from '@/lib/supabaseClient';
import { NextRequest, NextResponse } from 'next/server';
import { createNotification } from '@/lib/notifications'; // ADD THIS IMPORT



export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const { id } = params;

    console.log('🔍 [ADMIN API] Fetching application:', id);

    const { data: application, error } = await supabase
      .from('scholarship_applications')
      .select(`
        *,
        scholarships (
          title,
          description,
          deadline
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('❌ [ADMIN API] Database error:', error);
      return NextResponse.json(
        { error: 'Database error: ' + error.message },
        { status: 500 }
      );
    }

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    console.log('✅ [ADMIN API] Application found:', application.id);

    // Transform the data
    const transformedApplication = {
      id: application.id,
      scholarship_id: application.scholarship_id,
      student_regno: application.student_regno,
      status: application.status,
      applied_at: application.created_at,
      notes: application.notes,
      application_data: application.application_data,
      scholarship: {
        title: application.scholarships?.title || 'Unknown Scholarship',
        description: application.scholarships?.description || '',
        deadline: application.scholarships?.deadline || ''
      },
      student_name: application.application_data?.student_name || 'Student',
      student_email: application.application_data?.student_email || 'Email not available' // FIXED
    };

    return NextResponse.json({
      application: transformedApplication
    });

  } catch (error: unknown) {
    console.error('❌ [ADMIN API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const { id } = params;
    const { status } = await request.json();

    console.log('🔄 [ADMIN API] Updating application status:', { id, status });

    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Valid status (approved/rejected) is required' },
        { status: 400 }
      );
    }

//-------------------------This is for Update application status - REMOVE updated_at if it doesn't exist-----------------------
    const { data: application, error } = await supabase
      .from('scholarship_applications')
      .update({ 
        status: status
        //-----------------------------This is for Remove updated_at if column doesn't exist-----------------------------------
      })
      .eq('id', id)
      .select(`
        *,
        scholarships (
          title
        )
      `)
      .single();

    if (error) {
      console.error('❌ [ADMIN API] Database error:', error);
      return NextResponse.json(
        { error: 'Database error: ' + error.message },
        { status: 500 }
      );
    }

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    console.log('✅ [ADMIN API] Application updated:', application.id);

    // ✅ ADD NOTIFICATIONS HERE - AFTER SUCCESSFUL UPDATE
    try {
      const studentName = application.application_data?.student_name || application.student_regno;
      const scholarshipTitle = application.scholarships?.title || 'Scholarship';
      
      if (status === 'approved') {
        await createNotification({
          userId: application.student_regno,
          userType: 'student',
          type: 'application_approved',
          title: 'Application Approved',
          message: `Congratulations! Your application for "${scholarshipTitle}" has been approved.`,
          data: { 
            applicationId: application.id,
            scholarshipId: application.scholarship_id,
            scholarshipTitle: scholarshipTitle
          }
        });
        console.log('✅ [ADMIN API] Approval notification sent to student');
      } 
      else if (status === 'rejected') {
        await createNotification({
          userId: application.student_regno,
          userType: 'student',
          type: 'application_rejected',
          title: '📝 Application Update',
          message: `Your application for "${scholarshipTitle}" has been reviewed. Please check your status.`,
          data: { 
            applicationId: application.id,
            scholarshipId: application.scholarship_id,
            scholarshipTitle: scholarshipTitle
          }
        });
        console.log('✅ [ADMIN API] Rejection notification sent to student');
      }
    } catch (notifError) {
      // Don't fail the request if notifications fail
      console.error('⚠️ [ADMIN API] Notification error:', notifError);
    }

    return NextResponse.json({
      application,
      message: `Application ${status} successfully`
    });

  } catch (error: unknown) {
    console.error('❌ [ADMIN API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}