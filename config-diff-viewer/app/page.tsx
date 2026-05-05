/**
 * Config Diff Viewer 메인 페이지를 렌더링한다.
 */
"use client";

import dynamic from "next/dynamic";

const ConfigDiffClient = dynamic(
  () => import("@/app/_components/config-diff-client"),
  { ssr: false },
);

export default function HomePage() {
  return <ConfigDiffClient />;
}
