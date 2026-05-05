/**
 * 생성된 파일을 다운로드용으로 잠시 보관하는 메모리 저장소다.
 */
import { GeneratedFile } from "@/lib/types";

const TTL_MS = 1000 * 60 * 30;
const jobs = new Map<string, GeneratedFile>();

function cleanup() {
  const now = Date.now();
  for (const [id, item] of jobs.entries()) {
    if (now - item.createdAt > TTL_MS) {
      jobs.delete(id);
    }
  }
}

/**
 * 생성된 파일을 TTL이 적용된 메모리 저장소에 기록한다.
 */
export function saveJob(file: GeneratedFile) {
  cleanup();
  jobs.set(file.id, file);
}

/**
 * 저장소에서 다운로드 대상 파일을 조회한다.
 */
export function getJob(id: string): GeneratedFile | null {
  cleanup();
  return jobs.get(id) ?? null;
}
