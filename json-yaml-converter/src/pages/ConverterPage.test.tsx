import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConverterPage } from './ConverterPage';

vi.mock('../components/editor/CodeEditor', async () => {
  const React = await import('react');
  return {
    CodeEditor: React.forwardRef(function MockEditor(
      props: { ariaLabel: string; value: string; readOnly: boolean; onChange(value: string): void },
      ref: React.ForwardedRef<{ replaceAll(value: string): void; focusDiagnostic(): void }>,
    ) {
      React.useImperativeHandle(ref, () => ({
        replaceAll: props.onChange,
        focusDiagnostic: vi.fn(),
      }));
      return <textarea aria-label={props.ariaLabel} value={props.value} readOnly={props.readOnly} onChange={(event) => props.onChange(event.target.value)} />;
    }),
  };
});

describe('ConverterPage', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('JSON 입력을 자동 변환하고 JSON Pretty를 제공한다', () => {
    render(<ConverterPage theme="light" />);
    fireEvent.change(screen.getByLabelText('JSON 원본'), { target: { value: '{"a":1}' } });
    act(() => vi.advanceTimersByTime(300));
    expect(screen.getByLabelText('YAML 결과')).toHaveValue('a: 1\n');
    expect(screen.getByRole('button', { name: 'JSON Pretty' })).toBeEnabled();
  });

  it('방향 전환 후 YAML Pretty와 JSON 결과를 표시한다', () => {
    render(<ConverterPage theme="light" />);
    fireEvent.change(screen.getByLabelText('JSON 원본'), { target: { value: '{"a":1}' } });
    act(() => vi.advanceTimersByTime(300));
    fireEvent.click(screen.getByRole('button', { name: '변환 방향 전환' }));
    act(() => vi.advanceTimersByTime(300));
    expect(screen.getByRole('button', { name: 'YAML Pretty' })).toBeInTheDocument();
    expect(screen.getByLabelText('JSON 결과')).toHaveValue('{\n  "a": 1\n}\n');
  });

  it('빈 화면에서 YAML → JSON 방향을 직접 선택한다', () => {
    render(<ConverterPage theme="light" />);
    fireEvent.click(screen.getByRole('radio', { name: 'YAML → JSON' }));
    fireEvent.change(screen.getByLabelText('YAML 원본'), { target: { value: 'a: 1' } });
    act(() => vi.advanceTimersByTime(300));
    expect(screen.getByLabelText('JSON 결과')).toHaveValue('{\n  "a": 1\n}\n');
  });

  it('오류 위치와 stale 결과를 표시하고 내보내기를 막는다', () => {
    render(<ConverterPage theme="light" />);
    fireEvent.change(screen.getByLabelText('JSON 원본'), { target: { value: '{"a":1}' } });
    act(() => vi.advanceTimersByTime(300));
    fireEvent.change(screen.getByLabelText('JSON 원본'), { target: { value: '{"a" 1}' } });
    act(() => vi.advanceTimersByTime(300));
    expect(screen.getByText(/1행 6열/)).toBeInTheDocument();
    expect(screen.getByText('현재 입력과 동기화되지 않은 결과')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '결과 복사' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '결과 다운로드' })).toBeDisabled();
  });

  it('파일 확장자에 맞춰 방향을 바꾼다', async () => {
    render(<ConverterPage theme="light" />);
    const input = screen.getByLabelText('JSON 또는 YAML 파일 열기');
    fireEvent.change(input, { target: { files: [new File(['name: tool-hub\n'], 'config.yaml', { type: 'application/yaml' })] } });
    await act(async () => Promise.resolve());
    expect(screen.getByRole('button', { name: 'YAML Pretty' })).toBeInTheDocument();
  });

  it('클립보드 권한 거부를 비파괴적인 메시지로 표시한다', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    render(<ConverterPage theme="light" />);
    fireEvent.change(screen.getByLabelText('JSON 원본'), { target: { value: '{"a":1}' } });
    act(() => vi.advanceTimersByTime(300));
    fireEvent.click(screen.getByRole('button', { name: '결과 복사' }));
    await act(async () => Promise.resolve());
    expect(screen.getByText('결과를 클립보드에 복사하지 못했습니다.')).toBeInTheDocument();
    expect(screen.getByLabelText('JSON 원본')).toHaveValue('{"a":1}');
  });

  it('500KB 이상 입력을 변환 전에도 안내한다', () => {
    render(<ConverterPage theme="light" />);
    fireEvent.change(screen.getByLabelText('JSON 원본'), { target: { value: 'a'.repeat(500 * 1024) } });
    expect(screen.getByText(/500KB 이상 입력입니다/)).toBeInTheDocument();
  });
});
