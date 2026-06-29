/**
 * 그리기 모드의 컨트롤 패널 콘텐츠: 안내 문구 + 지우기/내려받기.
 */
import Button from "./ui/Button";

interface DrawControlsProps {
  onClear: () => void;
  onDownload: () => void;
}

export default function DrawControls({ onClear, onDownload }: DrawControlsProps) {
  return (
    <>
      <p className="panel-copy text-sm leading-relaxed">
        캔버스에 서명을 그리세요. 펜을 멈추면 3초 후 자동으로 부드럽게 정리돼요.
      </p>
      <div className="flex gap-2 mt-auto">
        <Button variant="secondary" className="flex-1 h-10 text-sm font-semibold" onClick={onClear}>
          지우기
        </Button>
        <Button variant="primary" className="flex-1 h-10 text-sm font-semibold" onClick={onDownload}>
          내려받기
        </Button>
      </div>
    </>
  );
}
