import { FileUp } from 'lucide-react';
import { useId, useState, type ChangeEvent, type DragEvent } from 'react';

interface FileDropzoneProps {
  disabled: boolean;
  onFile: (file: File) => void;
}

function supported(file: File): boolean {
  return /\.(?:ya?ml|json)$/i.test(file.name);
}

export function FileDropzone({ disabled, onFile }: FileDropzoneProps) {
  const inputId = useId();
  const [error, setError] = useState<string>();

  const choose = (file: File | undefined) => {
    if (!file) return;
    if (!supported(file)) {
      setError('yaml, yml, json 파일만 열 수 있습니다.');
      return;
    }
    setError(undefined);
    onFile(file);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    choose(event.target.files?.[0]);
    event.target.value = '';
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    if (!disabled) choose(event.dataTransfer.files[0]);
  };

  return (
    <div>
      <label
        className={`file-dropzone ${disabled ? 'is-disabled' : ''}`}
        id={`${inputId}-label`}
        role="button"
        aria-label="OpenAPI 파일 선택"
        tabIndex={disabled ? -1 : 0}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <FileUp size={20} aria-hidden="true" />
        <span><strong>파일을 선택하거나 끌어놓기</strong><small>YAML, YML, JSON · 최대 20MB</small></span>
        <input id={inputId} type="file" accept=".yaml,.yml,.json" disabled={disabled} onChange={handleChange} />
      </label>
      {error && <p className="inline-alert" role="alert">{error}</p>}
    </div>
  );
}
