/**
 * 워크벤치 메인 컨트롤러.
 * 화면 전환, 실행 흐름, 로그 표시, IPC 이벤트 수신을 담당한다.
 */

// ============================================================
// 초기화
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  initProjectScreen();
  initCaptureScreen();
  initDomScreen();
  initImageScreen();
  initBatchScreen();
  initExportScreen();

  bindTopbarButtons();
  bindLogTabs();
  bindNavigation();
  switchScreen("project");
});

// ============================================================
// 화면 전환
// ============================================================
function switchScreen(screenId) {
  // 모든 screen 숨기기
  document.querySelectorAll(".screen").forEach((el) => el.classList.add("hidden"));
  document.querySelectorAll(".nav-item").forEach((el) => el.classList.remove("active"));
  document.querySelectorAll(".panel-content").forEach((el) => el.classList.add("hidden"));

  // 대상 screen 표시
  const screenEl = document.getElementById(`screen-${screenId}`);
  if (screenEl) screenEl.classList.remove("hidden");

  const navEl = document.querySelector(`.nav-item[data-screen="${screenId}"]`);
  if (navEl) navEl.classList.add("active");

  const panelEl = document.getElementById(`panel-${screenId}`);
  if (panelEl) panelEl.classList.remove("hidden");

  AppState.currentScreen = screenId;

  // 화면별 진입 후 처리
  if (screenId === "capture") syncCaptureFormFromState();
  if (screenId === "image") renderThumbStrip();
  if (screenId === "batch") renderCaptureResultList();
  if (screenId === "export") updateExportPreview();
  if (screenId === "dom") renderDomRuleList();
}

function bindNavigation() {
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", () => switchScreen(item.dataset.screen));
  });
}

// ============================================================
// 상단 바 버튼
// ============================================================
function bindTopbarButtons() {
  const btnRun = document.getElementById("btn-run");
  const btnCancel = document.getElementById("btn-cancel");
  const btnSave = document.getElementById("btn-save-project");

  if (btnRun) btnRun.addEventListener("click", handleRun);
  if (btnCancel) btnCancel.addEventListener("click", handleCancel);
  if (btnSave) btnSave.addEventListener("click", saveCurrentProject);
}

function setRunning(flag) {
  AppState.isRunning = flag;
  const btnRun = document.getElementById("btn-run");
  const btnCancel = document.getElementById("btn-cancel");
  const badge = document.getElementById("status-badge");

  if (btnRun) btnRun.disabled = flag;
  if (btnCancel) btnCancel.disabled = !flag;
  if (badge) {
    badge.textContent = flag ? "실행 중..." : "Ready";
    badge.className = `status-badge${flag ? " running" : ""}`;
  }
}

async function handleRun() {
  if (AppState.isRunning) return;

  try {
    const args = buildCaptureArgs();
    // DOM 규칙을 직렬화해서 인자에 포함
    if (AppState.project.domRules && AppState.project.domRules.length > 0) {
      args.push("--domRules", JSON.stringify(AppState.project.domRules));
    }

    setRunning(true);
    clearLog("all");
    AppState.captureResults = [];
    AppState.failedUrls = [];
    updateFailedBadge();

    appendLog("app", `실행 시작: ${args.slice(0, 4).join(" ")} ...`);

    const res = await window.workbenchApi.runCapture(args);
    if (res && res.error) {
      appendLog("error", res.error);
      setRunning(false);
    }
  } catch (e) {
    appendLog("error", e.message || String(e));
    setRunning(false);
  }
}

async function handleCancel() {
  await window.workbenchApi.cancelCapture();
}

// ============================================================
// IPC 이벤트 수신
// ============================================================
window.workbenchApi.onLog((payload) => {
  const { type, message } = payload;
  appendLog(type, message);

  // 캡처 완료 결과 파싱
  if (message) {
    message.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // 구조화된 JSON 로그 처리
      try {
        const obj = JSON.parse(trimmed);

        if (obj.type === "error" && obj.url) {
          AppState.failedUrls.push(obj.url);
          updateFailedBadge();
          appendLog("failed", `${obj.url}\n  오류: ${obj.message}`);
        }

        if (obj.type === "failed-summary" && Array.isArray(obj.failed)) {
          obj.failed.forEach((f) => {
            if (f && f.url && !AppState.failedUrls.includes(f.url)) {
              AppState.failedUrls.push(f.url);
            }
          });
          updateFailedBadge();
        }

        if (obj.type === "capture-result") {
          AppState.captureResults.push(obj.result);
        }
      } catch (e) {
        // 비 JSON 줄 — 레거시 형식 처리
        const m = trimmed.match(/-> saved: (.+\.png)/i);
        if (m && m[1]) {
          const filePath = m[1].trim();
          // 파일명에서 baseName 추출
          const parts = filePath.split(/[\\/]/);
          const baseName = parts[parts.length - 1].replace(/\.png$/i, "");

          // URL을 마지막 appendLog에서 추출 시도 (간이 처리)
          const existingIdx = AppState.captureResults.findIndex((r) => r.filePath === filePath);
          if (existingIdx === -1) {
            AppState.captureResults.push({ filePath, baseName, status: "ok", url: "" });
          }
        }
      }
    });
  }

  // 실행 종료 감지
  if (message && message.includes("종료")) {
    setRunning(false);
    if (AppState.captureResults.length > 0) {
      renderCaptureResultList();
      renderThumbStrip();
    }
    appendLog("app", `캡처 완료: 성공 ${AppState.captureResults.filter((r) => r.status === "ok").length}개 / 실패 ${AppState.failedUrls.length}개`);
  }
});

// ============================================================
// 로그 관련
// ============================================================
function bindLogTabs() {
  document.querySelectorAll(".log-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".log-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const target = tab.dataset.log;
      document.querySelectorAll(".log-content").forEach((el) => el.classList.add("hidden"));
      const logEl = document.getElementById(`log-${target}`);
      if (logEl) logEl.classList.remove("hidden");
    });
  });

  document.getElementById("btn-clear-log").addEventListener("click", () => {
    ["all", "failed", "export"].forEach(clearLog);
  });

  document.getElementById("btn-copy-failed").addEventListener("click", async () => {
    if (!AppState.failedUrls.length) return;
    try {
      await navigator.clipboard.writeText(AppState.failedUrls.join("\n"));
      appendLog("app", "실패 URL을 클립보드에 복사했습니다.");
    } catch (e) {
      appendLog("error", e.message || "클립보드 복사 실패");
    }
  });

  document.getElementById("btn-rerun-failed").addEventListener("click", rerunFailed);
}

function appendLog(type, message) {
  if (!message) return;
  const text = `[${type}] ${message}`.trim();
  const allEl = document.getElementById("log-all");
  if (allEl) {
    allEl.textContent += `${text}\n`;
    allEl.scrollTop = allEl.scrollHeight;
  }

  if (type === "export") {
    const exportEl = document.getElementById("log-export");
    if (exportEl) {
      exportEl.textContent += `${text}\n`;
      exportEl.scrollTop = exportEl.scrollHeight;
    }
  }
}

function clearLog(target) {
  const el = document.getElementById(`log-${target}`);
  if (el) el.textContent = "";
}

function updateFailedBadge() {
  const badge = document.getElementById("failed-count-badge");
  const btnCopy = document.getElementById("btn-copy-failed");
  const btnRerun = document.getElementById("btn-rerun-failed");
  const count = AppState.failedUrls.length;

  if (badge) badge.textContent = count;
  if (btnCopy) btnCopy.disabled = count === 0;
  if (btnRerun) btnRerun.disabled = count === 0 || AppState.isRunning;
}

async function rerunFailed() {
  if (!AppState.failedUrls.length || AppState.isRunning) return;
  try {
    const args = buildCaptureArgs();
    args.push("--onlyUrls", AppState.failedUrls.join(","));
    if (AppState.project.domRules && AppState.project.domRules.length > 0) {
      args.push("--domRules", JSON.stringify(AppState.project.domRules));
    }

    setRunning(true);
    clearLog("all");
    appendLog("app", `실패 URL ${AppState.failedUrls.length}개 재실행`);
    AppState.failedUrls = [];
    updateFailedBadge();

    const res = await window.workbenchApi.runCapture(args);
    if (res && res.error) {
      appendLog("error", res.error);
      setRunning(false);
    }
  } catch (e) {
    appendLog("error", e.message || String(e));
    setRunning(false);
  }
}

// appendLog를 전역으로 노출 (다른 screen 파일에서 사용)
window.appendLog = appendLog;
