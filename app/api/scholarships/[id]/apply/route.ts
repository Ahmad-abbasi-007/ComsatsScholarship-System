import { supabase } from '@/lib/supabaseClient';
import { NextRequest, NextResponse } from 'next/server';
import { createNotification } from '@/lib/notifications'; 



export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> } 
) {
  console.log('🚀 [APPLY API] ===== API CALLED =====');
  
  try {
    //------------------------------This is for FIX: Await the params------------------------------
    const params = await context.params;
    const { id } = params;
    
    const body = await request.json();
    const { student_regno, application_data = {} } = body;

    console.log('🚀 [APPLY API] Received application for scholarship:', id);
    console.log('🚀 [APPLY API] Student:', student_regno);

    //------------------------------This is for Validate ID-------------------------------
    if (!id || id === 'undefined') {
      console.log('🚀 [APPLY API] Invalid ID');
      return NextResponse.json(
        { error: 'Invalid scholarship ID' },
        { status: 400 }
      );
    }

    //------------------------------This is for Validate required fields--------------------------------
    if (!student_regno) {
      console.log('🚀 [APPLY API] No student regno');
      return NextResponse.json(
        { error: 'Student registration number is required' },
        { status: 400 }
      );
    }

    //-----------------------------This is for Check if scholarship exists-------------------------------
    const { data: scholarship, error: scholarshipError } = await supabase
      .from('scholarships')
      .select('*')
      .eq('id', id)
      .single();

    console.log('🚀 [APPLY API] Scholarship check:', { scholarship, scholarshipError });

    if (scholarshipError) {
      console.error('🚀 [APPLY API] Database error:', scholarshipError);
      return NextResponse.json(
        { error: 'Database error: ' + scholarshipError.message },
        { status: 500 }
      );
    }

    if (!scholarship) {
      console.log('🚀 [APPLY API] Scholarship not found with ID:', id);
      return NextResponse.json(
        { error: 'Scholarship not found' },
        { status: 404 }
      );
    }

    console.log('🚀 [APPLY API] Scholarship found:', scholarship.title);

    //------------------------------This is for Create application-----------------------------------
    const { data: application, error: applicationError } = await supabase
      .from('scholarship_applications')
      .insert([
        {
          scholarship_id: id,
          student_regno,
          application_data,
          status: 'pending'
        }
      ])
      .select()
      .single();

    if (applicationError) {
      console.error('🚀 [APPLY API] Application creation error:', applicationError);
      return NextResponse.json(
        { error: 'Failed to create application: ' + applicationError.message }, 
        { status: 500 }
      );
    }

    console.log('🚀 [APPLY API] Application created successfully:', application.id);

    // ✅ ADD NOTIFICATIONS HERE - AFTER SUCCESSFUL CREATION
    console.log('🚀 [APPLY API] ===== STARTING NOTIFICATIONS =====');
    
    try {
      // Get student name from application_data
      const studentName = application_data?.student_name || student_regno;
      
      console.log('🚀 [APPLY API] Creating student notification...');
      
      // 1. Notify the student that application was received
      const studentNotif = await createNotification({
        userId: student_regno,
        userType: 'student',
        type: 'application_submitted',
        title: 'Application Received',
        message: `Your application for "${scholarship.title}" has been submitted successfully.`,
        data: { 
          scholarshipId: id, 
          applicationId: application.id,
          scholarshipTitle: scholarship.title 
        }
      });
      console.log('🚀 [APPLY API] Student notification result:', studentNotif);

      console.log('🚀 [APPLY API] Creating admin notification...');
      
      // 2. Notify all admins about new application
      const adminNotif = await createNotification({
        userId: 'all-admins',
        userType: 'admin',
        type: 'application_submitted',
        title: 'New Application',
        message: `${studentName} applied for "${scholarship.title}"`,
        data: { 
          scholarshipId: id, 
          applicationId: application.id,
          studentRegno: student_regno,
          studentName,
          scholarshipTitle: scholarship.title 
        }
      });
      console.log('🚀 [APPLY API] Admin notification result:', adminNotif);

      console.log('🚀 [APPLY API] ===== NOTIFICATIONS COMPLETE =====');
    } catch (notifError) {
      console.error('🚀 [APPLY API] Notification error:', notifError);
    }

    return NextResponse.json({ 
      success: true,
      application, 
      message: 'Application submitted successfully' 
    });

  } catch (error: unknown) {
    console.error('🚀 [APPLY API] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error: ' + errorMessage }, 
      { status: 500 }
    );
  }
}