package com.qrorder.repository;


import com.qrorder.entity.Reservation;
import com.qrorder.entity.enums.ReservationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ReservationRepository
        extends JpaRepository<Reservation, Long> {

    List<Reservation>
    findByStatus(
            ReservationStatus status
    );

    List<Reservation>
    findByStatusOrderByCreatedAtAsc(
            ReservationStatus status
    );

    List<Reservation>
    findByTableId(
            Long tableId
    );

    Optional<Reservation>
    findByConfirmationCode(
            String confirmationCode
    );

    long countByBranchId(Long branchId);

    long countByBranchIdAndReservationTimeBetween(Long branchId, java.time.LocalDateTime start, java.time.LocalDateTime end);

    Optional<Reservation> findByReservationCode(String reservationCode);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("SELECT r FROM Reservation r WHERE r.reservationCode = :code")
    Optional<Reservation> findByReservationCodeForUpdate(@org.springframework.data.repository.query.Param("code") String code);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("SELECT r FROM Reservation r WHERE r.branch.id = :branchId AND r.status = com.qrorder.entity.enums.ReservationStatus.WAITLIST ORDER BY r.createdAt ASC")
    List<Reservation> findWaitlistForUpdate(@org.springframework.data.repository.query.Param("branchId") Long branchId);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("SELECT r FROM Reservation r WHERE r.status = com.qrorder.entity.enums.ReservationStatus.BOOKED AND r.holdUntil < :now")
    List<Reservation> findExpiredBookingsForUpdate(@org.springframework.data.repository.query.Param("now") java.time.LocalDateTime now);
}
