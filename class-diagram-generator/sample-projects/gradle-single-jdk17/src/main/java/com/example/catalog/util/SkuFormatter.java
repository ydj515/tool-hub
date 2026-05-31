package com.example.catalog.util;

/**
 * SKU 문자열을 표준 형식으로 변환하는 유틸리티이다.
 */
public final class SkuFormatter {
    /**
     * 인스턴스 생성을 막는다.
     */
    private SkuFormatter() {
    }

    /**
     * 외부 입력 SKU를 표준 형식으로 정규화한다.
     *
     * @param rawSku 원본 SKU 문자열
     * @return 정규화된 SKU 문자열
     */
    public static String normalize(final String rawSku) {
        if (rawSku == null || rawSku.isBlank()) {
            throw new IllegalArgumentException("sku must not be blank");
        }
        return compact(rawSku).toUpperCase();
    }

    /**
     * 공백과 구분 문자를 제거한 압축 문자열을 반환한다.
     *
     * @param rawSku 원본 SKU 문자열
     * @return 압축된 SKU 문자열
     */
    static String compact(final String rawSku) {
        return rawSku.replace(" ", "").replace("_", "-").trim();
    }
}
