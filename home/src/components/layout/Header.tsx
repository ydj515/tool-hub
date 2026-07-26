/**
 * 홈 상단 헤더: 로고, GitHub 링크, 테마 토글 버튼.
 * 테마 상태는 Layout이 소유하고 props로 주입한다.
 *
 * home 은 허브 자신이므로 브랜드 블록을 링크로 만들지 않는다.
 * 유틸리티 슬롯의 마지막 요소는 테마 토글이어야 하므로 GitHub 링크를 앞에 둔다.
 */
import { GitHubIcon, SunIcon, MoonIcon } from '../icons';
import { GITHUB_REPO } from '../../constants';

interface HeaderProps {
  theme: 'dark' | 'light';
  onToggle: () => void;
}

export default function Header({ theme, onToggle }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-bg/85 backdrop-blur-xl border-b border-line">
      <div className="ds-shell h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="brandMark w-7 h-7 rounded-sm flex items-center justify-center shadow-sm">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <rect x="0.5" y="1.5" width="3" height="10" rx="0.8" fill="white" />
              <rect x="5" y="1.5" width="3" height="10" rx="0.8" fill="white" opacity="0.68" />
              <rect x="9.5" y="1.5" width="3" height="10" rx="0.8" fill="white" opacity="0.4" />
            </svg>
          </div>
          <span className="app-title text-tx font-semibold">Tool Hub</span>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={GITHUB_REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-caption font-medium text-muted hover:text-tx px-3 py-1.5 rounded-md border border-line hover:bg-fill transition-colors no-underline"
          >
            <GitHubIcon />
            GitHub
          </a>
          <button onClick={onToggle} aria-label="테마 전환" className="ds-icon-btn">
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </div>
    </header>
  );
}
