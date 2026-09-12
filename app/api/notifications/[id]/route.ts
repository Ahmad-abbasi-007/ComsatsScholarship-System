import { supabase } from '@/lib/supabaseClient';
import { NextRequest, NextResponse } from 'next/server';



// DELETE: Delete a specific notification
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Notification ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting notification:', error);
      return NextResponse.json(
        { error: 'Failed to delete notification' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}