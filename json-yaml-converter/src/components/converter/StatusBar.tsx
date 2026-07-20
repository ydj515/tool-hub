import type { ConverterState } from '../../hooks/useConverter';

export function StatusBar({ state }: { state: ConverterState }) {
  const message = state.status === 'oversized'
    ? '1MB를 초과해 변환할 수 없습니다.'
    : state.sizeLevel === 'warning'
      ? '500KB 이상 입력입니다.'
      : state.status === 'valid'
        ? '변환 완료'
        : state.status === 'scheduled'
          ? '변환 준비 중'
          : state.status === 'invalid'
            ? '입력 형식을 확인하세요.'
            : '입력을 기다리고 있습니다.';
  return <p className={`status-bar status-bar--${state.status}`} role="status">{message} · {state.bytes.toLocaleString('ko-KR')} B</p>;
}
