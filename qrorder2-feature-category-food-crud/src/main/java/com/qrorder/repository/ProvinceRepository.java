package com.qrorder.repository;

import com.qrorder.entity.Province;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProvinceRepository
        extends JpaRepository<Province, Long> {

    boolean existsByNameIgnoreCase(String name);
}
