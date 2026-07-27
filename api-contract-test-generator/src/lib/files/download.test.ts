import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadArtifact } from './download';

describe('downloadArtifact', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('Blob URL을 클릭한 다음 틱에 해제한다', () => {
    vi.useFakeTimers();
    const createObjectURL = vi.fn(() => 'blob:test');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    downloadArtifact({ filename: 'plan.md', mimeType: 'text/markdown', content: '# Plan' });

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    // 동기 해제는 브라우저가 다운로드를 시작하기 전에 URL을 무효화해 빈 파일을 만들 수 있다.
    expect(revokeObjectURL).not.toHaveBeenCalled();

    vi.runAllTimers();

    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });
});
