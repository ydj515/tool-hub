import { useEffect, useState } from 'react';

export interface PanelLayout {
  navigator: number;
  editor: number;
  preview: number;
  navigatorCollapsed: boolean;
  previewCollapsed: boolean;
}

const STORAGE_KEY = 'openapi-studio-panel-layout';
const DEFAULT_LAYOUT: PanelLayout = { navigator: 22, editor: 39, preview: 39, navigatorCollapsed: false, previewCollapsed: false };
const MIN_NAVIGATOR = 14;
const MIN_EDITOR = 28;
const MIN_PREVIEW = 24;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function initialLayout(): PanelLayout {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '') as Partial<PanelLayout>;
    if (typeof value.navigator === 'number' && typeof value.editor === 'number' && typeof value.preview === 'number') return { ...DEFAULT_LAYOUT, ...value };
  } catch {
    // 저장된 패널 설정이 없거나 손상되면 기본 비율을 사용한다.
  }
  return DEFAULT_LAYOUT;
}

export function usePanelLayout(): { layout: PanelLayout; resize: (left: 'navigator' | 'editor', percent: number) => void; toggle: (panel: 'navigator' | 'preview') => void } {
  const [layout, setLayout] = useState<PanelLayout>(initialLayout);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(layout)); } catch { /* 패널 설정 저장 실패는 무시한다. */ }
  }, [layout]);
  const resize = (left: 'navigator' | 'editor', percent: number) => {
    setLayout((current) => {
      const navigator = current.navigatorCollapsed ? 0 : current.navigator;
      const preview = current.previewCollapsed ? 0 : current.preview;
      if (left === 'navigator') {
        const next = clamp(percent, MIN_NAVIGATOR, 100 - MIN_EDITOR - preview);
        return { ...current, navigator: next, editor: 100 - next - preview, preview };
      }
      const editor = clamp(percent - navigator, MIN_EDITOR, 100 - navigator - MIN_PREVIEW);
      return { ...current, navigator, editor, preview: 100 - navigator - editor };
    });
  };
  const toggle = (panel: 'navigator' | 'preview') => setLayout((current) => panel === 'navigator'
    ? { ...current, navigatorCollapsed: !current.navigatorCollapsed }
    : { ...current, previewCollapsed: !current.previewCollapsed });
  return { layout, resize, toggle };
}
