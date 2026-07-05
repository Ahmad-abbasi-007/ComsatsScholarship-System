// lib/audit.ts
import { supabase } from './supabaseClient'

interface AuditLogData {
  adminId: string
  adminName: string
  adminEmail: string
  adminRole: string
  action: string
  entityType: string
  entityId?: number
  entityName?: string
  oldData?: any
  newData?: any
  changes?: string
//   ipAddress?: string
  userAgent?: string
  status?: 'success' | 'failed' | 'pending'
  errorMessage?: string
}

export async function createAuditLog(data: AuditLogData) {
  try {
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        admin_id: data.adminId,
        admin_name: data.adminName,
        admin_email: data.adminEmail,
        admin_role: data.adminRole,
        action: data.action,
        entity_type: data.entityType,
        entity_id: data.entityId || null,
        entity_name: data.entityName || null,
        old_data: data.oldData || null,
        new_data: data.newData || null,
        changes: data.changes || null,
        // ip_address: data.ipAddress || '0.0.0.0',
        user_agent: data.userAgent || 'Unknown',
        status: data.status || 'success',
        error_message: data.errorMessage || null,
        created_at: new Date().toISOString()
      })

    if (error) {
      console.error('Error creating audit log:', error)
    }
  } catch (error) {
    console.error('Error creating audit log:', error)
    // Don't throw - we don't want audit logging to break the main flow
  }
}

// Helper function to generate human-readable changes
export function generateChanges(oldData: any, newData: any): string {
  if (!oldData || !newData) return ''
  
  const changes: string[] = []
  const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)])
  
  for (const key of allKeys) {
    const oldValue = oldData[key]
    const newValue = newData[key]
    
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push(`${key}: "${oldValue}" → "${newValue}"`)
    }
  }
  
  return changes.join(', ') || 'No changes'
}