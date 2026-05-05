/**
 * SQL 식별자에서 따옴표(", `, [])를 제거하고 이스케이프된 따옴표를 복원한다.
 * 스키마를 포함한 점(.) 구분자도 처리한다. 예: `"public"."users"` → `public.users`
 * @param identifier - 정규화할 원본 SQL 식별자 문자열
 * @returns 따옴표가 제거된 식별자
 */
export function normalizeIdentifier(identifier: string): string {
  return identifier
    .trim()
    .split(".")
    .map((part) => {
      const t = part.trim();
      if (t.startsWith('"') && t.endsWith('"')) return t.slice(1, -1).replace(/""/g, '"');
      if (t.startsWith("`") && t.endsWith("`")) return t.slice(1, -1).replace(/``/g, "`");
      if (t.startsWith("[") && t.endsWith("]")) return t.slice(1, -1);
      return t;
    })
    .join(".");
}

/**
 * 문자열에서 지정된 여는 괄호 위치부터 대응하는 닫는 괄호까지의 내용을 추출한다.
 * 인용 문자열(', ", `, []) 내부의 괄호는 무시한다.
 * @param input - 검색할 전체 SQL 문자열
 * @param openParenIndex - 여는 괄호 '(' 의 문자 인덱스
 * @returns 괄호 사이의 내용 문자열, 대응하는 닫는 괄호가 없으면 null
 */
export function extractParenBody(input: string, openParenIndex: number): string | null {
  let depth = 0;
  let quote: "'" | '"' | "`" | null = null;
  let bracketQuote = false;

  for (let i = openParenIndex; i < input.length; i++) {
    const char = input[i];
    const next = input[i + 1];

    if (quote !== null) {
      if (char === quote && next === quote) {
        i++;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (bracketQuote) {
      if (char === "]") bracketQuote = false;
      continue;
    }

    if (char === "'" || char === '"' || char === "`") {
      quote = char;
      continue;
    }

    if (char === "[") {
      bracketQuote = true;
      continue;
    }

    if (char === "(") {
      depth++;
      continue;
    }

    if (char === ")") {
      depth--;
      if (depth === 0) return input.slice(openParenIndex + 1, i);
    }
  }

  return null;
}
