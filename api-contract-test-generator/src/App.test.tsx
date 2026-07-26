import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  it('도구 이름과 세 단계를 표시한다', () => {
    const { container } = render(<App />);

    expect(container.querySelector('[data-ds-page-shell]')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'API Contract Test Generator' })).toBeInTheDocument();
    expect(screen.getByText('명세 입력')).toBeInTheDocument();
    expect(screen.getByText('테스트 검토')).toBeInTheDocument();
    expect(screen.getByText('내보내기')).toBeInTheDocument();
  });
});
