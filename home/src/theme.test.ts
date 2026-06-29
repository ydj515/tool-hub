import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveInitialTheme } from "./theme";

describe("resolveInitialTheme", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("dark"),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it("prefers a saved theme from localStorage", () => {
    localStorage.setItem("theme", "light");

    expect(resolveInitialTheme()).toBe("light");
  });

  it("falls back to the system preference when nothing is saved", () => {
    expect(resolveInitialTheme()).toBe("dark");
  });
});
