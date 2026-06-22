package com.qrorder.repository;

import com.qrorder.entity.RestaurantTable;
import com.qrorder.entity.enums.TableStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RestaurantTableRepository
        extends JpaRepository<RestaurantTable, Long> {

    List<RestaurantTable>
    findByStatus(
            TableStatus status
    );

    boolean existsByTableNumber(Integer tableNumber);

    java.util.Optional<RestaurantTable> findByTableNumber(Integer tableNumber);

    java.util.Optional<RestaurantTable> findByTableKey(String tableKey);

    List<RestaurantTable> findByBranchId(Long branchId);

    boolean existsByTableNumberAndBranchId(Integer tableNumber, Long branchId);

    java.util.Optional<RestaurantTable> findByTableNumberAndBranchId(Integer tableNumber, Long branchId);

    long countByStatus(
            TableStatus status
    );

    long countByBranchIdAndStatus(Long branchId, TableStatus status);

    java.util.Optional<RestaurantTable> findByQrToken(String qrToken);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("SELECT t FROM RestaurantTable t WHERE t.branch.id = :branchId AND t.status = :status ORDER BY t.capacity ASC")
    List<RestaurantTable> findByBranchIdAndStatusForUpdate(
            @org.springframework.data.repository.query.Param("branchId") Long branchId,
            @org.springframework.data.repository.query.Param("status") TableStatus status
    );

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("SELECT t FROM RestaurantTable t WHERE t.branch.id = :branchId ORDER BY t.capacity ASC")
    List<RestaurantTable> findByBranchIdForUpdate(
            @org.springframework.data.repository.query.Param("branchId") Long branchId
    );

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("SELECT t FROM RestaurantTable t WHERE t.id = :id")
    java.util.Optional<RestaurantTable> findByIdForUpdate(@org.springframework.data.repository.query.Param("id") Long id);
}