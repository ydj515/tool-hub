/**
 * 이 파일은 packages/design-system/ds-contrast-e2e.ts 의 생성물이다.
 * 직접 편집하지 말고 정본을 고친 뒤 저장소 루트에서
 * `npm run tokens:sync` 를 실행한다.
 *
 * 렌더된 요소의 대비를 재는 Playwright 헬퍼다. 브라우저 없는
 * ds-contrast.test.ts 는 토큰 값만 보므로 부모 틴트 위 알파 표면 합성이나
 * background-image 로 칠한 틴트를 잡지 못한다. 그 층을 여기서 덮는다.
 *
 * Playwright 타입에 의존하지 않는다 — evaluate 를 가진 객체면 무엇이든 받는다.
 */

export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface Sample {
  label: string;
  color: string;
  backgrounds: string[];
}

interface Evaluatable {
  evaluate<T, A>(fn: (arg: A) => T, arg: A): Promise<T>;
}

/** `#rgb` · `#rrggbb` · `rgb()` · `rgba()` 를 해석한다. */
export function parseColor(value: string): Rgba {
  const text = value.trim();

  if (text.startsWith('#')) {
    const hex = text.slice(1);
    const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex;
    return {
      r: Number.parseInt(full.slice(0, 2), 16),
      g: Number.parseInt(full.slice(2, 4), 16),
      b: Number.parseInt(full.slice(4, 6), 16),
      a: 1,
    };
  }

  const parts = text.match(/[\d.]+/g);
  if (!parts || parts.length < 3) throw new Error(`색을 해석할 수 없다: ${value}`);
  const [r, g, b, a = '1'] = parts;
  return { r: Number(r), g: Number(g), b: Number(b), a: Number(a) };
}

/** 반투명 전경을 아래 색 위에 합성한다. */
export function composite(top: Rgba, bottom: Rgba): Rgba {
  const alpha = top.a + bottom.a * (1 - top.a);
  if (alpha === 0) return { r: 0, g: 0, b: 0, a: 0 };
  const mix = (t: number, b: number) => (t * top.a + b * bottom.a * (1 - top.a)) / alpha;
  return { r: mix(top.r, bottom.r), g: mix(top.g, bottom.g), b: mix(top.b, bottom.b), a: alpha };
}

function luminance({ r, g, b }: Rgba): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** 조상 체인에서 모은 배경 레이어를 불투명해질 때까지 합성한다. */
export function flatten(layers: string[]): Rgba {
  let result: Rgba = { r: 0, g: 0, b: 0, a: 0 };
  for (const layer of layers) {
    result = composite(result, parseColor(layer));
    if (result.a >= 1) return result;
  }
  // 어느 레이어도 불투명하지 않으면 캔버스 흰색이 밑바탕이다.
  return composite(result, { r: 255, g: 255, b: 255, a: 1 });
}

/** 두 색의 WCAG 대비 비율. 전경이 반투명하면 배경 위에 합성한다. */
export function contrastBetween(foreground: Rgba, background: Rgba): number {
  const flat = composite(foreground, background);
  const a = luminance(flat);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** 수집한 표본의 대비. 배경 레이어를 합성한 뒤 전경과 비교한다. */
export function contrastOf(sample: Sample): number {
  return contrastBetween(parseColor(sample.color), flatten(sample.backgrounds));
}

/**
 * 셀렉터마다 보이는 요소를 모아 색과 배경 레이어를 한 번의 evaluate 로 가져온다.
 *
 * 대상마다 evaluate 를 돌리면 왕복이 대상 수에 비례해 늘어나 병렬 부하에서
 * 테스트 타임아웃을 넘긴다 — 6차에서 실제로 30초를 넘겼다.
 *
 * background-image 도 읽는다. 배지는 눈에 보이는 틴트를 단색 gradient 로
 * 칠하고 background-color 에는 불투명 밑판만 두므로, backgroundColor 만
 * 보면 틴트를 건너뛰고 밑판과 비교하게 된다 — 실제 4.73:1 을 11.71:1 로 읽었다.
 */
export async function collectSamples(page: Evaluatable, selectors: string[]): Promise<Sample[]> {
  return page.evaluate((list: string[]) => {
    // 이 콜백은 브라우저에서 실행된다. DOM 타입을 쓰면 lib 이 프로젝트
    // 전역에 퍼져 다른 스펙의 타입 해석까지 바꾸므로, 필요한 것만 좁혀
    // 선언한다.
    interface Styles {
      backgroundImage: string;
      backgroundColor: string;
      color: string;
    }
    interface Node {
      parentElement: Node | null;
      textContent: string | null;
      getBoundingClientRect(): { width: number; height: number };
    }
    const env = globalThis as unknown as {
      getComputedStyle(el: Node): Styles;
      document: { querySelectorAll(selector: string): ArrayLike<Node> };
    };

    const collect = (el: Node) => {
      const backgrounds: string[] = [];
      let node: Node | null = el;
      while (node) {
        const style = env.getComputedStyle(node);
        const stops = style.backgroundImage.match(
          /^linear-gradient\((rgba?\([^)]*\)),\s*(rgba?\([^)]*\))\)$/,
        );
        if (stops && stops[1] === stops[2]) backgrounds.push(stops[1]);
        backgrounds.push(style.backgroundColor);
        node = node.parentElement;
      }
      return { color: env.getComputedStyle(el).color, backgrounds };
    };

    const out: { label: string; color: string; backgrounds: string[] }[] = [];
    for (const selector of list) {
      const found = env.document.querySelectorAll(selector);
      for (let i = 0; i < found.length; i += 1) {
        const el = found[i];
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        const text = (el.textContent ?? '').trim().slice(0, 20);
        out.push({ label: text ? `${selector} "${text}"` : selector, ...collect(el) });
      }
    }
    return out;
  }, selectors);
}
