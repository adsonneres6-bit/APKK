const WELCOME_KEY = 'circuit_welcome_modal_shown';
const INFO_KEY = 'circuit_info_modal_shown';

export async function hasSeenWelcomeModal(_userId?: string): Promise<boolean> {
  try {
    return localStorage.getItem(WELCOME_KEY) === 'true';
  } catch {
    return false;
  }
}

export async function markWelcomeModalSeen(_userId?: string): Promise<boolean> {
  try {
    localStorage.setItem(WELCOME_KEY, 'true');
  } catch {
    // Ignore
  }
  return true;
}

export async function hasSeenInfoModal(_userId?: string): Promise<boolean> {
  try {
    return localStorage.getItem(INFO_KEY) === 'true';
  } catch {
    return false;
  }
}

export async function markInfoModalSeen(_userId?: string): Promise<boolean> {
  try {
    localStorage.setItem(INFO_KEY, 'true');
  } catch {
    // Ignore
  }
  return true;
}
