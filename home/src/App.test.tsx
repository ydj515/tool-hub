import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("Home App", () => {
  it("filters cards by tag selection", async () => {
    const user = userEvent.setup();

    render(<App />);

    expect(screen.getByText("Sign Maker")).toBeInTheDocument();
    expect(screen.getByText("DDL Seed Generator")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "SQL" }));

    expect(screen.getByText("DDL Seed Generator")).toBeInTheDocument();
    expect(screen.queryByText("Sign Maker")).not.toBeInTheDocument();
  });

  it("toggles the theme class on the document root", async () => {
    const user = userEvent.setup();

    render(<App />);

    const toggleButton = screen.getByRole("button", { name: "테마 전환" });

    expect(document.documentElement).not.toHaveClass("dark");

    await user.click(toggleButton);

    expect(document.documentElement).toHaveClass("dark");
  });
});
