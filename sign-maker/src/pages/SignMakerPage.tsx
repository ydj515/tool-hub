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
  const { theme, toggle } = useTheme();

  const signaturePadRef = useRef<SignaturePadRef>(null);
  const imageUploaderRef = useRef<ImageUploaderRef>(null);

  return (
    <>
      <Header
        theme={theme}
        onToggleTheme={toggle}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="max-w-[1400px] mx-auto grid gap-5 grid-cols-1 md:grid-cols-[1fr_320px]">
        {/* Canvas panel */}
        <Panel
          title="캔버스"
          className="overflow-hidden"
          headClassName="flex items-center gap-2"
          bodyClassName="flex-1"
        >
          {activeTab === "draw"
            ? <SignaturePad ref={signaturePadRef} />
            : <ImageUploader ref={imageUploaderRef} threshold={threshold} />}
        </Panel>

        {/* Controls panel */}
        <Panel
          as="aside"
          title={activeTab === "draw" ? "그리기 도구" : "이미지 설정"}
          bodyClassName="flex flex-col gap-4 flex-1"
        >
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
    </>
  );
}
