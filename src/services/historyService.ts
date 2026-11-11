import { supabase } from '../lib/supabase';
import { getInstallationId } from './installationService';
import type { RawRow, DeliveryGroup, CheckState } from '../types';

export interface HistoryEntry {
  id: string;
  fileName: string;
  date: string;
  totalOrders: number;
  totalGroups: number;
  checkedOrders: number;
  importTime: string;
  exportTime: string | null;
  rows: RawRow[];
  groups: DeliveryGroup[];
  headers: string[];
  checkState: CheckState;
  importType?: string;
}

export interface FrotaHistoryEntry {
  id: string;
  fileName: string;
  totalRows: number;
  outputRows: number;
  duplicatesRemoved: number;
  headers: string[];
  rows: RawRow[];
  importTime: string;
}

function mapHistoryEntry(d: Record<string, unknown>): HistoryEntry {
  const importTime = d.import_time as string;
  const date = importTime ? new Date(importTime).toLocaleDateString('pt-BR') : '';
  return {
    id: d.id as string,
    fileName: d.file_name as string,
    date,
    totalOrders: d.total_orders as number,
    totalGroups: d.total_groups as number,
    checkedOrders: d.checked_groups as number,
    importTime: importTime ? new Date(importTime).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
    exportTime: d.export_time as string | null,
    rows: d.rows_data as RawRow[],
    groups: d.groups_data as DeliveryGroup[],
    headers: d.headers_data as string[],
    checkState: d.check_state_data as CheckState,
    importType: d.import_type as string | undefined,
  };
}

export async function getHistory(): Promise<HistoryEntry[]> {
  const installationId = getInstallationId();
  const { data, error } = await supabase
    .from('import_history')
    .select('*')
    .eq('user_id', installationId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching import history:', error);
    return [];
  }

  return (data || []).map(mapHistoryEntry);
}

export async function getFrotaImportHistory(): Promise<FrotaHistoryEntry[]> {
  const installationId = getInstallationId();
  const { data, error } = await supabase
    .from('import_history')
    .select('*')
    .eq('user_id', installationId)
    .eq('import_type', 'frota')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching frota import history:', error);
    return [];
  }

  return (data || []).map((d: Record<string, unknown>) => ({
    id: d.id as string,
    fileName: d.file_name as string,
    totalRows: d.total_orders as number,
    outputRows: d.total_groups as number,
    duplicatesRemoved: d.checked_groups as number,
    headers: d.headers_data as string[],
    rows: d.rows_data as RawRow[],
    importTime: d.import_time as string,
  }));
}

export async function addImportEntry(
  rows: RawRow[],
  groups: DeliveryGroup[],
  headers: string[],
  fileName: string,
  checkState: CheckState
): Promise<HistoryEntry | null> {
  const installationId = getInstallationId();
  const totalOrders = rows.length;
  const totalGroups = groups.length;
  const checkedGroups = Object.values(checkState.checked).filter(Boolean).length;

  const { data, error } = await supabase
    .from('import_history')
    .insert({
      user_id: installationId,
      file_name: fileName,
      total_orders: totalOrders,
      total_groups: totalGroups,
      checked_groups: checkedGroups,
      rows_data: rows,
      groups_data: groups,
      headers_data: headers,
      check_state_data: checkState,
      import_type: 'flex',
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding import entry:', error);
    return null;
  }

  return mapHistoryEntry(data);
}

export async function addFrotaImportEntry(
  fileName: string,
  totalRows: number,
  outputRows: number,
  duplicatesRemoved: number,
  headers: string[],
  rows: RawRow[]
): Promise<FrotaHistoryEntry | null> {
  const installationId = getInstallationId();
  const { data, error } = await supabase
    .from('import_history')
    .insert({
      user_id: installationId,
      file_name: fileName,
      total_orders: totalRows,
      total_groups: outputRows,
      checked_groups: duplicatesRemoved,
      headers_data: headers,
      rows_data: rows,
      import_type: 'frota',
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding frota import entry:', error);
    return null;
  }

  return {
    id: data.id,
    fileName: data.file_name,
    totalRows: data.total_orders,
    outputRows: data.total_groups,
    duplicatesRemoved: data.checked_groups,
    headers: data.headers_data,
    rows: data.rows_data,
    importTime: data.import_time,
  };
}

export async function updateExportEntry(
  id: string,
  groups: DeliveryGroup[],
  checkState: CheckState
): Promise<void> {
  const checkedGroups = Object.values(checkState.checked).filter(Boolean).length;

  const { error } = await supabase
    .from('import_history')
    .update({
      export_time: new Date().toISOString(),
      groups_data: groups,
      check_state_data: checkState,
      checked_groups: checkedGroups,
    })
    .eq('id', id);

  if (error) {
    console.error('Error updating export entry:', error);
  }
}

export async function updateHistoryProgress(
  id: string,
  groups: DeliveryGroup[],
  checkState: CheckState
): Promise<void> {
  const checkedGroups = Object.values(checkState.checked).filter(Boolean).length;

  const { error } = await supabase
    .from('import_history')
    .update({
      groups_data: groups,
      check_state_data: checkState,
      checked_groups: checkedGroups,
    })
    .eq('id', id);

  if (error) {
    console.error('Error updating history progress:', error);
  }
}

export async function deleteImportEntry(id: string): Promise<void> {
  const { error } = await supabase.from('import_history').delete().eq('id', id);
  if (error) {
    console.error('Error deleting import entry:', error);
  }
}

export async function deleteHistoryEntry(id: string): Promise<void> {
  await deleteImportEntry(id);
}

export function reexportXlsx(entry: HistoryEntry): void {
  import('xlsx').then((XLSX) => {
    const sheetData = [entry.headers, ...entry.rows.map((row) => [
      row.colA,
      row.sequence,
      row.colC,
      row.spxTn,
      row.destinationAddress,
      row.colF,
      row.colG,
      row.colH,
      row.colI,
      row.colJ,
      ...row.extra,
    ])];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Entregas');
    const baseName = entry.fileName.replace(/\.[^.]+$/, '');
    XLSX.writeFile(wb, `${baseName}.xlsx`);
  }).catch((err) => {
    console.error('Failed to re-export XLSX:', err);
  });
}

export async function findByFileName(fileName: string): Promise<HistoryEntry | null> {
  const installationId = getInstallationId();
  const { data, error } = await supabase
    .from('import_history')
    .select('*')
    .eq('user_id', installationId)
    .eq('file_name', fileName)
    .maybeSingle();

  if (error || !data) return null;
  return mapHistoryEntry(data);
}

export async function clearImportHistory(): Promise<{ success: boolean; error?: string }> {
  const installationId = getInstallationId();
  const { error } = await supabase
    .from('import_history')
    .delete()
    .eq('user_id', installationId);

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}
