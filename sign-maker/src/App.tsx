import { useState, useRef, useEffect } from "react";
import { PenTool, Image as ImageIcon, Sun, Moon } from "lucide-react";
import SignaturePad from "./components/SignaturePad";
import type { SignaturePadRef } from "./components/SignaturePad";
import ImageUploader from "./components/ImageUploader";
import type { ImageUploaderRef } from "./components/ImageUploader";
import "./index.css";

function App() {
  const [activeTab, setActiveTab] = useState<"draw" | "upload">("draw");
  const [threshold, setThreshold] = useState<number>(200);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const signaturePadRef = useRef<SignaturePadRef>(null);
  const imageUploaderRef = useRef<ImageUploaderRef>(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const handleClearDraw = () => {
    signaturePadRef.current?.clear();
  };

  const handleDownloadDraw = () => {
    signaturePadRef.current?.download();
  };

  const handleResetImage = () => {
    imageUploaderRef.current?.reset();
    setThreshold(200); // Reset slider to default
  };

  const handleDownloadImage = () => {
    imageUploaderRef.current?.download();
  };

  return (
    <div className="app-container">
      <header className="app-header" style={{ position: "relative" }}>
        <h1>Signature & Trace Studio</h1>
        <p>Craft beautiful signatures or extract them from images.</p>
        <button
          className="btn btn-secondary"
          onClick={toggleTheme}
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            padding: "0.5rem",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </header>

      <main className="main-content">
        {/* Left Side: Canvas Area */}
        <section className="glass-panel canvas-section">
          <h2 className="panel-title">
            {activeTab === "draw" ? (
              <PenTool size={20} />
            ) : (
              <ImageIcon size={20} />
            )}
            Canvas Workspace
          </h2>
          <div className="canvas-wrapper">
            {activeTab === "draw" ? (
              <SignaturePad ref={signaturePadRef} />
            ) : (
              <ImageUploader ref={imageUploaderRef} threshold={threshold} />
            )}
          </div>
        </section>

        {/* Right Side: Controls */}
        <aside className="glass-panel controls-section">
          <div className="tabs">
            <button
              className={`btn ${activeTab === "draw" ? "" : "btn-secondary"}`}
              onClick={() => setActiveTab("draw")}
              style={{
                width: "50%",
                borderBottomRightRadius: 0,
                borderTopRightRadius: 0,
              }}
            >
              <PenTool size={18} /> Draw
            </button>
            <button
              className={`btn ${activeTab === "upload" ? "" : "btn-secondary"}`}
              onClick={() => setActiveTab("upload")}
              style={{
                width: "50%",
                borderBottomLeftRadius: 0,
                borderTopLeftRadius: 0,
              }}
            >
              <ImageIcon size={18} /> Upload
            </button>
          </div>

          <div className="control-settings" style={{ marginTop: "2rem" }}>
            {activeTab === "draw" ? (
              <div>
                <h3 className="panel-title" style={{ fontSize: "1.1rem" }}>
                  Drawing Tools
                </h3>
                <p
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "0.9rem",
                    marginBottom: "1rem",
                  }}
                >
                  Start drawing. The stroke will automatically beautify 3
                  seconds after you finish.
                </p>
                <div
                  style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}
                >
                  <button
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                    onClick={handleClearDraw}
                  >
                    Clear
                  </button>
                  <button
                    className="btn"
                    style={{ flex: 1 }}
                    onClick={handleDownloadDraw}
                  >
                    Download
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="panel-title" style={{ fontSize: "1.1rem" }}>
                  Image Settings
                </h3>
                <p
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "0.9rem",
                    marginBottom: "1rem",
                  }}
                >
                  Upload an image with a white background to extract the
                  signature.
                </p>
                <div
                  className="slider-group"
                  style={{ marginBottom: "1.5rem" }}
                >
                  <label
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "0.5rem",
                      fontSize: "0.9rem",
                    }}
                  >
                    <span>Background Removal Threshold</span>
                    <span style={{ fontWeight: "bold" }}>{threshold}</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    style={{ width: "100%" }}
                  />
                </div>
                <div style={{ display: "flex", gap: "1rem" }}>
                  <button
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                    onClick={handleResetImage}
                  >
                    Reset
                  </button>
                  <button
                    className="btn"
                    style={{ flex: 1 }}
                    onClick={handleDownloadImage}
                  >
                    Download
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}

export default App;
