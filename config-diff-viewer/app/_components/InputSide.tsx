import { useRef } from "react";
import type { ChangeEvent } from "react";
import { AlertTriangle, Upload } from "lucide-react";
import type { ConfigFormat } from "@/lib/types";
import { ENV_OPTIONS, FORMAT_OPTIONS, FORMAT_LABELS } from "@/app/_lib/constants";

const TEXTAREA_PLACEHOLDER =
  "YAML / JSON / .properties / .env 내용을 여기에 붙여 넣으세요.\n파일 업로드 버튼을 사용할 수도 있습니다.";

/**
 * 비교 입력 한 쪽(A 또는 B): 파일명/환경/포맷/업로드 + 파스 오류 배너 + 코드 textarea.
 * 파일 입력 ref는 내부에서 소유하고, 선택 이벤트만 부모로 올린다.
 */
interface InputSideProps {
  label: string;
  right?: boolean;
  filename: string;
  onFilenameChange: (value: string) => void;
  env: string;
  onEnvChange: (value: string) => void;
  format: ConfigFormat;
  onFormatChange: (value: ConfigFormat) => void;
  parseError: string;
  content: string;
  onContentChange: (value: string) => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

export default function InputSide({
  label,
  right,
  filename,
  onFilenameChange,
  env,
  onEnvChange,
  format,
  onFormatChange,
  parseError,
  content,
  onContentChange,
  onFileChange,
}: InputSideProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={right ? "inputSide inputSideRight" : "inputSide"}>
      <div className="inputSideHeader">
        <span className="sideLabel">{label}</span>
        <input
          className="filenameInput"
          value={filename}
          onChange={(e) => onFilenameChange(e.target.value)}
          placeholder="파일명"
          spellCheck={false}
        />
        <select className="controlSelect" value={env} onChange={(e) => onEnvChange(e.target.value)}>
          {ENV_OPTIONS.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <select className="controlSelect" value={format} onChange={(e) => onFormatChange(e.target.value as ConfigFormat)}>
          {FORMAT_OPTIONS.map((f) => <option key={f} value={f}>{FORMAT_LABELS[f]}</option>)}
        </select>
        <button className="uploadBtn" onClick={() => fileInputRef.current?.click()}>
          <Upload size={12} />
          파일 업로드
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".yml,.yaml,.json,.properties,.env,text/*"
          className="hiddenFileInput"
          onChange={onFileChange}
        />
      </div>

      {parseError && (
        <div className="parseErrorBanner">
          <AlertTriangle size={13} />
          {parseError}
        </div>
      )}

      <textarea
        className="codeTextarea"
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
        placeholder={TEXTAREA_PLACEHOLDER}
        spellCheck={false}
      />
    </div>
  );
}
