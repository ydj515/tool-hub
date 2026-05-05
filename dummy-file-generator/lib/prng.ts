/**
 * seed 기반 결정론적 난수와 바이트 시퀀스를 생성한다.
 */
import crypto from "node:crypto";

function hashSeed(seed: string): number {
  const hash = crypto.createHash("sha256").update(seed).digest();
  return hash.readUInt32LE(0);
}

/**
 * 같은 seed에 대해 항상 같은 난수 순서를 만드는 생성기를 반환한다.
 */
export function createRng(seed: string) {
  let state = hashSeed(seed) || 0x6d2b79f5;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 결정론적 난수 생성기를 이용해 지정 길이의 바이트 버퍼를 만든다.
 */
export function randomBytes(length: number, seed: string): Buffer {
  const next = createRng(seed);
  const out = Buffer.alloc(length);
  for (let i = 0; i < length; i += 1) {
    out[i] = Math.floor(next() * 256);
  }
  return out;
}
