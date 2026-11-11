import { supabase } from '../lib/supabase';
import { getInstallationId } from './installationService';
import type { RawRow, DeliveryGroup, CheckState } from '../types';

export interface ActiveSession {
  id: string;
  fileName: string;
  rows: RawRow[];
  groups: DeliveryGroup[];
  headers: string[];
  checkState: CheckState;
  totalOrders: number;
  checkedCount: number;
  completed: boolean;
}

export async function getActiveSession(): Promise<ActiveSession | null> {
  const installationId = getInstallationId();

  const { data, error } = await supabase
    .from('active_sessions')
    .select('*')
    .eq('user_id', installationId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    fileName: data.file_name,
    rows: data.rows_data as RawRow[],
    groups: data.groups_data as DeliveryGroup[],
    headers: data.headers_data as string[],
    checkState: data.check_state_data as CheckState,
    totalOrders: data.total_orders,
    checkedCount: data.checked_count,
    completed: data.completed,
  };
}

export async function saveActiveSession(
  historyId: string,
  fileName: string,
  rows: RawRow[],
  groups: DeliveryGroup[],
  headers: string[],
  checkState: CheckState
): Promise<void> {
  const installationId = getInstallationId();
  const checkedCount = Object.values(checkState.checked).filter(Boolean).length;

  const { error } = await supabase
    .from('active_sessions')
    .upsert(
      {
        id: historyId,
        user_id: installationId,
        file_name: fileName,
        rows_data: rows,
        groups_data: groups,
        headers_data: headers,
        check_state_data: checkState,
        total_orders: rows.length,
        checked_count: checkedCount,
        completed: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

  if (error) {
    console.error('Failed to save active session:', error.message, error.details, error.hint);
  }
}

export async function clearActiveSession(): Promise<void> {
  const installationId = getInstallationId();

  const { error } = await supabase
    .from('active_sessions')
    .delete()
    .eq('user_id', installationId);

  if (error) {
    console.error('Failed to clear active session:', error.message);
  }
}
