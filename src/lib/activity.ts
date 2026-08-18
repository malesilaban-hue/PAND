import { supabase } from '@/lib/supabase';

export async function logActivity(
  userId: string,
  action: string,
  entityType?: string,
  entityId?: string,
  entityName?: string,
  projectId?: string,
  clientId?: string,
) {
  try {
    await supabase.from('activities').insert({
      user_id: userId,
      action,
      entity_type: entityType ?? null,
      entity_id: entityId ?? null,
      entity_name: entityName ?? null,
      project_id: projectId ?? null,
      client_id: clientId ?? null,
    });
  } catch {
    // Activity logging is best-effort; don't block the UI
  }
}
