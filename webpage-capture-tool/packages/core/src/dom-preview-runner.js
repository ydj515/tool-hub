/**
 * URL을 렌더링한 뒤 DOM 편집용 후보 요소를 수집한다.
 */
const { chromium } = require("playwright");
const { waitForRender } = require("./screenshot-runner");

function compactText(value, maxLength = 118) {
  const text = (value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

function normalizeTagName(value) {
  return (value || "").trim().toLowerCase();
}

function formatCandidateLabel(candidate) {
  const tagName = normalizeTagName(candidate.tagName) || "element";
  const id = (candidate.id || "").trim();
  const className = (candidate.className || "")
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(".");

  if (id && className) return `${tagName}#${id}.${className}`;
  if (id) return `${tagName}#${id}`;
  if (className) return `${tagName}.${className}`;
  return tagName;
}

function normalizeDomPreviewCandidates(rawCandidates, limit = 100) {
  return (rawCandidates || [])
    .filter((candidate) => candidate && candidate.selector && candidate.tagName)
    .slice(0, limit)
    .map((candidate, idx) => ({
      index: idx + 1,
      selector: candidate.selector,
      tagName: normalizeTagName(candidate.tagName),
      label: formatCandidateLabel(candidate),
      text: compactText(candidate.text),
      role: (candidate.role || "").trim(),
      ariaLabel: compactText(candidate.ariaLabel || "", 80)
    }));
}

async function collectDomPreviewCandidates(page, limit = 100) {
  const rawCandidates = await page.evaluate((maxItems) => {
    function escapeCss(value) {
      if (window.CSS && typeof window.CSS.escape === "function") {
        return window.CSS.escape(value);
      }
      return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
    }

    function isUnique(selector) {
      try {
        return document.querySelectorAll(selector).length === 1;
      } catch (_e) {
        return false;
      }
    }

    function selectorFor(el) {
      if (el.id) {
        const byId = `#${escapeCss(el.id)}`;
        if (isUnique(byId)) return byId;
      }

      const parts = [];
      let current = el;
      while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body) {
        const tag = current.tagName.toLowerCase();
        const classes = Array.from(current.classList || []).slice(0, 3).map((name) => `.${escapeCss(name)}`).join("");
        let part = `${tag}${classes}`;
        if (!isUnique([...parts, part].reverse().join(" > "))) {
          let nth = 1;
          let sibling = current;
          while ((sibling = sibling.previousElementSibling)) {
            if (sibling.tagName === current.tagName) nth++;
          }
          part = `${part}:nth-of-type(${nth})`;
        }
        parts.push(part);
        const selector = parts.slice().reverse().join(" > ");
        if (isUnique(selector)) return selector;
        current = current.parentElement;
      }

      return parts.slice().reverse().join(" > ");
    }

    const ignoredTags = new Set(["script", "style", "meta", "link", "noscript", "template"]);
    const elements = Array.from(document.body ? document.body.querySelectorAll("*") : [])
      .filter((el) => !ignoredTags.has(el.tagName.toLowerCase()))
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      })
      .slice(0, maxItems * 4);

    return elements
      .map((el) => ({
        selector: selectorFor(el),
        tagName: el.tagName,
        text: el.innerText || el.textContent || "",
        id: el.id || "",
        className: typeof el.className === "string" ? el.className : "",
        role: el.getAttribute("role") || "",
        ariaLabel: el.getAttribute("aria-label") || ""
      }))
      .filter((item) => item.selector)
      .slice(0, maxItems);
  }, limit);

  return normalizeDomPreviewCandidates(rawCandidates, limit);
}

async function inspectDomForUrl(url, options = {}) {
  const {
    headless = true,
    viewport = { width: 1440, height: 1024 },
    waitMs = 2000,
    limit = 100
  } = options;

  const browser = await chromium.launch({ headless, timeout: 30000 });
  try {
    const page = await browser.newPage();
    await page.setViewportSize(viewport);
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
    await waitForRender(page, waitMs);
    const candidates = await collectDomPreviewCandidates(page, limit);
    return { url, candidates };
  } finally {
    await browser.close();
  }
}

module.exports = {
  normalizeDomPreviewCandidates,
  collectDomPreviewCandidates,
  inspectDomForUrl
};
