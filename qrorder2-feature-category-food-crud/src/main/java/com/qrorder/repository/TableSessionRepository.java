package com.qrorder.repository;

import com.qrorder.entity.TableSession;
import com.qrorder.entity.enums.SessionStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

import java.util.Optional;
import java.util.List;

public interface TableSessionRepository
        extends JpaRepository<TableSession, Long> {

    boolean existsByTableIdAndStatus(
            Long tableId,
            SessionStatus status
    );

    Optional<TableSession>
    findByIdAndStatus(
            Long id,
            SessionStatus status
    );


    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<TableSession>
    findByTableIdAndStatus(

            Long tableId,

            SessionStatus status
    );

    // Read-only version without lock for service/tables endpoint
    Optional<TableSession> findTopByTableIdAndStatus(
            Long tableId,
            SessionStatus status
    );

    Optional<TableSession> findFirstByTableIdAndStatus(
            Long tableId,
            SessionStatus status
    );

    Optional<TableSession> findByTableTableKeyAndStatus(
            String tableKey,
            SessionStatus status
    );

    long countByBranchIdAndStatus(Long branchId, SessionStatus status);

    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT s FROM TableSession s " +
           "JOIN FETCH s.table t " +
           "LEFT JOIN FETCH s.branch b " +
           "WHERE s.status = :status " +
           "AND (:branchId IS NULL OR b.id = :branchId)")
    List<TableSession> findOpenSessionsWithTables(
            @org.springframework.data.repository.query.Param("status") SessionStatus status,
            @org.springframework.data.repository.query.Param("branchId") Long branchId
    );
}