package com.qrorder.repository;

import com.qrorder.entity.Branch;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BranchRepository
        extends JpaRepository<Branch, Long> {

    boolean existsByNameIgnoreCase(String name);

    boolean existsByProvinceId(Long provinceId);

    long countByProvinceId(Long provinceId);
}
