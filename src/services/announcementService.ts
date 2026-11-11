import { supabase } from '../lib/supabase';
import { getInstallationId } from './installationService';

export type DisplayLocation = 'after_login' | 'login';

export interface GlobalAnnouncement {
  id: string;
  title: string;
  message: string;
  isActive: boolean;
  displayLocation: DisplayLocation;
  showOncePerUser: boolean;
  requireConfirmation: boolean;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnnouncementConfirmation {
  id: string;
  userId: string;
  announcementId: string;
  confirmedAt: string;
}

const DISMISSED_ANNOUNCEMENTS_KEY = 'romaneio_dismissed_announcements';

/**
 * Get dismissed announcement IDs from localStorage (for pre-login)
 */
function getDismissedAnnouncementIds(): Set<string> {
  try {
    const stored = localStorage.getItem(DISMISSED_ANNOUNCEMENTS_KEY);
    if (stored) {
      return new Set(JSON.parse(stored));
    }
  } catch {
    // Ignore errors
  }
  return new Set();
}

/**
 * Add a dismissed announcement ID to localStorage
 */
export function dismissAnnouncementLocally(announcementId: string): void {
  try {
    const dismissed = getDismissedAnnouncementIds();
    dismissed.add(announcementId);
    localStorage.setItem(DISMISSED_ANNOUNCEMENTS_KEY, JSON.stringify([...dismissed]));
  } catch {
    // Ignore errors
  }
}

/**
 * Get all announcements (admin only)
 */
export async function getAllAnnouncements(): Promise<GlobalAnnouncement[]> {
  const { data, error } = await supabase
    .from('global_announcements')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching announcements:', error);
    return [];
  }

  return (data || []).map(mapAnnouncement);
}

/**
 * Get active announcements for a specific location (public for login, authenticated for after_login)
 */
export async function getActiveAnnouncements(
  location: DisplayLocation,
  _userId?: string
): Promise<GlobalAnnouncement[]> {
  const now = new Date().toISOString();
  const installationId = getInstallationId();

  let query = supabase
    .from('global_announcements')
    .select('*')
    .eq('is_active', true)
    .eq('display_location', location)
    .or(`start_date.is.null,start_date.lte.${now}`)
    .or(`end_date.is.null,end_date.gte.${now}`);

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching active announcements:', error);
    return [];
  }

  const announcements = (data || []).map(mapAnnouncement);

  if (announcements.length > 0) {
    const { data: confirmations } = await supabase
      .from('announcement_confirmations')
      .select('announcement_id')
      .eq('user_id', installationId);

    const confirmedIds = new Set((confirmations || []).map(c => c.announcement_id));

    return announcements.filter(a => {
      if (a.showOncePerUser && confirmedIds.has(a.id)) {
        return false;
      }
      return true;
    });
  }

  return announcements;
}

/**
 * Create a new announcement (admin only)
 */
export async function createAnnouncement(
  announcement: Omit<GlobalAnnouncement, 'id' | 'createdAt' | 'updatedAt'>
): Promise<GlobalAnnouncement | null> {
  const { data, error } = await supabase
    .from('global_announcements')
    .insert({
      title: announcement.title,
      message: announcement.message,
      is_active: announcement.isActive,
      display_location: announcement.displayLocation,
      show_once_per_user: announcement.showOncePerUser,
      require_confirmation: announcement.requireConfirmation,
      start_date: announcement.startDate,
      end_date: announcement.endDate,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating announcement:', error);
    return null;
  }

  return data ? mapAnnouncement(data) : null;
}

/**
 * Update an existing announcement (admin only)
 */
export async function updateAnnouncement(
  id: string,
  updates: Partial<Omit<GlobalAnnouncement, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<boolean> {
  const updateData: Record<string, unknown> = {};

  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.message !== undefined) updateData.message = updates.message;
  if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
  if (updates.displayLocation !== undefined) updateData.display_location = updates.displayLocation;
  if (updates.showOncePerUser !== undefined) updateData.show_once_per_user = updates.showOncePerUser;
  if (updates.requireConfirmation !== undefined) updateData.require_confirmation = updates.requireConfirmation;
  if (updates.startDate !== undefined) updateData.start_date = updates.startDate;
  if (updates.endDate !== undefined) updateData.end_date = updates.endDate;

  const { error } = await supabase
    .from('global_announcements')
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error('Error updating announcement:', error);
    return false;
  }

  return true;
}

/**
 * Delete an announcement (admin only)
 */
export async function deleteAnnouncement(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('global_announcements')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting announcement:', error);
    return false;
  }

  return true;
}

/**
 * Confirm that a user has read an announcement
 */
export async function confirmAnnouncement(_userId: string, announcementId: string): Promise<boolean> {
  const installationId = getInstallationId();
  const { error } = await supabase
    .from('announcement_confirmations')
    .insert({
      user_id: installationId,
      announcement_id: announcementId,
    });

  if (error) {
    if (error.code === '23505') return true;
    console.error('Error confirming announcement:', error);
    return false;
  }

  return true;
}

/**
 * Check if a user has confirmed a specific announcement
 */
export async function hasUserConfirmedAnnouncement(
  _userId: string,
  announcementId: string
): Promise<boolean> {
  const installationId = getInstallationId();
  const { data, error } = await supabase
    .from('announcement_confirmations')
    .select('id')
    .eq('user_id', installationId)
    .eq('announcement_id', announcementId)
    .maybeSingle();

  if (error) {
    console.error('Error checking announcement confirmation:', error);
    return false;
  }

  return !!data;
}

/**
 * Get all confirmations for an announcement (admin only)
 */
export async function getAnnouncementConfirmations(
  announcementId: string
): Promise<AnnouncementConfirmation[]> {
  const { data, error } = await supabase
    .from('announcement_confirmations')
    .select('*')
    .eq('announcement_id', announcementId);

  if (error) {
    console.error('Error fetching confirmations:', error);
    return [];
  }

  return (data || []).map(c => ({
    id: c.id,
    userId: c.user_id,
    announcementId: c.announcement_id,
    confirmedAt: c.confirmed_at,
  }));
}

// Helper to map database record to interface
function mapAnnouncement(data: Record<string, unknown>): GlobalAnnouncement {
  return {
    id: data.id as string,
    title: data.title as string,
    message: data.message as string,
    isActive: data.is_active as boolean,
    displayLocation: data.display_location as DisplayLocation,
    showOncePerUser: data.show_once_per_user as boolean,
    requireConfirmation: data.require_confirmation as boolean,
    startDate: data.start_date as string | null,
    endDate: data.end_date as string | null,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}
