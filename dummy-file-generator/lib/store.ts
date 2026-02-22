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

export function saveJob(file: GeneratedFile) {
  cleanup();
  jobs.set(file.id, file);
}

export function getJob(id: string): GeneratedFile | null {
  cleanup();
  return jobs.get(id) ?? null;
}
