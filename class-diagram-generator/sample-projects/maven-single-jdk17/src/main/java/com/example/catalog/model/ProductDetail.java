package com.example.catalog.model;

/**
 * 상품 상세 설명과 재고 지표를 담는 값 객체이다.
 *
 * @param description 상품 상세 설명
 * @param stockQuantity 현재 재고 수량
 * @param featured 추천 상품 여부
 */
public record ProductDetail(String description, int stockQuantity, boolean featured) {
    /**
     * 현재 재고 상태를 사람이 읽기 쉬운 형식으로 반환한다.
     *
     * @return 재고 상태 문자열
     */
    public String stockLabel() {
        if (stockQuantity <= 0) {
            return "out-of-stock";
        }
        if (featured) {
            return "featured";
        }
        return "available";
    }
}
