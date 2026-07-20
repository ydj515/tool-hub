import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App shell', () => {
  it('도구 이름과 개인정보 안내를 표시하고 테마를 전환한다', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole('heading', { name: 'JSON YAML Converter' })).toBeInTheDocument();
    expect(screen.getByText('입력 내용은 브라우저에서만 처리됩니다.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '테마 전환' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });
});
