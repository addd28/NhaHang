package com.qrorder.repository;

import com.qrorder.entity.RestaurantTable;
import com.qrorder.entity.enums.TableStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;

public interface RestaurantTableRepository
        extends JpaRepository<RestaurantTable, Long> {

    List<RestaurantTable> findByStatus(TableStatus status);

    boolean existsByTableNumber(Integer tableNumber);

    Optional<RestaurantTable> findByTableNumber(Integer tableNumber);

    Optional<RestaurantTable> findByTableKey(String tableKey);

    Optional<RestaurantTable> findByQrToken(String qrToken);

    long countByStatus(TableStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM RestaurantTable t WHERE t.status = :status ORDER BY t.capacity ASC")
    List<RestaurantTable> findByStatusForUpdate(
            @Param("status") TableStatus status
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM RestaurantTable t ORDER BY t.capacity ASC")
    List<RestaurantTable> findAllForUpdate();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM RestaurantTable t WHERE t.id = :id")
    Optional<RestaurantTable> findByIdForUpdate(@Param("id") Long id);
}