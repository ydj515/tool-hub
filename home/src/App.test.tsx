import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("Home App", () => {
  it("filters cards by category and restores all tools", async () => {
    const user = userEvent.setup();

    render(<App />);

    expect(screen.getByText("Sign Maker")).toBeInTheDocument();
    expect(screen.getByText("DDL Seed Generator")).toBeInTheDocument();

    expect(screen.getAllByRole("article")).toHaveLength(10);
    await user.click(screen.getByRole("button", { name: "변환·편집" }));

    expect(screen.getByText("JSON YAML Converter")).toBeInTheDocument();
    expect(screen.getByText("openapi-editor")).toBeInTheDocument();
    expect(screen.queryByText("Sign Maker")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "변환·편집" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("status")).toHaveTextContent("2개");
    await user.click(screen.getByRole("button", { name: "전체" }));
    expect(screen.getAllByRole("article")).toHaveLength(10);
  });

  it("uses the requested copy and a text-only footer", () => {
    render(<App />);
    expect(screen.getByRole("heading", { level: 1, name: "ToolHub" })).toBeInTheDocument();
    expect(screen.getByText("데이터 변환, 파일 생성 등 자주 사용하는 도구 모음입니다.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "도구 둘러보기" })).toHaveAttribute("href", "#tools");
    const footer = screen.getByRole("contentinfo");
    expect(footer).toHaveTextContent("ToolHub");
    expect(within(footer).queryByRole("link")).not.toBeInTheDocument();
    expect(footer.querySelector('img, svg')).toBeNull();
  });

  it("keeps unavailable tools non-launchable and preserves source links", () => {
    render(<App />);
    expect(screen.queryByRole("link", { name: "Webpage Capture 열기 (새 탭)" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Webpage Capture 소스 코드 (새 탭)" })).toHaveAttribute("href", "https://github.com/ydj515/tool-hub/tree/main/webpage-capture-tool");
    expect(screen.getByRole("link", { name: "Sign Maker 열기 (새 탭)" })).toHaveAttribute("href", "https://tool-hubsign-maker.vercel.app/");
  });

  it("toggles the document theme attribute", async () => {
    const user = userEvent.setup();

    render(<App />);

    const toggleButton = screen.getByRole("button", { name: "테마 전환" });

    expect(document.documentElement).toHaveAttribute("data-theme", "dark");

    await user.click(toggleButton);

    expect(document.documentElement).toHaveAttribute("data-theme", "light");
  });
});
