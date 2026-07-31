import { useCallback, useEffect, useRef } from 'react';

const SOUND_PRESETS = {
  start: { frequency: 440, endFrequency: 660, duration: 0.12, type: 'sine' },
  rotate: { frequency: 520, endFrequency: 620, duration: 0.05, type: 'square' },
  drop: { frequency: 180, endFrequency: 100, duration: 0.08, type: 'triangle' },
  hold: { frequency: 340, endFrequency: 460, duration: 0.08, type: 'sine' },
  clear: { frequency: 660, endFrequency: 920, duration: 0.14, type: 'sine' },
  tSpin: { frequency: 760, endFrequency: 1180, duration: 0.2, type: 'square' },
  garbage: { frequency: 130, endFrequency: 80, duration: 0.16, type: 'sawtooth' },
  gameOver: { frequency: 300, endFrequency: 90, duration: 0.35, type: 'sawtooth' },
  success: { frequency: 700, endFrequency: 1300, duration: 0.35, type: 'sine' },
};

/** 별도 음원 파일 없이 Web Audio로 짧은 게임 효과음을 재생합니다. */
export function useGameSounds(volume) {
  const audioContextRef = useRef(null);

  useEffect(() => () => {
    audioContextRef.current?.close();
    audioContextRef.current = null;
  }, []);

  return useCallback((name) => {
    if (volume <= 0 || typeof window === 'undefined') return;
    const preset = SOUND_PRESETS[name];
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!preset || !AudioContext) return;

    const context = audioContextRef.current || new AudioContext();
    audioContextRef.current = context;
    if (context.state === 'suspended') context.resume();

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    const peakGain = Math.max(0.001, (volume / 100) * 0.08);

    oscillator.type = preset.type;
    oscillator.frequency.setValueAtTime(preset.frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(preset.endFrequency, now + preset.duration);
    gain.gain.setValueAtTime(peakGain, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + preset.duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + preset.duration);
  }, [volume]);
}
