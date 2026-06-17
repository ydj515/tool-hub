import { createRequire } from "node:module";
import { describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const { collectDepthOneLinks, createDepthRow, waitForRender } = require("./screenshot-runner");

describe("waitForRender", () => {
  it("waitMs가 양수일 때 page.waitForTimeout을 호출한다", async () => {
    const page = {
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
    };

    await waitForRender(page, 1500);

    expect(page.waitForTimeout).toHaveBeenCalledWith(1500);
  });

  it("waitMs가 0이면 추가 대기를 생략한다", async () => {
    const page = {
      waitForTimeout: vi.fn().mockResolvedValue(undefined),
    };

    await waitForRender(page, 0);

    expect(page.waitForTimeout).not.toHaveBeenCalled();
  });
});

describe("collectDepthOneLinks", () => {
  it("같은 origin의 고유 URL만 수집하고 hash와 외부 링크는 제외한다", async () => {
    const page = {
      $$eval: vi.fn().mockResolvedValue([
        "https://example.com/start#intro",
        "https://example.com/docs/a#section",
        "https://example.com/docs/a",
        "https://example.com/docs/b?tab=api#part",
        "https://other.example.com/docs/c",
        "mailto:hello@example.com",
        "javascript:void(0)"
      ]),
    };

    const links = await collectDepthOneLinks(page, "https://example.com/start#top");

    expect(links).toEqual([
      "https://example.com/docs/a",
      "https://example.com/docs/b?tab=api",
    ]);
  });
});

describe("createDepthRow", () => {
  it("부모 행의 식별 정보를 유지하면서 depth 대상 URL 행을 만든다", () => {
    const row = createDepthRow(
      {
        id: "root-1",
        subject: "시작 페이지",
        detailPage: "https://example.com/start",
      },
      "https://example.com/about",
      {
        id: "id",
        subjectKey: "subject",
        urlKey: "detailPage",
      },
      2,
      1
    );

    expect(row).toEqual({
      id: "root-1-d1-2",
      subject: "시작 페이지_d1_2",
      detailPage: "https://example.com/about",
      __depth: 1,
      __parentUrl: "https://example.com/start",
    });
  });
});
