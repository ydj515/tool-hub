/**
 * 홈 상단 헤더: 로고, 테마 토글 버튼, GitHub 링크.
 * 테마 상태는 Layout이 소유하고 props로 주입한다.
 */
import { GitHubIcon, SunIcon, MoonIcon } from '../icons';
import { GITHUB_REPO } from '../../constants';

interface HeaderProps {
  theme: 'dark' | 'light';
  onToggle: () => void;
}

export default function Header({ theme, onToggle }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-white/70 dark:bg-canvas-dark/85 backdrop-blur-xl border-b border-black/[0.06] dark:border-white/[0.06]">
      <div className="max-w-[1120px] mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 shadow-sm">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <rect x="0.5" y="1.5" width="3" height="10" rx="0.8" fill="white" />
              <rect x="5" y="1.5" width="3" height="10" rx="0.8" fill="white" opacity="0.68" />
              <rect x="9.5" y="1.5" width="3" height="10" rx="0.8" fill="white" opacity="0.4" />
            </svg>
          </div>
          <span className="text-[15px] font-semibold tracking-normal text-gray-900 dark:text-white">
            Tool Hub
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggle}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 dark:text-white/35 hover:text-gray-700 dark:hover:text-white/80 hover:bg-black/[0.05] dark:hover:bg-white/[0.07] border border-transparent hover:border-black/[0.07] dark:hover:border-white/[0.08] transition-all cursor-pointer"
            aria-label="테마 전환"
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
          <a
            href={GITHUB_REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[13px] font-medium text-gray-500 dark:text-white/45 px-3 py-1.5 rounded-lg border border-black/[0.08] dark:border-white/[0.08] hover:text-gray-900 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:border-black/[0.12] dark:hover:border-white/[0.14] transition-all"
          >
            <GitHubIcon />
            GitHub
          </a>
        </div>
      </div>
    </header>
  );
}
