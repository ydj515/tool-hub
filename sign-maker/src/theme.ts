/**
 * 현재 환경과 저장된 사용자 설정을 바탕으로 초기 테마를 결정한다.
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
    if (saved === "light" || saved === "dark") {
      initial = saved;
    }
  } catch {
    /* localStorage unavailable */
  }

  return initial;
}
