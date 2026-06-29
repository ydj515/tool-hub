import { AlertTriangle, Check, FileCode2 } from "lucide-react";
import type { editor } from "monaco-editor";
import type { DdlSyntaxIssue, Dialect } from "@/lib/types";
import MonacoDdlEditor from "@/app/_components/monaco-ddl-editor";
import PanelHead from "@/app/_components/ui/PanelHead";

/**
 * 가운데 DDL 입력 패널: 헤더 + Monaco 에디터 + 검증 결과 패널.
 */
interface EditorPanelProps {
  ddl: string;
  onChangeDdl: (value: string) => void;
  issues: DdlSyntaxIssue[];
  hasErrors: boolean;
  errors: DdlSyntaxIssue[];
  warnings: DdlSyntaxIssue[];
  inputDialect: Dialect;
  tableNames: string[];
  columnNames: string[];
  onEditorMount: (editorInstance: editor.IStandaloneCodeEditor) => void;
  theme: "light" | "dark";
  onFocusIssue: (issue: DdlSyntaxIssue) => void;
}

export default function EditorPanel({
  ddl,
  onChangeDdl,
  issues,
  hasErrors,
  errors,
  warnings,
  inputDialect,
  tableNames,
  columnNames,
  onEditorMount,
  theme,
  onFocusIssue,
}: EditorPanelProps) {
  return (
    <section className="editorPanel" aria-label="DDL 입력">
      <PanelHead
        title="DDL Input"
        description="CREATE TABLE 또는 ALTER TABLE ... ADD FOREIGN KEY 문을 붙여넣으세요."
        icon={<FileCode2 size={20} />}
      />
      <MonacoDdlEditor
        value={ddl}
        onChange={onChangeDdl}
        issues={issues}
        dialect={inputDialect}
        tableNames={tableNames}
        columnNames={columnNames}
        onEditorMount={onEditorMount}
        hasErrors={hasErrors}
        theme={theme}
      />
      <div
        id="ddl-validation"
        className={`validationPanel ${hasErrors ? "error" : "ok"}`}
        aria-live="polite"
      >
        {hasErrors ? (
          <>
            <div className="validationTitle">
              <AlertTriangle size={16} />
              <strong>DDL 구문 오류 {errors.length}건</strong>
            </div>
            <div className="validationList">
              {errors.slice(0, 4).map((issue) => (
                <button
                  key={`${issue.line}-${issue.column}-${issue.message}`}
                  type="button"
                  onClick={() => onFocusIssue(issue)}
                >
                  <span>
                    Line {issue.line}, Col {issue.column}
                  </span>
                  <p>{issue.message}</p>
                  {issue.hint ? <small>{issue.hint}</small> : null}
                </button>
              ))}
            </div>
          </>
        ) : warnings.length > 0 ? (
          <div className="validationTitle">
            <AlertTriangle size={16} />
            <strong>{warnings[0].message}</strong>
          </div>
        ) : (
          <div className="validationTitle">
            <Check size={16} />
            <strong>DDL syntax looks good</strong>
          </div>
        )}
      </div>
    </section>
  );
}
