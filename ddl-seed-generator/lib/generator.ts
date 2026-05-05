/**
 * DDL 입력부터 분석, 데이터 생성, SQL 렌더링을 묶는 파이프라인 진입점이다.
 */
import { parseDdl } from "@/lib/ddl-parser";
import { generateFakeData } from "@/lib/fake-data";
import { analyzeSchema } from "@/lib/graph";
import { renderSql } from "@/lib/sql-renderer";
import type { GeneratedSql, GenerationOptions } from "@/lib/types";

/**
 * DDL 텍스트를 파싱해 가짜 데이터를 생성하고 INSERT/ROLLBACK SQL을 반환한다.
 * 내부적으로 parseDdl → analyzeSchema → generateFakeData → renderSql 파이프라인을 실행한다.
 * @param ddl - 입력 DDL 텍스트
 * @param options - 행 수, 방언, 시드, 로케일 등 생성 옵션
 * @returns insertSql, rollbackSql, 분석 결과, 생성된 테이블 데이터를 포함한 객체
 */
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
