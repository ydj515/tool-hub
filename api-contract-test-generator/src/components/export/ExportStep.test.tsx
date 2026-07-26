import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { planFixture, selectionFixture } from '../../test/factories';
import { ExportStep } from './ExportStep';

describe('ExportStep', () => {
  it('미검토 테스트를 내보내기 전에 확인한다', async () => {
    const user = userEvent.setup();
    const onExport = vi.fn();
    render(
      <ExportStep
        plan={planFixture()}
        selections={selectionFixture()}
        includedCount={2}
        unreviewedCount={2}
        skippedCount={0}
        exporting={false}
        onBack={vi.fn()}
        onExport={onExport}
      />,
    );

    await user.click(screen.getByRole('radio', { name: 'Postman Collection 2.1' }));
    await user.click(screen.getByRole('button', { name: '선택한 형식으로 다운로드' }));
    expect(screen.getByRole('alert')).toHaveTextContent('검토하지 않은 테스트 2개');
    expect(onExport).not.toHaveBeenCalled();
    await user.click(screen.getByRole('checkbox', { name: '미검토 테스트 포함을 확인했습니다' }));
    await user.click(screen.getByRole('button', { name: '선택한 형식으로 다운로드' }));
    expect(onExport).toHaveBeenCalledWith('postman');
  });
});
