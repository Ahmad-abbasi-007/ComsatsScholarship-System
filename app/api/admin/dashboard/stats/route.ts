import { supabase } from '@/lib/supabaseClient';
import { NextResponse } from 'next/server';



export async function GET() {
  try {
// 1. TOTAL STUDENTS - from students table (not profiles)
const { count: totalStudents } = await supabase
  .from('students')  // ← Changed from 'profiles' to 'students'
  .select('*', { count: 'exact', head: true });

    // 2. SCHOLARSHIPS STATS
    const { count: totalScholarships } = await supabase
      .from('scholarships')
      .select('*', { count: 'exact', head: true });

    const { count: activeScholarships } = await supabase
      .from('scholarships')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // 3. APPLICATIONS STATS
    const { count: totalApplications } = await supabase
      .from('scholarship_applications')
      .select('*', { count: 'exact', head: true });

    const { count: pendingApplications } = await supabase
      .from('scholarship_applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    const { count: approvedApplications } = await supabase
      .from('scholarship_applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved');

    const { count: rejectedApplications } = await supabase
      .from('scholarship_applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'rejected');

    // 4. SELECTED STUDENTS from merit lists
    const { count: selectedStudents } = await supabase
      .from('merit_lists')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'selected');

    // 5. MONTHLY APPLICATIONS (last 6 months)
    const months = [];
    const monthlyData = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthName = date.toLocaleString('default', { month: 'short' });
      months.push(monthName);
      
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      // Total applications in this month
      const { count: total } = await supabase
        .from('scholarship_applications')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString());
      
      // Approved applications in this month
      const { count: approved } = await supabase
        .from('scholarship_applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved')
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString());
      
      monthlyData.push({
        month: monthName,
        applications: total || 0,
        approved: approved || 0
      });
    }

// 6. SCHOLARSHIP DISTRIBUTION - Show actual scholarship names
const { data: scholarshipApps } = await supabase
  .from('scholarship_applications')
  .select('scholarship_id');

// Count applications per scholarship
const appCounts: Record<string, number> = {};
scholarshipApps?.forEach(app => {
  const id = app.scholarship_id;
  appCounts[id] = (appCounts[id] || 0) + 1;
});

// Get top 5 scholarships by application count
const topScholarshipIds = Object.entries(appCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5)
  .map(([id]) => id);

// Fetch scholarship details
const scholarshipDistribution = [];
const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

for (let i = 0; i < topScholarshipIds.length; i++) {
  const id = topScholarshipIds[i];
  const { data } = await supabase
    .from('scholarships')
    .select('title')
    .eq('id', id)
    .single();
  
  if (data) {
    scholarshipDistribution.push({
      name: data.title.length > 15 ? data.title.substring(0, 15) + '...' : data.title,
      value: appCounts[id],
      color: colors[i % colors.length]
    });
  }
}

// If no data, show default
if (scholarshipDistribution.length === 0) {
  scholarshipDistribution.push({
    name: 'No Applications',
    value: 1,
    color: '#94A3B8'
  });
}
    // 7. RECENT APPLICATIONS
    const { data: recentApps } = await supabase
      .from('scholarship_applications')
      .select(`
        id,
        student_regno,
        status,
        created_at,
        scholarships (title)
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    return NextResponse.json({
      success: true,
      stats: {
        totalStudents: totalStudents || 0,
        totalScholarships: totalScholarships || 0,
        activeScholarships: activeScholarships || 0,
        totalApplications: totalApplications || 0,
        pendingApplications: pendingApplications || 0,
        approvedApplications: approvedApplications || 0,
        rejectedApplications: rejectedApplications || 0,
        selectedStudents: selectedStudents || 0
      },
      monthlyApplications: monthlyData,
      scholarshipDistribution,
      recentApplications: recentApps || []
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}