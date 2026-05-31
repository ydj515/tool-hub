package com.example.catalog.model;

/**
 * 상품의 운영 상태를 나타내는 열거형이다.
 */
public enum ProductStatus {
    /**
     * 현재 판매 중인 상품 상태이다.
     */
    ACTIVE,

    /**
     * 판매가 중단된 상품 상태이다.
     */
    DISCONTINUED,

    /**
     * 아직 공개되지 않은 초안 상태이다.
     */
    DRAFT
}
