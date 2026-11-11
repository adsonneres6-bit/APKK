let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.3,
): void {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

export function playSuccess(): void {
  playTone(880, 0.15, 'sine', 0.3);
  setTimeout(() => playTone(1320, 0.2, 'sine', 0.3), 100);
}

export function playError(): void {
  playTone(220, 0.3, 'square', 0.2);
  setTimeout(() => playTone(180, 0.3, 'square', 0.2), 150);
}

export function playWarning(): void {
  playTone(440, 0.15, 'triangle', 0.25);
  setTimeout(() => playTone(440, 0.15, 'triangle', 0.25), 200);
}
