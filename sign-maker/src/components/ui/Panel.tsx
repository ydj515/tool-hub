/**
 * 카드(.ds-card) + 헤더(.panel-head/.panel-title) 셸.
 * 본문은 children 슬롯으로 받고, as로 시맨틱 태그(section/aside)를 고른다.
 */
import type { ElementType, ReactNode } from "react";

interface PanelProps {
  title: ReactNode;
  as?: ElementType;
  className?: string;
  headClassName?: string;
  bodyClassName?: string;
  children: ReactNode;
}

export default function Panel({
  title,
  as: Tag = "section",
  className = "",
  headClassName = "",
  bodyClassName = "",
  children,
}: PanelProps) {
  return (
    <Tag className={`ds-card flex flex-col ${className}`.trim()}>
      <div className={`panel-head px-5 py-3.5 border-b ${headClassName}`.trim()}>
        <span className="panel-title text-sm font-semibold">{title}</span>
      </div>
      <div className={`p-5 ${bodyClassName}`.trim()}>{children}</div>
    </Tag>
  );
}
