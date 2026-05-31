package com.example.catalog.model;

/**
 * 카탈로그에 노출되는 핵심 상품 엔티티이다.
 */
public class Product {
    /**
     * 상품을 유일하게 식별하는 SKU이다.
     */
    private final String sku;

    /**
     * 화면에 표시할 상품명이다.
     */
    private String name;

    /**
     * 상품의 현재 판매 상태이다.
     */
    protected ProductStatus status;

    /**
     * 상품이 속한 분류 코드이다.
     */
    String categoryCode;

    /**
     * 상품 상세 설명과 재고 정보를 담는 상세 객체이다.
     */
    private final ProductDetail detail;

    /**
     * 상품 엔티티를 생성한다.
     *
     * @param sku 상품 식별자
     * @param name 상품명
     * @param status 판매 상태
     * @param categoryCode 분류 코드
     * @param detail 상품 상세 정보
     */
    public Product(
            final String sku,
            final String name,
            final ProductStatus status,
            final String categoryCode,
            final ProductDetail detail) {
        this.sku = sku;
        this.name = name;
        this.status = status;
        this.categoryCode = categoryCode;
        this.detail = detail;
    }

    /**
     * 상품 SKU를 반환한다.
     *
     * @return 상품 식별자
     */
    public String getSku() {
        return sku;
    }

    /**
     * 상품명을 반환한다.
     *
     * @return 상품명
     */
    public String getName() {
        return name;
    }

    /**
     * 판매 상태를 반환한다.
     *
     * @return 상품 상태
     */
    public ProductStatus getStatus() {
        return status;
    }

    /**
     * 분류 코드를 반환한다.
     *
     * @return 분류 코드
     */
    public String getCategoryCode() {
        return categoryCode;
    }

    /**
     * 상세 정보를 반환한다.
     *
     * @return 상품 상세 정보
     */
    public ProductDetail getDetail() {
        return detail;
    }

    /**
     * 키워드가 상품명에 포함되는지 확인한다.
     *
     * @param keyword 검색 키워드
     * @return 포함 여부
     */
    public boolean matchesKeyword(final String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return true;
        }
        return name.toLowerCase().contains(keyword.toLowerCase());
    }

    /**
     * 상품명을 새로운 값으로 갱신한다.
     *
     * @param newName 새 상품명
     */
    void rename(final String newName) {
        if (newName == null || newName.isBlank()) {
            throw new IllegalArgumentException("name must not be blank");
        }
        this.name = newName.trim();
    }

    /**
     * 상품 상태를 새로운 값으로 전환한다.
     *
     * @param newStatus 새 상품 상태
     */
    protected void changeStatus(final ProductStatus newStatus) {
        this.status = newStatus;
    }
}
