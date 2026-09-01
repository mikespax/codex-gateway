const COMPLETION_SOUND_PREFERENCE_KEY = "codex-gateway.desktop-completion-sound";
const MAX_PLAYED_NOTIFICATION_KEYS = 128;

let audioContext: AudioContext | null = null;
let unlockListenersInstalled = false;
const playedNotificationKeys = new Set<string>();

function isBrowser() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function getAudioContext() {
  if (!isBrowser() || typeof window.AudioContext !== "function") return null;
  if (audioContext !== null) return audioContext;

  try {
    audioContext = new window.AudioContext();
  } catch {
    return null;
  }
  return audioContext;
}

export function isTurnCompletionSoundEnabled() {
  if (!isBrowser()) return true;
  try {
    return window.localStorage.getItem(COMPLETION_SOUND_PREFERENCE_KEY) !== "0";
  } catch {
    return true;
  }
}

export function setTurnCompletionSoundEnabled(enabled: boolean) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(COMPLETION_SOUND_PREFERENCE_KEY, enabled ? "1" : "0");
  } catch {
    // A locked-down browser may deny local storage. The in-memory default remains enabled.
  }
}

/**
 * Prime the Web Audio context from a user gesture. Browsers reject audio started without a
 * gesture, so the listener is installed once when the desktop app boots and resumed on the first
 * click or key press.
 */
export function installTurnCompletionSoundUnlock() {
  if (!isBrowser() || unlockListenersInstalled) return;
  unlockListenersInstalled = true;

  const unlock = () => {
    void unlockTurnCompletionSound();
  };
  window.addEventListener("pointerdown", unlock, { capture: true, passive: true });
  window.addEventListener("keydown", unlock, { capture: true, passive: true });
}

export async function unlockTurnCompletionSound() {
  const context = getAudioContext();
  if (context === null) return false;
  if (context.state === "running") return true;

  try {
    await context.resume();
    return true;
  } catch {
    return false;
  }
}

/** Plays a short, quiet two-note chime and returns whether it was scheduled. */
export function playTurnCompletionSound(notificationKey: string) {
  if (
    !isBrowser() ||
    !isTurnCompletionSoundEnabled() ||
    playedNotificationKeys.has(notificationKey)
  ) {
    return false;
  }

  const context = audioContext;
  if (context === null || context.state !== "running") return false;

  const start = context.currentTime;
  scheduleTone(context, 660, start, 0.14);
  scheduleTone(context, 880, start + 0.12, 0.24);
  playedNotificationKeys.add(notificationKey);
  if (playedNotificationKeys.size > MAX_PLAYED_NOTIFICATION_KEYS) {
    const oldest = playedNotificationKeys.values().next().value;
    if (oldest !== undefined) playedNotificationKeys.delete(oldest);
  }
  return true;
}

export async function testTurnCompletionSound() {
  if (!(await unlockTurnCompletionSound())) return false;
  return playTurnCompletionSound(`settings-test-${Date.now()}`);
}

function scheduleTone(context: AudioContext, frequency: number, start: number, duration: number) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.08, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.01);
}
