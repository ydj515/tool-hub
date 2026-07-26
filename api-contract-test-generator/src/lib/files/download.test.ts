import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadArtifact } from './download';

describe('downloadArtifact', () => {
  afterEach(() => vi.restoreAllMocks());

  it('Blob URL을 클릭한 후 해제한다', () => {
    const createObjectURL = vi.fn(() => 'blob:test');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    downloadArtifact({ filename: 'plan.md', mimeType: 'text/markdown', content: '# Plan' });

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });
});
