import { useState } from 'react';
import ToolCard from '../components/ToolCard';
import FilterButton from '../components/ui/FilterButton';
import { catalog, categories, type Category } from '../data/catalog';

export default function HomePage() {
  const [category, setCategory] = useState<Category>('전체');
  const visibleTools = catalog.filter((tool) => category === '전체' || tool.category === category);
  return (
    <>
      <section className="landingHero" aria-labelledby="hero-title">
        <img className="landingHeroArt" src="/images/toolhub-hero.webp" alt="" fetchPriority="high" width="1800" height="650" />
        <div className="ds-shell landingHeroContent">
          <h1 id="hero-title">ToolHub</h1>
          <p>데이터 변환, 파일 생성 등 자주 사용하는 도구 모음입니다.</p>
          <a className="heroAction" href="#tools">도구 둘러보기 <span aria-hidden="true">→</span></a>
        </div>
      </section>
      <section id="tools" className="ds-shell toolCatalog" aria-label="도구 모음">
        <div className="categoryFilters" role="group" aria-label="도구 분류">
          {categories.map((label) => (
            <FilterButton key={label} label={label} active={category === label} onClick={() => setCategory(label)} />
          ))}
        </div>
        <p className="sr-only" role="status">{category} 도구 {visibleTools.length}개</p>
        <div className="toolGrid">
          {visibleTools.map((tool, index) => <ToolCard key={tool.id} tool={tool} description={tool.description} eager={index < 3} />)}
        </div>
      </section>
    </>
  );
}
