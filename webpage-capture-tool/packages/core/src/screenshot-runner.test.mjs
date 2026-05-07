import { createRequire } from "node:module";
import { describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const { waitForRender } = require("./screenshot-runner");

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
