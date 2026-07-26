/**
 * 상단 카드 셸: 제품 정보 + 모드 전환 + 테마 토글.
 * 테마·모드 상태는 페이지가 소유하고 props로 주입한다.
 */
import { Image, PenLine } from "lucide-react";
import { TOOL_HUB_URL } from "../../constants";
import { SegmentedControl } from "../design-system/SegmentedControl";
import { ToolHeader } from "../design-system/ToolHeader";
import { PRODUCT, ProductIcon } from "../design-system/product.generated";

interface HeaderProps {
  theme: "light" | "dark";
  onToggleTheme: () => void;
  activeTab: "draw" | "upload";
  onTabChange: (tab: "draw" | "upload") => void;
}

export default function Header({ theme, onToggleTheme, activeTab, onTabChange }: HeaderProps) {
  return (
    <ToolHeader
      product={{ ...PRODUCT, icon: ProductIcon }}
      homeHref={TOOL_HUB_URL}
      theme={theme}
      onThemeToggle={onToggleTheme}
      actions={
        <SegmentedControl
          value={activeTab}
          onValueChange={onTabChange}
          ariaLabel="서명 입력 방식"
          options={[
            {
              value: "draw",
              label: "그리기",
              icon: <PenLine size={16} strokeWidth={2} />,
            },
            {
              value: "upload",
              label: "업로드",
              icon: <Image size={16} strokeWidth={2} />,
            },
          ]}
        />
      }
    />
  );
}
