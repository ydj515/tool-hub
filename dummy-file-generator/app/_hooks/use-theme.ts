"use client";

/**
 * 테마 상태를 data-theme 속성·localStorage와 동기화하는 훅.
 * mounted는 SSR 하이드레이션 불일치를 피하려 테마 아이콘 렌더를 한 프레임 지연시키는 데 쓴다.
 */
import { useEffect, useState } from "react";
import { resolveInitialTheme } from "@/app/theme";

export function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">(resolveInitialTheme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  function toggle() {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      try {
        localStorage.setItem("theme", next);
      } catch {
        /* localStorage unavailable */
      }
      return next;
    });
  }

  return { theme, toggle, mounted };
}
