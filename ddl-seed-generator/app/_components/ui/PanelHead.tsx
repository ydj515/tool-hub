import type { ReactNode } from "react";

/**
 * editorPanel / resultPanel 상단 헤더(.panelHead): 제목 + 설명 + 우측 아이콘.
 */
export default function PanelHead({
  title,
  description,
  icon,
}: {
  title: string;
  description: ReactNode;
  icon: ReactNode;
}) {
  return (
    <div className="panelHead">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {icon}
    </div>
  );
}
