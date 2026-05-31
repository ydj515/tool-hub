package com.example.catalog.support;

/**
 * 서비스 계층이 재사용하는 보조 기능 계약이다.
 */
public interface CatalogSupport {
    /**
     * 상품 식별자를 보기 좋은 형식으로 정리한다.
     *
     * @param sku 원본 상품 식별자
     * @return 정리된 상품 식별자
     */
    String formatSku(String sku);
}

