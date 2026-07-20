import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConverterPage } from './ConverterPage';

const focusDiagnostic = vi.fn();

vi.mock('../components/editor/CodeEditor', async () => {
  const React = await import('react');
  return {
    CodeEditor: React.forwardRef(function MockEditor(
      props: { ariaLabel: string; value: string; readOnly: boolean; onChange(value: string): void },
      ref: React.ForwardedRef<{ replaceAll(value: string): void; focusDiagnostic(): void }>,
    ) {
      React.useImperativeHandle(ref, () => ({
        replaceAll: props.onChange,
        focusDiagnostic,
      }));
      return <textarea aria-label={props.ariaLabel} value={props.value} readOnly={props.readOnly} onChange={(event) => props.onChange(event.target.value)} />;
    }),
  };
});

describe('ConverterPage', () => {
  beforeEach(() => { vi.useFakeTimers(); focusDiagnostic.mockReset(); });
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

  it('500KB valid 입력에서 크기 안내와 변환 상태를 함께 표시한다', () => {
    render(<ConverterPage theme="light" />);
    fireEvent.change(screen.getByLabelText('JSON 원본'), { target: { value: `{"text":"${'a'.repeat(500 * 1024)}"}` } });
    act(() => vi.advanceTimersByTime(300));
    expect(screen.getByText(/500KB 이상 입력입니다/)).toBeInTheDocument();
    expect(screen.getAllByText(/변환 완료/)).not.toHaveLength(0);
  });

  it('느린 파일 A 완료가 빠른 파일 B를 덮어쓰지 않는다', async () => {
    let resolveA: (value: string) => void = () => undefined;
    const fileA = new File([''], 'slow.json', { type: 'application/json' });
    Object.defineProperty(fileA, 'text', { value: () => new Promise<string>((resolve) => { resolveA = resolve; }) });
    const fileB = new File(['name: fast\n'], 'fast.yaml', { type: 'application/yaml' });
    render(<ConverterPage theme="light" />);
    const input = screen.getByLabelText('JSON 또는 YAML 파일 열기');
    fireEvent.change(input, { target: { files: [fileA] } });
    fireEvent.change(input, { target: { files: [fileB] } });
    await act(async () => Promise.resolve());
    await act(async () => { resolveA('{"old":true}'); });
    expect(screen.getByLabelText('YAML 원본')).toHaveValue('name: fast\n');
  });

  it('느린 파일 실패가 직접 입력 뒤 메시지를 덮어쓰지 않는다', async () => {
    let rejectA: (error: Error) => void = () => undefined;
    const fileA = new File([''], 'slow.json', { type: 'application/json' });
    Object.defineProperty(fileA, 'text', { value: () => new Promise<string>((_resolve, reject) => { rejectA = reject; }) });
    render(<ConverterPage theme="light" />);
    fireEvent.change(screen.getByLabelText('JSON 또는 YAML 파일 열기'), { target: { files: [fileA] } });
    fireEvent.change(screen.getByLabelText('JSON 원본'), { target: { value: '{"new":true}' } });
    await act(async () => { rejectA(new Error('failed')); });
    expect(screen.getByLabelText('JSON 원본')).toHaveValue('{"new":true}');
    expect(screen.queryByText('파일을 읽을 수 없습니다.')).not.toBeInTheDocument();
  });

  it('새 원본 mutation이 클립보드 오류 메시지를 지운다', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    render(<ConverterPage theme="light" />);
    fireEvent.change(screen.getByLabelText('JSON 원본'), { target: { value: '{"a":1}' } });
    act(() => vi.advanceTimersByTime(300));
    fireEvent.click(screen.getByRole('button', { name: '결과 복사' }));
    await act(async () => Promise.resolve());
    fireEvent.change(screen.getByLabelText('JSON 원본'), { target: { value: '{"a":2}' } });
    expect(screen.queryByText('결과를 클립보드에 복사하지 못했습니다.')).not.toBeInTheDocument();
  });

  it('결과 탭에서 진단 버튼을 누르면 원본 탭 선택 후 편집기에 focus한다', () => {
    focusDiagnostic.mockImplementation(() => expect(screen.getByRole('tab', { name: '원본' })).toHaveAttribute('aria-selected', 'true'));
    render(<ConverterPage theme="light" />);
    fireEvent.click(screen.getByRole('tab', { name: '결과' }));
    fireEvent.change(screen.getByLabelText('JSON 원본'), { target: { value: '{"a" 1}' } });
    act(() => vi.advanceTimersByTime(300));
    fireEvent.click(screen.getByRole('button', { name: /1행 6열/ }));
    act(() => vi.runOnlyPendingTimers());
    expect(focusDiagnostic).toHaveBeenCalledOnce();
  });

  it('모바일 탭과 방향 선택기에 keyboard roving 패턴을 제공한다', () => {
    render(<ConverterPage theme="light" />);
    const sourceTab = screen.getByRole('tab', { name: '원본' });
    const resultTab = screen.getByRole('tab', { name: '결과' });
    expect(sourceTab).toHaveAttribute('aria-controls', 'converter-source-panel');
    expect(resultTab).toHaveAttribute('tabindex', '-1');
    fireEvent.keyDown(sourceTab, { key: 'ArrowRight' });
    expect(resultTab).toHaveAttribute('aria-selected', 'true');
    const jsonDirection = screen.getByRole('radio', { name: 'JSON → YAML' });
    fireEvent.keyDown(jsonDirection, { key: 'ArrowRight' });
    expect(screen.getByRole('radio', { name: 'YAML → JSON' })).toHaveAttribute('aria-checked', 'true');
  });
});
