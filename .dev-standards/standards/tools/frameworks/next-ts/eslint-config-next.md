# eslint-config-next Guidelines

이 문서는 Next.js 프로젝트에서 `eslint-config-next`로 framework-specific 오류와 Core Web
Vitals 관련 규칙을 검사하는 기준입니다. 일반 TypeScript 규칙은
`tools/languages/typescript/eslint.md`가 소유합니다.

## 설정과 책임

- `eslint-config-next`는 사용하는 Next.js 버전과 호환되는 exact devDependency로 고정하고
  `package.json`과 lockfile을 함께 변경합니다.
- 대부분의 프로젝트는 `eslint-config-next/core-web-vitals`를 기본으로 사용합니다.
  TypeScript 프로젝트는 `eslint-config-next/typescript`도 함께 적용합니다.
- Next config에는 Next.js, React와 React Hooks 규칙이 포함되므로
  `eslint-plugin-react-hooks` preset을 중복 등록하지 않습니다.
- 기존 flat config와 단순 조합할 때는 Next config 배열을 펼쳐 넣습니다. parser나 plugin을
  이미 직접 등록한 복잡한 설정은 중복 등록 오류가 없는지 확인하고 필요하면
  `@next/eslint-plugin-next` 규칙만 직접 병합합니다.

```js
import { defineConfig } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
]);
```

이 설정은 기존 `eslint.config.mjs`와 병합해야 하므로 bootstrap이 별도 파일로 복사하지
않습니다.

## 검증과 예외

- Next.js 16 이상은 제거된 `next lint` 대신 ESLint CLI를 직접 실행합니다.
- CI는 warning을 성공 처리하지 않으며 lint, typecheck, test와 production build를 모두
  검증합니다. ESLint 성공이 Server/Client boundary와 production build 검증을 대체하지
  않습니다.
- rule override는 framework 동작을 오탐한 최소 범위에서만 적용하고 근거를 남깁니다.

```sh
pnpm exec eslint . --max-warnings=0
pnpm exec tsc --noEmit
pnpm run build
```

참고: [Next.js ESLint configuration](https://nextjs.org/docs/app/api-reference/config/eslint)
