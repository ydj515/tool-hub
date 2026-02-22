import { FileType, GenerateMode, ZipExtensionProfile, ZipStructure } from "@/lib/types";
import { generatePdf } from "@/lib/generators/pdf";
import { generateDocx, generateXlsx } from "@/lib/generators/ooxml";
import { generateBin, generateCsv, generateJson, generateTxt, generateZip } from "@/lib/generators/basic";
import { GeneratorResult } from "@/lib/generators/common";

export async function generateByType(
  type: FileType,
  targetBytes: number,
  mode: GenerateMode,
  seed: string,
  options?: { zipStructure?: ZipStructure; zipExtensionProfile?: ZipExtensionProfile }
): Promise<GeneratorResult> {
  switch (type) {
    case "pdf":
      return generatePdf(targetBytes, mode, seed);
    case "docx":
      return generateDocx(targetBytes, mode, seed);
    case "xlsx":
      return generateXlsx(targetBytes, mode, seed);
    case "txt":
      return generateTxt(targetBytes, mode, seed);
    case "csv":
      return generateCsv(targetBytes, mode, seed);
    case "json":
      return generateJson(targetBytes, mode, seed);
    case "bin":
      return generateBin(targetBytes, mode, seed);
    case "zip":
      return generateZip(
        targetBytes,
        mode,
        seed,
        options?.zipStructure ?? "flat",
        options?.zipExtensionProfile ?? "mixed"
      );
    default:
      throw new Error(`Unsupported type: ${type}`);
  }
}
