import { supabase } from '../lib/supabase';
import { getInstallationId } from './installationService';

export type TutorialType = 'flex' | 'interface' | 'frota';

export async function completeTutorial(
  _userId: string,
  tutorialType: TutorialType
): Promise<boolean> {
  const installationId = getInstallationId();
  const { error } = await supabase
    .from('user_tutorial_completions')
    .upsert(
      {
        user_id: installationId,
        tutorial_type: tutorialType,
        completed: true,
        completed_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,tutorial_type' }
    );

  if (error) {
    console.error('Error completing tutorial:', error);
    return false;
  }
  return true;
}

export async function hasCompletedTutorial(
  _userId: string,
  tutorialType: TutorialType
): Promise<boolean> {
  const installationId = getInstallationId();
  const { data, error } = await supabase
    .from('user_tutorial_completions')
    .select('id')
    .eq('user_id', installationId)
    .eq('tutorial_type', tutorialType)
    .maybeSingle();

  if (error) {
    console.error('Error checking tutorial completion:', error);
    return false;
  }

  return !!data;
}

export async function getCompletedTutorials(_userId: string): Promise<TutorialType[]> {
  const installationId = getInstallationId();
  const { data, error } = await supabase
    .from('user_tutorial_completions')
    .select('tutorial_type')
    .eq('user_id', installationId);

  if (error || !data) return [];
  return data.map((d) => d.tutorial_type as TutorialType);
}

export async function hasCompletedFlexTutorial(userId: string): Promise<boolean> {
  return hasCompletedTutorial(userId, 'flex');
}
