import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("Sign Maker App UI", () => {
  it("switches from draw mode to upload mode", async () => {
    const user = userEvent.setup();

    render(<App />);

    expect(screen.getByText("Drawing Tools")).toBeInTheDocument();
    expect(screen.getByText("캔버스에 서명을 그리세요. 펜을 멈추면 3초 후 자동으로 부드럽게 처리됩니다.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /upload/i }));

    expect(screen.getByText("Image Settings")).toBeInTheDocument();
    expect(screen.getByText("Background Threshold")).toBeInTheDocument();
    expect(screen.getByText("클릭하거나 드래그하여 업로드")).toBeInTheDocument();
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
