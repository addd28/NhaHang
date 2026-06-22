package com.qrorder.repository;

import com.qrorder.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoryRepository
        extends JpaRepository<Category, Long> {

    boolean existsByNameIgnoreCase(
            String name
    );

    java.util.Optional<Category> findByName(String name);
}