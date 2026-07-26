import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FileDropzone } from './FileDropzone';

describe('FileDropzone', () => {
  it('지원하지 않는 드롭 확장자를 알린다', async () => {
    const onFile = vi.fn();
    render(<FileDropzone onFile={onFile} disabled={false} />);

    fireEvent.drop(screen.getByRole('button', { name: 'OpenAPI 파일 선택' }), {
      dataTransfer: { files: [new File(['text'], 'notes.txt')] },
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('yaml, yml, json 파일만 열 수 있습니다.');
    expect(onFile).not.toHaveBeenCalled();
  });
});
