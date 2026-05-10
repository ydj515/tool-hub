/**
 * 캡처 전 DOM 규칙(텍스트 치환, 요소 숨기기)을 Playwright 페이지에 적용한다.
 *
 * 규칙 타입:
 *   replaceText: selector의 텍스트를 value로 치환
 *   hide:        selector의 요소를 display:none 처리
 *
 * 좌표계: 이 모듈은 DOM/CSS pixel 단계에서만 동작하며 이미지 좌표를 다루지 않는다.
 */

/** @typedef {{ id: string, type: 'replaceText'|'hide', selector: string, value?: string, enabled: boolean }} DomRule */

/**
 * @param {import('playwright').Page} page
 * @param {DomRule[]} rules
 * @returns {Promise<Array<{ruleId: string, selector: string, status: 'ok'|'warn', message?: string}>>}
 */
async function applyDomRules(page, rules) {
  const results = [];

  for (const rule of rules) {
    if (!rule.enabled) continue;

    const { id: ruleId, type, selector, value } = rule;

    if (!selector) {
      results.push({ ruleId, selector, status: "warn", message: "selector가 비어 있습니다." });
      continue;
    }

    try {
      const count = await page.evaluate(
        ({ type, selector, value }) => {
          const els = document.querySelectorAll(selector);
          if (els.length === 0) return 0;
          els.forEach((el) => {
            if (type === "replaceText") {
              el.textContent = value || "";
            } else if (type === "hide") {
              el.style.display = "none";
            }
          });
          return els.length;
        },
        { type, selector, value }
      );

      if (count === 0) {
        results.push({
          ruleId,
          selector,
          status: "warn",
          message: `selector '${selector}'에 해당하는 요소를 찾지 못했습니다.`
        });
      } else {
        results.push({ ruleId, selector, status: "ok", message: `${count}개 요소 처리됨` });
      }
    } catch (e) {
      results.push({
        ruleId,
        selector,
        status: "warn",
        message: `규칙 적용 실패: ${e && e.message ? e.message : String(e)}`
      });
    }
  }

  return results;
}

/**
 * DOM 규칙 결과를 구조화된 로그 객체로 직렬화한다.
 */
function formatDomRuleLog(results, url) {
  return results.map((r) => ({
    type: r.status === "ok" ? "dom-rule-ok" : "dom-rule-warn",
    url,
    ruleId: r.ruleId,
    selector: r.selector,
    message: r.message || ""
  }));
}

module.exports = { applyDomRules, formatDomRuleLog };
