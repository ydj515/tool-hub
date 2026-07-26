import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("Sign Maker App UI", () => {
  it("승인된 제품명과 공통 페이지·버튼 셸을 렌더링한다", () => {
    const { container } = render(<App />);

    expect(screen.getByRole("heading", { name: "Sign Maker" })).toBeInTheDocument();
    expect(container.querySelector("[data-ds-page-shell]")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "지우기" })).toHaveAttribute(
      "data-ds-button",
    );
    expect(screen.getByRole("button", { name: "내려받기" })).toHaveAttribute(
      "data-ds-button",
    );
  });

  it("switches from draw mode to upload mode", async () => {
    const user = userEvent.setup();

    render(<App />);

    expect(screen.getByText("그리기 도구")).toBeInTheDocument();
    expect(screen.getByText("캔버스에 서명을 그리세요. 펜을 멈추면 3초 후 자동으로 부드럽게 정리돼요.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "업로드" }));

    expect(screen.getByText("이미지 설정")).toBeInTheDocument();
    expect(screen.getByText("배경 임계값")).toBeInTheDocument();
    expect(screen.getByText("클릭하거나 드래그하여 업로드해요")).toBeInTheDocument();
  });

  it("toggles the document theme attribute", async () => {
    const user = userEvent.setup();

    render(<App />);

    const toggleButton = screen.getByRole("button", { name: /테마로 전환/ });

    expect(document.documentElement).toHaveAttribute("data-theme", "dark");

    await user.click(toggleButton);

    expect(document.documentElement).toHaveAttribute("data-theme", "light");
  });

  it("브랜드 블록이 Tool Hub 로 돌아가는 링크다", () => {
    render(<App />);

    const hubLink = screen.getByRole("link", { name: /Tool Hub/ });
    expect(hubLink).toHaveAttribute("href", "https://tool-hub-rho.vercel.app/");
  });
});
