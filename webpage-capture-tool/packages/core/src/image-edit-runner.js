/**
 * 캡처된 PNG에 대해 이미지 후처리 파이프라인을 실행한다.
 *
 * 파이프라인 순서: crop -> resize -> blur/box (rawImagePx 기준)
 *
 * 좌표계: 모든 편집 규칙은 캡처 직후 원본 PNG 픽셀 기준(rawImagePx)으로 저장/전달한다.
 *
 * 규칙 타입:
 *   crop:   { x, y, width, height }
 *   resize: { width, height? } — height 없으면 비율 유지
 *   blur:   { x, y, width, height, sigma? }
 *   box:    { x, y, width, height, color? } — 단색 오버레이
 */
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

/** @typedef {{ type: 'crop'|'resize'|'blur'|'box', [key: string]: any }} EditRule */

/**
 * 이미지에 편집 규칙을 순서대로 적용하고 결과를 저장한다.
 * @param {string} inputPath - 원본 PNG 경로
 * @param {string} outputPath - 출력 PNG 경로
 * @param {EditRule[]} rules - 적용할 편집 규칙 배열
 * @returns {Promise<{width: number, height: number}>} 최종 이미지 크기
 */
async function applyEditRules(inputPath, outputPath, rules) {
  if (!rules || rules.length === 0) {
    if (inputPath !== outputPath) {
      fs.copyFileSync(inputPath, outputPath);
    }
    const meta = await sharp(inputPath).metadata();
    return { width: meta.width, height: meta.height };
  }

  // Sharp는 같은 파일을 동시에 읽고 쓰는 것을 지원하지 않으므로 항상 버퍼로 먼저 읽는다
  const inputBuf = fs.readFileSync(inputPath);
  let pipeline = sharp(inputBuf);
  let meta = await pipeline.metadata();
  let currentWidth = meta.width;
  let currentHeight = meta.height;

  // 1단계: crop (가장 먼저 처리 - 이후 규칙의 좌표 기준이 변경됨)
  const cropRule = rules.find((r) => r.type === "crop");
  if (cropRule) {
    const { x = 0, y = 0, width, height } = cropRule;
    const safeX = Math.max(0, Math.min(x, currentWidth - 1));
    const safeY = Math.max(0, Math.min(y, currentHeight - 1));
    const safeW = Math.min(width || currentWidth, currentWidth - safeX);
    const safeH = Math.min(height || currentHeight, currentHeight - safeY);
    pipeline = pipeline.extract({ left: safeX, top: safeY, width: safeW, height: safeH });
    currentWidth = safeW;
    currentHeight = safeH;
  }

  // 2단계: resize
  const resizeRule = rules.find((r) => r.type === "resize");
  if (resizeRule) {
    const { width, height } = resizeRule;
    pipeline = pipeline.resize(width || null, height || null, { fit: "inside", withoutEnlargement: true });
    const resizeMeta = await pipeline.clone().metadata();
    currentWidth = resizeMeta.width || currentWidth;
    currentHeight = resizeMeta.height || currentHeight;
  }

  // 3단계: blur/box 오버레이 — 중간 버퍼에서 합성
  const overlayRules = rules.filter((r) => r.type === "blur" || r.type === "box");

  if (overlayRules.length > 0) {
    const buf = await pipeline.toBuffer();
    let composite = sharp(buf);
    const overlays = [];

    for (const rule of overlayRules) {
      const rx = Math.max(0, rule.x || 0);
      const ry = Math.max(0, rule.y || 0);
      const rw = Math.max(1, Math.min(rule.width || 50, currentWidth - rx));
      const rh = Math.max(1, Math.min(rule.height || 50, currentHeight - ry));

      if (rule.type === "blur") {
        const sigma = Math.max(0.3, rule.sigma || 10);
        // 해당 영역을 추출 -> 블러 -> 오버레이 (buf는 이미 메모리에 적재된 상태)
        const region = await sharp(buf)
          .extract({ left: rx, top: ry, width: rw, height: rh })
          .blur(sigma)
          .toBuffer();
        overlays.push({ input: region, left: rx, top: ry });
      } else if (rule.type === "box") {
        const color = rule.color || "#000000";
        // 지정 색상 단색 박스 생성
        const hex = color.replace("#", "");
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        const boxBuf = await sharp({
          create: { width: rw, height: rh, channels: 4, background: { r, g, b, alpha: 255 } }
        })
          .png()
          .toBuffer();
        overlays.push({ input: boxBuf, left: rx, top: ry });
      }
    }

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    await composite.composite(overlays).png().toFile(outputPath);
  } else {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    await pipeline.png().toFile(outputPath);
  }

  const finalMeta = await sharp(outputPath).metadata();
  return { width: finalMeta.width, height: finalMeta.height };
}

/**
 * 단일 이미지에 편집 규칙을 적용한다 (제자리 처리용 임시 파일 불필요).
 */
async function processImage(inputPath, outputPath, rules) {
  return applyEditRules(inputPath, outputPath, rules);
}

module.exports = { applyEditRules, processImage };
