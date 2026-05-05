import JSZip from "jszip";

import { GenerateMode, ZipExtensionProfile, ZipStructure } from "@/lib/types";
import { randomBytes } from "@/lib/prng";
import { GeneratorResult } from "@/lib/generators/common";

const LOREM_LINES = [
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
  "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
  "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
  "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum.",
  "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia.",
  "Nulla pariatur. At vero eos et accusamus et iusto odio dignissimos ducimus.",
  "Nam libero tempore cum soluta nobis est eligendi optio cumque nihil impedit.",
  "Temporibus autem quibusdam et aut officiis debitis rerum necessitatibus saepe.",
  "Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil.",
  "Neque porro quisquam est qui dolorem ipsum quia dolor sit amet consectetur.",
];

export function generateTxt(targetBytes: number, mode: GenerateMode, seed: string): GeneratorResult {
  const now = new Date().toISOString();
  const header = `Dummy text file\nseed: ${seed}\ncreated: ${now}\n---\n`;
  const headerBytes = Buffer.byteLength(header, "utf-8");

  if (headerBytes >= targetBytes) {
    return { buffer: Buffer.from(header, "utf-8"), modeApplied: "at_least" };
  }

  const parts: Buffer[] = [Buffer.from(header, "utf-8")];
  let used = headerBytes;
  let lineIdx = 0;

  while (used < targetBytes) {
    const line = LOREM_LINES[lineIdx % LOREM_LINES.length];
    const normalLine = line + "\n";
    const normalLineBytes = Buffer.byteLength(normalLine, "utf-8");
    const remaining = targetBytes - used;

    if (remaining >= normalLineBytes) {
      parts.push(Buffer.from(normalLine, "utf-8"));
      used += normalLineBytes;
      lineIdx++;
      continue;
    }

    // 남은 공간에 현재 줄을 바이트 단위로 잘라서 채운다
    parts.push(Buffer.from(normalLine, "utf-8").subarray(0, remaining));
    used += remaining;
    break;
  }

  const buf = Buffer.concat(parts);
  return { buffer: buf, modeApplied: buf.length === targetBytes ? "exact" : "at_least" };
}

export function generateCsv(targetBytes: number, mode: GenerateMode, seed: string): GeneratorResult {
  const header = "id,name,value\n";
  const headerBytes = Buffer.byteLength(header, "utf-8");

  if (headerBytes >= targetBytes) {
    return { buffer: Buffer.from(header, "utf-8"), modeApplied: "at_least" };
  }

  const parts: Buffer[] = [Buffer.from(header, "utf-8")];
  let used = headerBytes;
  let idx = 1;

  while (used < targetBytes) {
    const prefix = `${idx},dummy_${idx},`;
    const suffix = "\n";
    const fixedRowBytes = Buffer.byteLength(prefix + suffix, "utf-8");
    const normalRow = `${prefix}${seed}${suffix}`;
    const normalRowBytes = Buffer.byteLength(normalRow, "utf-8");
    const remaining = targetBytes - used;

    if (remaining < fixedRowBytes) {
      break;
    }

    if (remaining === fixedRowBytes) {
      parts.push(Buffer.from(prefix + suffix, "utf-8"));
      used += fixedRowBytes;
      break;
    }

    if (remaining < normalRowBytes) {
      const paddingChars = remaining - fixedRowBytes;
      const pad = randomBytes(paddingChars + 4, `${seed}:csv:${idx}`)
        .toString("base64")
        .slice(0, paddingChars);
      parts.push(Buffer.from(`${prefix}${pad}${suffix}`, "utf-8"));
      used += remaining;
      break;
    }

    // 일반 행 추가 후 남은 공간이 다음 행의 최소 크기보다 작아지면
    // 현재 행을 패딩 행으로 처리해서 exact 크기를 확보한다
    const afterNormalRemaining = remaining - normalRowBytes;
    if (afterNormalRemaining > 0) {
      const nextIdx = idx + 1;
      const nextFixedRowBytes = Buffer.byteLength(`${nextIdx},dummy_${nextIdx},\n`, "utf-8");
      if (afterNormalRemaining < nextFixedRowBytes) {
        const paddingChars = remaining - fixedRowBytes;
        const pad = randomBytes(paddingChars + 4, `${seed}:csv:${idx}`)
          .toString("base64")
          .slice(0, paddingChars);
        parts.push(Buffer.from(`${prefix}${pad}${suffix}`, "utf-8"));
        used += remaining;
        break;
      }
    }

    parts.push(Buffer.from(normalRow, "utf-8"));
    used += normalRowBytes;
    idx++;
  }

  const buf = Buffer.concat(parts);
  return { buffer: buf, modeApplied: buf.length === targetBytes ? "exact" : "at_least" };
}

export function generateJson(targetBytes: number, mode: GenerateMode, seed: string): GeneratorResult {
  const now = new Date().toISOString();
  // 사용자 입력 seed의 특수 문자를 JSON 문자열로 안전하게 이스케이프
  const seedEscaped = JSON.stringify(seed).slice(1, -1);

  const header = `{\n  "seed": ${JSON.stringify(seed)},\n  "createdAt": ${JSON.stringify(now)},\n  "items": [\n`;
  const footer = `\n  ]\n}`;
  const headerBytes = Buffer.byteLength(header, "utf-8");
  const footerBytes = Buffer.byteLength(footer, "utf-8");

  if (headerBytes + footerBytes >= targetBytes) {
    const base = `{\n  "seed": ${JSON.stringify(seed)},\n  "createdAt": ${JSON.stringify(now)},\n  "items": []\n}`;
    return { buffer: Buffer.from(base, "utf-8"), modeApplied: "at_least" };
  }

  const parts: Buffer[] = [Buffer.from(header, "utf-8")];
  let used = headerBytes;
  let idx = 1;

  while (used + footerBytes < targetBytes) {
    const prefix = idx === 1
      ? `    { "id": ${idx}, "name": "dummy_${idx}", "value": "`
      : `,\n    { "id": ${idx}, "name": "dummy_${idx}", "value": "`;
    const suffix = `" }`;
    const fixedItemBytes = Buffer.byteLength(prefix + suffix, "utf-8");
    const normalItem = `${prefix}${seedEscaped}${suffix}`;
    const normalItemBytes = Buffer.byteLength(normalItem, "utf-8");
    const remaining = targetBytes - used - footerBytes;

    if (remaining < fixedItemBytes) {
      break;
    }

    if (remaining === fixedItemBytes) {
      parts.push(Buffer.from(prefix + suffix, "utf-8"));
      used += fixedItemBytes;
      break;
    }

    if (remaining < normalItemBytes) {
      const paddingChars = remaining - fixedItemBytes;
      const pad = randomBytes(paddingChars + 4, `${seed}:json:${idx}`)
        .toString("base64")
        .slice(0, paddingChars);
      parts.push(Buffer.from(`${prefix}${pad}${suffix}`, "utf-8"));
      used += remaining;
      break;
    }

    // 일반 아이템 추가 후 다음 아이템의 최소 크기를 수용할 수 없으면
    // 현재 아이템을 패딩 아이템으로 처리해서 exact 크기를 확보한다
    const afterNormalRemaining = remaining - normalItemBytes;
    if (afterNormalRemaining > 0) {
      const nextIdx = idx + 1;
      const nextFixedItemBytes = Buffer.byteLength(
        `,\n    { "id": ${nextIdx}, "name": "dummy_${nextIdx}", "value": "` + suffix,
        "utf-8"
      );
      if (afterNormalRemaining < nextFixedItemBytes) {
        const paddingChars = remaining - fixedItemBytes;
        const pad = randomBytes(paddingChars + 4, `${seed}:json:${idx}`)
          .toString("base64")
          .slice(0, paddingChars);
        parts.push(Buffer.from(`${prefix}${pad}${suffix}`, "utf-8"));
        used += remaining;
        break;
      }
    }

    parts.push(Buffer.from(normalItem, "utf-8"));
    used += normalItemBytes;
    idx++;
  }

  parts.push(Buffer.from(footer, "utf-8"));
  const buf = Buffer.concat(parts);
  return { buffer: buf, modeApplied: buf.length === targetBytes ? "exact" : "at_least" };
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
