package com.example.catalog.repository;

import com.example.catalog.model.ProductDetail;
import com.example.catalog.model.ProductSummary;
import com.example.catalog.service.CatalogService;
import com.example.catalog.service.DefaultCatalogService;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

/**
 * 기본 카탈로그 서비스의 주요 조회 동작을 검증한다.
 */
class DefaultCatalogServiceTest {
    /**
     * 서비스가 샘플 저장소 데이터를 요약 목록으로 변환하는지 검증한다.
     */
    @Test
    void searchProductsReturnsCatalogSummaries() {
        final ProductRepository repository = new InMemoryProductRepository();
        final CatalogService service = new DefaultCatalogService(repository);

        final List<ProductSummary> result = service.searchProducts("note");

        assertFalse(result.isEmpty());
        assertEquals("SKU-1000", result.get(0).sku());
    }

    /**
     * 서비스가 SKU 기준 상세 정보를 조회하는지 검증한다.
     */
    @Test
    void getProductDetailReturnsSeededDetail() {
        final ProductRepository repository = new InMemoryProductRepository();
        final CatalogService service = new DefaultCatalogService(repository);

        final ProductDetail detail = service.getProductDetail("sku-1001");

        assertEquals("featured", detail.stockLabel());
    }
}
