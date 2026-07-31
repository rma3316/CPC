import { useCallback, useEffect, useRef } from 'react';

const MAX_ACTIVE_OSCILLATORS = 24;
const MIN_FREQUENCY = 35;
const MAX_FREQUENCY = 6000;
const MIN_GAIN = 0.0001;
const VOLUME_RAMP_SECONDS = 0.05;

const EVENT_COOLDOWNS = Object.freeze({
  move: 32,
  rotate: 48,
  lock: 45,
  drop: 70,
  hold: 100,
  countdown: 140,
  go: 180,
  line1: 100,
  line2: 120,
  line3: 140,
  line4: 180,
  tSpin: 180,
  perfectClear: 300,
  combo: 80,
  backToBack: 180,
  garbageWarning: 500,
  garbage: 180,
  danger: 420,
  gameOver: 500,
  success: 500,
  uiClick: 65,
});

const SOUND_ALIASES = Object.freeze({
  start: 'go',
  clear: 'line1',
});

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function toFiniteNumber(value, fallback = 0) {
  try {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  } catch {
    return fallback;
  }
}

function normalizeVolume(volume) {
  return clamp(toFiniteNumber(volume), 0, 100) / 100;
}

function safeFrequency(frequency) {
  return clamp(toFiniteNumber(frequency, MIN_FREQUENCY), MIN_FREQUENCY, MAX_FREQUENCY);
}

function tone(frequency, duration, options = {}) {
  return {
    frequency,
    duration,
    endFrequency: options.endFrequency ?? frequency,
    offset: options.offset ?? 0,
    type: options.type ?? 'sine',
    gain: options.gain ?? 0.05,
    attack: options.attack ?? 0.004,
    ramp: options.ramp ?? 'exponential',
  };
}

const SOUND_BUILDERS = Object.freeze({
  move: () => [
    tone(190, 0.028, { endFrequency: 145, type: 'triangle', gain: 0.022, attack: 0.002 }),
  ],
  rotate: () => [
    tone(410, 0.052, { endFrequency: 620, type: 'square', gain: 0.024, attack: 0.002 }),
    tone(820, 0.038, { endFrequency: 690, offset: 0.012, gain: 0.016, attack: 0.002 }),
  ],
  lock: () => [
    tone(145, 0.09, { endFrequency: 72, type: 'triangle', gain: 0.055 }),
    tone(76, 0.12, { endFrequency: 46, type: 'sine', gain: 0.045 }),
  ],
  drop: () => [
    tone(360, 0.11, { endFrequency: 74, type: 'sawtooth', gain: 0.038, attack: 0.002 }),
    tone(96, 0.1, { endFrequency: 55, offset: 0.065, type: 'triangle', gain: 0.065 }),
  ],
  hold: () => [
    tone(330, 0.075, { endFrequency: 475, type: 'sine', gain: 0.045 }),
    tone(660, 0.085, { endFrequency: 495, offset: 0.052, type: 'triangle', gain: 0.038 }),
  ],
  countdown: () => [
    tone(440, 0.105, { type: 'square', gain: 0.035 }),
    tone(880, 0.09, { gain: 0.025 }),
  ],
  go: () => [
    tone(523.25, 0.09, { type: 'triangle', gain: 0.04 }),
    tone(783.99, 0.09, { offset: 0.055, type: 'triangle', gain: 0.045 }),
    tone(1046.5, 0.18, { offset: 0.11, gain: 0.055 }),
    tone(261.63, 0.2, { offset: 0.11, type: 'triangle', gain: 0.035 }),
  ],
  line1: () => [
    tone(659.25, 0.075, { type: 'triangle', gain: 0.04 }),
    tone(880, 0.12, { offset: 0.055, gain: 0.048 }),
  ],
  line2: () => [
    tone(587.33, 0.075, { type: 'triangle', gain: 0.038 }),
    tone(739.99, 0.075, { offset: 0.048, type: 'triangle', gain: 0.042 }),
    tone(987.77, 0.14, { offset: 0.096, gain: 0.05 }),
    tone(493.88, 0.14, { offset: 0.096, type: 'sine', gain: 0.025 }),
  ],
  line3: () => [
    tone(523.25, 0.07, { type: 'square', gain: 0.025 }),
    tone(659.25, 0.07, { offset: 0.045, type: 'triangle', gain: 0.035 }),
    tone(783.99, 0.07, { offset: 0.09, type: 'triangle', gain: 0.04 }),
    tone(1046.5, 0.16, { offset: 0.135, gain: 0.052 }),
    tone(1318.51, 0.13, { offset: 0.135, gain: 0.022 }),
  ],
  line4: () => [
    tone(110, 0.22, { endFrequency: 82, type: 'sawtooth', gain: 0.045 }),
    tone(440, 0.07, { type: 'square', gain: 0.026 }),
    tone(554.37, 0.07, { offset: 0.04, type: 'triangle', gain: 0.034 }),
    tone(659.25, 0.07, { offset: 0.08, type: 'triangle', gain: 0.038 }),
    tone(880, 0.18, { offset: 0.12, gain: 0.052 }),
    tone(1108.73, 0.18, { offset: 0.12, gain: 0.035 }),
    tone(1318.51, 0.18, { offset: 0.12, gain: 0.03 }),
  ],
  tSpin: () => [
    tone(740, 0.1, { endFrequency: 1110, type: 'square', gain: 0.03 }),
    tone(1046.5, 0.075, { endFrequency: 784, offset: 0.055, type: 'triangle', gain: 0.035 }),
    tone(1108.73, 0.14, { offset: 0.105, type: 'square', gain: 0.032 }),
    tone(1480, 0.18, { offset: 0.105, gain: 0.04 }),
  ],
  perfectClear: () => [
    tone(261.63, 0.3, { type: 'triangle', gain: 0.035 }),
    tone(523.25, 0.09, { gain: 0.038 }),
    tone(659.25, 0.09, { offset: 0.045, gain: 0.04 }),
    tone(783.99, 0.09, { offset: 0.09, gain: 0.042 }),
    tone(1046.5, 0.2, { offset: 0.135, gain: 0.05 }),
    tone(1318.51, 0.2, { offset: 0.135, gain: 0.036 }),
    tone(1567.98, 0.22, { offset: 0.18, gain: 0.032 }),
  ],
  combo: (options) => {
    const level = clamp(Math.trunc(toFiniteNumber(options?.level)), 0, 18);
    const base = safeFrequency(392 * (2 ** (level / 12)));
    return [
      tone(base, 0.065, { type: 'triangle', gain: 0.035 }),
      tone(base * 1.25, 0.1, { offset: 0.045, gain: 0.042 }),
      tone(base * 2, 0.08, { offset: 0.045, gain: 0.018 }),
    ];
  },
  backToBack: () => [
    tone(880, 0.11, { endFrequency: 1174.66, type: 'triangle', gain: 0.04 }),
    tone(1320, 0.11, { endFrequency: 1760, gain: 0.026 }),
    tone(1174.66, 0.15, { offset: 0.085, type: 'triangle', gain: 0.043 }),
    tone(1760, 0.15, { offset: 0.085, gain: 0.025 }),
  ],
  garbageWarning: () => [
    tone(170, 0.12, { endFrequency: 220, type: 'sawtooth', gain: 0.035 }),
    tone(233, 0.12, { endFrequency: 180, type: 'square', gain: 0.022 }),
    tone(190, 0.12, { endFrequency: 245, offset: 0.13, type: 'sawtooth', gain: 0.038 }),
    tone(260, 0.12, { endFrequency: 195, offset: 0.13, type: 'square', gain: 0.022 }),
  ],
  garbage: () => [
    tone(98, 0.2, { endFrequency: 42, type: 'sawtooth', gain: 0.05 }),
    tone(126, 0.16, { endFrequency: 52, type: 'square', gain: 0.03 }),
    tone(63, 0.24, { endFrequency: 38, type: 'triangle', gain: 0.055 }),
  ],
  danger: () => [
    tone(82, 0.115, { endFrequency: 58, type: 'sine', gain: 0.06 }),
    tone(164, 0.09, { endFrequency: 112, type: 'triangle', gain: 0.025 }),
    tone(88, 0.13, { endFrequency: 56, offset: 0.16, type: 'sine', gain: 0.065 }),
    tone(176, 0.1, { endFrequency: 110, offset: 0.16, type: 'triangle', gain: 0.025 }),
  ],
  gameOver: () => [
    tone(392, 0.15, { endFrequency: 370, type: 'triangle', gain: 0.045 }),
    tone(311.13, 0.15, { endFrequency: 294, offset: 0.12, type: 'triangle', gain: 0.048 }),
    tone(246.94, 0.16, { endFrequency: 220, offset: 0.24, type: 'triangle', gain: 0.052 }),
    tone(196, 0.34, { endFrequency: 82, offset: 0.36, type: 'sawtooth', gain: 0.045 }),
    tone(98, 0.38, { endFrequency: 45, offset: 0.36, gain: 0.05 }),
  ],
  success: () => [
    tone(523.25, 0.1, { type: 'triangle', gain: 0.04 }),
    tone(659.25, 0.1, { offset: 0.075, type: 'triangle', gain: 0.043 }),
    tone(783.99, 0.12, { offset: 0.15, type: 'triangle', gain: 0.047 }),
    tone(1046.5, 0.28, { offset: 0.23, gain: 0.052 }),
    tone(1318.51, 0.28, { offset: 0.23, gain: 0.035 }),
    tone(1567.98, 0.28, { offset: 0.23, gain: 0.028 }),
    tone(261.63, 0.32, { offset: 0.23, type: 'triangle', gain: 0.032 }),
  ],
  uiClick: () => [
    tone(960, 0.026, { endFrequency: 720, type: 'sine', gain: 0.022, attack: 0.001 }),
  ],
});

function disconnectNode(node) {
  try {
    node?.disconnect();
  } catch {
    return;
  }
}

function resumeAudioContext(context) {
  if (!context || context.state !== 'suspended') return;

  try {
    const resumePromise = context.resume();
    resumePromise?.catch(() => undefined);
  } catch {
    return;
  }
}

function scheduleTone(context, masterGain, activeVoices, description, baseTime) {
  if (activeVoices.size >= MAX_ACTIVE_OSCILLATORS) return false;

  let oscillator;
  let voiceGain;
  try {
    oscillator = context.createOscillator();
    voiceGain = context.createGain();
  } catch {
    return false;
  }

  const offset = clamp(toFiniteNumber(description.offset), 0, 1);
  const duration = clamp(toFiniteNumber(description.duration, 0.05), 0.012, 1.5);
  const startTime = baseTime + offset;
  const endTime = startTime + duration;
  const attackEnd = startTime + clamp(toFiniteNumber(description.attack, 0.004), 0.001, duration * 0.45);
  const releaseStart = Math.max(attackEnd, endTime - Math.min(0.035, duration * 0.4));
  const startFrequency = safeFrequency(description.frequency);
  const endFrequency = safeFrequency(description.endFrequency);
  const peakGain = clamp(toFiniteNumber(description.gain, 0.05), 0.005, 0.12);

  oscillator.type = description.type;
  oscillator.frequency.setValueAtTime(startFrequency, startTime);
  if (endFrequency !== startFrequency) {
    if (description.ramp === 'linear') {
      oscillator.frequency.linearRampToValueAtTime(endFrequency, endTime);
    } else {
      oscillator.frequency.exponentialRampToValueAtTime(endFrequency, endTime);
    }
  }

  voiceGain.gain.setValueAtTime(MIN_GAIN, startTime);
  voiceGain.gain.exponentialRampToValueAtTime(peakGain, attackEnd);
  voiceGain.gain.setValueAtTime(peakGain, releaseStart);
  voiceGain.gain.exponentialRampToValueAtTime(MIN_GAIN, endTime);

  oscillator.connect(voiceGain);
  voiceGain.connect(masterGain);

  const cleanup = () => {
    activeVoices.delete(oscillator);
    oscillator.onended = null;
    disconnectNode(oscillator);
    disconnectNode(voiceGain);
  };

  oscillator.onended = cleanup;
  activeVoices.set(oscillator, voiceGain);

  try {
    oscillator.start(startTime);
    oscillator.stop(endTime + 0.01);
    return true;
  } catch {
    cleanup();
    return false;
  }
}

function playSequence(context, masterGain, activeVoices, notes) {
  const baseTime = context.currentTime + 0.004;
  let scheduledCount = 0;

  for (const description of notes) {
    if (activeVoices.size >= MAX_ACTIVE_OSCILLATORS) break;
    if (scheduleTone(context, masterGain, activeVoices, description, baseTime)) {
      scheduledCount += 1;
    }
  }

  return scheduledCount;
}

/** 외부 음원 없이 Web Audio oscillator로 게임 효과음을 합성합니다. */
export function useGameSounds(volume) {
  const audioContextRef = useRef(null);
  const masterGainRef = useRef(null);
  const activeVoicesRef = useRef(new Map());
  const cooldownsRef = useRef(new Map());
  const disposedRef = useRef(false);

  useEffect(() => {
    disposedRef.current = false;
    const activeVoices = activeVoicesRef.current;
    const cooldowns = cooldownsRef.current;

    const resumeOnInteraction = () => resumeAudioContext(audioContextRef.current);
    if (typeof window !== 'undefined') {
      window.addEventListener('pointerdown', resumeOnInteraction, true);
      window.addEventListener('touchstart', resumeOnInteraction, true);
      window.addEventListener('keydown', resumeOnInteraction, true);
    }

    return () => {
      disposedRef.current = true;
      if (typeof window !== 'undefined') {
        window.removeEventListener('pointerdown', resumeOnInteraction, true);
        window.removeEventListener('touchstart', resumeOnInteraction, true);
        window.removeEventListener('keydown', resumeOnInteraction, true);
      }

      for (const [oscillator, voiceGain] of activeVoices) {
        oscillator.onended = null;
        try {
          oscillator.stop();
        } catch {
          disconnectNode(oscillator);
        }
        disconnectNode(oscillator);
        disconnectNode(voiceGain);
      }
      activeVoices.clear();
      cooldowns.clear();

      const context = audioContextRef.current;
      disconnectNode(masterGainRef.current);
      if (context && context.state !== 'closed') {
        try {
          const closePromise = context.close();
          closePromise?.catch(() => undefined);
        } catch {
          disconnectNode(masterGainRef.current);
        }
      }
      audioContextRef.current = null;
      masterGainRef.current = null;
    };
  }, []);

  useEffect(() => {
    const context = audioContextRef.current;
    const masterGain = masterGainRef.current;
    if (!context || !masterGain || context.state === 'closed') return;

    const now = context.currentTime;
    const targetVolume = normalizeVolume(volume);
    const currentVolume = clamp(toFiniteNumber(masterGain.gain.value), 0, 1);
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(currentVolume, now);
    masterGain.gain.linearRampToValueAtTime(targetVolume, now + VOLUME_RAMP_SECONDS);
  }, [volume]);

  return useCallback((name, options = {}) => {
    const targetVolume = normalizeVolume(volume);
    if (targetVolume <= 0 || disposedRef.current || typeof window === 'undefined') return;
    if (typeof name !== 'string') return;

    const canonicalName = Object.prototype.hasOwnProperty.call(SOUND_ALIASES, name)
      ? SOUND_ALIASES[name]
      : name;
    if (!Object.prototype.hasOwnProperty.call(SOUND_BUILDERS, canonicalName)) return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    let context = audioContextRef.current;
    let masterGain = masterGainRef.current;
    if (!context) {
      try {
        context = new AudioContextClass();
        masterGain = context.createGain();
        masterGain.gain.setValueAtTime(targetVolume, context.currentTime);
        masterGain.connect(context.destination);
      } catch {
        if (context && context.state !== 'closed') {
          try {
            const closePromise = context.close();
            closePromise?.catch(() => undefined);
          } catch {
            return;
          }
        }
        return;
      }
      audioContextRef.current = context;
      masterGainRef.current = masterGain;
    }

    if (!masterGain || context.state === 'closed') return;
    resumeAudioContext(context);

    const now = Date.now();
    const cooldown = EVENT_COOLDOWNS[canonicalName] ?? 0;
    const lastPlayed = cooldownsRef.current.get(canonicalName) ?? -Infinity;
    if (now - lastPlayed < cooldown) return;

    let notes;
    try {
      notes = SOUND_BUILDERS[canonicalName](options);
    } catch {
      return;
    }
    if (!Array.isArray(notes) || notes.length === 0) return;

    const scheduledCount = playSequence(
      context,
      masterGain,
      activeVoicesRef.current,
      notes,
    );
    if (scheduledCount > 0) cooldownsRef.current.set(canonicalName, now);
  }, [volume]);
}
