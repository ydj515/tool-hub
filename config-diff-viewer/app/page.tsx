"use client";

import dynamic from "next/dynamic";

const ConfigDiffClient = dynamic(
  () => import("@/app/_components/config-diff-client"),
  { ssr: false },
);

export default function HomePage() {
  return <ConfigDiffClient />;
}
