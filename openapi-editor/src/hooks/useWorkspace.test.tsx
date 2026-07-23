import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useWorkspace } from './useWorkspace';

describe('useWorkspace', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('keeps a valid JSON document unchanged when JSON is requested', () => {
    vi.useFakeTimers();
    vi.stubGlobal('Worker', undefined);
    const { result } = renderHook(() => useWorkspace());

    act(() => result.current.forceFormat('json'));
    act(() => result.current.setSource('{"openapi":"3.1.2","info":{"title":"Pets","version":"1.0.0"},"paths":{}}'));
    act(() => vi.advanceTimersByTime(400));
    const source = result.current.state.source;

    act(() => result.current.convertFormat('json'));

    expect(result.current.state.format).toBe('json');
    expect(result.current.state.source).toBe(source);
  });
});
