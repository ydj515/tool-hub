package com.example.catalog.support;

/**
 * API와 서비스 계층이 공유하는 상품 요약 뷰이다.
 *
 * @param sku 상품 식별자
 * @param status 상품 상태
 */
public record CatalogSnapshot(String sku, CatalogStatus status) {
}

