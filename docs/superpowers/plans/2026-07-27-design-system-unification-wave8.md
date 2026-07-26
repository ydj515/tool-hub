# 디자인 시스템 통일 8차: 반전 표면 토큰과 monospace 스택 승격

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 4개 앱이 4가지 이름·5가지 값으로 갖고 있는 "밝은 페이지 안의 반전(어두운) 표면"과 4가지 monospace 스택을 정본으로 승격해, 6·7차가 앱마다 로컬 토큰을 따로 만들며 남긴 파편화를 걷어낸다.

**Architecture:** 정본에 `--inverse-bg` · `--inverse-text` · `--inverse-line` · `--ds-font-mono` 네 토큰을 추가하고(순수 추가, 기존 값 불변), 각 앱의 `theme.local.css` 에서 중복 정의를 지운 뒤 참조부 이름을 맞춘다. 값은 이미 정본 다크 팔레트에서 파생된 `ddl-seed-generator` 계열을 채택한다 — 우연이 아니라 그 앱이 다크 표면을 의도적으로 미러링했기 때문이다. 대비 계약은 7차에서 만든 `ds-contrast.test.ts` 에 반전 쌍을 추가해 지킨다.

**Tech Stack:** 정본 CSS + `scripts/sync-design-tokens.mjs` · vitest (9개 앱) · Next.js 3 / Vite 4 / Electron 1

## Global Constraints

- 작업 브랜치는 `feat/design-system-wave8` 이다. `main` 에서 분기한다.
- `styles/ds-*.css` · `ds-sync.test.ts` · `ds-contrast.test.ts` 는 **생성물이다.** 직접 편집하지 말고 `packages/design-system/` 정본을 고친 뒤 저장소 루트에서 `npm run tokens:sync` 를 실행한다.
- 정본 토큰 추가는 **순수 추가**여야 한다. 기존 토큰 값을 바꾸지 않는다.
- Tailwind 테마 네임스페이스와 겹치는 토큰은 `--ds-` 접두사를 쓴다. `--font-mono` 는 Tailwind 네임스페이스라 **`--ds-font-mono`** 로 두고 `@theme inline` 으로 매핑한다. 색 토큰(`--inverse-*`)은 겹치지 않으므로 접두사가 없다.
- 검증은 앱마다 `mise run check`, 루트에서 `npm run tokens:check` 와 `npm run tokens:test` 다.
- 값이 바뀌는 앱이 생기면 **이름 치환과 값 변경을 같은 커밋에 섞지 않는다.**

## 사전 실측

`main`(e8ecc4f)에서 확인한 사실이다. 실행자는 다시 증명할 필요가 없다.

### 반전 표면 — 4개 앱, 4가지 이름, 5가지 값

**"코드"가 아니라 "반전 표면"이다.** 사용처를 실제로 열어 보면 코드 블록만이 아니다.

| 앱 | 사용처 | 컴포넌트 |
|---|---|---|
| `ddl-seed-generator` | `.sqlPreview` | SQL 미리보기 코드 블록 |
| `api-contract-test-generator` | `.request-preview pre` | 요청 미리보기 코드 블록 |
| `config-diff-viewer` | `.optionToggle[data-tooltip]::after` · `::before` | **다크 툴팁**(화살표 포함) |
| `openapi-editor` | `.editor-frame` | **Monaco 프레임 배경** |

넷 다 "밝은 페이지 안에 놓인 어두운 표면"이고 다크 테마에서 한 단계 더 내려간다. `--code-*` 로 이름 붙이면 툴팁과 에디터 프레임에 맞지 않으므로 `--inverse-*` 를 쓴다.

| 앱 | 이름 | 라이트 | 다크 | 현재 대비 |
|---|---|---|---|---|
| `openapi-editor` | `--code` | `#171717` | `#0f1010` | 글자 토큰 없음 |
| `config-diff-viewer` | `--code` · `--code-text` · `--code-line` | `#171717` / `#f0f4f2` | `#0f1010` / `#f0f4f2` | 16.16 / 17.18 |
| `ddl-seed-generator` | `--code` · `--code-text` · `--code-line` | `rgb(27,28,30)` / `rgb(232,233,236)` | `rgb(20,20,21)` / `rgb(228,229,232)` | 14.05 / 14.62 |
| `api-contract-test-generator` | **`--code-bg`** · `--code-text` | `#15171c` / `#eef1f6` (다크 오버라이드 없음 = 고정) | — | 15.84 |

`--code` 와 `--code-bg` 로 이름이 갈렸고, `openapi-editor` 는 배경만 있고 글자 토큰이 없다.

**값의 출처를 보면 하나로 모을 근거가 있다.** `ddl-seed-generator` 의 값은 정본 다크 팔레트를 그대로 미러링한 것이다.

- `rgb(27, 28, 30)` = 정본 다크 `--surface`
- `rgb(20, 20, 21)` = 다크 `--bg`(`rgb(15,15,16)`)와 `--surface` 사이
- `rgb(232, 233, 236)` ≈ 다크 `--text`(`rgb(247,247,247)`)보다 약간 낮은 단계

나머지 앱의 `#171717` 은 라이트 `--text`, `#0f1010` 은 다크 `--bg` 근사치로 **역할이 아니라 우연히 같은 값**을 쓴 것이다.

**채택할 정본 값과 대비**(계산 완료):

| 토큰 | 라이트 | 다크 |
|---|---|---|
| `--inverse-bg` | `rgb(27, 28, 30)` | `rgb(20, 20, 21)` |
| `--inverse-text` | `rgb(232, 233, 236)` | `rgb(228, 229, 232)` |
| `--inverse-line` | `rgb(55, 56, 60)` | `rgb(46, 47, 51)` |

대비는 라이트 **14.05:1**, 다크 **14.62:1** 로 AAA 를 크게 넘는다.

**앱별 시각 변화**는 다음과 같다. 전부 대비가 유지되거나 좋아진다.

- `config-diff-viewer`: 배경이 `#171717` → `rgb(27,28,30)` 로 약간 밝아지고 글자가 `#f0f4f2` → `rgb(232,233,236)` 로 약간 어두워진다. 대비 16.16 → 14.05.
- `ddl-seed-generator`: **변화 없음**(이미 그 값).
- `openapi-editor`: `.editor-frame` 배경이 `#171717` → `rgb(27,28,30)`. Monaco 가 자기 배경을 위에 칠하므로 보이는 변화는 로딩 중뿐이다.
- `api-contract-test-generator`: 고정값에서 **테마 적응**으로 바뀐다. `#15171c` → 라이트 `rgb(27,28,30)` / 다크 `rgb(20,20,21)`.

### webpage-capture-tool 의 `--log-*` 는 포함하지 않는다

로그 패널도 반전 표면이지만 **탭 상태를 가진 콘솔 컴포넌트**다. `--log-text`(비활성 탭) · `--log-active-bg` · `--log-active-text` 처럼 반전 표면에 없는 상태 토큰을 갖고, 값도 파랑 계열(`#111827` · `#374151` · `#9ca3af`)로 의도적으로 다르다. 이 앱은 다크 모드 자체가 없다. 억지로 합치면 탭 상태 표현을 잃는다.

단 `--log-h`(180px, 레이아웃)와 `--sidebar-*` 는 애초에 승격 대상이 아니다.

### json-yaml-converter 의 `--editor-bg` 도 포함하지 않는다

`#ffffff` / `#1e1e1e` 로 **Monaco 의 vs / vs-dark 기본 배경을 따라간다.** 반전 표면이 아니라 서드파티 에디터의 테마를 따라가는 값이다. 반전 표면과 반대로 라이트에서 흰색이다. `openapi-editor` 의 `.editor-frame` 은 두 테마 모두 어두우므로 반전 표면이 맞지만, 이쪽은 테마를 따라가므로 다르다.

### monospace — 4개 앱, 4가지 스택, 13곳

| 앱 | 스택 | 곳 |
|---|---|---|
| `ddl-seed-generator` | `'SF Mono', SFMono-Regular, Consolas, "Liberation Mono", monospace` | 3 |
| `config-diff-viewer` | `SFMono-Regular, Consolas, "Liberation Mono", monospace` | 6 |
| `webpage-capture-tool` | `"SFMono-Regular", "Menlo", "Consolas", monospace` (1곳), `"SFMono-Regular", "Menlo", monospace` (1곳), `monospace` (1곳) | 3 |
| `openapi-editor` | `.file-chip` 안 (1곳) | 1 |

`ddl-seed-generator` 스택이 가장 넓다(`'SF Mono'` 는 macOS 사용자 설치본, `SFMono-Regular` 는 시스템, `Consolas` 는 Windows, `Liberation Mono` 는 Linux). 이것을 정본으로 채택한다.

### 사용처 (참조부 개명 대상)

```
ddl-seed-generator/app/styles/components.css:406-408      .sqlPreview        --code-text · --code · --code-line
config-diff-viewer/app/styles/components.css:585-586      툴팁 ::after       --code · --code-text
config-diff-viewer/app/styles/components.css:598          툴팁 ::before      --code (border-top-color)
api-contract-test-generator/src/styles/components.css:239 .request-preview pre  --code-bg · --code-text
openapi-editor/src/styles/components.css:40               .editor-frame      --code (background)
```

`openapi-editor` 의 `.editor-frame` 은 한 줄에 여러 규칙이 붙어 있어 `sed` 로 바꿀 때 다른 선언을 건드리지 않도록 `var(--code)` 만 정확히 치환한다.

---

### Task 1: 정본에 반전 표면과 monospace 토큰을 추가

값만 추가한다. 이 태스크에서 앱 화면은 바뀌지 않는다 — 아직 아무도 참조하지 않는다.

**Files:**
- Modify: `packages/design-system/tokens.css`
- Modify: `packages/design-system/ds-contrast.test.ts`
- Modify: `packages/design-system/README.md`

**Interfaces:**
- Produces: `--inverse-bg` · `--inverse-text` · `--inverse-line`(라이트/다크), `--ds-font-mono`, `@theme inline` 의 `--color-inverse-*` 와 `--font-mono`

- [ ] **Step 1: 대비 테스트에 반전 쌍을 먼저 추가한다 (실패해야 한다)**

`packages/design-system/ds-contrast.test.ts` 의 `BODY_TEXT` 아래에 상수를 추가한다.

```ts
/** 반전 표면은 밝은 페이지 안의 어두운 영역이다. 자기 배경 위에서만 검사한다. */
const INVERSE_PAIR = ['--inverse-text', '--inverse-bg'] as const;
```

그리고 `describe.each` 블록 안, `--on-primary` 검사 앞에 넣는다.

```ts
  it('--inverse-text 가 --inverse-bg 위에서 4.5:1 이상이다', () => {
    expect(contrast(read(INVERSE_PAIR[0]), read(INVERSE_PAIR[1]))).toBeGreaterThanOrEqual(4.5);
  });

  it('--inverse-line 이 --inverse-bg 위에서 3:1 이상이다', () => {
    // 반전 표면의 테두리는 영역 경계를 식별하므로 WCAG 1.4.11 비텍스트 기준을 쓴다.
    expect(contrast(read('--inverse-line'), read('--inverse-bg'))).toBeGreaterThanOrEqual(3);
  });
```

- [ ] **Step 2: 실패를 확인한다**

```bash
cd api-contract-test-generator && npm run test -- src/styles/ds-contrast.test.ts
```

Expected: FAIL — `토큰 --inverse-text 이 없다` 로 던진다(아직 정본에 없다). 라이트·다크 각각 2건씩 총 4건.

- [ ] **Step 3: 정본에 반전 표면 토큰을 추가한다**

`packages/design-system/tokens.css` 의 라이트 `:root` 블록에서 `--warning-surface` 줄 뒤에 추가한다.

```css

  /* ── 반전 표면 ── */
  /* 밝은 페이지 안의 어두운 영역 — 코드 블록·다크 툴팁·에디터 프레임.
     페이지가 다크일 때 한 단계 더 내려 영역 경계를 유지한다. 값은 다크 팔레트에서 파생했다 —
     라이트 배경은 다크 --surface, 다크 배경은 다크 --bg 와 --surface 사이.
     대비 14.05:1 (라이트) · 14.62:1 (다크) */
  --inverse-bg: rgb(27, 28, 30);
  --inverse-text: rgb(232, 233, 236);
  --inverse-line: rgb(55, 56, 60);
```

다크 `[data-theme="dark"]` 블록에서 `--warning-surface` 줄 뒤에 추가한다.

```css

  --inverse-bg: rgb(20, 20, 21);
  --inverse-text: rgb(228, 229, 232);
  --inverse-line: rgb(46, 47, 51);
```

- [ ] **Step 4: monospace 스택을 추가한다**

라이트 `:root` 의 `--ds-font-sans` 줄 바로 뒤에 추가한다.

```css
  /* 코드·수치 정렬용 등폭. 'SF Mono' 는 macOS 사용자 설치본, SFMono-Regular 는
     시스템, Consolas 는 Windows, Liberation Mono 는 Linux 를 덮는다. */
  --ds-font-mono: 'SF Mono', SFMono-Regular, Consolas, 'Liberation Mono', monospace;
```

- [ ] **Step 5: `@theme inline` 매핑을 추가한다**

`--color-warning-surface` 줄 뒤에 색 토큰을 추가한다.

```css
  --color-inverse-bg: var(--inverse-bg);
  --color-inverse-text: var(--inverse-text);
  --color-inverse-line: var(--inverse-line);
```

그리고 `--font-sans: var(--ds-font-sans);` 줄 뒤에 추가한다.

```css
  --font-mono: var(--ds-font-mono);
```

`--font-mono` 는 Tailwind 네임스페이스라 `:root` 에서는 `--ds-` 접두사를 쓰고 여기서만 Tailwind 이름으로 매핑한다. 접두사를 빼면 `font-mono` 유틸리티와 `var()` 가 갈라진다.

- [ ] **Step 6: 동기화하고 통과를 확인한다**

```bash
npm run tokens:sync && npm run tokens:test
```

Expected: 9개 앱에 5개 파일이 복사되고 루트 테스트 7건 통과.

```bash
cd api-contract-test-generator && npm run test -- src/styles/ds-contrast.test.ts
```

Expected: 전부 통과. 코드 쌍 검사가 라이트 14.05 · 다크 14.62 로 통과한다.

- [ ] **Step 7: README 를 갱신한다**

`packages/design-system/README.md` 의 네임스페이스 표에서 접두사 사용 행에 `--ds-font-mono` 를 추가하고, 접두사 없음 행에 `--inverse-*` 를 추가한다.

그리고 "역할 표면 위의 텍스트" 절 뒤에 추가한다.

```markdown
#### 반전 표면

`--inverse-bg` · `--inverse-text` · `--inverse-line` 은 **밝은 페이지 안의 어두운 영역**용이다 — 코드 블록, 다크 툴팁, 항상 어두운 에디터 프레임. 라이트에서도 어두운 배경을 쓰고, 페이지가 다크일 때 한 단계 더 내려 영역 경계를 유지한다.

값은 다크 팔레트에서 파생했다. 라이트 배경은 다크 `--surface`, 다크 배경은 다크 `--bg` 와 `--surface` 사이다. 대비는 라이트 14.05:1, 다크 14.62:1 로 `ds-contrast.test.ts` 가 검사한다.

**테마를 따라가는** 서드파티 에디터 배경은 이 토큰을 쓰지 않는다. 라이트에서 흰색이 되어야 하므로 앱 고유 토큰으로 둔다. 두 테마 모두 어두운 에디터 프레임은 반전 표면이 맞다.
```

- [ ] **Step 8: 9개 앱 검증**

정본이 바뀌었으므로 전부 돌린다.

```bash
for app in sign-maker json-yaml-converter ddl-seed-generator openapi-editor dummy-file-generator config-diff-viewer home webpage-capture-tool api-contract-test-generator; do printf "%-30s " "$app"; (cd "$app" && mise run check >/tmp/w8-$app.log 2>&1) && echo PASS || echo FAIL; done
```

Expected: 9개 전부 PASS. 아직 아무 앱도 새 토큰을 참조하지 않으므로 화면 변화가 없다.

- [ ] **Step 9: 커밋**

```bash
git add packages/design-system/ scripts/ '*/styles/ds-*' && git commit -m "feat(design-system): promote code surface and mono stack to the canonical"
```

---

### Task 2: ddl-seed-generator — 중복 정의 제거

정본 값과 **완전히 같은** 앱부터 한다. 참조부 이름만 `--code` → `--inverse-bg` 로 바뀌고 값은 그대로다.

**Files:**
- Modify: `ddl-seed-generator/app/styles/theme.local.css`
- Modify: `ddl-seed-generator/app/styles/components.css`

- [ ] **Step 1: 값이 정본과 같은지 확인한다**

```bash
grep -E "^\s*--code" ddl-seed-generator/app/styles/theme.local.css
```

Expected: 라이트 `rgb(27, 28, 30)` / `rgb(232, 233, 236)` / `rgb(55, 56, 60)`, 다크 `rgb(20, 20, 21)` / `rgb(228, 229, 232)` / `rgb(46, 47, 51)`. 정본과 일치한다.

- [ ] **Step 2: 참조부를 개명한다**

`--code` 만 이름이 다르다(`--inverse-text` · `--inverse-line` 은 같다).

```bash
cd ddl-seed-generator && sed -i '' 's/var(--code)/var(--inverse-bg)/g' app/styles/components.css
```

- [ ] **Step 3: monospace 를 토큰으로 바꾼다**

```bash
cd ddl-seed-generator && sed -i '' "s/font-family: 'SF Mono', SFMono-Regular, Consolas, \"Liberation Mono\", monospace;/font-family: var(--ds-font-mono);/g" app/styles/components.css
```

- [ ] **Step 4: 로컬 정의를 지운다**

`theme.local.css` 의 `:root` 와 `[data-theme="dark"]` 양쪽에서 `--code` · `--inverse-text` · `--inverse-line` 세 줄씩 지운다. 다른 토큰은 건드리지 않는다.

- [ ] **Step 5: 남은 참조와 리터럴을 확인한다**

```bash
cd ddl-seed-generator && grep -rn "var(--code)\|'SF Mono'\|SFMono-Regular" app/styles/ || echo "남은 것 없음"
```

Expected: `남은 것 없음`

- [ ] **Step 6: 검증**

```bash
cd ddl-seed-generator && mise run check
```

- [ ] **Step 7: 커밋**

```bash
git add ddl-seed-generator/ && git commit -m "refactor(ddl-seed-generator): consume the canonical code surface tokens"
```

---

### Task 3: openapi-editor · config-diff-viewer — 개명과 값 정렬

두 앱은 값이 정본과 다르다(`#171717` / `#0f1010`). **이름 치환과 값 변경을 분리한다.**

**Files:**
- Modify: `openapi-editor/src/styles/theme.local.css`, `src/styles/components.css`
- Modify: `config-diff-viewer/app/styles/theme.local.css`, `app/styles/components.css`

- [ ] **Step 1: openapi-editor 의 `--code` 사용처를 찾는다**

사전 실측에서 정의는 확인했지만 사용처는 한 줄이 길어 잘렸다. 먼저 본다.

```bash
cd openapi-editor && grep -n "var(--code" src/styles/*.css
```

사용처가 없다면 `theme.local.css` 의 정의만 지우고 Step 4 로 간다(죽은 토큰이었다는 뜻이므로 커밋 메시지에 적는다).

- [ ] **Step 2: 두 앱의 참조부를 개명한다 (값 보존)**

`theme.local.css` 는 그대로 두고 참조부만 바꾼다. `--code` → `--inverse-bg` 다.

```bash
sed -i '' 's/var(--code)/var(--inverse-bg)/g' openapi-editor/src/styles/components.css config-diff-viewer/app/styles/components.css
```

이 시점에는 앱의 `theme.local.css` 가 `--code` 를 정의하고 참조부는 `--inverse-bg` 를 보므로 **정본 값이 적용된다.** 값 변경이 여기서 일어나므로 Step 3 에서 로컬 정의를 지우는 것과 한 커밋으로 묶는다.

- [ ] **Step 3: 로컬 정의를 지운다**

- `openapi-editor/src/styles/theme.local.css`: `--code` 두 줄(라이트·다크)
- `config-diff-viewer/app/styles/theme.local.css`: `--code` · `--inverse-text` · `--inverse-line` 각 두 줄

`config-diff-viewer` 의 `--coral` · `--green` · `--green-dark` · `--violet` · `--scrim` 은 남긴다.

- [ ] **Step 4: monospace 를 토큰으로 바꾼다**

```bash
sed -i '' 's/font-family: SFMono-Regular, Consolas, "Liberation Mono", monospace;/font-family: var(--ds-font-mono);/g' config-diff-viewer/app/styles/components.css
```

`openapi-editor` 의 `.file-chip` 은 한 줄 안에 있으므로 파일을 열어 손으로 바꾼다.

- [ ] **Step 5: 남은 것을 확인한다**

```bash
grep -rn "var(--code)\|SFMono-Regular" openapi-editor/src/styles/ config-diff-viewer/app/styles/ || echo "남은 것 없음"
```

- [ ] **Step 6: 검증과 눈 확인**

```bash
(cd openapi-editor && mise run check) && (cd config-diff-viewer && mise run check)
```

`config-diff-viewer` 는 넘침 E2E 가 없으므로 dev 서버를 띄워 코드 툴팁(`.diffTooltip` 계열, `--inverse-bg` 사용처)을 라이트·다크 양쪽에서 본다.

```bash
cd config-diff-viewer && npm run dev -- --port 3210
```

확인 후 서버를 끈다.

- [ ] **Step 7: 커밋**

```bash
git add openapi-editor/ config-diff-viewer/ && git commit -m "refactor(design-system): align openapi-editor and config-diff-viewer code surfaces"
```

---

### Task 4: api-contract-test-generator — 고정에서 테마 적응으로

이 앱만 `--inverse-bg` 라는 이름을 이미 쓰지만 **다크 오버라이드가 없어 고정값**이다. 정본을 쓰면 테마를 따라가게 된다.

**Files:**
- Modify: `api-contract-test-generator/src/styles/theme.local.css`
- Modify: `api-contract-test-generator/src/styles/components.css`

- [ ] **Step 1: 로컬 정의를 지운다**

`theme.local.css` 의 `:root` 에서 `--inverse-bg` 와 `--inverse-text` 두 줄, 그리고 그 위 주석 블록을 지운다. `--hero-size` 와 `--section-hero-size` 는 남긴다.

참조부는 이미 `var(--inverse-bg)` · `var(--inverse-text)` 라 **바꿀 것이 없다.**

- [ ] **Step 2: 대비 E2E 에 코드 블록을 추가한다**

이 앱은 요소 층 가드가 있으므로 렌더된 코드 블록도 검사한다. `e2e/contrast.spec.ts` 의 요소 층 테스트에서 수집 대상 셀렉터에 추가한다.

```js
      for (const selector of ['.privacy-note', '.eyebrow', '.request-preview pre']) {
```

그리고 아래 단정도 함께 고친다.

```js
    expect(samples.map((s) => s.label)).toContain('.request-preview pre');
```

- [ ] **Step 3: 검증**

```bash
cd api-contract-test-generator && mise run check
```

Expected: 전부 통과. 코드 블록이 라이트에서 `rgb(27,28,30)`, 다크에서 `rgb(20,20,21)` 로 렌더되고 대비 14 이상이다.

- [ ] **Step 4: 커밋**

```bash
git add api-contract-test-generator/ && git commit -m "refactor(api-contract-test-generator): let the code block follow the theme"
```

---

### Task 5: webpage-capture-tool — monospace 만

로그 패널 색은 **합치지 않는다**(사전 실측의 근거 참조). monospace 스택 3곳만 정본으로 옮긴다.

**Files:**
- Modify: `webpage-capture-tool/apps/electron/renderer/style.css`

- [ ] **Step 1: 세 곳을 바꾼다**

| 행 | 현재 | 변경 |
|---|---|---|
| 198 | `font-family: "SFMono-Regular", "Menlo", "Consolas", monospace;` | `font-family: var(--ds-font-mono);` |
| 561 | `font-family: monospace;` | `font-family: var(--ds-font-mono);` |
| 602 | `font-family: "SFMono-Regular", "Menlo", monospace;` | `font-family: var(--ds-font-mono);` |

행 번호는 현재 파일 기준이다. 인용한 문자열로 위치를 찾는다.

- [ ] **Step 2: 확인**

```bash
cd webpage-capture-tool && grep -n "monospace" apps/electron/renderer/style.css || echo "리터럴 monospace 없음"
```

Expected: `리터럴 monospace 없음`

- [ ] **Step 3: 검증**

```bash
cd webpage-capture-tool && mise run check && npm run test:e2e
```

E2E 는 이 앱의 `CLAUDE.md` 가 최종 검증에 요구한다.

- [ ] **Step 4: 커밋**

```bash
git add webpage-capture-tool/ && git commit -m "refactor(webpage-capture-tool): use the canonical mono stack"
```

---

### Task 6: 문서 갱신과 9개 앱 최종 검증

**Files:**
- Modify: `docs/frontend-conventions.md`

- [ ] **Step 1: 컨벤션에 규칙을 추가한다**

"상시 다크 영역" 규칙 줄 뒤에 추가한다.

```markdown
- **코드·터미널 블록은 정본 `--inverse-bg`/`--inverse-text`/`--inverse-line` 을 쓴다.** 테마와 무관하게 어둡고 페이지가 다크일 때 한 단계 더 내려간다. 앱마다 로컬 토큰을 만들지 않는다 — 8차 이전에 4개 앱이 4가지 이름·5가지 값으로 갈라져 있었다.
- **서드파티 에디터의 배경은 예외다.** Monaco 처럼 자기 테마를 가진 컴포넌트는 그 테마를 따라가야 하므로 앱 고유 토큰(`--editor-bg`)으로 둔다.
- **등폭 글꼴은 `var(--ds-font-mono)` 를 쓴다.** `--font-mono` 는 Tailwind 네임스페이스라 `:root` 에서는 `--ds-` 접두사를 쓴다.
```

- [ ] **Step 2: 9개 앱 최종 검증**

```bash
for app in sign-maker json-yaml-converter ddl-seed-generator openapi-editor dummy-file-generator config-diff-viewer home webpage-capture-tool api-contract-test-generator; do printf "%-30s " "$app"; (cd "$app" && mise run check >/tmp/w8f-$app.log 2>&1) && echo PASS || echo FAIL; done
```

- [ ] **Step 3: 루트 검증**

```bash
npm run tokens:check && npm run tokens:test
```

- [ ] **Step 4: 승격 대상이 남았는지 다시 센다**

```bash
python3 - <<'EOF'
import pathlib, re, collections
apps = "home sign-maker json-yaml-converter openapi-editor api-contract-test-generator ddl-seed-generator config-diff-viewer dummy-file-generator webpage-capture-tool".split()
owner = collections.defaultdict(set)
for a in apps:
    for f in pathlib.Path(a).rglob('theme.local.css'):
        if 'node_modules' in str(f): continue
        for m in re.finditer(r'^\s*(--[a-z0-9-]+)\s*:', f.read_text(), re.M):
            owner[m.group(1)].add(a)
for tok, apps_ in sorted(owner.items(), key=lambda x: -len(x[1])):
    if len(apps_) >= 3: print(f"승격 대상 남음: {tok} — {sorted(apps_)}")
print("검사 완료")
EOF
```

Expected: 승격 대상 없음.

- [ ] **Step 5: 커밋**

```bash
git add docs/ && git commit -m "docs(design-system): record the code surface and mono stack rules"
```

---

## 완료 기준

- [ ] 9개 앱 전부 `mise run check` 통과
- [ ] 루트 `tokens:check` drift 0건, `tokens:test` 7/7
- [ ] `theme.local.css` 에 3개 앱 이상에서 반복되는 토큰이 없음
- [ ] 앱 CSS 에 `monospace` 리터럴 스택이 없음
- [ ] `ds-contrast.test.ts` 가 코드 쌍을 검사하고 9개 앱에서 통과
- [ ] `config-diff-viewer` 코드 툴팁을 라이트·다크로 눈 확인

## 이번 파도에서 하지 않는 것

- **`webpage-capture-tool` 의 `--log-*` 통합.** 반전 표면이긴 하나 탭 상태 토큰을 가진 콘솔 컴포넌트고, 값도 파랑 계열로 의도적으로 다르다. 이 앱은 다크 모드도 없다.
- **`json-yaml-converter` 의 `--editor-bg` 통합.** Monaco 의 vs/vs-dark 배경을 따라가 라이트에서 흰색이다. 반전 표면과 반대 방향이다.
- **`.ds-card` 채택 확대.** 앱마다 카드 규약이 달라 통합 가치가 불확실하다. 7차 조사에서 유보했다.
- **요소 층 대비 가드를 E2E 없는 5개 앱에 확대.** 하네스 신설 비용이 크다. 토큰 층은 `ds-contrast.test.ts` 가 이미 9개 앱을 덮는다.
- **허브 URL 12곳 하드코딩 해소.** 앱마다 독립 패키지라 상수 공유 수단이 없고, 도메인 변경은 드물다.
