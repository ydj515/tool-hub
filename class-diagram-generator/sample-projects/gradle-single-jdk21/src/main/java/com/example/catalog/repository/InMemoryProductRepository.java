package com.example.catalog.repository;

import com.example.catalog.model.Product;
import com.example.catalog.model.ProductDetail;
import com.example.catalog.model.ProductStatus;
import com.example.catalog.util.SkuFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * 고정된 샘플 데이터를 메모리에서 제공하는 저장소 구현체이다.
 */
class InMemoryProductRepository implements ProductRepository {
    /**
     * 메모리에 적재된 샘플 상품 목록이다.
     */
    private final List<Product> products;

    /**
     * 기본 샘플 데이터를 사용하여 저장소를 생성한다.
     */
    InMemoryProductRepository() {
        this.products = createSeedProducts();
    }

    /**
     * SKU 기준으로 상품을 조회한다.
     *
     * @param sku 상품 식별자
     * @return 조회 결과
     */
    @Override
    public Optional<Product> findBySku(final String sku) {
        for (Product product : products) {
            if (product.getSku().equals(SkuFormatter.normalize(sku))) {
                return Optional.of(product);
            }
        }
        return Optional.empty();
    }

    /**
     * 키워드가 이름에 포함되는 상품을 찾는다.
     *
     * @param keyword 검색 키워드
     * @return 검색 결과 목록
     */
    @Override
    public List<Product> findByKeyword(final String keyword) {
        final List<Product> matchedProducts = new ArrayList<>();
        for (Product product : products) {
            if (product.matchesKeyword(keyword)) {
                matchedProducts.add(product);
            }
        }
        return matchedProducts;
    }

    /**
     * 전체 상품 목록을 반환한다.
     *
     * @return 전체 상품 목록
     */
    @Override
    public List<Product> findAll() {
        return List.copyOf(products);
    }

    /**
     * 샘플 테스트에 사용할 초기 데이터를 생성한다.
     *
     * @return 초기 상품 목록
     */
    private List<Product> createSeedProducts() {
        final List<Product> seedProducts = new ArrayList<>();
        seedProducts.add(new Product(
                "SKU-1000",
                "Notebook Pro",
                ProductStatus.ACTIVE,
                "DEVICE",
                new ProductDetail("High performance notebook for office workers.", 120, true)));
        seedProducts.add(new Product(
                "SKU-1001",
                "Noise Canceling Headphones",
                ProductStatus.ACTIVE,
                "AUDIO",
                new ProductDetail("Wireless headphones with adaptive noise canceling.", 45, true)));
        seedProducts.add(new Product(
                "SKU-1002",
                "Archive Storage Box",
                ProductStatus.DISCONTINUED,
                "OFFICE",
                new ProductDetail("Paper document storage box for long term retention.", 0, false)));
        return seedProducts;
    }
}
