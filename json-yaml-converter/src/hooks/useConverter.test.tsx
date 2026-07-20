import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SIZE_LIMIT_BYTES } from '../lib/size';
import { useConverter } from './useConverter';

describe('useConverter', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('300ms 뒤 최신 JSON만 YAML로 변환한다', () => {
    const { result } = renderHook(() => useConverter());
    act(() => result.current.setSource('{"a":1}'));
    act(() => result.current.setSource('{"a":2}'));
    expect(result.current.state.status).toBe('scheduled');

    act(() => vi.advanceTimersByTime(299));
    expect(result.current.state.result).toBe('');
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.state).toMatchObject({ status: 'valid', result: 'a: 2\n', resultFresh: true });
  });

  it('오류 시 마지막 성공 결과를 stale로 유지하고 수정 후 복구한다', () => {
    const { result } = renderHook(() => useConverter());
    act(() => result.current.setSource('{"a":1}'));
    act(() => vi.advanceTimersByTime(300));
    act(() => result.current.setSource('{"a" 1}'));
    expect(result.current.state).toMatchObject({ status: 'scheduled', result: 'a: 1\n', resultFresh: false });
    act(() => vi.advanceTimersByTime(300));
    expect(result.current.state).toMatchObject({ status: 'invalid', result: 'a: 1\n', resultFresh: false });
    expect(result.current.state.diagnostic?.line).toBe(1);

    act(() => result.current.setSource('{"a":3}'));
    act(() => vi.advanceTimersByTime(300));
    expect(result.current.state).toMatchObject({ status: 'valid', result: 'a: 3\n', resultFresh: true });
  });

  it('빈 입력과 1MB 초과 입력은 변환하지 않는다', () => {
    const { result } = renderHook(() => useConverter());
    act(() => result.current.setSource('   '));
    expect(result.current.state).toMatchObject({ status: 'empty', result: '', resultFresh: false });
    act(() => result.current.setSource('x'.repeat(SIZE_LIMIT_BYTES + 1)));
    expect(result.current.state).toMatchObject({ status: 'oversized', resultFresh: false });
    act(() => vi.advanceTimersByTime(300));
    expect(result.current.state.status).toBe('oversized');
  });

  it('500KB 입력을 warning으로 분류하면서 변환을 예약한다', () => {
    const { result } = renderHook(() => useConverter());
    act(() => result.current.setSource(' '.repeat(500 * 1024) + 'null'));
    expect(result.current.state).toMatchObject({ status: 'scheduled', sizeLevel: 'warning' });
  });

  it('fresh 결과만 방향 전환하고 새 원본으로 사용한다', () => {
    const { result } = renderHook(() => useConverter());
    act(() => result.current.setSource('{"a":1}'));
    act(() => vi.advanceTimersByTime(300));
    act(() => result.current.swap());
    expect(result.current.state).toMatchObject({
      direction: 'yaml-to-json', source: 'a: 1\n', status: 'scheduled', resultFresh: false,
    });
  });

  it('stale 결과에서는 swap하지 않는다', () => {
    const { result } = renderHook(() => useConverter());
    act(() => result.current.setSource('{"a":1}'));
    act(() => vi.advanceTimersByTime(300));
    act(() => result.current.setSource('{"a" 1}'));
    act(() => result.current.swap());
    expect(result.current.state).toMatchObject({ direction: 'json-to-yaml', source: '{"a" 1}', resultFresh: false });
  });

  it('결과가 없어도 방향 선택기로 YAML 입력 모드를 선택하고 현재 원본을 재해석한다', () => {
    const { result } = renderHook(() => useConverter());
    act(() => result.current.selectDirection('yaml-to-json'));
    expect(result.current.state).toMatchObject({ direction: 'yaml-to-json', source: '', status: 'empty' });

    act(() => result.current.setSource('name: tool-hub\n'));
    act(() => result.current.selectDirection('json-to-yaml'));
    expect(result.current.state).toMatchObject({ direction: 'json-to-yaml', source: 'name: tool-hub\n', status: 'scheduled' });
  });

  it('clear는 예약된 변환을 취소하고 초기 상태로 되돌린다', () => {
    const { result } = renderHook(() => useConverter());
    act(() => result.current.setSource('{"a":1}'));
    act(() => result.current.clear());
    act(() => vi.advanceTimersByTime(300));
    expect(result.current.state).toMatchObject({ status: 'empty', source: '', result: '', resultFresh: false });
  });
});
