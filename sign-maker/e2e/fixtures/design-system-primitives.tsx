import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/styles/ds-tokens.css';
import '../../src/styles/ds-base.css';
import '../../src/styles/ds-primitives.css';
import { Badge } from '../../src/components/design-system/Badge';
import { ThemeToggle } from '../../src/components/design-system/ThemeToggle';

const root = document.getElementById('root');
if (!root) throw new Error('디자인 시스템 fixture root가 없다.');

createRoot(root).render(
  <StrictMode>
    <ThemeToggle theme="light" onToggle={() => {}} />
    {(['light', 'dark'] as const).map((theme) => (
      <div
        key={theme}
        data-theme={theme}
        data-ds-contrast-theme={theme}
        style={{ background: 'var(--surface)', padding: 16 }}
      >
        <div style={{ background: 'var(--primary-surface)', padding: 8 }}>
          <Badge variant="primary">기본 배지</Badge>
        </div>
      </div>
    ))}
  </StrictMode>,
);
