import { parseDdl } from "@/lib/ddl-parser";
import { generateFakeData } from "@/lib/fake-data";
import { analyzeSchema } from "@/lib/graph";
import { renderSql } from "@/lib/sql-renderer";
import type { GeneratedSql, GenerationOptions } from "@/lib/types";

export function generateSeedSql(ddl: string, options: GenerationOptions): GeneratedSql {
  const parseResult = parseDdl(ddl);
  const analysis = analyzeSchema(parseResult.tables, parseResult.warnings);
  const generatedTables = generateFakeData(analysis, options);
  const rendered = renderSql(generatedTables, analysis, options);

  return {
    ...rendered,
    analysis,
    generatedTables,
  };
}
