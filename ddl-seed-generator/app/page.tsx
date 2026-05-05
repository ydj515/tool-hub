/**
 * DDL Seed Generator 메인 페이지를 렌더링한다.
 */
"use client";

import dynamic from "next/dynamic";

const GeneratorClient = dynamic(() => import("@/app/_components/generator-client"), {
  ssr: false,
});

export default function HomePage() {
  return <GeneratorClient />;
}
