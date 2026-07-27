/**
 * 더미 파일 생성 폼: 포맷·옵션·크기 입력과 생성 요청을 자체 상태로 관리한다.
 */
"use client";

import { FormEvent, useMemo, useState } from "react";

import {
  FILE_TYPES,
  ZIP_EXTENSION_PROFILES,
  ZIP_STRUCTURES,
  type FileType,
  type GenerateOutput,
  type ZipExtensionProfile,
  type ZipStructure,
} from "@/lib/types";
import { Button } from "./design-system/Button";
import {
  SegmentedControl,
  type SegmentOption,
} from "./design-system/SegmentedControl";
import { DownloadIcon, FormatIcon } from "./icons";

const ZIP_STRUCTURE_OPTIONS: readonly SegmentOption<ZipStructure>[] = ZIP_STRUCTURES.map((value) => ({
  value,
  label: value === "flat" ? "평면" : "계층",
}));

const ZIP_EXTENSION_PROFILE_OPTIONS: readonly SegmentOption<ZipExtensionProfile>[] =
  ZIP_EXTENSION_PROFILES.map((value) => ({
    value,
    label: value === "mixed" ? "혼합" : value === "text" ? "텍스트" : "바이너리",
  }));

export default function GeneratorForm() {
  const [loading, setLoading] = useState(false);
  const [targetSize, setTargetSize] = useState("1");
  const [type, setType] = useState<FileType>("pdf");
  const [zipStructure, setZipStructure] = useState<ZipStructure>("flat");
  const [zipExtensionProfile, setZipExtensionProfile] = useState<ZipExtensionProfile>("mixed");
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    const num = Number(targetSize);
    return Number.isFinite(num) && num > 0 && num <= 100;
  }, [targetSize]);

  /**
   * 파일 생성 요청을 보낸 뒤 응답받은 다운로드 URL로 저장을 시작한다.
   */
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
      if (!response.ok) throw new Error(data?.error ?? "생성 요청 실패");
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
    <>
      <form className="form" onSubmit={onSubmit}>
        <div className="fieldHead">파일 형식</div>
        <div className="typeGrid" role="group" aria-label="파일 형식 선택">
          {FILE_TYPES.map((item) => (
            <button
              key={item}
              type="button"
              className={`typeBtn ${type === item ? "active" : ""}`}
              aria-pressed={type === item}
              onClick={() => { setType(item); setError(null); }}
            >
              <FormatIcon type={item} />
              <span>{item.toUpperCase()}</span>
            </button>
          ))}
        </div>

        {type === "zip" ? (
          <>
            <div className="fieldLabel zipLabel">ZIP 구조</div>
            <SegmentedControl<ZipStructure>
              value={zipStructure}
              options={ZIP_STRUCTURE_OPTIONS}
              onValueChange={setZipStructure}
              ariaLabel="ZIP 구조"
            />
            {zipStructure === "hierarchy" && (
              <>
                <div className="fieldLabel zipLabel">확장자 조합</div>
                <SegmentedControl<ZipExtensionProfile>
                  value={zipExtensionProfile}
                  options={ZIP_EXTENSION_PROFILE_OPTIONS}
                  onValueChange={setZipExtensionProfile}
                  ariaLabel="확장자 조합"
                />
              </>
            )}
          </>
        ) : null}

        <label className="fieldLabel" htmlFor="targetSize">목표 크기 (MiB)</label>
        <input
          id="targetSize"
          className="sizeInput"
          value={targetSize}
          onChange={(e) => { setTargetSize(e.target.value); setError(null); }}
          inputMode="decimal"
          placeholder="1"
        />
        <p className="hint">1 MiB = 1,048,576 B. 최대 100 MiB 정책.</p>

        <Button type="submit" variant="primary" disabled={!canSubmit || loading}>
          <DownloadIcon />
          <span>{loading ? "생성 중..." : "파일 생성"}</span>
        </Button>
      </form>

      {error ? <p className="error">오류: {error}</p> : null}
    </>
  );
}
