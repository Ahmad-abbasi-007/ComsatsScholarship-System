import { supabase } from '@/lib/supabaseClient';
import { NextRequest, NextResponse } from 'next/server';



// Types matching your existing APIs
interface Application {
  id: string;
  scholarship_id: string;
  student_regno: string;
  status: 'pending' | 'approved' | 'rejected' | 'under_review'; // FIXED: Added under_review
  created_at: string;
  notes?: string;
  scholarships?: {
    title: string;
    deadline: string;
  } | null;
}

interface Scholarship {
  id: number;
  title: string;
  description: string;
  deadline: string;
  status: string;
  created_at: string;
}

interface StudentInfo {
  regno: string;
  name: string;
  level: string;
  cgpa: number;
  department: string;
  current_semester?: number;
  profile_picture?: string;
  email?: string;
}

interface DashboardStats {
  applications: number;
  approved: number;
  pending: number;
  rejected: number;
  under_review: number;
}

interface Activity {
  id: number;
  action: string;
  description: string;
  time: string;
  status: string;
}

interface Deadline {
  id: number;
  title: string;
  deadline: string;
  daysLeft: number;
}

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

    console.log('📊 Fetching dashboard for student:', student_regno);

    // 1. Get Student Info from your existing students table
    const { data: studentInfo, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('regno', student_regno)
      .single();

    if (studentError) {
      console.log('⚠️ Student not found in DB, using fallback data');
    }

    // 2. Get Applications using the same pattern as your applications API
    const { data: applications, error: appError } = await supabase
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

    if (appError) {
      console.error('❌ Error fetching applications:', appError);
    }

    const typedApplications = (applications as unknown as Application[]) || [];

    // 3. Get Active Scholarships for deadlines using your scholarships API pattern
    const { data: scholarships, error: schError } = await supabase
      .from('scholarships')
      .select('id, title, deadline')
      .eq('status', 'active')
      .gte('deadline', new Date().toISOString().split('T')[0])
      .order('deadline', { ascending: true })
      .limit(5);

    if (schError) {
      console.error('❌ Error fetching scholarships:', schError);
    }

    const typedScholarships = (scholarships as unknown as Scholarship[]) || [];

    // Calculate Statistics from applications
    const stats: DashboardStats = {
      applications: typedApplications.length,
      approved: typedApplications.filter(a => a.status === 'approved').length,
      pending: typedApplications.filter(a => a.status === 'pending').length,
      rejected: typedApplications.filter(a => a.status === 'rejected').length,
      under_review: typedApplications.filter(a => a.status === 'under_review').length // FIXED: No error now
    };

    // Create Recent Activities from applications
    const recentActivities: Activity[] = typedApplications.slice(0, 5).map((app, index) => {
      const date = new Date(app.created_at);
      const now = new Date();
      const diffTime = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      const diffMins = Math.floor(diffTime / (1000 * 60));

      let timeStr = '';
      if (diffMins < 60) timeStr = `${diffMins} minutes ago`;
      else if (diffHours < 24) timeStr = `${diffHours} hours ago`;
      else if (diffDays === 1) timeStr = 'yesterday';
      else timeStr = `${diffDays} days ago`;

      return {
        id: index + 1,
        action: 'Scholarship Application',
        description: `Applied for ${app.scholarships?.title || 'a scholarship'}`,
        time: timeStr,
        status: app.status
      };
    });

    // Add profile update if no recent applications
    if (recentActivities.length === 0 && studentInfo) {
      recentActivities.push({
        id: 1,
        action: 'Profile Created',
        description: 'Student profile registered',
        time: 'recently',
        status: 'completed'
      });
    }

    // Create Upcoming Deadlines from active scholarships
    const upcomingDeadlines: Deadline[] = typedScholarships.map((sch, index) => {
      const deadlineDate = new Date(sch.deadline);
      const today = new Date();
      const diffTime = deadlineDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        id: sch.id || index + 100,
        title: sch.title,
        deadline: sch.deadline,
        daysLeft: diffDays > 0 ? diffDays : 0
      };
    });

    // Prepare Student Info (fallback to mock if not found)
    const studentData: StudentInfo = studentInfo ? {
      regno: studentInfo.regno,
      name: studentInfo.name || 'Student',
      level: studentInfo.level || 'Undergraduate',
      cgpa: studentInfo.cgpa || 3.5,
      department: studentInfo.department || 'Not specified',
      current_semester: studentInfo.current_semester,
      profile_picture: studentInfo.profile_picture,
      email: studentInfo.email
    } : {
      regno: student_regno,
      name: 'Student',
      level: 'Undergraduate',
      cgpa: 3.5,
      department: 'Computer Science'
    };

    // Final Dashboard Data
    const dashboardData = {
      studentInfo: {
        name: studentData.name,
        regno: studentData.regno,
        level: studentData.level,
        cgpa: studentData.cgpa,
        department: studentData.department,
        semester: studentData.current_semester || 1
      },
      stats: {
        applications: stats.applications,
        approved: stats.approved,
        pending: stats.pending,
        rejected: stats.rejected
        // under_review not shown in dashboard stats
      },
      recentActivities: recentActivities,
      upcomingDeadlines: upcomingDeadlines
    };

    return NextResponse.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('❌ Dashboard API Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to load dashboard data'
      }, 
      { status: 500 }
    );
  }
}