import { supabase } from '../lib/supabase';

export interface AppSettings {
  id?: string;
  tutorialUrl: string;
  tutorialInterfaceUrl: string;
  tutorialFlexUrl: string;
  tutorialFrotaUrl: string;
  apkCircuitUrl: string;
}

const DEFAULT_APK_URL = 'https://github.com/adsonneres6-bit/adsonteste_download/releases/latest/download/Circuit.apk';

const DEFAULT_SETTINGS: AppSettings = {
  tutorialUrl: '',
  tutorialInterfaceUrl: '',
  tutorialFlexUrl: '',
  tutorialFrotaUrl: '',
  apkCircuitUrl: DEFAULT_APK_URL,
};

export async function getSettings(): Promise<AppSettings> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('*')
    .maybeSingle();

  if (error || !data) return DEFAULT_SETTINGS;

  return {
    id: data.id,
    tutorialUrl: data.tutorial_url ?? '',
    tutorialInterfaceUrl: data.tutorial_interface_url ?? '',
    tutorialFlexUrl: data.tutorial_flex_url ?? '',
    tutorialFrotaUrl: data.tutorial_frota_url ?? '',
    apkCircuitUrl: data.apk_circuit_url ?? DEFAULT_APK_URL,
  };
}

export async function saveSettings(settings: Partial<AppSettings>): Promise<{ success: boolean; error?: string }> {
  const current = await getSettings();
  const next = { ...current, ...settings };

  const upsertData: Record<string, unknown> = {
    tutorial_url: next.tutorialUrl,
    tutorial_interface_url: next.tutorialInterfaceUrl,
    tutorial_flex_url: next.tutorialFlexUrl,
    tutorial_frota_url: next.tutorialFrotaUrl,
    apk_circuit_url: next.apkCircuitUrl,
  };

  if (current.id) {
    upsertData.id = current.id;
  }

  const { error } = await supabase
    .from('app_settings')
    .upsert(upsertData, { onConflict: 'id' });

  if (error) {
    console.error('Failed to save settings:', error);
    return { success: false, error: error.message };
  }

  window.dispatchEvent(new CustomEvent('settings-changed'));
  return { success: true };
}

export async function getTutorialUrl(): Promise<string> {
  const settings = await getSettings();
  return settings.tutorialUrl;
}

export async function setTutorialUrl(value: string): Promise<void> {
  await saveSettings({ tutorialUrl: value });
}

export async function getTutorialInterfaceUrl(): Promise<string> {
  const settings = await getSettings();
  return settings.tutorialInterfaceUrl;
}

export async function setTutorialInterfaceUrl(value: string): Promise<{ success: boolean; error?: string }> {
  return saveSettings({ tutorialInterfaceUrl: value });
}

export async function getTutorialFlexUrl(): Promise<string> {
  const settings = await getSettings();
  return settings.tutorialFlexUrl;
}

export async function setTutorialFlexUrl(value: string): Promise<{ success: boolean; error?: string }> {
  return saveSettings({ tutorialFlexUrl: value });
}

export async function getTutorialFrotaUrl(): Promise<string> {
  const settings = await getSettings();
  return settings.tutorialFrotaUrl;
}

export async function setTutorialFrotaUrl(value: string): Promise<{ success: boolean; error?: string }> {
  return saveSettings({ tutorialFrotaUrl: value });
}

export async function getApkCircuitUrl(): Promise<string> {
  const settings = await getSettings();
  return settings.apkCircuitUrl;
}

export async function setApkCircuitUrl(value: string): Promise<void> {
  await saveSettings({ apkCircuitUrl: value });
}

export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;

  const trimmed = url.trim();

  const shortsMatch = trimmed.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{6,})/);
  if (shortsMatch) return shortsMatch[1];

  const shortMatch = trimmed.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/);
  if (shortMatch) return shortMatch[1];

  const watchMatch = trimmed.match(/youtube\.com\/watch\?[^\s]*[&?]v=([A-Za-z0-9_-]{6,})/);
  if (watchMatch) return watchMatch[1];

  const embedMatch = trimmed.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/);
  if (embedMatch) return embedMatch[1];

  const liveMatch = trimmed.match(/youtube\.com\/live\/([A-Za-z0-9_-]{6,})/);
  if (liveMatch) return liveMatch[1];

  return null;
}

export function isValidYouTubeUrl(url: string): boolean {
  if (!url) return false;
  const videoId = extractYouTubeVideoId(url);
  if (videoId) return true;
  const trimmed = url.trim();
  return /youtube\.com|youtu\.be/.test(trimmed);
}

export function toEmbedUrl(url: string): string {
  if (!url) return '';
  const videoId = extractYouTubeVideoId(url);
  if (videoId) return `https://www.youtube.com/embed/${videoId}`;
  return url.trim();
}

export function validateYouTubeUrl(url: string): { valid: boolean; videoId?: string; error?: string } {
  if (!url || !url.trim()) {
    return { valid: false, error: 'URL não informada.' };
  }

  const videoId = extractYouTubeVideoId(url);

  if (videoId) {
    return { valid: true, videoId };
  }

  if (/youtube\.com|youtu\.be/.test(url)) {
    return { valid: false, error: 'Formato de URL do YouTube não reconhecido. Use o link completo do vídeo.' };
  }

  return { valid: false, error: 'A URL informada não corresponde a um vídeo válido do YouTube.' };
}
