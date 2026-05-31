package com.example.catalog.service;

/**
 * 카탈로그 서비스 구현이 공통으로 사용하는 보호 메서드를 제공한다.
 */
public abstract class AbstractCatalogSupport {
    /**
     * 필수 SKU 값을 검증하고 정리한다.
     *
     * @param sku 원본 SKU 값
     * @return 공백이 제거된 SKU 값
     */
    protected String requireSku(final String sku) {
        if (sku == null || sku.isBlank()) {
            throw new IllegalArgumentException("sku must not be blank");
        }
        return sku.trim().toUpperCase();
    }

    /**
     * 검색 키워드를 표준 형식으로 정규화한다.
     *
     * @param keyword 원본 검색 키워드
     * @return 정규화된 검색 키워드
     */
    protected String normalizeKeyword(final String keyword) {
        if (keyword == null) {
            return "";
        }
        return keyword.trim().toLowerCase();
    }
}
