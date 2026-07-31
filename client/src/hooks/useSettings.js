import { useState, useEffect } from 'react';
import { KEY_BINDINGS } from '../game/constants';

export function useSettings() {
  const [keys, setKeys] = useState(() => {
    const saved = localStorage.getItem('tetris_keys');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // 새로운 키(RESET 등)가 없을 수 있으므로 기본값과 병합
        return { ...KEY_BINDINGS, ...parsed };
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
    return { ...KEY_BINDINGS };
  });

  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('tetris_volume');
    return saved !== null ? parseInt(saved, 10) : 50;
  });

  const [fontTheme, setFontTheme] = useState(() => {
    const saved = localStorage.getItem('tetris_font_theme');
    return saved || 'modern';
  });

  useEffect(() => {
    localStorage.setItem('tetris_keys', JSON.stringify(keys));
  }, [keys]);

  useEffect(() => {
    localStorage.setItem('tetris_volume', volume.toString());
  }, [volume]);

  useEffect(() => {
    localStorage.setItem('tetris_font_theme', fontTheme);
    document.documentElement.setAttribute('data-font-theme', fontTheme);
  }, [fontTheme]);

  const updateKey = (action, newKey) => {
    setKeys(previous => {
      const conflictingAction = Object.keys(previous)
        .find(key => key !== action && previous[key] === newKey);
      const updated = { ...previous, [action]: newKey };
      if (conflictingAction) updated[conflictingAction] = previous[action];
      return updated;
    });
  };

  return { keys, updateKey, volume, setVolume, fontTheme, setFontTheme };
}
