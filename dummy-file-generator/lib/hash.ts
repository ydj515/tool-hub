/**
 * 생성된 파일의 무결성 표시를 위해 SHA-256 해시를 계산한다.
 */
import crypto from "node:crypto";

/**
 * 바이너리 버퍼의 SHA-256 해시를 16진수 문자열로 반환한다.
 */
export function sha256(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}
