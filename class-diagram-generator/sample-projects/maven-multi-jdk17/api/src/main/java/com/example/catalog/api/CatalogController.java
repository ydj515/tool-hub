package com.example.catalog.api;

import com.example.catalog.service.CatalogService;
import com.example.catalog.support.CatalogSnapshot;

/**
 * 외부 요청에서 카탈로그 조회를 시작하는 진입점 클래스이다.
 */
public class CatalogController {
    /**
     * 조회를 위임할 서비스이다.
     */
    private final CatalogService catalogService;

    /**
     * 컨트롤러를 생성한다.
     *
     * @param catalogService 카탈로그 서비스
     */
    public CatalogController(final CatalogService catalogService) {
        this.catalogService = catalogService;
    }

    /**
     * 상품 스냅샷을 조회한다.
     *
     * @param sku 상품 식별자
     * @return 상품 스냅샷
     */
    public CatalogSnapshot getSnapshot(final String sku) {
        return catalogService.load(sku);
    }

    /**
     * 요청 문맥을 표현하는 내부 값 객체이다.
     */
    static final class RequestContext {
        /**
         * 외부 요청 식별자이다.
         */
        private final String requestId;

        /**
         * 요청 문맥을 생성한다.
         *
         * @param requestId 외부 요청 식별자
         */
        RequestContext(final String requestId) {
            this.requestId = requestId;
        }

        /**
         * 요청 식별자를 반환한다.
         *
         * @return 요청 식별자
         */
        String requestId() {
            return requestId;
        }
    }
}

