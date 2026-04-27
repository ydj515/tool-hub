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
