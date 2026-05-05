/**
 * 비교 옵션과 규칙 보기 액션을 제어하는 툴바다.
 */
"use client";

import { BookOpen } from "lucide-react";
import type { AnalysisOptions } from "@/lib/types";

interface Props {
  options: AnalysisOptions;
  onChange: (next: AnalysisOptions) => void;
  onOpenRules: () => void;
}

export default function AnalysisOptionsBar({ options, onChange, onOpenRules }: Props) {
  function toggle(key: keyof AnalysisOptions) {
    onChange({ ...options, [key]: !options[key] });
  }

  return (
    <div className="optionsBar">
      <div className="optionsLeft">
        <span className="optionsLabel">분석 범위</span>

        {/* 기본 비교 — always on */}
        <div
          className="optionToggle on locked"
          data-tooltip="두 파일의 키를 비교하여 값 불일치와 누락 키를 찾습니다."
        >
          <span className="toggleDot" />
          키 비교
          <span className="toggleStatusBadge on">항상</span>
        </div>

        {/* Secret detection */}
        <button
          className={`optionToggle ${options.enableSecretDetection ? "on" : "off"}`}
          onClick={() => toggle("enableSecretDetection")}
          aria-pressed={options.enableSecretDetection}
          data-tooltip="password, secret, token 등 민감한 키·값 패턴을 탐지합니다."
        >
          <span className="toggleDot" />
          민감정보 탐지
          <span className={`toggleStatusBadge ${options.enableSecretDetection ? "on" : "off"}`}>
            {options.enableSecretDetection ? "ON" : "OFF"}
          </span>
        </button>

        {/* Dangerous config detection */}
        <button
          className={`optionToggle ${options.enableDangerousConfigDetection ? "on" : "off"}`}
          onClick={() => toggle("enableDangerousConfigDetection")}
          aria-pressed={options.enableDangerousConfigDetection}
          data-tooltip="Spring Boot, Kubernetes, Docker Compose의 위험한 설정을 검사합니다."
        >
          <span className="toggleDot" />
          위험 설정 탐지
          <span className={`toggleStatusBadge ${options.enableDangerousConfigDetection ? "on" : "off"}`}>
            {options.enableDangerousConfigDetection ? "ON" : "OFF"}
          </span>
        </button>

        {/* Duplicate key detection */}
        <button
          className={`optionToggle ${options.enableDuplicateKeyDetection ? "on" : "off"}`}
          onClick={() => toggle("enableDuplicateKeyDetection")}
          aria-pressed={options.enableDuplicateKeyDetection}
          data-tooltip="같은 파일 내에서 동일한 키가 두 번 이상 정의된 경우를 찾습니다."
        >
          <span className="toggleDot" />
          중복 키 탐지
          <span className={`toggleStatusBadge ${options.enableDuplicateKeyDetection ? "on" : "off"}`}>
            {options.enableDuplicateKeyDetection ? "ON" : "OFF"}
          </span>
        </button>

        <span className="optionsHint">항목을 클릭하여 분석 범위를 설정하세요</span>
      </div>

      <button className="optionsRulesBtn" onClick={onOpenRules}>
        <BookOpen size={13} />
        규칙 보기
      </button>
    </div>
  );
}
