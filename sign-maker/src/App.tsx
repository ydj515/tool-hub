/**
 * 서명 그리기와 이미지 추출 워크플로를 묶는 메인 화면 컴포넌트다.
 */
import { useState, useRef, useEffect } from "react";
import { PenTool, Image as ImageIcon, Moon, Sun, Pencil } from "lucide-react";
import SignaturePad from "./components/SignaturePad";
import type { SignaturePadRef } from "./components/SignaturePad";
import ImageUploader from "./components/ImageUploader";
import type { ImageUploaderRef } from "./components/ImageUploader";
import { resolveInitialTheme } from "./theme";

/**
 * 서명 그리기와 이미지 추출 워크플로를 한 화면에서 전환한다.
 */
function App() {
  const [activeTab, setActiveTab] = useState<"draw" | "upload">("draw");
  const [threshold, setThreshold] = useState<number>(200);
  const [theme, setTheme] = useState<"light" | "dark">(resolveInitialTheme);

  const signaturePadRef = useRef<SignaturePadRef>(null);
  const imageUploaderRef = useRef<ImageUploaderRef>(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("theme", theme);
    } catch {
      /* localStorage unavailable */
    }
  }, [theme]);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      {/* Top bar */}
      <header className="ds-card flex items-center gap-3 max-w-[1400px] mx-auto mb-5 px-5 py-4">
        <div
          className="app-mark w-10 h-10 rounded-xl grid place-items-center shrink-0"
        >
          <Pencil size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="app-title text-xl font-bold leading-tight">
            Signature &amp; Trace Studio
          </h1>
          <p className="app-subtitle text-sm mt-0.5">
            서명을 직접 그리거나 이미지에서 추출해요.
          </p>
        </div>

        {/* Tab switcher — segmented control */}
        <div className="seg flex items-center gap-1">
          <button
            onClick={() => setActiveTab("draw")}
            data-active={activeTab === "draw"}
            className="seg-btn flex items-center gap-1.5 px-3 h-8 text-sm font-semibold"
          >
            <PenTool size={14} />
            Draw
          </button>
          <button
            onClick={() => setActiveTab("upload")}
            data-active={activeTab === "upload"}
            className="seg-btn flex items-center gap-1.5 px-3 h-8 text-sm font-semibold"
          >
            <ImageIcon size={14} />
            Upload
          </button>
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          aria-label="테마 전환"
          className="btn-icon w-9 h-9 grid place-items-center shrink-0"
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </header>

      {/* Workspace */}
      <div className="max-w-[1400px] mx-auto grid gap-5 grid-cols-1 md:grid-cols-[1fr_320px]">

        {/* Canvas panel */}
        <section className="ds-card overflow-hidden flex flex-col">
          <div className="panel-head flex items-center gap-2 px-5 py-3.5 border-b">
            <span className="panel-title text-sm font-semibold">
              캔버스
            </span>
          </div>
          <div className="flex-1 p-5">
            {activeTab === "draw"
              ? <SignaturePad ref={signaturePadRef} />
              : <ImageUploader ref={imageUploaderRef} threshold={threshold} />}
          </div>
        </section>

        {/* Controls panel */}
        <aside className="ds-card flex flex-col">
          <div className="panel-head px-5 py-3.5 border-b">
            <span className="panel-title text-sm font-semibold">
              {activeTab === "draw" ? "그리기 도구" : "이미지 설정"}
            </span>
          </div>

          <div className="p-5 flex flex-col gap-4 flex-1">
            {activeTab === "draw" ? (
              <>
                <p className="panel-copy text-sm leading-relaxed">
                  캔버스에 서명을 그리세요. 펜을 멈추면 3초 후 자동으로 부드럽게 정리돼요.
                </p>
                <div className="flex gap-2 mt-auto">
                  <button
                    onClick={() => signaturePadRef.current?.clear()}
                    className="btn-secondary flex-1 h-10 text-sm font-semibold"
                  >
                    지우기
                  </button>
                  <button
                    onClick={() => signaturePadRef.current?.download()}
                    className="btn-primary flex-1 h-10 text-sm font-semibold"
                  >
                    내려받기
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="panel-copy text-sm leading-relaxed">
                  흰 배경의 이미지를 업로드하면 서명을 추출해요.
                </p>

                <div>
                  <label
                    className="setting-label flex justify-between mb-2 text-sm font-medium"
                  >
                    <span>배경 임계값</span>
                    <span className="setting-value">{threshold}</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="flex gap-2 mt-auto">
                  <button
                    onClick={() => { imageUploaderRef.current?.reset(); setThreshold(200); }}
                    className="btn-secondary flex-1 h-10 text-sm font-semibold"
                  >
                    초기화
                  </button>
                  <button
                    onClick={() => imageUploaderRef.current?.download()}
                    className="btn-primary flex-1 h-10 text-sm font-semibold"
                  >
                    내려받기
                  </button>
                </div>
              </>
            )}
          </div>
        </aside>
      </div>

    </div>
  );
}

export default App;
