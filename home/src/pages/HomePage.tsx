/**
 * Tool Hub 홈 화면 콘텐츠: 히어로 영역과 태그 필터링 도구 목록을 렌더링한다.
 */
import { useState } from 'react';
import ToolCard from '../components/ToolCard';
import FilterButton from '../components/ui/FilterButton';
import Stat from '../components/ui/Stat';
import { tools } from '../data/tools';

const liveCount = tools.filter((t) => t.status === 'live').length;
const allTags = [...new Set(tools.flatMap((t) => t.tags))];

export default function HomePage() {
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const filteredTools = activeTag
    ? tools.filter((t) => t.tags.includes(activeTag))
    : tools;

  return (
    <>
      {/* 히어로 */}
      <section className="py-14 sm:py-24 px-6">
        <div className="max-w-[600px] mx-auto text-center flex flex-col items-center gap-5">
          {/* 상태 인디케이터 */}
          <div className="flex items-center gap-2 text-[11px] font-semibold text-primary dark:text-primary-light tracking-normal uppercase">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-light opacity-70" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary dark:bg-primary-light" />
            </span>
            Open Source · Always Free
          </div>

          {/* 메인 타이틀 */}
          <h1 className="text-[clamp(40px,7vw,64px)] font-black leading-[1.08] tracking-normal text-gray-900 dark:text-white">
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
            <Stat value={tools.length} label="tools" />
            <span className="text-gray-200 dark:text-white/12 text-base select-none">/</span>
            <Stat value={liveCount} label="live" />
            <span className="text-gray-200 dark:text-white/12 text-base select-none">/</span>
            <Stat value="100%" label="free" tabular={false} />
          </div>
        </div>
      </section>

      {/* 도구 목록 */}
      <section className="max-w-[1120px] mx-auto px-6 pb-28">
        {/* 섹션 헤더 */}
        <div className="flex items-center gap-4 mb-5">
          <span className="text-[11px] font-bold tracking-normal uppercase text-gray-400 dark:text-white/30 shrink-0">
            All Tools
          </span>
          <div className="flex-1 h-px bg-black/[0.07] dark:bg-white/[0.07]" />
          <span className="text-[11px] font-medium text-gray-400 dark:text-white/25 tabular-nums shrink-0">
            {activeTag ? `${filteredTools.length} / ${tools.length}` : `${tools.length} total`}
          </span>
        </div>

        {/* 태그 필터 */}
        <div className="flex gap-2 flex-wrap mb-8">
          <FilterButton
            label="All"
            active={activeTag === null}
            onClick={() => setActiveTag(null)}
          />
          {allTags.map((tag) => (
            <FilterButton
              key={tag}
              label={tag}
              active={activeTag === tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
            />
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
    </>
  );
}
