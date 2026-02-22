import JSZip from "jszip";

import { GenerateMode, ZipExtensionProfile, ZipStructure } from "@/lib/types";
import { randomBytes } from "@/lib/prng";
import { GeneratorResult } from "@/lib/generators/common";

function fitText(base: string, targetBytes: number, mode: GenerateMode, seed: string): GeneratorResult {
  const initial = Buffer.from(base, "utf-8");
  if (initial.length >= targetBytes) {
    return { buffer: initial, modeApplied: mode };
  }

  const gap = targetBytes - initial.length;
  const filler = randomBytes(gap, seed).toString("base64").slice(0, gap);
  const output = Buffer.concat([initial, Buffer.from(filler, "utf-8")]);

  if (mode === "exact") {
    return { buffer: output.subarray(0, targetBytes), modeApplied: "exact" };
  }

  return { buffer: output, modeApplied: "at_least" };
}

export function generateTxt(targetBytes: number, mode: GenerateMode, seed: string): GeneratorResult {
  return fitText(`Dummy text file\nseed=${seed}\n`, targetBytes, mode, seed);
}

export function generateCsv(targetBytes: number, mode: GenerateMode, seed: string): GeneratorResult {
  return fitText(`id,name,value\n1,dummy,${seed}\n`, targetBytes, mode, seed);
}

export function generateJson(targetBytes: number, mode: GenerateMode, seed: string): GeneratorResult {
  const base = JSON.stringify({ seed, createdAt: new Date().toISOString(), items: [1, 2, 3] }, null, 2);
  return fitText(base, targetBytes, mode, seed);
}

export function generateBin(targetBytes: number, mode: GenerateMode, seed: string): GeneratorResult {
  const bytes = randomBytes(targetBytes, seed);
  if (mode === "exact") {
    return { buffer: bytes, modeApplied: "exact" };
  }
  return { buffer: bytes, modeApplied: "at_least" };
}

function buildZip(
  seed: string,
  paddingSize: number,
  zipStructure: ZipStructure,
  attempt: number,
  zipExtensionProfile: ZipExtensionProfile
) {
  const zip = new JSZip();

  if (zipStructure === "hierarchy") {
    // hierarchy 규칙:
    // 1) 루트 파일 1개
    // 2) 1depth 폴더(level1/)에 파일 2개
    // 3) 2depth 폴더(level1/level2/)에 파일 2개
    if (zipExtensionProfile === "text") {
      zip.file("README.txt", `Dummy ZIP\nseed=${seed}\nstructure=hierarchy\nprofile=text\n`);
      zip.file("level1/info.txt", `level1 info\nseed=${seed}\n`);
      zip.file("level1/notes.md", `# Notes\nseed=${seed}\n`);
      zip.file("level1/level2/fixed.txt", `fixed text payload\nseed=${seed}\n`);
      zip.file("level1/level2/padding.txt", randomBytes(Math.max(0, paddingSize), `${seed}:zip:${attempt}`), {
        compression: "STORE",
      });
    } else if (zipExtensionProfile === "binary") {
      zip.file("README.bin", randomBytes(96, `${seed}:root:bin`), { compression: "STORE" });
      zip.file("level1/info.dat", randomBytes(256, `${seed}:level1:info`), { compression: "STORE" });
      zip.file("level1/data.bin", randomBytes(256, `${seed}:level1:data`), { compression: "STORE" });
      zip.file("level1/level2/fixed.bin", randomBytes(256, `${seed}:level2:fixed`), {
        compression: "STORE",
      });
      zip.file("level1/level2/padding.bin", randomBytes(Math.max(0, paddingSize), `${seed}:zip:${attempt}`), {
        compression: "STORE",
      });
    } else {
      zip.file("README.txt", `Dummy ZIP\nseed=${seed}\nstructure=hierarchy\nprofile=mixed\n`);
      zip.file("level1/info.json", JSON.stringify({ seed, level: 1 }, null, 2));
      zip.file("level1/data.bin", randomBytes(256, `${seed}:level1:data`), {
        compression: "STORE",
      });
      zip.file(
        "level1/level2/fixed.bin",
        randomBytes(256, `${seed}:level2:fixed`),
        { compression: "STORE" }
      );
      zip.file(
        "level1/level2/padding.bin",
        randomBytes(Math.max(0, paddingSize), `${seed}:zip:${attempt}`),
        { compression: "STORE" }
      );
    }
  } else {
    zip.file("README.txt", `Dummy ZIP\nseed=${seed}\nstructure=flat\n`);
    zip.file("data.bin", randomBytes(256, `${seed}:data`), {
      compression: "STORE",
    });
    zip.file(
      "padding.bin",
      randomBytes(Math.max(0, paddingSize), `${seed}:zip:${attempt}`),
      { compression: "STORE" }
    );
  }

  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

export async function generateZip(
  targetBytes: number,
  mode: GenerateMode,
  seed: string,
  zipStructure: ZipStructure = "flat",
  zipExtensionProfile: ZipExtensionProfile = "mixed"
): Promise<GeneratorResult> {
  let padding = Math.max(0, targetBytes - 1024);
  let modeApplied: GenerateMode = mode;
  let fallbackReason: string | undefined;

  for (let i = 0; i < 12; i += 1) {
    const out = await buildZip(seed, padding, zipStructure, i, zipExtensionProfile);
    const diff = targetBytes - out.length;

    if (mode === "exact" && diff === 0) {
      return { buffer: out, modeApplied: "exact" };
    }

    if (mode === "at_least" && diff <= 0) {
      return { buffer: out, modeApplied: "at_least" };
    }

    padding += diff;
    if (padding < 0) padding = 0;
  }

  const out = await buildZip(seed, padding, zipStructure, 999, zipExtensionProfile);

  if (mode === "exact" && out.length !== targetBytes) {
    modeApplied = "at_least";
    fallbackReason = "zip_overhead_variation";
  }

  return { buffer: out, modeApplied, fallbackReason };
}
