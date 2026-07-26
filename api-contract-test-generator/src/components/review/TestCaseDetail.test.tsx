import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { selectionFixture, testCase } from '../../test/factories';
import { TestCaseDetail } from './TestCaseDetail';

describe('TestCaseDetail', () => {
  it('테스트가 선택되지 않으면 공통 빈 상태를 표시한다', () => {
    const { container } = render(<TestCaseDetail onSelectionChange={vi.fn()} />);

    expect(screen.getByText('테스트를 선택해 주세요.')).toBeInTheDocument();
    expect(container.querySelector('[data-ds-empty-state]')).toBeInTheDocument();
  });

  it('쉼표 구분 숫자 상태만 검토 완료로 저장한다', async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    render(
      <TestCaseDetail
        testCase={testCase({ expected: { statuses: [], needsReview: true, rationale: '검토 필요' } })}
        selection={selectionFixture()['auth-id']!}
        onSelectionChange={onSelectionChange}
      />,
    );

    const input = screen.getByRole('textbox', { name: '기대 상태 코드' });
    await user.type(input, '400, 422');
    await user.click(screen.getByRole('button', { name: '상태 코드 검토 완료' }));

    expect(onSelectionChange).toHaveBeenCalledWith('required-email-id', { expectedStatuses: [400, 422], reviewed: true });
  });

  it('범위 상태를 저장하고 기대 상태 근거와 검토 사유를 표시한다', async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    const { container } = render(
      <TestCaseDetail
        testCase={testCase({ expected: { statuses: [], needsReview: true, rationale: '명세에 오류 응답이 없습니다.' } })}
        selection={{ included: true, reviewed: false }}
        onSelectionChange={onSelectionChange}
      />,
    );

    expect(screen.getByText('명세에 오류 응답이 없습니다.')).toBeInTheDocument();
    expect(screen.getByText('검토 필요 사유')).toBeInTheDocument();
    expect(screen.getByText('선택한 테스트')).toBeInTheDocument();
    expect(screen.queryByText('Selected test')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '상태 코드 검토 완료' })).toHaveAttribute('data-ds-button');
    expect(container.querySelector('[data-ds-badge]')).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: '기대 상태 코드' }), '4XX');
    await user.click(screen.getByRole('button', { name: '상태 코드 검토 완료' }));

    expect(onSelectionChange).toHaveBeenCalledWith('required-email-id', { expectedStatuses: ['4XX'], reviewed: true });
  });

  it('상세 패널에서 테스트를 내보내기 대상에서 제외한다', async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    render(<TestCaseDetail testCase={testCase()} selection={{ included: true, reviewed: true }} onSelectionChange={onSelectionChange} />);

    await user.click(screen.getByRole('button', { name: '내보내기에서 제외' }));

    expect(onSelectionChange).toHaveBeenCalledWith('required-email-id', { included: false });
  });
});
