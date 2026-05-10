/**
 * 내보내기 화면 초기화와 채널별 출력 실행을 담당한다.
 */

function initExportScreen() {
  const btnPickExportDir = document.getElementById("btn-pick-export-dir");
  const btnRunExport = document.getElementById("btn-run-export");
  const btnOpenFolder = document.getElementById("btn-open-export-folder");
  const exportDirInput = document.getElementById("export-dir");
  const namingInput = document.getElementById("naming-pattern");

  if (btnPickExportDir) {
    btnPickExportDir.addEventListener("click", async () => {
      const dir = await window.workbenchApi.selectOutDir();
      if (dir) {
        exportDirInput.value = dir;
        AppState.exportConfig.outputDir = dir;
      }
    });
  }

  if (btnRunExport) {
    btnRunExport.addEventListener("click", runExport);
  }

  if (btnOpenFolder) {
    btnOpenFolder.addEventListener("click", () => {
      const dir = exportDirInput.value || AppState.exportConfig.outputDir;
      if (dir) window.workbenchApi.openFolder(dir);
    });
  }

  // 채널 체크박스
  ["markdown", "word", "ppt"].forEach((ch) => {
    const cb = document.getElementById(`ch-${ch}`);
    if (cb) {
      cb.addEventListener("change", (e) => {
        AppState.exportConfig.channels[ch] = e.target.checked;
        updateExportPreview();
      });
    }
  });

  if (namingInput) {
    namingInput.addEventListener("input", (e) => {
      AppState.exportConfig.namingPattern = e.target.value;
    });
  }
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
      const summary = [];
      if (res.markdown) summary.push(`Markdown: ${res.markdown.count}개`);
      if (res.word) summary.push(`Word Assets: ${res.word.count}개`);
      if (res.ppt) summary.push(`PPT Assets: ${res.ppt.count}개`);
      appendLog("export", `내보내기 완료 → ${summary.join(" / ")}`);
      appendLog("export", `출력 경로: ${outputDir}`);
    }
  } catch (e) {
    appendLog("error", e.message || String(e));
  }
}

window.initExportScreen = initExportScreen;
window.updateExportPreview = updateExportPreview;
