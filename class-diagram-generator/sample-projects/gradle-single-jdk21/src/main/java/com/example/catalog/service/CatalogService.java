package com.example.catalog.service;

import com.example.catalog.model.ProductDetail;
import com.example.catalog.model.ProductSummary;
import java.util.List;

/**
 * 상품 조회 유스케이스를 제공하는 서비스 계약이다.
 */
public interface CatalogService {
    /**
     * SKU로 상품 상세 정보를 조회한다.
     *
     * @param sku 상품 식별자
     * @return 상품 상세 정보
     */
    ProductDetail getProductDetail(String sku);

    /**
     * 키워드로 상품 목록을 조회한다.
     *
     * @param keyword 검색 키워드
     * @return 검색 결과 요약 목록
     */
    List<ProductSummary> searchProducts(String keyword);

    /**
     * 검색 키워드가 서비스 규칙에 부합하는지 확인한다.
     *
     * @param keyword 검사할 검색 키워드
     * @return 유효 여부
     */
    default boolean supportsKeyword(final String keyword) {
        return keyword != null && !keyword.isBlank();
    }
}
