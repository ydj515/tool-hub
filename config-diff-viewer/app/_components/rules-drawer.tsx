/**
 * 탐지 규칙과 위험 설정 목록을 설명하는 사이드 패널이다.
 */
"use client";

import { useState } from "react";
import { X } from "lucide-react";
import IssueBadge from "./issue-badge";
import { ALL_RULE_DEFINITIONS, type RuleCategory } from "@/lib/validator";
import {
  SECRET_KEY_PATTERNS_META,
  SECRET_VALUE_PATTERNS_META,
} from "@/lib/detector";

type DrawerTab = "danger" | "secret";
type CategoryFilter = "all" | RuleCategory;

const CATEGORY_LABELS: Record<RuleCategory, string> = {
  "spring-boot": "Spring Boot",
  "kubernetes": "Kubernetes",
  "docker-compose": "Docker Compose",
};

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function RulesDrawer({ open, onClose }: Props) {
  const [tab, setTab] = useState<DrawerTab>("danger");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");

  if (!open) return null;

  const filtered =
    categoryFilter === "all"
      ? ALL_RULE_DEFINITIONS
      : ALL_RULE_DEFINITIONS.filter((r) => r.category === categoryFilter);

  return (
    <>
      {/* Backdrop */}
      <div className="drawerBackdrop" onClick={onClose} />

      {/* Drawer panel */}
      <aside className="rulesDrawer">
        {/* Header */}
        <div className="drawerHeader">
          <div>
            <strong>탐지 규칙 목록</strong>
            <span className="drawerSubtitle">비교 시 적용되는 모든 규칙을 확인합니다.</span>
          </div>
          <button className="drawerCloseBtn" onClick={onClose} aria-label="닫기">
            <X size={18} />
          </button>
        </div>

        {/* Tab bar */}
        <div className="drawerTabBar">
          <button
            className={`drawerTabBtn ${tab === "danger" ? "active" : ""}`}
            onClick={() => setTab("danger")}
          >
            위험 설정 규칙
            <span className="drawerTabCount">{ALL_RULE_DEFINITIONS.length}</span>
          </button>
          <button
            className={`drawerTabBtn ${tab === "secret" ? "active" : ""}`}
            onClick={() => setTab("secret")}
          >
            민감정보 규칙
            <span className="drawerTabCount">
              {SECRET_KEY_PATTERNS_META.length + SECRET_VALUE_PATTERNS_META.length}
            </span>
          </button>
        </div>

        {/* Body */}
        <div className="drawerBody">
          {tab === "danger" && (
            <>
              {/* Category filter */}
              <div className="drawerFilterRow">
                {(["all", "spring-boot", "kubernetes", "docker-compose"] as const).map((cat) => (
                  <button
                    key={cat}
                    className={`filterChip ${categoryFilter === cat ? "active" : ""}`}
                    onClick={() => setCategoryFilter(cat)}
                  >
                    {cat === "all" ? `전체 (${ALL_RULE_DEFINITIONS.length})` : CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>

              {/* Rule list */}
              <div className="ruleList">
                {filtered.map((rule) => (
                  <div key={rule.id} className="ruleCard">
                    <div className="ruleCardTop">
                      <IssueBadge severity={rule.severity} />
                      <span className="ruleCategoryChip">{CATEGORY_LABELS[rule.category]}</span>
                      <code className="ruleId">{rule.id}</code>
                    </div>
                    <p className="ruleMessage">{rule.message}</p>
                    <div className="ruleCondition">
                      <span className="ruleConditionLabel">조건</span>
                      <code className="ruleConditionCode">{rule.conditionDesc}</code>
                    </div>
                    {rule.suggestion && (
                      <div className="ruleSuggestion">{rule.suggestion}</div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === "secret" && (
            <div className="ruleList">
              {/* Key patterns */}
              <div className="drawerSection">
                <div className="drawerSectionTitle">
                  키 이름 패턴
                  <span className="drawerTabCount">{SECRET_KEY_PATTERNS_META.length}</span>
                </div>
                <p className="drawerSectionDesc">
                  아래 패턴과 일치하는 키 이름에 값이 평문으로 설정된 경우 탐지됩니다.
                  placeholder({"${...}"}) 값은 제외합니다.
                </p>
                {SECRET_KEY_PATTERNS_META.map((p, i) => (
                  <div key={i} className="ruleCard">
                    <div className="ruleCardTop">
                      <IssueBadge severity={p.severity} />
                      <code className="ruleConditionCode">{p.pattern}</code>
                    </div>
                    <div className="ruleCondition">
                      <span className="ruleConditionLabel">예시 키</span>
                      <code className="ruleConditionCode">{p.example}</code>
                    </div>
                  </div>
                ))}
              </div>

              {/* Value patterns */}
              <div className="drawerSection" style={{ marginTop: 16 }}>
                <div className="drawerSectionTitle">
                  값 패턴 (정규식 기반)
                  <span className="drawerTabCount">{SECRET_VALUE_PATTERNS_META.length}</span>
                </div>
                <p className="drawerSectionDesc">
                  키 이름과 무관하게 값 자체가 아래 패턴과 일치하면 탐지됩니다.
                </p>
                {SECRET_VALUE_PATTERNS_META.map((p, i) => (
                  <div key={i} className="ruleCard">
                    <div className="ruleCardTop">
                      <IssueBadge severity={p.severity} />
                      <strong className="ruleMessage" style={{ fontSize: "0.86rem" }}>
                        {p.name}
                      </strong>
                    </div>
                    <div className="ruleCondition">
                      <span className="ruleConditionLabel">패턴</span>
                      <code className="ruleConditionCode">{p.pattern}</code>
                    </div>
                    <div className="ruleCondition">
                      <span className="ruleConditionLabel">예시</span>
                      <code className="ruleConditionCode">{p.example}</code>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
