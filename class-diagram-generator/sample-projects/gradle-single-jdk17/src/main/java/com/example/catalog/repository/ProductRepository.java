package com.example.catalog.repository;

import com.example.catalog.model.Product;
import java.util.List;
import java.util.Optional;

/**
 * 상품 저장소의 조회 계약을 정의한다.
 */
public interface ProductRepository {
    /**
     * SKU 기준으로 단일 상품을 조회한다.
     *
     * @param sku 상품 식별자
     * @return 조회 결과
     */
    Optional<Product> findBySku(String sku);

    /**
     * 키워드로 상품을 검색한다.
     *
     * @param keyword 검색 키워드
     * @return 검색 결과 목록
     */
    List<Product> findByKeyword(String keyword);

    /**
     * 전체 상품을 조회한다.
     *
     * @return 전체 상품 목록
     */
    List<Product> findAll();
}
