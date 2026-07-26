import { Sparkles } from "lucide-react";
import { TOOL_HUB_URL } from "@/app/_lib/constants";
import { Button } from "@/app/_components/design-system/Button";
import { ToolHeader } from "@/app/_components/design-system/ToolHeader";
import { PRODUCT, ProductIcon } from "@/app/_components/design-system/product.generated";

/**
 * 상단 바: 브랜드 + 샘플 불러오기 + 생성 + 테마 토글.
 * 페이지 액션을 품으므로 root layout이 아니라 페이지가 렌더한다.
 */
interface TopbarProps {
  canGenerate: boolean;
  onGenerate: () => void;
  onLoadPreset: (presetKey: string) => void;
  theme: "light" | "dark";
  mounted: boolean;
  onToggleTheme: () => void;
}

export default function Topbar({
  canGenerate,
  onGenerate,
  onLoadPreset,
  theme,
  mounted,
  onToggleTheme,
}: TopbarProps) {
  const actions = (
    <div className="ddl-header-actions">
      <select
        className="sampleSelect"
        defaultValue=""
        onChange={(event) => {
          onLoadPreset(event.target.value);
          event.target.value = "";
        }}
        aria-label="샘플 DDL 불러오기"
      >
        <option value="" disabled>샘플</option>
        <option value="basic">기본 — PostgreSQL</option>
        <option value="schema">스키마 + ALTER TABLE — PostgreSQL</option>
        <option value="advanced">GENERATED ALWAYS AS IDENTITY — PostgreSQL</option>
        <option value="mysql">AUTO_INCREMENT + ENUM — MySQL</option>
        <option value="h2">IDENTITY 타입 — H2</option>
      </select>
      <Button variant="primary" disabled={!canGenerate} onClick={onGenerate}>
        <Sparkles size={16} strokeWidth={2} />
        생성
      </Button>
    </div>
  );

  return (
    <ToolHeader
      product={{ ...PRODUCT, icon: ProductIcon }}
      homeHref={TOOL_HUB_URL}
      theme={theme}
      mounted={mounted}
      onThemeToggle={onToggleTheme}
      actions={actions}
    />
  );
}
