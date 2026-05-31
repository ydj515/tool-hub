package com.example.catalog.model;

/**
 * 상품 목록 화면에 필요한 최소 요약 정보를 담는 레코드이다.
 *
 * @param sku 상품 식별자
 * @param name 상품명
 * @param statusLabel 상태 표시 문자열
 * @param categoryCode 분류 코드
 */
public record ProductSummary(
        String sku,
        String name,
        String statusLabel,
        String categoryCode) {
    /**
     * 표시용 라벨을 조합한다.
     *
     * @return 결합된 표시 문자열
     */
    public String displayLabel() {
        return sku + " - " + name;
    }
}
