import { useState, useRef, useEffect } from "react";
import { PenTool, Image as ImageIcon, Moon, Sun, Pencil } from "lucide-react";
import SignaturePad from "./components/SignaturePad";
import type { SignaturePadRef } from "./components/SignaturePad";
import ImageUploader from "./components/ImageUploader";
import type { ImageUploaderRef } from "./components/ImageUploader";

function App() {
  const [activeTab, setActiveTab] = useState<"draw" | "upload">("draw");
  const [threshold, setThreshold] = useState<number>(200);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  const signaturePadRef = useRef<SignaturePadRef>(null);
  const imageUploaderRef = useRef<ImageUploaderRef>(null);

  useEffect(() => {
    let initial: "light" | "dark" = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    try {
      const saved = localStorage.getItem("theme");
      if (saved === "light" || saved === "dark") initial = saved;
    } catch { /* localStorage unavailable */ }
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
    setMounted(true);
  }, []);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch { /* localStorage unavailable */ }
  }

  return (
    <div className="min-h-screen p-4 md:p-5">
      {/* Top bar */}
      <header
        className="flex items-center gap-3 max-w-[1400px] mx-auto mb-4 px-4 py-3.5 rounded-lg bg-surface border border-line"
      >
        <div
          className="w-10 h-10 rounded-lg grid place-items-center shrink-0"
          style={{ background: "var(--green)", color: "#f8fff9" }}
        >
          <Pencil size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold leading-tight" style={{ color: "var(--text)" }}>
            Signature &amp; Trace Studio
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
            서명을 직접 그리거나 이미지에서 추출합니다.
          </p>
        </div>

        {/* Tab switcher */}
        <div
          className="flex items-center rounded-lg overflow-hidden"
          style={{ border: "1px solid var(--line)" }}
        >
          <button
            onClick={() => setActiveTab("draw")}
            className="flex items-center gap-1.5 px-3 h-9 text-sm font-bold transition-colors"
            style={
              activeTab === "draw"
                ? { background: "var(--green)", color: "#f8fff9", border: "none" }
                : { background: "var(--surface-2)", color: "var(--muted)", border: "none" }
            }
          >
            <PenTool size={14} />
            Draw
          </button>
          <button
            onClick={() => setActiveTab("upload")}
            className="flex items-center gap-1.5 px-3 h-9 text-sm font-bold transition-colors"
            style={
              activeTab === "upload"
                ? { background: "var(--green)", color: "#f8fff9", border: "none" }
                : { background: "var(--surface-2)", color: "var(--muted)", border: "none" }
            }
          >
            <ImageIcon size={14} />
            Upload
          </button>
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          aria-label="테마 전환"
          className="w-9 h-9 rounded-lg grid place-items-center transition-colors"
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--line)",
            color: "var(--muted)",
          }}
        >
          {mounted ? (theme === "dark" ? <Sun size={16} /> : <Moon size={16} />) : <span style={{ display: "block", width: 16, height: 16 }} />}
        </button>
      </header>

      {/* Workspace */}
      <div className="max-w-[1400px] mx-auto grid gap-4 grid-cols-1 md:grid-cols-[1fr_320px]">

        {/* Canvas panel */}
        <section
          className="rounded-lg overflow-hidden flex flex-col"
          style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
        >
          <div
            className="flex items-center gap-2 px-4 py-3 border-b"
            style={{ borderColor: "var(--line)", background: "var(--surface-2)" }}
          >
            <span className="text-xs font-extrabold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
              Canvas Workspace
            </span>
          </div>
          <div className="flex-1 p-4">
            {activeTab === "draw"
              ? <SignaturePad ref={signaturePadRef} />
              : <ImageUploader ref={imageUploaderRef} threshold={threshold} />}
          </div>
        </section>

        {/* Controls panel */}
        <aside
          className="rounded-lg flex flex-col"
          style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
        >
          <div
            className="px-4 py-3 border-b"
            style={{ borderColor: "var(--line)", background: "var(--surface-2)" }}
          >
            <span className="text-xs font-extrabold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
              {activeTab === "draw" ? "Drawing Tools" : "Image Settings"}
            </span>
          </div>

          <div className="p-4 flex flex-col gap-4 flex-1">
            {activeTab === "draw" ? (
              <>
                <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                  캔버스에 서명을 그리세요. 펜을 멈추면 3초 후 자동으로 부드럽게 처리됩니다.
                </p>
                <div className="flex gap-2 mt-auto">
                  <button
                    onClick={() => signaturePadRef.current?.clear()}
                    className="flex-1 h-10 rounded-lg text-sm font-bold transition-colors"
                    style={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--line)",
                      color: "var(--text)",
                    }}
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => signaturePadRef.current?.download()}
                    className="flex-1 h-10 rounded-lg text-sm font-bold transition-colors"
                    style={{ background: "var(--green)", color: "#f8fff9" }}
                  >
                    Download
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                  흰 배경의 이미지를 업로드하면 서명을 추출합니다.
                </p>

                <div>
                  <label
                    className="flex justify-between mb-2 text-xs font-extrabold uppercase tracking-wide"
                    style={{ color: "var(--muted)" }}
                  >
                    <span>Background Threshold</span>
                    <span style={{ color: "var(--text)" }}>{threshold}</span>
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
                    className="flex-1 h-10 rounded-lg text-sm font-bold transition-colors"
                    style={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--line)",
                      color: "var(--text)",
                    }}
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => imageUploaderRef.current?.download()}
                    className="flex-1 h-10 rounded-lg text-sm font-bold transition-colors"
                    style={{ background: "var(--green)", color: "#f8fff9" }}
                  >
                    Download
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
