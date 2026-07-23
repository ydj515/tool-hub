import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { usePanelLayout } from './usePanelLayout';

describe('usePanelLayout', () => {
  it('treats the editor divider position as the navigator-plus-editor boundary', () => {
    const { result } = renderHook(() => usePanelLayout());

    act(() => result.current.resize('editor', 61));

    expect(result.current.layout).toMatchObject({ navigator: 22, editor: 39, preview: 39 });
  });
});
