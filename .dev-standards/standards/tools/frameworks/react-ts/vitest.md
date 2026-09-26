# Vitest Coverage Guidelines

이 문서는 React + TypeScript 프로젝트에서 Vitest와 V8 coverage를 테스트 및 커버리지 게이트로
사용하는 기준입니다.

## 설정과 범위

- Vitest, `@vitest/coverage-v8`, React plugin과 DOM test environment를 exact devDependency와
  lockfile에 함께 고정합니다.
- 시작점은 `templates/vitest/react-ts/vitest.config.ts.example`입니다. 기존 `vite.config.ts`
  또는 `vitest.config.ts`가 있으면 새 파일을 병행하지 않고 `test` 설정을 직접 병합합니다.
- component test는 `jsdom` 같은 DOM environment를 명시하고, pure function과 Node adapter는
  필요하면 별도 project에서 `node` environment로 분리합니다.
- `coverage.include`에 production source를 명시하여 test에서 import되지 않은 파일도 측정
  대상에 포함합니다. generated code, declaration, story와 test support 파일만 근거를 남기고
  제외합니다.
- line, branch, function, statement threshold를 모두 설정합니다. 기존 프로젝트는 현재 측정값
  이하의 현실적인 기준에서 시작해 낮추지 않고 점진적으로 올리며, 신규 프로젝트는 template의
  기준을 출발점으로 사용합니다.
- HTML은 로컬 분석, text는 CI log, LCOV는 외부 리포팅 연동에 사용합니다.

## 테스트 전략

- compiler와 ESLint가 이미 잡는 타입 모양을 반복 검증하지 않습니다.
- component는 role, accessible name과 사용자 상호작용을 검증하고 내부 state나 class name에
  결합하지 않습니다.
- API adapter와 state 경계는 정상 응답뿐 아니라 timeout, 오류 응답, 취소와 race를 포함합니다.
- coverage 수치만 채우는 assertion 없는 test나 production 분기를 제외 목록으로 숨기는 방식을
  허용하지 않습니다.

## 실행과 검증

```json
{
  "scripts": {
    "test": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

```sh
pnpm exec vitest run --coverage
```

Jest를 이미 사용하는 프로젝트는 교체를 강제하지 않습니다. 같은 역할을 Istanbul coverage와
threshold로 유지하고, Vitest와 Jest를 하나의 application test suite에 중복 운영하지 않습니다.

참고: [Vitest coverage](https://vitest.dev/guide/coverage.html)
