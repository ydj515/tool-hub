# ESLint Guidelines

이 문서는 TypeScript 프로젝트에서 ESLint를 type-aware 품질 게이트로 사용하는 기준입니다.

## 설정과 버전

- ESLint, `@eslint/js`, TypeScript와 typescript-eslint 버전을 `package.json`과 lockfile에
  함께 고정합니다.
- 저장소 루트의 `eslint.config.mjs` flat config를 단일 진입점으로 사용합니다. legacy
  `.eslintrc*`와 flat config를 함께 유지하지 않습니다.
- 일반 correctness는 recommended rules, TypeScript 의미 분석은
  `recommendedTypeChecked`와 `parserOptions.projectService: true`에서 시작합니다.
  type-aware lint 비용이 큰 저장소는 측정 결과와 제외 범위를 기록합니다.
- 시작점은 `templates/eslint/typescript/eslint.config.mjs.example`이며 소비할 때
  `.example` suffix를 제거하고 실제 source 및 generated 경로에 맞게 glob을 조정합니다.

## 실행과 예외

- lint script는 `eslint . --max-warnings=0`처럼 warning 누적을 성공으로 처리하지 않게
  구성합니다.
- `eslint --fix`는 개발자용 명시적 수정 명령으로 분리하고 CI에서는 자동 수정하지 않습니다.
- disable directive는 rule id와 최소 범위를 사용합니다. 사용하지 않는 directive는
  `reportUnusedDisableDirectives`로 실패시키고 광범위한 file disable을 기본 해법으로
  사용하지 않습니다.
- typecheck와 ESLint는 역할이 다르므로 `tsc --noEmit`과 lint를 모두 `verify` 경로에
  포함합니다.
- Prettier를 formatter로 선택하면 ESLint는 lint만 담당하고 stylistic rule을 중복
  선언하지 않습니다. Biome가 lint까지 담당하면 ESLint를 선택하지 않는 구성을 기본으로
  하며, 함께 사용할 때는 각 도구가 소유할 rule 범위를 문서화합니다.

## 최소 검증

```sh
pnpm exec eslint . --max-warnings=0
pnpm exec tsc --noEmit
```

Node.js, pnpm과 공통 task를 고정하는 시작점은
`templates/mise/typescript/mise.toml.example`을 사용합니다. 설정 형식은
[ESLint flat config](https://eslint.org/docs/latest/use/configure/configuration-files)와
[typescript-eslint typed linting](https://typescript-eslint.io/getting-started/typed-linting/)을
기준으로 합니다.
