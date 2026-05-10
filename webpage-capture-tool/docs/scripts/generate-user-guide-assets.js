const fs = require("fs");
const os = require("os");
const path = require("path");
const { pathToFileURL } = require("url");
const { _electron: electron } = require("playwright");

const repoRoot = path.resolve(__dirname, "../..");
const appPath = path.join(repoRoot, "apps/electron/main.js");
const assetDir = path.join(repoRoot, "docs/user-guide-assets");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, "utf8");
}

function buildDemoPage({ title, subtitle, bannerClass, memberName, memberId, steps, cards }) {
  const stepItems = steps
    .map((step) => `<li><strong>${step.title}</strong><span>${step.description}</span></li>`)
    .join("");
  const cardItems = cards
    .map((card) => `
      <article class="metric-card">
        <h3>${card.title}</h3>
        <p>${card.value}</p>
        <small>${card.caption}</small>
      </article>
    `)
    .join("");

  return `<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>
      :root {
        --bg: #f4f6fb;
        --ink: #17324d;
        --muted: #5d7187;
        --panel: #ffffff;
        --line: #d9e2ef;
        --brand: #1769aa;
        --accent: #f59e0b;
        --success: #1f8f58;
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        font-family: "Pretendard", "Apple SD Gothic Neo", sans-serif;
        background:
          radial-gradient(circle at top right, rgba(23, 105, 170, 0.14), transparent 22%),
          linear-gradient(180deg, #fbfcff 0%, var(--bg) 100%);
        color: var(--ink);
      }

      .page {
        max-width: 1120px;
        margin: 0 auto;
        padding: 40px 36px 72px;
      }

      .hero {
        display: grid;
        grid-template-columns: 1.4fr 0.8fr;
        gap: 24px;
        align-items: stretch;
      }

      .hero-main,
      .hero-side,
      .section,
      .metric-card,
      .tip-card {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 24px;
        box-shadow: 0 22px 45px rgba(23, 50, 77, 0.08);
      }

      .hero-main {
        padding: 28px;
      }

      .eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 14px;
        color: var(--brand);
        font-size: 13px;
        font-weight: 700;
      }

      .hero-main h1 {
        margin: 0;
        font-size: 44px;
        line-height: 1.08;
      }

      .hero-main p {
        margin: 18px 0 0;
        color: var(--muted);
        font-size: 18px;
        line-height: 1.7;
      }

      .promo-banner {
        margin-top: 24px;
        padding: 18px 20px;
        border-radius: 18px;
        color: #fff;
        font-weight: 700;
      }

      .promo-banner.notice {
        background: linear-gradient(135deg, #6d28d9, #2563eb);
      }

      .promo-banner.warning {
        background: linear-gradient(135deg, #ef4444, #f59e0b);
      }

      .hero-side {
        padding: 24px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }

      .member-box {
        padding: 18px;
        border-radius: 20px;
        background: linear-gradient(180deg, #eef7ff 0%, #f9fbff 100%);
        border: 1px solid #d9ebfb;
      }

      .member-box h2 {
        margin: 0 0 8px;
        font-size: 18px;
      }

      #member-name {
        display: block;
        margin-top: 12px;
        font-size: 28px;
        font-weight: 800;
      }

      .member-id {
        margin-top: 8px;
        color: var(--muted);
      }

      .stat-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 16px;
        margin-top: 28px;
      }

      .metric-card {
        padding: 18px 18px 20px;
      }

      .metric-card h3 {
        margin: 0;
        font-size: 14px;
        color: var(--muted);
      }

      .metric-card p {
        margin: 14px 0 6px;
        font-size: 34px;
        font-weight: 800;
        color: var(--brand);
      }

      .metric-card small {
        color: var(--muted);
      }

      .section-grid {
        display: grid;
        grid-template-columns: 1.15fr 0.85fr;
        gap: 24px;
        margin-top: 24px;
      }

      .section {
        padding: 24px;
      }

      .section h2 {
        margin: 0 0 16px;
        font-size: 24px;
      }

      .steps {
        margin: 0;
        padding: 0;
        list-style: none;
        display: grid;
        gap: 14px;
      }

      .steps li {
        display: grid;
        gap: 6px;
        padding: 16px 18px;
        border-radius: 18px;
        background: #f8fbff;
        border: 1px solid #dde8f5;
      }

      .steps strong {
        font-size: 17px;
      }

      .steps span,
      .tip-card p {
        color: var(--muted);
        line-height: 1.65;
      }

      .tip-stack {
        display: grid;
        gap: 16px;
      }

      .tip-card {
        padding: 18px;
      }

      .tip-card h3 {
        margin: 0 0 10px;
        font-size: 18px;
      }

      .footer-note {
        margin-top: 28px;
        padding: 18px 20px;
        border-radius: 18px;
        background: #edf9f1;
        border: 1px solid #cfe8d8;
        color: var(--success);
        font-weight: 700;
      }
    </style>
  </head>
  <body>
    <main class="page">
      <section class="hero">
        <div class="hero-main">
          <div class="eyebrow">Manual Capture Demo</div>
          <h1>${title}</h1>
          <p>${subtitle}</p>
          <div class="promo-banner ${bannerClass}">민감 정보는 캡처 전에 치환하거나 숨길 수 있습니다.</div>
        </div>
        <aside class="hero-side">
          <div class="member-box">
            <h2>대표 회원 카드</h2>
            <span id="member-name">${memberName}</span>
            <div class="member-id">회원번호: ${memberId}</div>
          </div>
          <div class="footer-note">캡처 결과는 Markdown, Word 문서, PPT 문서로 바로 내보낼 수 있습니다.</div>
        </aside>
      </section>

      <section class="stat-grid">
        ${cardItems}
      </section>

      <section class="section-grid">
        <div class="section">
          <h2>작업 절차</h2>
          <ol class="steps">
            ${stepItems}
          </ol>
        </div>
        <div class="tip-stack">
          <article class="tip-card">
            <h3>뷰포트 추천</h3>
            <p>문서용 결과물이면 Word 기본, 발표용 결과물이면 PPT 16:9 프리셋을 먼저 써보세요.</p>
          </article>
          <article class="tip-card">
            <h3>자동 반복 작업</h3>
            <p>이미지 편집 규칙을 저장해두면 여러 페이지에 같은 블러, 박스, 크롭을 반복 적용할 수 있습니다.</p>
          </article>
          <article class="tip-card">
            <h3>오류 확인</h3>
            <p>실패 로그 탭에서 실패 URL과 selector 경고를 따로 복사하고, 실패 항목만 다시 실행할 수 있습니다.</p>
          </article>
        </div>
      </section>
    </main>
  </body>
</html>`;
}

function buildDemoAssets(tempRoot) {
  const siteDir = path.join(tempRoot, "demo-site");
  const captureDir = path.join(tempRoot, "captures");
  const exportDir = path.join(tempRoot, "exports");
  ensureDir(siteDir);
  ensureDir(captureDir);
  ensureDir(exportDir);

  const pageAPath = path.join(siteDir, "member-overview.html");
  const pageBPath = path.join(siteDir, "member-audit.html");
  const listPath = path.join(siteDir, "capture-list.csv");

  writeFile(pageAPath, buildDemoPage({
    title: "회원 관리 대시보드",
    subtitle: "신규 가입자 현황과 검수 상태를 한 화면에서 정리한 예시 페이지입니다.",
    bannerClass: "notice",
    memberName: "김도연",
    memberId: "M-240531-01",
    steps: [
      { title: "입력 목록 준비", description: "단일 URL 또는 목록 파일을 연결해 캡처 대상을 정합니다." },
      { title: "캡처 옵션 설정", description: "뷰포트, 비율, 캡처 범위, 대기 시간을 작업 목적에 맞게 조정합니다." },
      { title: "후처리 적용", description: "DOM 규칙과 이미지 편집 규칙으로 민감 정보를 가리고 문서용 화면을 정리합니다." }
    ],
    cards: [
      { title: "오늘 가입", value: "128", caption: "전일 대비 12% 증가" },
      { title: "검수 대기", value: "16", caption: "자동 태깅 완료" },
      { title: "재실행 필요", value: "2", caption: "선택적 재처리 대상" }
    ]
  }));

  writeFile(pageBPath, buildDemoPage({
    title: "회원 검수 이력",
    subtitle: "캡처 이후 배치 편집과 내보내기 예시를 보여주기 위한 두 번째 샘플 페이지입니다.",
    bannerClass: "warning",
    memberName: "박지훈",
    memberId: "M-240531-02",
    steps: [
      { title: "DOM 치환", description: "실제 이름 대신 공용 이름을 넣어 검수본을 안전하게 공유합니다." },
      { title: "이미지 블러", description: "카드 영역 일부만 블러 처리해 개인정보를 비식별화합니다." },
      { title: "내보내기", description: "Markdown 미리보기를 확인한 뒤 Word 문서와 PPT 문서를 함께 생성합니다." }
    ],
    cards: [
      { title: "완료된 검수", value: "87", caption: "이번 주 기준" },
      { title: "보류 중", value: "5", caption: "정책 검토 필요" },
      { title: "오류 로그", value: "0", caption: "재시도 후 정상화" }
    ]
  }));

  const csvRows = [
    "id,subject,detailPage",
    `1,회원 관리 대시보드,${pathToFileURL(pageAPath).href}`,
    `2,회원 검수 이력,${pathToFileURL(pageBPath).href}`
  ];
  writeFile(listPath, csvRows.join("\n"));

  return {
    pageAPath,
    pageBPath,
    listPath,
    captureDir,
    exportDir
  };
}

async function screenshotCurrentPage(page, fileName) {
  await page.screenshot({
    path: path.join(assetDir, fileName)
  });
}

async function switchScreen(page, screenId) {
  await page.locator(`.nav-item[data-screen="${screenId}"]`).click();
  await page.waitForFunction((id) => window.AppState.currentScreen === id, screenId);
}

async function fillProject(page, captureDir) {
  await page.locator("#btn-new-project").click();
  await page.locator("#modal-project-name").fill("사용 설명서 데모");
  await page.locator("#modal-project-out").fill(captureDir);
  await page.locator("#modal-create-project").click();
  await page.waitForFunction(() => window.AppState.project.name === "사용 설명서 데모");
}

async function configureCapture(page, listPath, captureDir) {
  await switchScreen(page, "capture");
  await page.evaluate(({ listPath, captureDir }) => {
    AppState.project.capturePreset.sourceType = "file";
    AppState.project.capturePreset.filePaths = [listPath];
    AppState.project.capturePreset.outDir = captureDir;
    AppState.project.capturePreset.sheet = "";
    AppState.project.capturePreset.colUrl = "detailPage";
    AppState.project.capturePreset.waitMs = 800;
    AppState.project.capturePreset.viewportPreset = "word";
    AppState.project.capturePreset.viewport = { width: 1440, height: 1024 };
    AppState.project.capturePreset.aspectMode = "16:9";
    AppState.project.capturePreset.captureScope = "fullPage";
    AppState.project.capturePreset.headless = true;
    AppState.project.capturePreset.dedupe = true;
    syncCaptureFormFromState();
  }, { listPath, captureDir });
  await screenshotCurrentPage(page, "02-capture-settings.png");
}

async function configureDomRules(page) {
  await switchScreen(page, "dom");
  await page.locator("#new-rule-type").selectOption("replaceText");
  await page.locator("#new-rule-selector").fill("#member-name");
  await page.locator("#new-rule-value").fill("홍길동");
  await page.locator("#btn-add-rule-confirm").click();

  await page.locator("#new-rule-type").selectOption("hide");
  await page.locator("#new-rule-selector").fill(".promo-banner");
  await page.locator("#btn-add-rule-confirm").click();

  await page.waitForFunction(() => window.AppState.project.domRules.length === 2);
  await screenshotCurrentPage(page, "03-dom-rules.png");
}

async function runCapture(page) {
  await page.locator("#btn-run").click();
  await page.waitForFunction(() => window.AppState.isRunning === true);
  await page.waitForFunction(() => {
    return window.AppState.isRunning === false && window.AppState.captureResults.filter((item) => item.status === "ok").length >= 2;
  }, null, { timeout: 60_000 });
}

async function prepareImageEditor(page) {
  await switchScreen(page, "image");
  await page.waitForFunction(() => window.AppState.captureResults.length >= 2 && window.AppState.imageEdit.currentIndex >= 0);
  await page.locator("#btn-zoom-fit").click();
  await page.evaluate(() => {
    AppState.imageEdit.currentTool = "blur";
    document.querySelectorAll(".tool-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tool === "blur");
    });
    updateToolProps();
    AppState.imageEdit.pendingRules = [{
      id: generateRuleId(),
      type: "blur",
      x: 120,
      y: 110,
      width: 300,
      height: 90,
      sigma: 10
    }];
    renderEditRuleList();
    redrawCanvas();
  });
  await screenshotCurrentPage(page, "04-image-editor.png");
  await page.evaluate(async () => {
    await applyImageEdits();
  });
  await page.waitForFunction(() => window.AppState.project.editRules.length >= 1);
}

async function prepareBatch(page) {
  await switchScreen(page, "batch");
  await page.locator("#batch-select-all").check();
  await page.waitForTimeout(300);
  await screenshotCurrentPage(page, "05-batch-work.png");
}

async function prepareExport(page, exportDir) {
  await switchScreen(page, "export");
  await page.evaluate((exportDir) => {
    AppState.exportConfig.channels = { markdown: true, word: true, ppt: true };
    AppState.exportConfig.outputDir = exportDir;
    AppState.exportConfig.namingPattern = "{index}_{safeTitle}";
    syncProjectExportProfiles();
    syncExportFormFromState();
    updateExportPreview();
  }, exportDir);
  await page.locator("#btn-run-export").click();
  await page.waitForFunction(() => document.getElementById("log-export").textContent.includes("내보내기 완료"), null, { timeout: 30_000 });
  await page.locator('.log-tab[data-log="export"]').click();
  await page.waitForTimeout(300);
  await screenshotCurrentPage(page, "06-export.png");
}

async function main() {
  ensureDir(assetDir);
  const tempRoot = path.join(os.tmpdir(), "mcw-user-guide-demo");
  fs.rmSync(tempRoot, { recursive: true, force: true });
  ensureDir(tempRoot);
  const demo = buildDemoAssets(tempRoot);

  const electronApp = await electron.launch({
    args: [appPath],
    env: { ...process.env, NODE_ENV: "test" }
  });

  try {
    const page = await electronApp.firstWindow();
    await page.waitForLoadState("domcontentloaded");
    await page.setViewportSize({ width: 1440, height: 1080 });

    await fillProject(page, demo.captureDir);
    await screenshotCurrentPage(page, "01-project-home.png");
    await configureCapture(page, demo.listPath, demo.captureDir);
    await configureDomRules(page);
    await runCapture(page);
    await prepareImageEditor(page);
    await prepareBatch(page);
    await prepareExport(page, demo.exportDir);

    const manifest = {
      generatedAt: new Date().toISOString(),
      assetDir: path.relative(repoRoot, assetDir),
      captureDir: path.relative(repoRoot, demo.captureDir),
      exportDir: path.relative(repoRoot, demo.exportDir)
    };
    writeFile(path.join(assetDir, "manifest.json"), JSON.stringify(manifest, null, 2));
    console.log(`Generated user guide assets in ${assetDir}`);
  } finally {
    await electronApp.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
