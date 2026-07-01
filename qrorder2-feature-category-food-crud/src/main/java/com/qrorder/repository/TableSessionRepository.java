package com.qrorder.repository;

import com.qrorder.entity.TableSession;
import com.qrorder.entity.enums.SessionStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.List;

public interface TableSessionRepository
        extends JpaRepository<TableSession, Long> {

    boolean existsByTableIdAndStatus(Long tableId, SessionStatus status);

    Optional<TableSession> findByIdAndStatus(Long id, SessionStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<TableSession> findByTableIdAndStatus(Long tableId, SessionStatus status);

    // Read-only version without lock for service/tables endpoint
    Optional<TableSession> findTopByTableIdAndStatus(Long tableId, SessionStatus status);

    Optional<TableSession> findFirstByTableIdAndStatus(Long tableId, SessionStatus status);

    Optional<TableSession> findByTableTableKeyAndStatus(String tableKey, SessionStatus status);

    long countByStatus(SessionStatus status);

    @Query("SELECT DISTINCT s FROM TableSession s " +
           "JOIN FETCH s.table t " +
           "WHERE s.status = :status")
    List<TableSession> findOpenSessionsWithTables(
            @Param("status") SessionStatus status
    );
}