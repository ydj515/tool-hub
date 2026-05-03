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
        <div className="optionToggle on locked" title="기본 키 비교는 항상 활성화됩니다.">
          <span className="toggleDot" />
          키 비교
          <span className="toggleStatusBadge on">항상</span>
        </div>

        {/* Secret detection */}
        <button
          className={`optionToggle ${options.enableSecretDetection ? "on" : "off"}`}
          onClick={() => toggle("enableSecretDetection")}
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
        >
          <span className="toggleDot" />
          위험 설정 탐지
          <span className={`toggleStatusBadge ${options.enableDangerousConfigDetection ? "on" : "off"}`}>
            {options.enableDangerousConfigDetection ? "ON" : "OFF"}
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
