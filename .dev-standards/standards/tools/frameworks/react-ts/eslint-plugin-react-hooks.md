# eslint-plugin-react-hooks Guidelines

이 문서는 React 프로젝트에서 `eslint-plugin-react-hooks`를 Hook과 render 규칙의 정적
품질 게이트로 사용하는 기준입니다. 일반 TypeScript 규칙은
`tools/languages/typescript/eslint.md`가 소유하고 이 문서는 React 의미 규칙만 추가합니다.

## 설정과 책임

- React, ESLint, Node.js와 호환되는 plugin 버전을 exact devDependency와 lockfile로
  고정합니다.
- stable `recommended` preset을 기본으로 적용합니다. `recommended-latest`는 실험적인
  compiler 규칙을 의도적으로 검증할 때만 별도 변경으로 도입합니다.
- `rules-of-hooks`와 `exhaustive-deps`를 필수 오류로 유지합니다. dependency를 제거하거나
  disable comment로 Effect 재실행을 숨기지 않고 Effect 책임과 값의 identity를 수정합니다.
- custom Effect Hook이 있으면 실제 외부 동기화 의미를 가진 Hook만
  `settings.react-hooks.additionalEffectHooks`에 등록합니다.
- Next.js의 `eslint-config-next`를 사용하면 React와 React Hooks 규칙이 이미 포함되므로
  같은 preset을 중복 등록하지 않습니다.

기존 `eslint.config.mjs`에 다음 preset을 병합합니다.

```js
import { defineConfig } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";

export default defineConfig([
  reactHooks.configs.flat.recommended,
]);
```

이 설정은 기존 TypeScript ESLint 설정과 같은 파일에 병합해야 하므로 bootstrap이 별도
파일로 복사하지 않습니다.

## 검증과 예외

- CI는 `eslint . --max-warnings=0`으로 실행하고 lint와 `tsc --noEmit`, test, production
  build를 같은 `verify` 경로에 둡니다.
- suppress가 불가피하면 정확한 rule id, 최소 statement 범위와 React 규칙을 따를 수 없는
  이유를 함께 기록합니다.
- plugin major 변경 시 preset에 새로 포함된 rule과 기존 위반을 먼저 확인한 뒤 gate를
  갱신합니다.

```sh
pnpm exec eslint . --max-warnings=0
pnpm exec tsc --noEmit
```

참고: [React eslint-plugin-react-hooks](https://react.dev/reference/eslint-plugin-react-hooks),
[Rules of Hooks lint](https://react.dev/reference/eslint-plugin-react-hooks/lints/rules-of-hooks)
