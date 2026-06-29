/**
 * 업로드 모드의 컨트롤 패널 콘텐츠: 안내 + 배경 임계값 슬라이더 + 초기화/내려받기.
 */
import Button from "./ui/Button";

interface ImageControlsProps {
  threshold: number;
  onThresholdChange: (value: number) => void;
  onReset: () => void;
  onDownload: () => void;
}

export default function ImageControls({
  threshold,
  onThresholdChange,
  onReset,
  onDownload,
}: ImageControlsProps) {
  return (
    <>
      <p className="panel-copy text-sm leading-relaxed">
        흰 배경의 이미지를 업로드하면 서명을 추출해요.
      </p>

      <div>
        <label className="setting-label flex justify-between mb-2 text-sm font-medium">
          <span>배경 임계값</span>
          <span className="setting-value">{threshold}</span>
        </label>
        <input
          type="range"
          min="0"
          max="255"
          value={threshold}
          onChange={(e) => onThresholdChange(Number(e.target.value))}
          className="w-full"
        />
      </div>

      <div className="flex gap-2 mt-auto">
        <Button variant="secondary" className="flex-1 h-10 text-sm font-semibold" onClick={onReset}>
          초기화
        </Button>
        <Button variant="primary" className="flex-1 h-10 text-sm font-semibold" onClick={onDownload}>
          내려받기
        </Button>
      </div>
    </>
  );
}
