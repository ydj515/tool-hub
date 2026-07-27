import { renderToStaticMarkup } from 'react-dom/server';
import { PenLine } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { Badge } from './Badge';
import { BrandMark } from './BrandMark';
import { Button } from './Button';
import { EmptyState } from './EmptyState';
import { SegmentedControl } from './SegmentedControl';
import { ThemeToggle } from './ThemeToggle';
import { ToolHeader } from './ToolHeader';

describe('생성 디자인 시스템 컴포넌트', () => {
  it('Button은 기본 type과 variant별 소비자 계약을 출력한다', () => {
    const defaultHtml = renderToStaticMarkup(<Button>저장</Button>);
    const primaryHtml = renderToStaticMarkup(<Button variant="primary">저장</Button>);
    const dangerHtml = renderToStaticMarkup(<Button variant="danger">삭제</Button>);

    expect(defaultHtml).toContain('type="button"');
    expect(defaultHtml).toContain('data-ds-button="true"');
    expect(defaultHtml).toContain('ds-button--secondary');
    expect(primaryHtml).toContain('data-variant="primary"');
    expect(primaryHtml).toContain('ds-button--primary');
    expect(dangerHtml).toContain('ds-button--danger');
  });

  it('Button은 접근성 이름 없는 icon variant를 거부한다', () => {
    expect(() => renderToStaticMarkup(<Button variant="icon">+</Button>)).toThrow(/aria-label/);
  });

  it('Button icon variant는 접근성 이름이 있으면 제어 요소를 출력한다', () => {
    const html = renderToStaticMarkup(<Button variant="icon" aria-label="메뉴 열기">+</Button>);

    expect(html).toContain('data-variant="icon"');
    expect(html).toContain('aria-label="메뉴 열기"');
    expect(html).toContain('ds-button--icon');
  });

  it('BrandMark는 장식용 브랜드 아이콘을 출력한다', () => {
    const html = renderToStaticMarkup(<BrandMark icon={PenLine} />);

    expect(html).toContain('data-ds-brand-mark="true"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('data-ds-icon="true"');
  });

  it('ThemeToggle은 두 테마의 다음 행동을 접근성 이름으로 알린다', () => {
    const lightHtml = renderToStaticMarkup(<ThemeToggle theme="light" onToggle={() => {}} />);
    const darkHtml = renderToStaticMarkup(<ThemeToggle theme="dark" onToggle={() => {}} />);

    expect(lightHtml).toContain('다크 테마로 전환');
    expect(darkHtml).toContain('라이트 테마로 전환');
    expect(lightHtml).toContain('data-ds-theme-toggle="true"');
    expect(darkHtml).toContain('data-ds-theme-toggle="true"');
  });

  it('ThemeToggle은 마운트 전에는 아이콘 대신 크기 보존 placeholder를 출력한다', () => {
    const html = renderToStaticMarkup(<ThemeToggle theme="light" mounted={false} onToggle={() => {}} />);

    expect(html).toContain('ds-theme-placeholder');
    expect(html).not.toContain('<svg');
  });

  it('ThemeToggle은 icon Button 기본 class와 소비자 className을 병합한다', () => {
    const html = renderToStaticMarkup(
      <ThemeToggle theme="light" className="header-theme-toggle" onToggle={() => {}} />,
    );

    expect(html).toContain('class="ds-button ds-button--icon header-theme-toggle"');
  });

  it('SegmentedControl은 단일 선택을 aria-pressed로 표현한다', () => {
    const html = renderToStaticMarkup(
      <SegmentedControl
        value="a"
        ariaLabel="보기"
        onValueChange={() => {}}
        options={[
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
        ]}
      />,
    );

    expect(html).toContain('data-ds-segmented="true"');
    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label="보기"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('aria-pressed="false"');
  });

  it('SegmentedControl은 disabled 상태를 그룹과 모든 선택지에 반영한다', () => {
    const html = renderToStaticMarkup(
      <SegmentedControl
        value="a"
        ariaLabel="보기"
        disabled
        onValueChange={() => {}}
        options={[
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
        ]}
      />,
    );

    expect(html).toContain('aria-disabled="true"');
    expect((html.match(/disabled=""/g) ?? [])).toHaveLength(2);
  });

  it('EmptyState는 선택적 아이콘, 설명, 액션 없이 제목만 출력할 수 있다', () => {
    const html = renderToStaticMarkup(<EmptyState title="결과가 없습니다" />);

    expect(html).toContain('data-ds-empty-state="true"');
    expect(html).toContain('<strong>결과가 없습니다</strong>');
    expect(html).not.toContain('ds-empty-state__icon');
    expect(html).not.toContain('ds-empty-state__action');
    expect(html).not.toContain('<p>');
  });

  it('EmptyState는 제공한 모든 보조 영역을 출력한다', () => {
    const html = renderToStaticMarkup(
      <EmptyState
        icon={<PenLine />}
        title="결과가 없습니다"
        description="조건을 변경해 보세요"
        action={<Button>초기화</Button>}
      />,
    );

    expect(html).toContain('ds-empty-state__icon');
    expect(html).toContain('<p>조건을 변경해 보세요</p>');
    expect(html).toContain('ds-empty-state__action');
  });

  it('Badge는 variant를 data attribute와 class에 반영한다', () => {
    const html = renderToStaticMarkup(<Badge variant="success">완료</Badge>);

    expect(html).toContain('data-ds-badge="true"');
    expect(html).toContain('data-variant="success"');
    expect(html).toContain('ds-badge--success');
    expect(html).toContain('완료');
  });

  it('ToolHeader는 브랜드, actions, utilities와 마지막 ThemeToggle을 구조화한다', () => {
    const html = renderToStaticMarkup(
      <ToolHeader
        product={{ name: 'Sign Maker', description: '설명', icon: PenLine }}
        homeHref="https://example.com"
        theme="light"
        actions={<Button>저장</Button>}
        utilities={<span>도움말</span>}
        onThemeToggle={() => {}}
      />,
    );

    expect(html).toContain('<header');
    expect(html).toContain('data-ds-tool-header="true"');
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('aria-label="Sign Maker에서 Tool Hub로 이동"');
    expect(html).toContain('<h1>Sign Maker</h1>');
    expect(html).toContain('data-ds-tool-actions="true"');
    expect(html).toContain('data-ds-tool-utilities="true"');
    expect(html.indexOf('도움말')).toBeLessThan(html.indexOf('data-ds-theme-toggle'));
    expect(html).toContain('다크 테마로 전환');
  });
});
