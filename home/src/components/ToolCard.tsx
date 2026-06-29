/**
 * 도구 카드의 시각 표현과 링크 동작을 담당한다.
 */
import type { Tool } from '../data/tools';

function ExternalLinkIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

interface ToolCardProps {
  tool: Tool;
}

/**
 * 개별 도구의 상태, 설명, 외부 링크를 카드 형태로 렌더링한다.
 */
export default function ToolCard({ tool }: ToolCardProps) {
  const { id, name, longDescription, tags, url, github, status } = tool;
  const isLive = status === 'live';

  return (
    <article
      className={`toolCard relative flex flex-col rounded-2xl overflow-hidden bg-white dark:bg-surface-dark border border-black/[0.08] dark:border-white/[0.07] ${!isLive ? 'cursor-default' : ''}`}
      data-tool-id={id}
      data-live={isLive ? 'true' : 'false'}
    >
      {/* accent 링 오버레이 — pointer-events-none이므로 상호작용에 영향 없음 */}
      <div className="toolCardAccentRing absolute inset-0 rounded-2xl pointer-events-none z-[3]" />

      {/* 그라디언트 배너 */}
      <div className="toolCardHero h-[148px] relative shrink-0">
        {/* z-auto: stretched link(z-1)이 위에서 클릭 영역을 담당 */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/5 to-black/40" />

        {/* 상태 뱃지 — z-[1]: 그라디언트 위, stretched link와 동일 레벨(DOM 순서상 ::after가 위) */}
        <div className="absolute top-3.5 right-3.5 z-[1]">
          <span
            className={`text-[10px] font-bold tracking-normal uppercase px-2.5 py-1 rounded-full backdrop-blur-sm ${
              isLive ? 'bg-white/22 text-white' : 'bg-black/28 text-white/58'
            }`}
          >
            {isLive ? 'Live' : 'Soon'}
          </span>
        </div>

        {/* 도구 이름 */}
        <div className="absolute bottom-3.5 left-4 right-4 z-[1]">
          <h3 className="text-[17px] font-bold text-white leading-snug tracking-normal drop-shadow-sm">
            {name}
          </h3>
        </div>
      </div>

      {/* 콘텐츠 영역 */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        <p className="text-[13px] leading-[1.65] text-gray-500 dark:text-white/48 line-clamp-3">
          {longDescription}
        </p>

        {/* 태그 */}
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="toolTag text-[11px] font-medium px-2 py-0.5 rounded-md tracking-normal"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-2 mt-auto pt-3 border-t border-black/[0.06] dark:border-white/[0.06]">
          {isLive && url ? (
            /*
             * Stretched Link 패턴:
             * ::after(z-1)가 article 전체를 덮어 카드 어디서나 클릭 가능하게 함.
             * article에 onClick/tabIndex를 두지 않으므로 스크린 리더 이중 포커스 없음.
             * GitHub 링크(z-2)는 ::after 위에 위치해 독립적으로 클릭 가능.
             */
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="toolVisitButton relative z-[1] flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-semibold transition-opacity hover:opacity-70 after:absolute after:inset-0 after:z-[1] after:content-[''] after:rounded-2xl focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
            >
              <ExternalLinkIcon />
              Visit Site
            </a>
          ) : (
            <span className="flex-1 flex items-center justify-center py-2 rounded-lg text-[12px] font-semibold text-gray-300 dark:text-white/22 bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06] cursor-not-allowed">
              Coming Soon
            </span>
          )}
          {/* relative z-[2]: stretched link(z-1) 위에 위치하여 독립 클릭 보장 */}
          <a
            href={github}
            target="_blank"
            rel="noopener noreferrer"
            className="relative z-[2] flex items-center justify-center w-9 rounded-lg text-gray-500 dark:text-white/42 bg-gray-50 dark:bg-white/[0.04] border border-gray-100 dark:border-white/[0.06] hover:text-gray-800 dark:hover:text-white/80 hover:bg-gray-100 dark:hover:bg-white/[0.08] hover:border-gray-200 dark:hover:border-white/[0.14] transition-all"
            aria-label={`${name} GitHub 저장소`}
          >
            <GitHubIcon />
          </a>
        </div>
      </div>
    </article>
  );
}
