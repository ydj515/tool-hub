import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { planFixture, selectionFixture } from '../../test/factories';
import { installMatchMedia } from '../../test/match-media';
import { ReviewStep } from './ReviewStep';

afterEach(() => {
  installMatchMedia(false);
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
  vi.restoreAllMocks();
});

function props() {
  return {
    plan: planFixture(),
    selections: selectionFixture(),
    selectedEndpointId: 'POST /users',
    selectedTestCaseId: 'required-email-id',
    onSelectEndpoint: vi.fn(),
    onSelectTestCase: vi.fn(),
    onSelectionChange: vi.fn(),
    onProceed: vi.fn(),
  };
}

describe('ReviewStep', () => {
  it('테스트를 검색하고 포함 상태를 바꾼다', async () => {
    const user = userEvent.setup();
    const values = props();
    const { container } = render(<ReviewStep {...values} />);

    expect(screen.getByText('2단계')).toBeInTheDocument();
    expect(container.querySelector('.endpoint-column .eyebrow')).toHaveTextContent('엔드포인트');
    expect(screen.getByRole('button', { name: '내보내기 단계로' })).toHaveAttribute('data-ds-button');
    expect(container.querySelector('[data-ds-badge]')).toBeInTheDocument();
    await user.type(screen.getByRole('searchbox', { name: '테스트 검색' }), 'email');
    expect(screen.getByText('필수 email 필드 누락')).toBeInTheDocument();
    expect(screen.queryByText('인증 토큰 누락')).not.toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: '필수 email 필드 누락 포함' }));
    expect(values.onSelectionChange).toHaveBeenCalledWith('required-email-id', { included: false });
  });

  it('검색 결과가 없으면 공통 빈 상태를 표시한다', async () => {
    const user = userEvent.setup();
    const { container } = render(<ReviewStep {...props()} />);

    await user.type(screen.getByRole('searchbox', { name: '테스트 검색' }), '없는 테스트');

    expect(screen.getByText('조건에 맞는 테스트가 없습니다.')).toBeInTheDocument();
    expect(container.querySelector('[data-ds-empty-state]')).toBeInTheDocument();
  });

  it('모바일에서 목록과 상세를 별도 화면으로 전환한다', async () => {
    installMatchMedia(true);
    const user = userEvent.setup();
    render(<ReviewStep {...props()} />);

    await user.click(screen.getByRole('button', { name: 'POST /users 테스트 보기' }));
    expect(screen.getByRole('region', { name: '테스트 목록' })).toBeVisible();
    expect(screen.queryByRole('region', { name: '엔드포인트 목록' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '필수 email 필드 누락 상세' }));
    expect(screen.getByRole('region', { name: '테스트 상세' })).toBeVisible();
    expect(screen.queryByRole('region', { name: '테스트 목록' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '테스트 목록으로 돌아가기' }));
    expect(screen.getByRole('region', { name: '테스트 목록' })).toBeVisible();
  });

  it('모바일 상세에서 돌아와도 검색 조건을 유지한다', async () => {
    installMatchMedia(true);
    const user = userEvent.setup();
    render(<ReviewStep {...props()} />);

    await user.click(screen.getByRole('button', { name: 'POST /users 테스트 보기' }));
    await user.type(screen.getByRole('searchbox', { name: '테스트 검색' }), 'email');
    await user.click(screen.getByRole('button', { name: '필수 email 필드 누락 상세' }));
    await user.click(screen.getByRole('button', { name: '테스트 목록으로 돌아가기' }));

    expect(screen.getByRole('searchbox', { name: '테스트 검색' })).toHaveValue('email');
  });

  it('현재 선택 상태를 기준으로 검토 필요 수를 표시한다', () => {
    const selections = selectionFixture();
    selections['auth-id'] = { included: true, reviewed: true };

    render(<ReviewStep {...props()} selections={selections} />);

    expect(screen.getByText(/검토 필요 0개/)).toBeInTheDocument();
  });

  it('모바일 화면별 스크롤 위치를 복원한다', async () => {
    installMatchMedia(true);
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    const user = userEvent.setup();
    render(<ReviewStep {...props()} />);

    await user.click(screen.getByRole('button', { name: 'POST /users 테스트 보기' }));
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 420 });
    await user.click(screen.getByRole('button', { name: '필수 email 필드 누락 상세' }));
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 80 });
    await user.click(screen.getByRole('button', { name: '테스트 목록으로 돌아가기' }));

    await waitFor(() => expect(scrollTo).toHaveBeenLastCalledWith({ top: 420 }));
  });

  it('부분 지원 진단과 생략 수를 검토 화면에 표시한다', () => {
    const plan = planFixture();
    plan.summary.skippedCount = 2;
    plan.diagnostics = [{
      id: 'external', code: 'EXTERNAL_REFERENCE_UNSUPPORTED', severity: 'warning', stage: 'reference',
      message: '외부 $ref는 가져오지 않습니다.', sourcePointer: 'https://example.com/schema.yaml', blocking: false,
    }];

    render(<ReviewStep {...props()} plan={plan} />);

    expect(screen.getByText(/생략 2개/)).toBeInTheDocument();
    expect(screen.getByText(/외부 \$ref는 가져오지 않습니다/)).toBeInTheDocument();
  });
});
