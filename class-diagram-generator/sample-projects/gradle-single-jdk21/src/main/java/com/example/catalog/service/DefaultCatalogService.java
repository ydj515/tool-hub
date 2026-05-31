package com.example.catalog.service;

import com.example.catalog.model.Product;
import com.example.catalog.model.ProductDetail;
import com.example.catalog.model.ProductSummary;
import com.example.catalog.repository.ProductRepository;
import java.util.ArrayList;
import java.util.List;

/**
 * 상품 조회 유스케이스의 기본 구현체이다.
 */
public class DefaultCatalogService extends AbstractCatalogSupport implements CatalogService {
    /**
     * 상품 데이터를 제공하는 저장소이다.
     */
    private final ProductRepository productRepository;

    /**
     * 기본 서비스 구현체를 생성한다.
     *
     * @param productRepository 상품 저장소
     */
    public DefaultCatalogService(final ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    /**
     * 상품 상세 정보를 조회한다.
     *
     * @param sku 상품 식별자
     * @return 상품 상세 정보
     */
    @Override
    public ProductDetail getProductDetail(final String sku) {
        return loadProduct(requireSku(sku)).getDetail();
    }

    /**
     * 상품 검색 결과를 요약 목록으로 변환한다.
     *
     * @param keyword 검색 키워드
     * @return 상품 요약 목록
     */
    @Override
    public List<ProductSummary> searchProducts(final String keyword) {
        final String normalizedKeyword = normalizeKeyword(keyword);
        final List<ProductSummary> summaries = new ArrayList<>();
        for (Product product : productRepository.findByKeyword(normalizedKeyword)) {
            summaries.add(toSummary(product));
        }
        return summaries;
    }

    /**
     * 조회된 상품 엔티티를 요약 응답으로 변환한다.
     *
     * @param product 변환 대상 상품
     * @return 상품 요약 응답
     */
    protected ProductSummary toSummary(final Product product) {
        return new ProductSummary(
                product.getSku(),
                product.getName(),
                product.getStatus().name(),
                product.getCategoryCode());
    }

    /**
     * 저장소에서 상품을 조회한다.
     *
     * @param sku 조회할 상품 식별자
     * @return 조회된 상품 엔티티
     */
    Product loadProduct(final String sku) {
        return productRepository.findBySku(sku)
                .orElseThrow(() -> new IllegalArgumentException("product not found: " + sku));
    }
}
