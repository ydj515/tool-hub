"use client";

import dynamic from "next/dynamic";

const GeneratorClient = dynamic(() => import("@/app/_components/generator-client"), {
  ssr: false
});

export default function HomePage() {
  return <GeneratorClient />;
}
