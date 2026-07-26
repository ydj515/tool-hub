import { describe, expect, it, vi } from "vitest";
import { getInvalidGenerationOptionsMessage } from "./generator-client";

vi.mock("@/app/_components/EditorPanel", () => ({
  default: () => null,
}));

describe("DDL Seed Generator 생성 옵션 오류", () => {
  it("행 수와 시드 값의 유효 범위를 한국어로 안내한다", () => {
    expect(getInvalidGenerationOptionsMessage()).toBe(
      "DDL, 행 수, 시드 값을 확인해 주세요. 행 수는 1부터 10000까지 지원합니다.",
    );
  });
});
