/**
 * 채널별 출력 프로필 정의와 파일명 규칙 처리를 담당한다.
 *
 * 지원 채널: markdown, word, ppt
 * 파일명 토큰: {index}, {title}, {safeTitle}, {date}, {slug}
 */

/** 내장 채널 프리셋 */
const BUILTIN_PROFILES = {
  markdown: {
    channel: "markdown",
    preset: "markdown-default",
    imageWidth: 1280,
    namingPattern: "{index}_{safeTitle}",
    outputSubDir: "markdown-export"
  },
  word: {
    channel: "word",
    preset: "word-default",
    imageWidth: 1440,
    namingPattern: "{index}_{safeTitle}",
    outputSubDir: "word-assets"
  },
  ppt: {
    channel: "ppt",
    preset: "ppt-16-9",
    imageWidth: 1920,
    namingPattern: "{index}_{safeTitle}",
    outputSubDir: "ppt-assets"
  }
};

/** 뷰포트 프리셋 */
const VIEWPORT_PRESETS = {
  word: { width: 1440, height: 1024, label: "Word 기본 (1440x1024)" },
  ppt: { width: 1920, height: 1080, label: "PPT 16:9 (1920x1080)" },
  markdown: { width: 1280, height: 800, label: "Markdown 기본 (1280x800)" },
  custom: { width: 1280, height: 720, label: "사용자 정의" }
};

/**
 * 파일명 토큰을 실제 값으로 치환한다.
 * @param {string} pattern - 파일명 패턴
 * @param {{ index: number, title?: string, date?: string }} ctx
 * @returns {string}
 */
function resolveFilename(pattern, ctx) {
  const { index, title = "", date } = ctx;
  const safeTitle = makeSafeTitle(title);
  const slug = makeSlug(title);
  const dateStr = date || formatDate(new Date());

  return (pattern || "{index}_{safeTitle}")
    .replace(/\{index\}/g, String(index).padStart(3, "0"))
    .replace(/\{title\}/g, title)
    .replace(/\{safeTitle\}/g, safeTitle)
    .replace(/\{slug\}/g, slug)
    .replace(/\{date\}/g, dateStr);
}

/** OS 금지 문자를 _로 치환, 한글 유지 */
function makeSafeTitle(title) {
  return (title || "untitled").replace(/[\\/:*?"<>|]/g, "_").slice(0, 120);
}

/** 파일명 slug: 영문/숫자/한글/하이픈만 유지 */
function makeSlug(title) {
  return (title || "untitled")
    .replace(/[^a-zA-Z0-9가-힣\s-]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase()
    .slice(0, 80);
}

function formatDate(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

/**
 * 충돌 방지용 suffix를 붙인 파일명을 반환한다.
 * @param {string} base - 확장자 제외 파일명
 * @param {Set<string>} usedNames
 */
function resolveUniqueFilename(base, usedNames) {
  if (!usedNames.has(base)) {
    usedNames.add(base);
    return base;
  }
  let n = 1;
  while (usedNames.has(`${base}_${n}`)) n++;
  const unique = `${base}_${n}`;
  usedNames.add(unique);
  return unique;
}

module.exports = {
  BUILTIN_PROFILES,
  VIEWPORT_PRESETS,
  resolveFilename,
  makeSafeTitle,
  makeSlug,
  resolveUniqueFilename
};
