import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_HANDLING,
  HANDLING_RANGES,
  INFINITE_SDF,
  KEY_BINDINGS,
} from '../game/constants';

const STORAGE_KEYS = Object.freeze({
  keys: 'tetris_keys',
  handling: 'tetris_handling',
  volume: 'tetris_volume',
  fontTheme: 'tetris_font_theme',
});

const HANDLING_PRESETS = Object.freeze({
  beginner: Object.freeze({ das: 180, arr: 40, sdf: 10 }),
  balanced: Object.freeze({ das: 133, arr: 10, sdf: 20 }),
  fast: Object.freeze({ das: 90, arr: 0, sdf: 40 }),
});

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readStorage(key) {
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // 저장소가 비활성화되었거나 용량을 초과해도 현재 세션 설정은 유지한다.
  }
}

function parseStoredObject(key) {
  const saved = readStorage(key);
  if (saved === null) return null;

  try {
    const parsed = JSON.parse(saved);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function normalizeKey(key) {
  if (typeof key !== 'string' || key.length === 0) return null;
  if (key === 'Space' || key === 'Spacebar') return ' ';
  return key.length === 1 ? key.toLowerCase() : key;
}

function createDefaultKeys() {
  return Object.fromEntries(
    Object.entries(KEY_BINDINGS).map(([action, key]) => [action, normalizeKey(key)]),
  );
}

function readKeys() {
  const defaults = createDefaultKeys();
  const saved = parseStoredObject(STORAGE_KEYS.keys);
  if (!saved) return defaults;

  return Object.fromEntries(
    Object.entries(defaults).map(([action, defaultKey]) => [
      action,
      normalizeKey(saved[action]) ?? defaultKey,
    ]),
  );
}

function clampHandlingValue(name, value, fallback) {
  const isNumericValue = typeof value === 'number'
    || (typeof value === 'string' && value.trim() !== '');
  if (!isNumericValue) return fallback;

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return fallback;
  if (name === 'sdf' && numericValue === INFINITE_SDF) return INFINITE_SDF;

  const { min, max } = HANDLING_RANGES[name];
  return Math.min(max, Math.max(min, Math.round(numericValue)));
}

function normalizeHandling(candidate, fallback = DEFAULT_HANDLING) {
  const source = isRecord(candidate) ? candidate : {};

  return Object.fromEntries(
    Object.keys(DEFAULT_HANDLING).map((name) => [
      name,
      clampHandlingValue(name, source[name], fallback[name]),
    ]),
  );
}

function readHandling() {
  return normalizeHandling(parseStoredObject(STORAGE_KEYS.handling));
}

function readVolume() {
  const saved = Number.parseInt(readStorage(STORAGE_KEYS.volume), 10);
  return Number.isFinite(saved) ? Math.min(100, Math.max(0, saved)) : 50;
}

export function useSettings() {
  const [keys, setKeys] = useState(readKeys);
  const [handling, setHandling] = useState(readHandling);
  const [volume, setVolume] = useState(readVolume);
  const [fontTheme, setFontTheme] = useState(
    () => readStorage(STORAGE_KEYS.fontTheme) || 'modern',
  );

  useEffect(() => {
    writeStorage(STORAGE_KEYS.keys, JSON.stringify(keys));
  }, [keys]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.handling, JSON.stringify(handling));
  }, [handling]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.volume, volume.toString());
  }, [volume]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.fontTheme, fontTheme);
    document.documentElement.setAttribute('data-font-theme', fontTheme);
  }, [fontTheme]);

  const updateKey = useCallback((action, newKey) => {
    const normalizedKey = normalizeKey(newKey);
    if (!Object.hasOwn(KEY_BINDINGS, action) || normalizedKey === null) return;

    setKeys((previous) => {
      const conflictingAction = Object.keys(previous).find(
        (key) => key !== action && normalizeKey(previous[key]) === normalizedKey,
      );
      const updated = { ...previous, [action]: normalizedKey };

      if (conflictingAction) updated[conflictingAction] = previous[action];
      return updated;
    });
  }, []);

  const updateHandling = useCallback((nameOrValues, value) => {
    setHandling((previous) => {
      let updates;
      if (typeof nameOrValues === 'string') {
        if (!Object.hasOwn(HANDLING_RANGES, nameOrValues)) return previous;
        updates = { [nameOrValues]: value };
      } else if (isRecord(nameOrValues)) {
        updates = nameOrValues;
      } else {
        return previous;
      }

      const candidate = { ...previous };
      for (const name of Object.keys(DEFAULT_HANDLING)) {
        if (Object.hasOwn(updates, name)) candidate[name] = updates[name];
      }
      return normalizeHandling(candidate, previous);
    });
  }, []);

  const applyHandlingPreset = useCallback((presetName) => {
    const preset = HANDLING_PRESETS[presetName];
    if (preset) setHandling({ ...preset });
  }, []);

  const resetHandling = useCallback(() => {
    setHandling({ ...DEFAULT_HANDLING });
  }, []);

  const resetKeys = useCallback(() => {
    setKeys(createDefaultKeys());
  }, []);

  return {
    keys,
    updateKey,
    resetKeys,
    handling,
    updateHandling,
    applyHandlingPreset,
    resetHandling,
    volume,
    setVolume,
    fontTheme,
    setFontTheme,
  };
}
