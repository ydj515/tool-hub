import type { ExportArtifact } from '../export/export-plan';

export function downloadArtifact(artifact: ExportArtifact): void {
  const url = URL.createObjectURL(new Blob([artifact.content], { type: `${artifact.mimeType};charset=utf-8` }));
  const link = document.createElement('a');
  link.href = url;
  link.download = artifact.filename;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
