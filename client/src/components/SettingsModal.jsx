import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_HANDLING,
  HANDLING_RANGES,
  INFINITE_SDF,
} from '../game/constants';
import { useAutoShift } from '../hooks/useAutoShift';

const KEY_LABELS = {
  MOVE_LEFT: '왼쪽 이동',
  MOVE_RIGHT: '오른쪽 이동',
  SOFT_DROP: '소프트 드롭',
  HARD_DROP: '하드 드롭',
  ROTATE_CW: '시계 방향 회전',
  ROTATE_CCW: '반시계 방향 회전',
  ROTATE_180: '180도 회전',
  HOLD: '홀드',
  PAUSE: '일시정지',
  RESET: '리셋 (싱글플레이)',
};

const TABS = [
  { id: 'general', label: '일반' },
  { id: 'keys', label: '조작키' },
  { id: 'handling', label: '입력 감도' },
];

const HANDLING_FIELDS = [
  {
    id: 'das',
    label: 'DAS',
    unit: 'ms',
    description: '키를 누른 뒤 자동 이동이 시작될 때까지의 시간',
  },
  {
    id: 'arr',
    label: 'ARR',
    unit: 'ms',
    description: '자동 이동 사이의 간격 (0ms는 즉시 벽까지 이동)',
  },
  {
    id: 'sdf',
    label: 'SDF',
    unit: 'x',
    description: '소프트 드롭 속도 배율 (무한은 잠그지 않고 즉시 바닥까지 이동)',
  },
];

const HANDLING_PRESETS = [
  { id: 'beginner', label: '초보', values: { das: 180, arr: 40, sdf: 10 } },
  { id: 'balanced', label: '균형', values: { das: 133, arr: 10, sdf: 20 } },
  { id: 'fast', label: '빠름', values: { das: 90, arr: 0, sdf: 40 } },
];

const FONT_THEMES = [
  { id: 'modern', label: '모던 (Pretendard)' },
  { id: 'retro', label: '레트로 (마루미냐)' },
  { id: 'casual', label: '캐주얼 (배민주아)' },
  { id: 'tech', label: '디지털 (Share Tech)' },
];

const TRACK_LENGTH = 10;
const TRACK_CELLS = Array.from({ length: TRACK_LENGTH }, (_, index) => index);
const TRACK_CENTER = Math.floor(TRACK_LENGTH / 2) - 1;

function formatKey(key) {
  if (key === ' ') return 'SPACE';
  if (key === 'Escape') return 'ESC';
  if (key?.startsWith('Arrow')) return key.replace('Arrow', '').toUpperCase();
  return key?.toUpperCase() || '미지정';
}

export default function SettingsModal({
  isOpen,
  onClose,
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
  onPlaySound,
}) {
  const effectiveKeys = keys;
  const effectiveUpdateKey = updateKey;
  const effectiveHandling = { ...DEFAULT_HANDLING, ...handling };
  const effectiveUpdateHandling = updateHandling;
  const effectiveApplyPreset = applyHandlingPreset;
  const effectiveResetHandling = resetHandling;
  const effectiveVolume = volume;
  const effectiveSetVolume = setVolume;
  const effectiveFontTheme = fontTheme;
  const effectiveSetFontTheme = setFontTheme;

  const [activeTab, setActiveTab] = useState('general');
  const [editingAction, setEditingAction] = useState(null);
  const [testPosition, setTestPosition] = useState(TRACK_CENTER);
  const testPositionRef = useRef(TRACK_CENTER);

  const handleClose = useCallback(() => {
    onPlaySound?.('uiClick');
    setEditingAction(null);
    onClose();
  }, [onClose, onPlaySound]);

  const moveTestPiece = useCallback((direction) => {
    const delta = direction === 'left' ? -1 : 1;
    const nextPosition = Math.min(
      TRACK_LENGTH - 1,
      Math.max(0, testPositionRef.current + delta),
    );
    if (nextPosition === testPositionRef.current) return false;

    testPositionRef.current = nextPosition;
    setTestPosition(nextPosition);
    return true;
  }, []);

  useAutoShift({
    leftKey: effectiveKeys.MOVE_LEFT,
    rightKey: effectiveKeys.MOVE_RIGHT,
    das: effectiveHandling.das,
    arr: effectiveHandling.arr,
    enabled: isOpen && activeTab === 'handling' && editingAction === null,
    onMove: moveTestPiece,
    ignoreTypingTarget: true,
  });

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (editingAction !== null) {
        if (event.repeat) return;
        event.preventDefault();
        event.stopPropagation();

        if (event.key === 'Escape' && editingAction !== 'PAUSE') {
          setEditingAction(null);
          return;
        }

        effectiveUpdateKey(editingAction, event.key);
        setEditingAction(null);
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [editingAction, effectiveUpdateKey, handleClose, isOpen]);

  const selectTab = (tabId) => {
    onPlaySound?.('uiClick');
    setEditingAction(null);
    setActiveTab(tabId);
  };

  const handleResetKeys = () => {
    setEditingAction(null);
    resetKeys();
  };

  const resetTestPosition = () => {
    testPositionRef.current = TRACK_CENTER;
    setTestPosition(TRACK_CENTER);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-sky-950/40 p-4 backdrop-blur-sm transition-all duration-300"
      onClick={handleClose}
    >
      <div
        aria-labelledby="settings-title"
        aria-modal="true"
        className="glass-panel relative flex max-h-[90vh] w-full max-w-lg flex-col p-6 shadow-2xl animate-scale-in sm:p-8"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <button
          aria-label="설정 닫기"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-sky-500 transition-colors hover:bg-sky-100/50 hover:text-sky-700"
          onClick={handleClose}
          type="button"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-xl">close</span>
        </button>

        <h2 id="settings-title" className="mb-5 flex items-center gap-2 pr-10 font-headline text-2xl font-bold text-sky-950">
          <span aria-hidden="true" className="material-symbols-outlined text-sky-500">settings</span>
          설정
        </h2>

        <div aria-label="설정 영역" className="mb-5 grid grid-cols-3 gap-2" role="tablist">
          {TABS.map((tab) => (
            <button
              aria-controls={`settings-panel-${tab.id}`}
              aria-selected={activeTab === tab.id}
              className={`rounded-xl border px-3 py-2 text-sm font-bold transition-all ${
                activeTab === tab.id
                  ? 'border-sky-600 bg-sky-500 text-white shadow-md'
                  : 'border-sky-200 bg-white/40 text-sky-800 hover:bg-sky-50'
              }`}
              id={`settings-tab-${tab.id}`}
              key={tab.id}
              onClick={() => selectTab(tab.id)}
              role="tab"
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="custom-scrollbar min-h-0 w-full flex-1 overflow-y-auto pr-2">
          {activeTab === 'general' && (
            <section
              aria-labelledby="settings-tab-general"
              className="flex flex-col gap-6"
              id="settings-panel-general"
              role="tabpanel"
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <label className="font-headline font-semibold text-sky-900" htmlFor="settings-volume">
                    효과음 볼륨
                  </label>
                  <span className="rounded bg-sky-100/80 px-2.5 py-0.5 text-sm font-bold text-sky-700 shadow-sm">
                    {effectiveVolume}%
                  </span>
                </div>
                <input
                  aria-valuetext={`${effectiveVolume}%`}
                  className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-sky-200/70 accent-sky-500 transition-all hover:accent-sky-400"
                  id="settings-volume"
                  max="100"
                  min="0"
                  onChange={(event) => effectiveSetVolume(Number.parseInt(event.target.value, 10))}
                  type="range"
                  value={effectiveVolume}
                />
                <button
                  className="self-end rounded-lg border border-sky-200 bg-white/60 px-3 py-1.5 text-xs font-bold text-sky-700 transition-colors hover:bg-white"
                  onClick={() => onPlaySound?.('line4')}
                  type="button"
                >
                  효과음 미리듣기
                </button>
              </div>

              <fieldset className="flex flex-col gap-3">
                <legend className="mb-3 font-headline font-semibold text-sky-900">폰트 테마</legend>
                <div className="grid grid-cols-2 gap-2">
                  {FONT_THEMES.map((theme) => (
                    <button
                      aria-pressed={effectiveFontTheme === theme.id}
                      className={`rounded-xl border px-3 py-2 text-sm font-medium transition-all ${
                        effectiveFontTheme === theme.id
                          ? 'scale-[1.02] border-sky-600 bg-sky-500 text-white shadow-md'
                          : 'border-sky-200 bg-white/40 text-sky-800 hover:bg-sky-50'
                      }`}
                      key={theme.id}
                      onClick={() => {
                        onPlaySound?.('uiClick');
                        effectiveSetFontTheme(theme.id);
                      }}
                      type="button"
                    >
                      {theme.label}
                    </button>
                  ))}
                </div>
              </fieldset>
            </section>
          )}

          {activeTab === 'keys' && (
            <section
              aria-labelledby="settings-tab-keys"
              className="flex flex-col gap-3 animate-fade-in"
              id="settings-panel-keys"
              role="tabpanel"
            >
              <p className="text-sm text-sky-700">
                변경할 항목을 누른 뒤 새 키를 입력하세요. 같은 키를 선택하면 두 조작키가 서로 교환됩니다.
              </p>
              <div className="flex flex-col gap-2.5">
                {Object.entries(KEY_LABELS).map(([action, label]) => (
                  <div
                    className="flex items-center justify-between rounded-xl border border-sky-100 bg-white/40 px-4 py-3 shadow-sm"
                    key={action}
                  >
                    <span className="text-sm font-medium text-sky-900">{label}</span>
                    <button
                      aria-label={`${label} 키 변경, 현재 ${formatKey(effectiveKeys[action])}`}
                      className={`glass-button !h-9 !w-32 text-xs font-bold tracking-wide transition-all ${
                        editingAction === action
                          ? 'scale-[1.02] bg-sky-50 ring-2 ring-sky-500 ring-offset-2'
                          : ''
                      }`}
                      onClick={() => setEditingAction(action)}
                      type="button"
                    >
                      {editingAction === action ? '입력 대기중...' : formatKey(effectiveKeys[action])}
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-1 flex items-center justify-between gap-3 rounded-xl border border-sky-100 bg-sky-50/50 p-3">
                <span className="text-xs text-sky-700">
                  입력 대기 중 ESC는 취소하며, 일시정지 항목에서는 ESC로 지정됩니다.
                </span>
                <button
                  className="rounded-lg border border-sky-200 bg-white/70 px-3 py-2 text-sm font-bold text-sky-700 transition-colors hover:bg-white"
                  onClick={handleResetKeys}
                  type="button"
                >
                  조작키 초기화
                </button>
              </div>
            </section>
          )}

          {activeTab === 'handling' && (
            <section
              aria-labelledby="settings-tab-handling"
              className="flex flex-col gap-5 animate-fade-in"
              id="settings-panel-handling"
              role="tabpanel"
            >
              <fieldset>
                <legend className="mb-2 font-headline font-semibold text-sky-900">감도 프리셋</legend>
                <div className="grid grid-cols-3 gap-2">
                  {HANDLING_PRESETS.map((preset) => {
                    const isActive = Object.entries(preset.values).every(
                      ([name, value]) => effectiveHandling[name] === value,
                    );
                    return (
                      <button
                        aria-pressed={isActive}
                        className={`rounded-xl border px-3 py-2 text-sm font-bold transition-all ${
                          isActive
                            ? 'border-sky-600 bg-sky-500 text-white shadow-md'
                            : 'border-sky-200 bg-white/40 text-sky-800 hover:bg-sky-50'
                        }`}
                        key={preset.id}
                        onClick={() => {
                          onPlaySound?.('uiClick');
                          effectiveApplyPreset(preset.id);
                        }}
                        type="button"
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <div className="flex flex-col gap-5">
                {HANDLING_FIELDS.map((field) => {
                  const range = HANDLING_RANGES[field.id];
                  const isInfiniteSdf = field.id === 'sdf'
                    && effectiveHandling.sdf === INFINITE_SDF;
                  return (
                    <div className="flex flex-col gap-2" key={field.id}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <label
                            className="font-headline font-bold text-sky-900"
                            htmlFor={`handling-${field.id}-range`}
                            id={`handling-${field.id}-label`}
                          >
                            {field.label}
                          </label>
                          <p className="text-xs text-sky-600">{field.description}</p>
                        </div>
                        <label className="flex shrink-0 items-center gap-1 text-sm font-bold text-sky-800">
                          <span className="sr-only">{field.label} 숫자 입력</span>
                          <input
                            aria-labelledby={`handling-${field.id}-label`}
                            className="w-20 rounded-lg border border-sky-200 bg-white/70 px-2 py-1 text-right outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={isInfiniteSdf}
                            max={range.max}
                            min={range.min}
                            onChange={(event) => effectiveUpdateHandling(field.id, event.target.value)}
                            placeholder={isInfiniteSdf ? '∞' : undefined}
                            type="number"
                            value={isInfiniteSdf ? '' : effectiveHandling[field.id]}
                          />
                          <span>{isInfiniteSdf ? '즉시' : field.unit}</span>
                        </label>
                      </div>
                      <input
                        aria-labelledby={`handling-${field.id}-label`}
                        className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-sky-200/70 accent-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={isInfiniteSdf}
                        id={`handling-${field.id}-range`}
                        max={range.max}
                        min={range.min}
                        onChange={(event) => effectiveUpdateHandling(field.id, event.target.value)}
                        type="range"
                        value={isInfiniteSdf ? range.max : effectiveHandling[field.id]}
                      />
                      {field.id === 'sdf' && (
                        <button
                          aria-pressed={isInfiniteSdf}
                          className={`self-end rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                            isInfiniteSdf
                              ? 'border-sky-600 bg-sky-500 text-white'
                              : 'border-sky-200 bg-white/70 text-sky-700 hover:bg-white'
                          }`}
                          onClick={() => effectiveUpdateHandling(
                            'sdf',
                            isInfiniteSdf ? DEFAULT_HANDLING.sdf : INFINITE_SDF,
                          )}
                          type="button"
                        >
                          {isInfiniteSdf ? '∞ 무한 사용 중' : '∞ 무한으로 설정'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="rounded-xl border border-sky-100 bg-white/40 p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-headline font-bold text-sky-900">좌우 입력 테스트</h3>
                    <p className="text-xs text-sky-600">설정한 좌우키를 길게 눌러 감도를 확인하세요.</p>
                  </div>
                  <button
                    className="rounded-lg border border-sky-200 bg-white/70 px-3 py-1.5 text-xs font-bold text-sky-700 hover:bg-white"
                    onClick={resetTestPosition}
                    type="button"
                  >
                    가운데로
                  </button>
                </div>
                <div
                  aria-label={`10칸 입력 테스트 트랙, 블록 위치 ${testPosition + 1}번째 칸`}
                  className="grid grid-cols-10 gap-1 rounded-xl border border-sky-200 bg-sky-100/60 p-2"
                  role="img"
                >
                  {TRACK_CELLS.map((index) => (
                    <span
                      aria-hidden="true"
                      className={`aspect-square rounded border ${
                        index === testPosition
                          ? 'border-sky-600 bg-sky-500 shadow-md shadow-sky-300'
                          : 'border-sky-200 bg-white/60'
                      }`}
                      key={index}
                    />
                  ))}
                </div>
                <p aria-live="polite" className="sr-only">블록 위치 {testPosition + 1}번째 칸</p>
              </div>

              <button
                className="self-end rounded-lg border border-sky-200 bg-white/70 px-4 py-2 text-sm font-bold text-sky-700 transition-colors hover:bg-white"
                onClick={effectiveResetHandling}
                type="button"
              >
                입력 감도 기본값 복원
              </button>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
