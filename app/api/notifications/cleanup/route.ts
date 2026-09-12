import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// DELETE: Clean up old notifications
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const daysOld = parseInt(searchParams.get('days') || '30');
    const userId = searchParams.get('userId');
    const userType = searchParams.get('userType');

    let query = supabase
      .from('notifications')
      .delete()
      .lt('created_at', new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString());

    // If userId provided, only delete for that user
    if (userId && userType) {
      query = query
        .eq('user_id', userId)
        .eq('user_type', userType);
    }

    const { error, count } = await query;

    if (error) {
      console.error('Error cleaning up notifications:', error);
      return NextResponse.json(
        { error: 'Failed to clean up notifications' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Notifications older than ${daysOld} days deleted`,
      count
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}