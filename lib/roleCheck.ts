// lib/roleCheck.ts

type UserRole = 'super_admin' | 'reviewer' | null;

export const hasAccess = (pathname: string, role: string): boolean => {
  // Super Admin has access to everything
  if (role === 'super_admin') return true;

  // Pages only Super Admin can access
  const superAdminOnly = [
    '/admin/admins',
    '/admin/admins/create',
    '/admin/settings',
    '/admin/budget/approvals',
    '/admin/budget/overview',
    '/admin/budget/reports',
  ];

  // Check if current path is super admin only
  if (superAdminOnly.some(path => pathname.startsWith(path))) {
    return role === 'super_admin';
  }

  // Pages Reviewer can access
  if (role === 'reviewer') {
    const reviewerAllowed = [
      '/admin/dashboard',
      '/admin/students',
      '/admin/students/reports',
      '/admin/scholarships',
      '/admin/scholarships/statistics',
      '/admin/scholarships/archive',
      '/admin/applications',
      '/admin/merit/lists',
      '/admin/merit/reports',
      '/admin/reports',
      '/admin/disputes',
      '/admin/help/faqs',
      '/admin/help/guidelines',
      '/admin/help/policies',
      '/admin/notifications',  // ✅ Added notifications for reviewer
    ];
    return reviewerAllowed.some(path => pathname.startsWith(path));
  }

  // Viewer role removed - no access
  return false;
};