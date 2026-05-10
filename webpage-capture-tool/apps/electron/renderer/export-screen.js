/**
 * 내보내기 화면 초기화와 채널별 출력 실행을 담당한다.
 */

function buildExportProfileFromState() {
  return {
    id: "default-export-profile",
    name: "기본 출력 프로필",
    channels: { ...AppState.exportConfig.channels },
    outputDir: AppState.exportConfig.outputDir || "",
    namingPattern: AppState.exportConfig.namingPattern || "{index}_{safeTitle}",
    updatedAt: new Date().toISOString()
  };
}

function syncProjectExportProfiles() {
  AppState.project.exportProfiles = [buildExportProfileFromState()];
  return AppState.project.exportProfiles;
}

function applyProjectExportProfiles(profiles) {
  const profile = Array.isArray(profiles) && profiles.length > 0 ? profiles[0] : null;

  if (!profile) {
    AppState.exportConfig.channels = { markdown: true, word: false, ppt: false };
    AppState.exportConfig.outputDir = AppState.project.capturePreset.outDir || "";
    AppState.exportConfig.namingPattern = "{index}_{safeTitle}";
    syncExportFormFromState();
    return;
  }

  AppState.exportConfig.channels = Object.assign(
    { markdown: true, word: false, ppt: false },
    profile.channels || {}
  );
  AppState.exportConfig.outputDir = profile.outputDir || AppState.project.capturePreset.outDir || "";
  AppState.exportConfig.namingPattern = profile.namingPattern || "{index}_{safeTitle}";

  syncExportFormFromState();
}

function syncExportFormFromState() {
  const exportDirInput = document.getElementById("export-dir");
  const namingInput = document.getElementById("naming-pattern");

  if (exportDirInput) {
    exportDirInput.value = AppState.exportConfig.outputDir || "";
  }

  if (namingInput) {
    namingInput.value = AppState.exportConfig.namingPattern || "{index}_{safeTitle}";
  }

  ["markdown", "word", "ppt"].forEach((ch) => {
    const cb = document.getElementById(`ch-${ch}`);
    if (cb) cb.checked = !!AppState.exportConfig.channels[ch];
  });

  updateExportActionButtons();
  renderExportResultSummary();
}

function initExportScreen() {
  const btnPickExportDir = document.getElementById("btn-pick-export-dir");
  const btnRunExport = document.getElementById("btn-run-export");
  const btnOpenFolder = document.getElementById("btn-open-export-folder");
  const btnOpenWord = document.getElementById("btn-open-word-export");
  const btnOpenPpt = document.getElementById("btn-open-ppt-export");
  const exportDirInput = document.getElementById("export-dir");
  const namingInput = document.getElementById("naming-pattern");

  if (btnPickExportDir) {
    btnPickExportDir.addEventListener("click", async () => {
      const dir = await window.workbenchApi.selectOutDir();
      if (dir) {
        exportDirInput.value = dir;
        AppState.exportConfig.outputDir = dir;
        syncProjectExportProfiles();
      }
    });
  }

  if (btnRunExport) {
    btnRunExport.addEventListener("click", runExport);
  }

  if (btnOpenFolder) {
    btnOpenFolder.addEventListener("click", () => {
      const dir = AppState.exportResults.outputDir || exportDirInput.value || AppState.exportConfig.outputDir;
      if (dir) window.workbenchApi.openFolder(dir);
    });
  }

  if (btnOpenWord) {
    btnOpenWord.addEventListener("click", () => {
      const targetPath = AppState.exportResults.wordPath;
      if (targetPath) window.workbenchApi.openPath(targetPath);
    });
  }

  if (btnOpenPpt) {
    btnOpenPpt.addEventListener("click", () => {
      const targetPath = AppState.exportResults.pptPath;
      if (targetPath) window.workbenchApi.openPath(targetPath);
    });
  }

  // 채널 체크박스
  ["markdown", "word", "ppt"].forEach((ch) => {
    const cb = document.getElementById(`ch-${ch}`);
    if (cb) {
      cb.addEventListener("change", (e) => {
        AppState.exportConfig.channels[ch] = e.target.checked;
        syncProjectExportProfiles();
        updateExportPreview();
      });
    }
  });

  if (namingInput) {
    namingInput.addEventListener("input", (e) => {
      AppState.exportConfig.namingPattern = e.target.value;
      syncProjectExportProfiles();
    });
  }

  syncExportFormFromState();
}

function updateExportActionButtons() {
  const btnOpenWord = document.getElementById("btn-open-word-export");
  const btnOpenPpt = document.getElementById("btn-open-ppt-export");
  const btnOpenFolder = document.getElementById("btn-open-export-folder");

  if (btnOpenFolder) {
    btnOpenFolder.disabled = !(AppState.exportResults.outputDir || AppState.exportConfig.outputDir);
  }
  if (btnOpenWord) {
    btnOpenWord.disabled = !AppState.exportResults.wordPath;
  }
  if (btnOpenPpt) {
    btnOpenPpt.disabled = !AppState.exportResults.pptPath;
  }
}

function renderExportResultSummary() {
  const container = document.getElementById("export-result-card");
  if (!container) return;

  const result = AppState.exportResults;
  if (!result || (!result.markdownPath && !result.wordPath && !result.pptPath)) {
    container.innerHTML = '<p class="empty-hint">최근 내보내기 결과가 없습니다.</p>';
    return;
  }

  const rows = [];
  if (result.exportedAt) {
    rows.push(`<div class="export-result-row"><span>생성 시각</span><span>${result.exportedAt}</span></div>`);
  }
  if (result.wordPath) {
    rows.push(`<div class="export-result-row"><span>Word</span><span>${result.wordPath}</span></div>`);
  }
  if (result.pptPath) {
    rows.push(`<div class="export-result-row"><span>PPT</span><span>${result.pptPath}</span></div>`);
  }
  if (result.markdownPath) {
    rows.push(`<div class="export-result-row"><span>Markdown</span><span>${result.markdownPath}</span></div>`);
  }

  container.innerHTML = rows.join("");
}

function updateExportPreview() {
  const container = document.getElementById("export-preview");
  if (!container) return;

  if (!AppState.captureResults || AppState.captureResults.length === 0) {
    container.textContent = "캡처 결과가 있으면 Markdown 미리보기가 여기 표시됩니다.";
    return;
  }

  let preview = "";
  const results = AppState.captureResults.filter((r) => r.status === "ok").slice(0, 5);
  results.forEach((result, i) => {
    const title = result.baseName || `화면 ${i + 1}`;
    preview += `## ${i + 1}. ${title}\n\n![${title}](./images/${String(i + 1).padStart(3, "0")}_${title}.png)\n\n`;
  });

  if (AppState.captureResults.length > 5) {
    preview += `... 외 ${AppState.captureResults.length - 5}개`;
  }

  container.textContent = preview || "(캡처 성공 결과가 없습니다)";
}

async function runExport() {
  syncProjectExportProfiles();

  const outputDir = document.getElementById("export-dir").value || AppState.exportConfig.outputDir;
  if (!outputDir) {
    appendLog("error", "출력 경로를 선택해주세요.");
    return;
  }

  const successResults = AppState.captureResults.filter((r) => r.status === "ok" && r.filePath);
  if (successResults.length === 0) {
    appendLog("warn", "내보내기할 캡처 결과가 없습니다.");
    return;
  }

  const channels = AppState.exportConfig.channels;
  const namingPattern = document.getElementById("naming-pattern").value || "{index}_{safeTitle}";

  const items = successResults.map((r, i) => ({
    index: i + 1,
    slug: r.baseName || `item_${i + 1}`,
    title: r.baseName || `화면 ${i + 1}`,
    caption: "",
    altText: r.baseName || `화면 ${i + 1}`,
    imagePath: r.filePath
  }));

  try {
    const res = await window.workbenchApi.runExport({
      items,
      outputDir,
      channels,
      namingPattern
    });

    if (res && res.error) {
      appendLog("error", res.error);
    } else {
      AppState.exportResults = {
        outputDir,
        markdownPath: res.markdown?.documentPath || "",
        wordPath: res.word?.documentPath || "",
        pptPath: res.ppt?.presentationPath || "",
        exportedAt: new Date().toLocaleString("ko-KR")
      };
      const summary = [];
      if (res.markdown) summary.push(`Markdown: ${res.markdown.count}개`);
      if (res.word) summary.push(`Word(.docx): ${res.word.count}개`);
      if (res.ppt) summary.push(`PPT(.pptx): ${res.ppt.count}개`);
      appendLog("export", `내보내기 완료 → ${summary.join(" / ")}`);
      appendLog("export", `출력 경로: ${outputDir}`);
      if (res.word && res.word.documentPath) {
        appendLog("export", `Word 문서: ${res.word.documentPath}`);
      }
      if (res.ppt && res.ppt.presentationPath) {
        appendLog("export", `PPT 문서: ${res.ppt.presentationPath}`);
      }
      updateExportActionButtons();
      renderExportResultSummary();
    }
  } catch (e) {
    appendLog("error", e.message || String(e));
  }
}

window.initExportScreen = initExportScreen;
window.updateExportPreview = updateExportPreview;
window.syncProjectExportProfiles = syncProjectExportProfiles;
window.applyProjectExportProfiles = applyProjectExportProfiles;
window.syncExportFormFromState = syncExportFormFromState;
