import type { Dialect, DataLocale, GeneratedSql } from "@/lib/types";
import { DIALECT_LABELS } from "@/app/_lib/samples";
import SelectField from "@/app/_components/ui/SelectField";
import Stat from "@/app/_components/ui/Stat";

/**
 * 좌측 생성 옵션 패널: 입력/출력 방언, row 수, seed, 경계값, locale, 요약 통계.
 */
interface ControlPanelProps {
  inputDialect: Dialect;
  onInputDialectChange: (value: Dialect) => void;
  outputDialect: Dialect;
  onOutputDialectChange: (value: Dialect) => void;
  rowCount: string;
  onRowCountChange: (value: string) => void;
  seed: string;
  onSeedChange: (value: string) => void;
  includeBoundaryValues: boolean;
  onIncludeBoundaryChange: (value: boolean) => void;
  locale: DataLocale;
  onLocaleChange: (value: DataLocale) => void;
  result: GeneratedSql | null;
}

const dialectKeys = Object.keys(DIALECT_LABELS) as Dialect[];

export default function ControlPanel({
  inputDialect,
  onInputDialectChange,
  outputDialect,
  onOutputDialectChange,
  rowCount,
  onRowCountChange,
  seed,
  onSeedChange,
  includeBoundaryValues,
  onIncludeBoundaryChange,
  locale,
  onLocaleChange,
  result,
}: ControlPanelProps) {
  return (
    <aside className="controlPanel" aria-label="생성 옵션">
      <SelectField
        label="Input DDL"
        id="inputDialect"
        value={inputDialect}
        onChange={(e) => onInputDialectChange(e.target.value as Dialect)}
      >
        {dialectKeys.map((item) => (
          <option key={item} value={item}>{DIALECT_LABELS[item]}</option>
        ))}
      </SelectField>

      <SelectField
        label="Output DB"
        id="outputDialect"
        value={outputDialect}
        onChange={(e) => onOutputDialectChange(e.target.value as Dialect)}
        spaced
      >
        {dialectKeys.map((item) => (
          <option key={item} value={item}>{DIALECT_LABELS[item]}</option>
        ))}
      </SelectField>

      <div className="numberGrid">
        <label>
          <span>Rows / table</span>
          <input
            type="number"
            min="1"
            max="10000"
            value={rowCount}
            onChange={(event) => onRowCountChange(event.target.value)}
          />
        </label>
        <label>
          <span>Seed</span>
          <input type="number" value={seed} onChange={(event) => onSeedChange(event.target.value)} />
        </label>
      </div>

      <label className="toggleRow">
        <input
          type="checkbox"
          checked={includeBoundaryValues}
          onChange={(event) => onIncludeBoundaryChange(event.target.checked)}
        />
        <span>경계값 포함</span>
      </label>

      <SelectField
        label="Data Locale"
        id="dataLocale"
        value={locale}
        onChange={(e) => onLocaleChange(e.target.value as DataLocale)}
        spaced
      >
        <option value="ko">한국어</option>
        <option value="en">English</option>
      </SelectField>

      <div className="miniStats" aria-label="생성 요약">
        <Stat label="Tables" value={result?.summary.tableCount ?? "-"} />
        <Stat label="Total rows" value={result?.summary.totalRows.toLocaleString() ?? "-"} />
        <Stat label="Insert order" value={result ? result.analysis.insertOrder.length : "-"} />
      </div>
    </aside>
  );
}
