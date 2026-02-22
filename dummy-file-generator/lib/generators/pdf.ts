import { GenerateMode } from "@/lib/types";
import { randomBytes } from "@/lib/prng";
import { GeneratorResult } from "@/lib/generators/common";

function buildPdf(payload: Buffer): Buffer {
  const chunks: Buffer[] = [];
  const offsets: number[] = [];

  const pushAscii = (txt: string) => {
    chunks.push(Buffer.from(txt, "ascii"));
  };

  pushAscii("%PDF-1.4\n");
  pushAscii("%\\xD0\\xD1\\xD2\\xD3\n");

  const pushObject = (id: number, body: Buffer | string) => {
    const offset = Buffer.concat(chunks).length;
    offsets[id] = offset;
    pushAscii(`${id} 0 obj\n`);
    if (typeof body === "string") {
      pushAscii(body);
    } else {
      chunks.push(body);
    }
    pushAscii("\nendobj\n");
  };

  pushObject(1, "<< /Type /Catalog /Pages 2 0 R >>");
  pushObject(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  pushObject(3, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << >> >>");

  const streamHeader = Buffer.from(`<< /Length ${payload.length} >>\nstream\n`, "ascii");
  const streamTail = Buffer.from("\nendstream", "ascii");
  pushObject(4, Buffer.concat([streamHeader, payload, streamTail]));

  const body = Buffer.concat(chunks);
  const xrefStart = body.length;

  const xref: string[] = [];
  xref.push("xref\n");
  xref.push("0 5\n");
  xref.push("0000000000 65535 f \n");
  for (let i = 1; i <= 4; i += 1) {
    xref.push(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
  }

  const trailer = `trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.concat([body, Buffer.from(xref.join(""), "ascii"), Buffer.from(trailer, "ascii")]);
}

export function generatePdf(targetBytes: number, mode: GenerateMode, seed: string): GeneratorResult {
  let payloadSize = Math.max(0, targetBytes - 512);
  let best = buildPdf(randomBytes(payloadSize, `${seed}:pdf:init`));

  for (let i = 0; i < 16; i += 1) {
    const diff = targetBytes - best.length;

    if (mode === "exact" && diff === 0) {
      return { buffer: best, modeApplied: "exact" };
    }

    if (mode === "at_least" && diff <= 0) {
      return { buffer: best, modeApplied: "at_least" };
    }

    payloadSize += diff;
    if (payloadSize < 0) payloadSize = 0;
    best = buildPdf(randomBytes(payloadSize, `${seed}:pdf:${i}`));
  }

  if (mode === "exact") {
    if (best.length < targetBytes) {
      const deficit = targetBytes - best.length;
      const padded = Buffer.concat([best, Buffer.from(`\n%PAD ${"X".repeat(Math.max(0, deficit - 6))}`, "ascii")]);
      if (padded.length === targetBytes) {
        return { buffer: padded, modeApplied: "exact" };
      }
    }

    if (best.length !== targetBytes) {
      return {
        buffer: best.length < targetBytes ? Buffer.concat([best, randomBytes(targetBytes - best.length, `${seed}:pdf:fallback`)]) : best,
        modeApplied: "at_least",
        fallbackReason: "pdf_exact_not_reached"
      };
    }
  }

  return { buffer: best, modeApplied: mode };
}
