package com.example.catalog.controller;

import com.example.catalog.model.ProductDetail;
import com.example.catalog.model.ProductSummary;
import com.example.catalog.service.CatalogService;
import java.util.List;

/**
 * 상품 조회 요청을 처리하는 진입점 클래스이다.
 */
public class CatalogController {
    /**
     * 조회 로직을 위임할 서비스이다.
     */
    private final CatalogService catalogService;

    /**
     * 컨트롤러를 생성한다.
     *
     * @param catalogService 상품 조회 서비스
     */
    public CatalogController(final CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    /**
     * 단일 상품의 상세 정보를 조회한다.
     *
     * @param sku 조회할 상품 식별자
     * @return 상품 상세 정보
     */
    public ProductDetail getProductDetail(final String sku) {
        return catalogService.getProductDetail(SkuInput.of(sku).normalizedSku());
    }

    /**
     * 키워드 기준으로 상품 목록을 조회한다.
     *
     * @param keyword 검색 키워드
     * @return 검색 결과 목록
     */
    public List<ProductSummary> searchProducts(final String keyword) {
        return catalogService.searchProducts(keyword);
    }

    /**
     * 요청 문맥 객체를 생성한다.
     *
     * @param requestId 외부 요청 식별자
     * @return 요청 문맥 객체
     */
    public RequestContext currentRequestContext(final String requestId) {
        return new RequestContext(sanitizeRequestId(requestId));
    }

    /**
     * 요청 식별자를 안전한 형식으로 정리한다.
     *
     * @param requestId 원본 요청 식별자
     * @return 정리된 요청 식별자
     */
    String sanitizeRequestId(final String requestId) {
        if (requestId == null || requestId.isBlank()) {
            return "anonymous";
        }
        return requestId.trim();
    }

    /**
     * 요청 단위 메타데이터를 담는 내부 클래스이다.
     */
    public static final class RequestContext {
        /**
         * 현재 요청의 고유 식별자이다.
         */
        private final String requestId;

        /**
         * 요청 문맥 객체를 생성한다.
         *
         * @param requestId 현재 요청 식별자
         */
        public RequestContext(final String requestId) {
            this.requestId = requestId;
        }

        /**
         * 요청 식별자를 반환한다.
         *
         * @return 요청 식별자
         */
        public String requestId() {
            return requestId;
        }
    }

    /**
     * SKU 입력을 정규화하는 내부 값 객체이다.
     */
    static final class SkuInput {
        /**
         * 정규화된 SKU 값이다.
         */
        private final String normalizedSku;

        /**
         * 내부 값 객체를 생성한다.
         *
         * @param normalizedSku 정규화된 SKU 값
         */
        private SkuInput(final String normalizedSku) {
            this.normalizedSku = normalizedSku;
        }

        /**
         * 원본 SKU 문자열로부터 입력 객체를 생성한다.
         *
         * @param rawSku 원본 SKU
         * @return 입력 객체
         */
        static SkuInput of(final String rawSku) {
            if (rawSku == null || rawSku.isBlank()) {
                throw new IllegalArgumentException("sku must not be blank");
            }
            return new SkuInput(rawSku.trim().toUpperCase());
        }

        /**
         * 정규화된 SKU 값을 반환한다.
         *
         * @return 정규화된 SKU 값
         */
        String normalizedSku() {
            return normalizedSku;
        }
    }
}
