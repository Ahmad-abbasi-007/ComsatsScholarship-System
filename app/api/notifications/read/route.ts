import { supabase } from '@/lib/supabaseClient';
import { NextRequest, NextResponse } from 'next/server';



// PUT: Mark notifications as read
export async function PUT(request: NextRequest) {
  try {
    const { notificationIds, userId, userType, markAll } = await request.json();

    // Case 1: Mark specific notifications as read
    if (notificationIds && Array.isArray(notificationIds) && notificationIds.length > 0) {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', notificationIds);

      if (error) {
        console.error('Error marking notifications as read:', error);
        return NextResponse.json(
          { error: 'Failed to mark notifications as read' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `${notificationIds.length} notifications marked as read`
      });
    }

    // Case 2: Mark all as read for a user
    if (markAll && userId && userType) {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('user_type', userType)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all as read:', error);
        return NextResponse.json(
          { error: 'Failed to mark all as read' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read'
      });
    }

    return NextResponse.json(
      { error: 'Invalid request. Provide notificationIds or markAll with userId and userType' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}