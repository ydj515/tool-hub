import JSZip from "jszip";

import { GenerateMode } from "@/lib/types";
import { randomBytes } from "@/lib/prng";
import { GeneratorResult } from "@/lib/generators/common";

async function generateSizedZip(
  buildBase: (zip: JSZip, seed: string) => void,
  targetBytes: number,
  mode: GenerateMode,
  seed: string,
  padPath: string
): Promise<GeneratorResult> {
  let padding = Math.max(0, targetBytes - 2048);
  let modeApplied: GenerateMode = mode;
  let fallbackReason: string | undefined;

  for (let i = 0; i < 14; i += 1) {
    const zip = new JSZip();
    buildBase(zip, seed);
    zip.file(padPath, randomBytes(padding, `${seed}:${padPath}:${i}`), { compression: "STORE" });

    const output = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
    const diff = targetBytes - output.length;

    if (mode === "exact" && diff === 0) {
      return { buffer: output, modeApplied: "exact" };
    }

    if (mode === "at_least" && diff <= 0) {
      return { buffer: output, modeApplied: "at_least" };
    }

    padding += diff;
    if (padding < 0) padding = 0;
  }

  const zip = new JSZip();
  buildBase(zip, seed);
  zip.file(padPath, randomBytes(padding, `${seed}:${padPath}:final`), { compression: "STORE" });
  const output = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });

  if (mode === "exact" && output.length !== targetBytes) {
    modeApplied = "at_least";
    fallbackReason = "zip_padding_not_converged";
  }

  return { buffer: output, modeApplied, fallbackReason };
}

export async function generateDocx(targetBytes: number, mode: GenerateMode, seed: string): Promise<GeneratorResult> {
  return generateSizedZip(
    (zip) => {
      zip.file(
        "[Content_Types].xml",
        `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
      );
      zip.file(
        "_rels/.rels",
        `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
      );
      zip.file(
        "word/document.xml",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Dummy DOCX seed: ${seed}</w:t></w:r></w:p>
    <w:sectPr/>
  </w:body>
</w:document>`
      );
    },
    targetBytes,
    mode,
    seed,
    "word/media/padding.bin"
  );
}

export async function generateXlsx(targetBytes: number, mode: GenerateMode, seed: string): Promise<GeneratorResult> {
  return generateSizedZip(
    (zip) => {
      zip.file(
        "[Content_Types].xml",
        `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`
      );
      zip.file(
        "_rels/.rels",
        `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`
      );
      zip.file(
        "xl/workbook.xml",
        `<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets>
</workbook>`
      );
      zip.file(
        "xl/_rels/workbook.xml.rels",
        `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`
      );
      zip.file(
        "xl/worksheets/sheet1.xml",
        `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1"><c r="A1" t="inlineStr"><is><t>Dummy XLSX seed: ${seed}</t></is></c></row>
  </sheetData>
</worksheet>`
      );
    },
    targetBytes,
    mode,
    seed,
    "xl/media/padding.bin"
  );
}
