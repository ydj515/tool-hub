/**
 * 저장된 선호값 또는 시스템 설정을 기반으로 초기 테마를 계산한다.
 */
export function resolveInitialTheme(): "light" | "dark" {
  if (typeof window === "undefined") {
    return "light";
  }

  let initial: "light" | "dark" = window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
  try {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") initial = saved;
  } catch {
    /* localStorage unavailable */
  }

  return initial;
}
