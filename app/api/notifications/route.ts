import { supabase } from '@/lib/supabaseClient';
import { NextRequest, NextResponse } from 'next/server';



// GET: Fetch notifications for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const userType = searchParams.get('userType');
    const limit = parseInt(searchParams.get('limit') || '50');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    if (!userId || !userType) {
      return NextResponse.json(
        { error: 'userId and userType are required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('user_type', userType)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json(
        { error: 'Failed to fetch notifications' },
        { status: 500 }
      );
    }

    // Get unread count
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('user_type', userType)
      .eq('is_read', false);

    return NextResponse.json({
      success: true,
      notifications: data || [],
      unreadCount: unreadCount || 0
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Create a new notification
export async function POST(request: NextRequest) {
  try {
    const { 
      userId, 
      userType, 
      type, 
      title, 
      message, 
      data = {} 
    } = await request.json();

    if (!userId || !userType || !type || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Handle "all-admins" special case
    if (userId === 'all-admins') {
      // Get all admin users (you'll need an admins table)
      const { data: admins } = await supabase
        .from('admins')
        .select('id');

      if (admins && admins.length > 0) {
        const notifications = admins.map(admin => ({
          user_id: admin.id,
          user_type: 'admin',
          type,
          title,
          message,
          data
        }));

        const { error } = await supabase
          .from('notifications')
          .insert(notifications);

        if (error) throw error;
      }
    } else {
      // Single user notification
      const { error } = await supabase
        .from('notifications')
        .insert([{
          user_id: userId,
          user_type: userType,
          type,
          title,
          message,
          data
        }]);

      if (error) throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Notification created successfully'
    });

  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}