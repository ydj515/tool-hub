import { ArrowLeftRight, Loader2, RotateCcw } from "lucide-react";
import { TOOL_HUB_URL } from "@/app/_lib/constants";
import { Button } from "./design-system/Button";
import { ToolHeader } from "./design-system/ToolHeader";
import { PRODUCT, ProductIcon } from "./design-system/product.generated";

/**
 * 상단 바: 브랜드 + 초기화 + 비교 + 테마 토글.
 * 페이지 액션을 품으므로 root layout이 아니라 페이지가 렌더한다.
 */
interface TopbarProps {
  isComparing: boolean;
  hasParseError: boolean;
  onReset: () => void;
  onCompare: () => void;
  theme: "light" | "dark";
  mounted: boolean;
  onToggleTheme: () => void;
}

export default function Topbar({
  isComparing,
  hasParseError,
  onReset,
  onCompare,
  theme,
  mounted,
  onToggleTheme,
}: TopbarProps) {
  const actions = (
    <div className="config-header-actions">
      <Button variant="secondary" onClick={onReset}>
        <RotateCcw size={16} strokeWidth={2} />
        초기화
      </Button>
      <Button
        variant="primary"
        onClick={onCompare}
        disabled={isComparing || hasParseError}
        title={hasParseError ? "파싱 오류를 먼저 수정하세요." : undefined}
      >
        {isComparing ? (
          <Loader2 size={16} strokeWidth={2} className="spinning" />
        ) : (
          <ArrowLeftRight size={16} strokeWidth={2} />
        )}
        비교
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
