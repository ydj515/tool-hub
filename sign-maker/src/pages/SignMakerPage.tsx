/**
 * 서명 그리기/이미지 추출 워크플로를 조립하는 페이지.
 * 모드(activeTab)·임계값·테마 상태와 캔버스 ref를 소유한다.
 */
import { useState, useRef } from "react";
import Header from "../components/layout/Header";
import Panel from "../components/ui/Panel";
import SignaturePad from "../components/SignaturePad";
import type { SignaturePadRef } from "../components/SignaturePad";
import ImageUploader from "../components/ImageUploader";
import type { ImageUploaderRef } from "../components/ImageUploader";
import DrawControls from "../components/DrawControls";
import ImageControls from "../components/ImageControls";
import { useTheme } from "../hooks/useTheme";

export default function SignMakerPage() {
  const [activeTab, setActiveTab] = useState<"draw" | "upload">("draw");
  const [threshold, setThreshold] = useState<number>(200);
  const [preview, setPreview] = useState<string | null>(null);
  const { theme, toggle } = useTheme();

  const signaturePadRef = useRef<SignaturePadRef>(null);
  const imageUploaderRef = useRef<ImageUploaderRef>(null);

  return (
    <>
      <Header
        theme={theme}
        onToggleTheme={toggle}
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (tab !== activeTab) { setActiveTab(tab); setPreview(null); }
        }}
      />

      <div className="ds-shell signature-workbench">
        {/* Canvas panel */}
        <Panel
          title="캔버스"
          className="overflow-hidden"
          headClassName="flex items-center gap-2"
          bodyClassName="flex-1"
        >
          {activeTab === "draw"
            ? <SignaturePad ref={signaturePadRef} onPreviewChange={setPreview} />
            : <ImageUploader ref={imageUploaderRef} threshold={threshold} onPreviewChange={setPreview} />}
        </Panel>

        {/* Controls panel */}
        <Panel
          as="aside"
          title={activeTab === "draw" ? "서명 미리보기" : "이미지 설정"}
          bodyClassName="flex flex-col gap-4 flex-1"
        >
          <div className="signature-preview" aria-label="서명 미리보기">
            {preview ? <img src={preview} alt="현재 서명 미리보기" /> : <p>서명을 입력하면 여기에 표시됩니다.</p>}
          </div>
          {activeTab === "draw" ? (
            <DrawControls
              onClear={() => signaturePadRef.current?.clear()}
              onDownload={() => signaturePadRef.current?.download()}
            />
          ) : (
            <ImageControls
              threshold={threshold}
              onThresholdChange={setThreshold}
              onReset={() => { imageUploaderRef.current?.reset(); setThreshold(200); }}
              onDownload={() => imageUploaderRef.current?.download()}
            />
          )}
        </Panel>
      </div>
      <footer className="signature-status">투명 배경 PNG · 서명은 브라우저 밖으로 전송되지 않습니다.</footer>
    </>
  );
}
