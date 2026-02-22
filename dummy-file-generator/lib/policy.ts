export const MAX_TARGET_BYTES = 100 * 1024 * 1024;
export const MIN_TARGET_BYTES = 256;
export const BLOB_RECOMMEND_THRESHOLD_BYTES = 50 * 1024 * 1024;

export function recommendDeliveryStrategy(targetBytes: number): "direct" | "blob" {
  return targetBytes > BLOB_RECOMMEND_THRESHOLD_BYTES ? "blob" : "direct";
}
