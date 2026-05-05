import { useState } from 'react';
import ToolCard from './components/ToolCard';
import { tools } from './data/tools';
import { useTheme } from './hooks/useTheme';

function GitHubIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

const GITHUB_REPO = 'https://github.com/ydj515/tool-hub';
const liveCount = tools.filter((t) => t.status === 'live').length;
const allTags = [...new Set(tools.flatMap((t) => t.tags))];

export default function App() {
  const { theme, toggle } = useTheme();
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const filteredTools = activeTag
    ? tools.filter((t) => t.tags.includes(activeTag))
    : tools;

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f5f9] dark:bg-[#080810] text-gray-900 dark:text-[#eeeef5]">

      {/* 배경 레이어 (다크 모드 전용) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div
          className="absolute inset-0 opacity-0 dark:opacity-100"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)
            `,
            backgroundSize: '44px 44px',
          }}
        />
        <div
          className="orb-a absolute -top-[15%] -left-[5%] w-[65vw] h-[65vw] max-w-[680px] max-h-[680px] rounded-full blur-[130px] opacity-0 dark:opacity-[0.08]"
          style={{ background: 'radial-gradient(circle, #6366f1, #8b5cf6 55%, transparent)' }}
        />
        <div
          className="orb-b absolute top-[5%] right-[-8%] w-[55vw] h-[55vw] max-w-[560px] max-h-[560px] rounded-full blur-[110px] opacity-0 dark:opacity-[0.055]"
          style={{ background: 'radial-gradient(circle, #22d3ee, #3b82f6 55%, transparent)' }}
        />
        <div
          className="orb-c absolute bottom-[-8%] left-[25%] w-[50vw] h-[50vw] max-w-[520px] max-h-[520px] rounded-full blur-[100px] opacity-0 dark:opacity-[0.045]"
          style={{ background: 'radial-gradient(circle, #10b981, #6366f1 55%, transparent)' }}
        />
      </div>

      {/* 헤더 */}
      <header className="sticky top-0 z-50 bg-white/70 dark:bg-[#080810]/85 backdrop-blur-xl border-b border-black/[0.06] dark:border-white/[0.06]">
        <div className="max-w-[1120px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 shadow-sm">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <rect x="0.5" y="1.5" width="3" height="10" rx="0.8" fill="white" />
                <rect x="5" y="1.5" width="3" height="10" rx="0.8" fill="white" opacity="0.68" />
                <rect x="9.5" y="1.5" width="3" height="10" rx="0.8" fill="white" opacity="0.4" />
              </svg>
            </div>
            <span className="text-[15px] font-semibold tracking-[-0.02em] text-gray-900 dark:text-white">
              Tool Hub
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
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

      <main className="flex-1 relative">
        {/* 히어로 */}
        <section className="py-14 sm:py-24 px-6">
          <div className="max-w-[600px] mx-auto text-center flex flex-col items-center gap-5">
            {/* 상태 인디케이터 */}
            <div className="flex items-center gap-2 text-[11px] font-semibold text-indigo-500 dark:text-indigo-400 tracking-[0.07em] uppercase">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-70" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500 dark:bg-indigo-400" />
              </span>
              Open Source · Always Free
            </div>

            {/* 메인 타이틀 */}
            <h1 className="text-[clamp(40px,7vw,64px)] font-black leading-[1.08] tracking-[-0.035em] text-gray-900 dark:text-white">
              개발자를 위한
              <br />
              <span className="bg-gradient-to-r from-indigo-500 via-purple-400 to-sky-400 dark:from-indigo-400 dark:via-purple-400 dark:to-sky-300 bg-clip-text text-transparent">
                웹 도구 모음
              </span>
            </h1>

            {/* 서브 텍스트 */}
            <p className="text-[15px] text-gray-500 dark:text-white/42 leading-relaxed max-w-[420px]">
              개발과 일상에서 자주 쓰는 소형 도구들.
              <br />
              브라우저에서 바로, 설치 없이 사용하세요.
            </p>

            {/* 인라인 통계 */}
            <div className="flex items-center gap-3.5 text-sm mt-1">
              <span>
                <span className="font-bold text-gray-900 dark:text-white tabular-nums">{tools.length}</span>
                <span className="text-gray-400 dark:text-white/30 ml-1">tools</span>
              </span>
              <span className="text-gray-200 dark:text-white/12 text-base select-none">/</span>
              <span>
                <span className="font-bold text-gray-900 dark:text-white tabular-nums">{liveCount}</span>
                <span className="text-gray-400 dark:text-white/30 ml-1">live</span>
              </span>
              <span className="text-gray-200 dark:text-white/12 text-base select-none">/</span>
              <span>
                <span className="font-bold text-gray-900 dark:text-white">100%</span>
                <span className="text-gray-400 dark:text-white/30 ml-1">free</span>
              </span>
            </div>
          </div>
        </section>

        {/* 도구 목록 */}
        <section className="max-w-[1120px] mx-auto px-6 pb-28">
          {/* 섹션 헤더 */}
          <div className="flex items-center gap-4 mb-5">
            <span className="text-[11px] font-bold tracking-[0.08em] uppercase text-gray-400 dark:text-white/30 shrink-0">
              All Tools
            </span>
            <div className="flex-1 h-px bg-black/[0.07] dark:bg-white/[0.07]" />
            <span className="text-[11px] font-medium text-gray-400 dark:text-white/25 tabular-nums shrink-0">
              {activeTag ? `${filteredTools.length} / ${tools.length}` : `${tools.length} total`}
            </span>
          </div>

          {/* 태그 필터 */}
          <div className="flex gap-2 flex-wrap mb-8">
            <button
              onClick={() => setActiveTag(null)}
              className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                activeTag === null
                  ? 'bg-indigo-500 text-white border-indigo-500'
                  : 'text-gray-400 dark:text-white/40 border-black/[0.10] dark:border-white/[0.10] hover:border-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-400'
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                  activeTag === tag
                    ? 'bg-indigo-500 text-white border-indigo-500'
                    : 'text-gray-400 dark:text-white/40 border-black/[0.10] dark:border-white/[0.10] hover:border-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-400'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
            {filteredTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
            {filteredTools.length === 0 && (
              <p className="col-span-full text-center py-16 text-[13px] text-gray-400 dark:text-white/25">
                해당 태그의 도구가 없습니다.
              </p>
            )}
          </div>
        </section>
      </main>

      {/* 푸터 */}
      <footer className="border-t border-black/[0.07] dark:border-white/[0.06] py-5 px-6">
        <div className="max-w-[1120px] mx-auto flex items-center justify-between">
          <p className="text-[12px] text-gray-400 dark:text-white/25">
            Built with React &amp; Tailwind CSS
          </p>
          <a
            href={GITHUB_REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] text-gray-400 dark:text-white/25 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
          >
            View on GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
