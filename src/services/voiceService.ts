type AndroidBridge = {
  isNativeApp?: () => boolean;
  isTtsReady?: () => boolean;
  speak?: (text: string) => void;
  stopSpeaking?: () => void;
};

function getAndroidBridge(): AndroidBridge | null {
  const bridge = (window as unknown as { AndroidRota123?: AndroidBridge }).AndroidRota123;
  if (bridge && typeof bridge.isNativeApp === 'function' && bridge.isNativeApp()) {
    return bridge;
  }
  return null;
}

let voicesLoaded = false;
let cachedVoice: SpeechSynthesisVoice | null = null;

function loadVoices(): void {
  if (voicesLoaded) return;
  const voices = window.speechSynthesis?.getVoices() ?? [];
  if (voices.length === 0) return;
  voicesLoaded = true;

  const ptVoices = voices.filter((v) => v.lang.startsWith('pt'));
  if (ptVoices.length === 0) {
    cachedVoice = voices[0] ?? null;
    return;
  }

  const femaleNames = ['Luciana', 'Maria', 'Vitória', 'Vitoria', 'Helena', 'Felipe', 'pt-BR'];
  cachedVoice = ptVoices.find((v) => femaleNames.some((n) => v.name.includes(n))) ?? ptVoices[0];
}

if (typeof window !== 'undefined' && window.speechSynthesis) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

function speakNative(text: string): boolean {
  const bridge = getAndroidBridge();
  if (!bridge || typeof bridge.speak !== 'function') return false;
  bridge.speak(text);
  return true;
}

export function speakCompletion(totalOrders: number, minutes: number): void {
  const text = `Você levou ${minutes} minutos para ler ${totalOrders} pedidos.`;

  if (speakNative(text)) return;

  if (!window.speechSynthesis) return;
  loadVoices();

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'pt-BR';
  if (cachedVoice) utterance.voice = cachedVoice;
  utterance.rate = 0.85;
  utterance.pitch = 1.15;
  utterance.volume = 0.7;

  window.speechSynthesis.speak(utterance);
}

export function speakSequence(sequence: string, isMultiOrder: boolean): void {
  let text = sequence;
  if (isMultiOrder) {
    text = `${sequence}+`;
  }

  if (speakNative(text)) return;

  if (!window.speechSynthesis) return;
  loadVoices();

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'pt-BR';
  if (cachedVoice) utterance.voice = cachedVoice;
  utterance.rate = 0.85;
  utterance.pitch = 1.15;
  utterance.volume = 0.7;

  window.speechSynthesis.speak(utterance);
}
