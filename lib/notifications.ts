import { supabase } from '@/lib/supabaseClient';



interface CreateNotificationParams {
  userId: string;
  userType: 'student' | 'admin';
  type: string;
  title: string;
  message: string;
  data?: any;
}

export async function createNotification({
  userId,
  userType,
  type,
  title,
  message,
  data = {}
}: CreateNotificationParams) {
  try {
    console.log('🔔 [NOTIFICATION] ===== START =====');
    console.log('🔔 [NOTIFICATION] Input:', { userId, userType, type, title });
    
    // ✅ NEW: Handle "all-admins" - send to ALL Super Admins AND Reviewers
    if (userId === 'all-admins') {
      console.log('🔔 [NOTIFICATION] Sending to ALL Super Admins and Reviewers');
      
      // Fetch ALL Super Admins and Reviewers
      const { data: admins, error: fetchError } = await supabase
        .from('admins')
        .select('id')
        .in('role', ['super_admin', 'reviewer']);

      if (fetchError) {
        console.error('❌ [NOTIFICATION] Error fetching admins:', fetchError);
        return { success: false, error: fetchError };
      }

      if (!admins || admins.length === 0) {
        console.warn('⚠️ [NOTIFICATION] No admins found to notify');
        return { success: false, error: 'No admins found' };
      }

      console.log(`📋 [NOTIFICATION] Found ${admins.length} admins to notify`);

      // Create notifications for ALL admins
      const notifications = admins.map(admin => ({
        user_id: admin.id,
        user_type: 'admin',
        type,
        title,
        message,
        data,
        is_read: false,
        created_at: new Date().toISOString()
      }));

      const { data: insertedData, error: insertError } = await supabase
        .from('notifications')
        .insert(notifications)
        .select();

      if (insertError) {
        console.error('❌ [NOTIFICATION] Insert error:', insertError);
        return { success: false, error: insertError };
      }
      
      console.log(`✅ [NOTIFICATION] ${insertedData?.length || 0} admin notifications created`);
      console.log('🔔 [NOTIFICATION] ===== END =====');
      return { success: true, data: insertedData };
    }
    
    // Handle student notification
    console.log('🔔 [NOTIFICATION] Creating notification for student:', userId);
    
    const { data: insertedData, error } = await supabase
      .from('notifications')
      .insert([{
        user_id: userId,
        user_type: userType,
        type,
        title,
        message,
        data,
        is_read: false,
        created_at: new Date().toISOString()
      }])
      .select();

    if (error) {
      console.error('❌ [NOTIFICATION] Insert error:', error);
      return { success: false, error };
    }
    
    console.log('✅ [NOTIFICATION] Notification created:', insertedData);
    console.log('🔔 [NOTIFICATION] ===== END =====');
    return { success: true, data: insertedData };
    
  } catch (error) {
    console.error('❌ [NOTIFICATION] Fatal error:', error);
    return { success: false, error };
  }
}

export async function markAsRead(notificationIds: string[]) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', notificationIds);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error marking as read:', error);
    return { success: false, error };
  }
}

export async function markAllAsRead(userId: string, userType: string) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('user_type', userType)
      .eq('is_read', false);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error marking all as read:', error);
    return { success: false, error };
  }
}

export async function getUnreadCount(userId: string, userType: string) {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('user_type', userType)
      .eq('is_read', false);

    if (error) throw error;
    return { count: count || 0 };
  } catch (error) {
    console.error('Error getting unread count:', error);
    return { count: 0 };
  }
}