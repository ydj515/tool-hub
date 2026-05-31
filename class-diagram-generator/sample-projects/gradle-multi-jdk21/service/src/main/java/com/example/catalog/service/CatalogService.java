package com.example.catalog.service;

import com.example.catalog.support.CatalogSnapshot;
import com.example.catalog.support.CatalogStatus;
import com.example.catalog.support.CatalogSupport;

/**
 * 카탈로그 조회 유스케이스를 조합하는 서비스 구현체이다.
 */
public class CatalogService {
    /**
     * 식별자 정규화를 위임할 보조 계약이다.
     */
    private final CatalogSupport catalogSupport;

    /**
     * 서비스 구현체를 생성한다.
     *
     * @param catalogSupport 식별자 포맷터
     */
    public CatalogService(final CatalogSupport catalogSupport) {
        this.catalogSupport = catalogSupport;
    }

    /**
     * 상품 식별자로 현재 카탈로그 스냅샷을 조회한다.
     *
     * @param sku 상품 식별자
     * @return 상품 스냅샷
     */
    public CatalogSnapshot load(final String sku) {
        return new CatalogSnapshot(catalogSupport.formatSku(sku), CatalogStatus.ACTIVE);
    }

    /**
     * 서비스 내부 점검 이력을 담는 내부 클래스이다.
     */
    protected static final class AuditTrail {
        /**
         * 마지막 점검 시각 표현이다.
         */
        private final String lastCheckedAt;

        /**
         * 내부 점검 이력을 생성한다.
         *
         * @param lastCheckedAt 마지막 점검 시각
         */
        public AuditTrail(final String lastCheckedAt) {
            this.lastCheckedAt = lastCheckedAt;
        }

        /**
         * 마지막 점검 시각을 반환한다.
         *
         * @return 마지막 점검 시각
         */
        public String lastCheckedAt() {
            return lastCheckedAt;
        }
    }
}

