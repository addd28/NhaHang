package com.qrorder.repository;

import com.qrorder.entity.MenuItem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;

public interface MenuItemRepository extends JpaRepository<MenuItem, Long> {
    List<MenuItem> findAll();
    List<MenuItem> findByAvailable(Boolean available);
    Optional<MenuItem> findByIdAndAvailable(Long id, Boolean available);
    boolean existsByNameIgnoreCase(String name);
    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);
    boolean existsByCategoryId(Long categoryId);

    @EntityGraph(attributePaths = {"optionGroups"})
    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT m FROM MenuItem m")
    List<MenuItem> findAllWithOptions();

    @EntityGraph(attributePaths = {"optionGroups"})
    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT m FROM MenuItem m WHERE m.available = :available")
    List<MenuItem> findByAvailableWithOptions(@org.springframework.data.repository.query.Param("available") Boolean available);

    @EntityGraph(attributePaths = {"optionGroups"})
    @org.springframework.data.jpa.repository.Query("SELECT m FROM MenuItem m WHERE m.id = :id")
    Optional<MenuItem> findByIdWithOptions(@org.springframework.data.repository.query.Param("id") Long id);
}
