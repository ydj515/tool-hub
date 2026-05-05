/**
 * 더미 파일 생성 API의 허용 크기와 다운로드 전략 정책을 정의한다.
 */
export const MAX_TARGET_BYTES = 100 * 1024 * 1024;
export const MIN_TARGET_BYTES = 256;
export const BLOB_RECOMMEND_THRESHOLD_BYTES = 50 * 1024 * 1024;

/**
 * 목표 파일 크기를 기준으로 직접 응답과 Blob 저장 중 권장 전략을 결정한다.
 */
export function recommendDeliveryStrategy(targetBytes: number): "direct" | "blob" {
  return targetBytes > BLOB_RECOMMEND_THRESHOLD_BYTES ? "blob" : "direct";
}
