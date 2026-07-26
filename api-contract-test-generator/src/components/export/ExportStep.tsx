import { ArrowLeft, Braces, Download, FileText, PackageOpen } from 'lucide-react';
import { useState } from 'react';
import type { ExportFormat, TestCaseSelection, TestPlan } from '../../domain/test-case';
import { Button } from '../ui/Button';

interface ExportStepProps {
  plan: TestPlan;
  selections: Record<string, TestCaseSelection>;
  includedCount: number;
  unreviewedCount: number;
  skippedCount: number;
  exporting: boolean;
  onBack: () => void;
  onExport: (format: ExportFormat) => void;
}

const formats: Array<{ id: ExportFormat; title: string; description: string; icon: typeof FileText }> = [
  { id: 'markdown', title: 'Markdown 테스트 계획', description: '코드 리뷰와 문서 공유에 적합합니다.', icon: FileText },
  { id: 'json', title: 'JSON 테스트 계획', description: '자동화 파이프라인에서 읽을 수 있는 버전 형식입니다.', icon: Braces },
  { id: 'postman', title: 'Postman Collection 2.1', description: '변수와 검토된 assertion을 포함합니다.', icon: PackageOpen },
];

export function ExportStep({
  plan,
  selections,
  includedCount,
  unreviewedCount,
  skippedCount,
  exporting,
  onBack,
  onExport,
}: ExportStepProps) {
  const [format, setFormat] = useState<ExportFormat>('markdown');
  const [confirmedFor, setConfirmedFor] = useState<string>();
  const [attemptedFor, setAttemptedFor] = useState<string>();
  const confirmationKey = `${format}:${unreviewedCount}`;
  const confirmed = confirmedFor === confirmationKey;
  const showWarning = unreviewedCount > 0 && attemptedFor === confirmationKey && !confirmed;

  const download = () => {
    if (unreviewedCount > 0 && !confirmed) {
      setAttemptedFor(confirmationKey);
      return;
    }
    onExport(format);
  };

  return (
    <section className="step-panel export-step" aria-labelledby="export-heading">
      <div className="section-heading">
        <div><p className="eyebrow">Step 3</p><h2 id="export-heading">테스트 계획 내보내기</h2><p>{plan.title}에서 선택한 테스트를 원하는 형식으로 저장합니다.</p></div>
        <Button onClick={onBack}><ArrowLeft size={16} aria-hidden="true" /> 테스트 검토로 돌아가기</Button>
      </div>

      <div className="export-summary" aria-label="내보내기 요약">
        <div><strong>{includedCount}</strong><span>포함</span></div>
        <div><strong>{unreviewedCount}</strong><span>미검토</span></div>
        <div><strong>{skippedCount}</strong><span>건너뜀</span></div>
      </div>

      <fieldset className="format-grid">
        <legend>내보내기 형식</legend>
        {formats.map((item) => {
          const Icon = item.icon;
          return (
            <label key={item.id} className={`format-card ${format === item.id ? 'is-selected' : ''}`}>
              <input type="radio" name="export-format" value={item.id} aria-label={item.title} checked={format === item.id} onChange={() => setFormat(item.id)} />
              <Icon size={22} aria-hidden="true" />
              <span><strong>{item.title}</strong><small>{item.description}</small></span>
            </label>
          );
        })}
      </fieldset>

      {unreviewedCount > 0 && (
        <label className="confirmation-row">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmedFor(event.target.checked ? confirmationKey : undefined)}
          />
          미검토 테스트 포함을 확인했습니다
        </label>
      )}
      {showWarning && <p className="export-warning" role="alert">검토하지 않은 테스트 {unreviewedCount}개가 포함됩니다. 확인 후 다시 다운로드해 주세요.</p>}

      <div className="export-actions">
        <p>선택 상태와 상태 코드 검토 결과가 현재 파일에 반영됩니다. ({Object.keys(selections).length}개 선택 기록)</p>
        <Button variant="primary" disabled={exporting || includedCount === 0} onClick={download}>
          <Download size={16} aria-hidden="true" /> {exporting ? '파일 생성 중' : '선택한 형식으로 다운로드'}
        </Button>
      </div>
    </section>
  );
}
