"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  FILE_TYPES,
  ZIP_EXTENSION_PROFILES,
  ZIP_STRUCTURES,
  type FileType,
  type GenerateOutput,
  type ZipExtensionProfile,
  type ZipStructure,
} from "@/lib/types";

type Theme = "light" | "dark";

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4v10" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path
        d="m8 11 4 4 4-4"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="M5 18h14" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4.2" />
      <path
        d="M12 2.5v2.3M12 19.2v2.3M21.5 12h-2.3M4.8 12H2.5M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6M18.7 18.7l-1.6-1.6M6.9 6.9 5.3 5.3"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20.7 14.6A8.7 8.7 0 1 1 9.4 3.3a7 7 0 1 0 11.3 11.3z" />
    </svg>
  );
}

function FormatIcon({ type }: { type: FileType }) {
  if (type === "pdf") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 3.5h9l3 3V20.5H6z" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15 3.5v3h3" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 15.5h8M8 18h6" fill="none" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === "docx" || type === "txt") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 3.5h9l3 3V20.5H6z" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 9.5h6M9 13h6M9 16.5h4.5" fill="none" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === "xlsx" || type === "csv") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="5.5" y="4.5" width="13" height="15" rx="1.8" fill="none" strokeWidth="1.8" />
        <path d="M5.5 9.5h13M10 4.5v15M14.5 4.5v15" fill="none" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === "zip") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 3.5h8v17H8z" fill="none" strokeWidth="1.8" />
        <path d="M11 6h2M11 8.5h2M11 11h2M11 13.5h2M10.5 16h3" fill="none" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === "json") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 5.5C7.8 6.4 7 7.7 7 9.2v5.6C7 16.3 7.8 17.6 9 18.5" fill="none" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M15 5.5c1.2.9 2 2.2 2 3.7v5.6c0 1.5-.8 2.8-2 3.7" fill="none" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="12" cy="12" r="1.1" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5.5" y="5.5" width="13" height="13" rx="2" fill="none" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="2.1" />
    </svg>
  );
}

export default function GeneratorClient() {
  const [loading, setLoading] = useState(false);
  const [targetSize, setTargetSize] = useState("1");
  const [type, setType] = useState<FileType>("pdf");
  const [zipStructure, setZipStructure] = useState<ZipStructure>("flat");
  const [zipExtensionProfile, setZipExtensionProfile] = useState<ZipExtensionProfile>("mixed");
  const [theme, setTheme] = useState<Theme>("light");
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    const num = Number(targetSize);
    return Number.isFinite(num) && num > 0;
  }, [targetSize]);

  useEffect(() => {
    const saved = window.localStorage.getItem("theme") as Theme | null;
    const initial: Theme = saved === "dark" ? "dark" : "light";
    setTheme(initial);
    document.documentElement.dataset.theme = initial;
  }, []);

  function onToggleTheme() {
    const next: Theme = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("theme", next);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type,
          targetSize: Number(targetSize),
          sizeUnit: "MiB",
          mode: "exact",
          zipStructure,
          zipExtensionProfile,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error ?? "생성 요청 실패");
      }

      const nextResult = data as GenerateOutput;

      const link = document.createElement("a");
      link.href = nextResult.downloadUrl;
      link.download = nextResult.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 에러");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <button
        className="globalThemeBtn"
        type="button"
        onClick={onToggleTheme}
        aria-label="테마 전환"
        aria-pressed={theme === "dark"}
      >
        {theme === "light" ? <MoonIcon /> : <SunIcon />}
      </button>

      <section className="card">
        <header className="hero">
          <div className="heroLeft">
            <div>
              <h1>Dummy File Generator</h1>
              <p>테스트 업로드용 더미 파일을 생성합니다.</p>
            </div>
          </div>
        </header>

        <form className="form" onSubmit={onSubmit}>
          <div className="fieldHead">File Format</div>
          <div className="typeGrid" role="tablist" aria-label="파일 포맷 선택">
            {FILE_TYPES.map((item) => (
              <button
                key={item}
                type="button"
                className={`typeBtn ${type === item ? "active" : ""}`}
                onClick={() => {
                  setType(item);
                  setError(null);
                }}
              >
                <FormatIcon type={item} />
                <span>{item.toUpperCase()}</span>
              </button>
            ))}
          </div>

          <label className="fieldLabel" htmlFor="targetSize">
            Target Size (MiB)
          </label>

          {type === "zip" ? (
            <>
              <label className="fieldLabel zipLabel" htmlFor="zipStructure">
                ZIP Structure
              </label>
              <div className="zipStructureGrid" role="tablist" aria-label="ZIP 구조 선택">
                {ZIP_STRUCTURES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`zipStructureBtn ${zipStructure === item ? "active" : ""}`}
                  onClick={() => setZipStructure(item)}
                >
                  {item === "flat" ? "Flat" : "Hierarchy"}
                </button>
              ))}
            </div>

              {zipStructure === "hierarchy" ? (
                <>
                  <label className="fieldLabel zipLabel" htmlFor="zipExtensionProfile">
                    Extension Profile
                  </label>
                  <div className="zipStructureGrid" role="tablist" aria-label="확장자 조합 선택">
                    {ZIP_EXTENSION_PROFILES.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className={`zipStructureBtn ${zipExtensionProfile === item ? "active" : ""}`}
                        onClick={() => setZipExtensionProfile(item)}
                      >
                        {item === "mixed" ? "Mixed" : item === "text" ? "Text" : "Binary"}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
            </>
          ) : null}

          <input
            id="targetSize"
            className="sizeInput"
            value={targetSize}
            onChange={(e) => {
              setTargetSize(e.target.value);
              setError(null);
            }}
            inputMode="decimal"
            placeholder="1"
          />
          <p className="hint">1 MiB = 1,048,576 Bytes. 최대 100MiB 정책.</p>

          <button
            className="generateBtn"
            type="submit"
            disabled={!canSubmit || loading}
          >
            <DownloadIcon />
            <span>{loading ? "생성 중..." : "Generate File"}</span>
          </button>
        </form>

        {error ? <p className="error">오류: {error}</p> : null}
      </section>
    </main>
  );
}
