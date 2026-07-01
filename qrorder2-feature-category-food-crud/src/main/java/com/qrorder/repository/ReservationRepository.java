package com.qrorder.repository;

import com.qrorder.entity.Reservation;
import com.qrorder.entity.enums.ReservationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ReservationRepository
        extends JpaRepository<Reservation, Long> {

    List<Reservation> findByStatus(ReservationStatus status);

    List<Reservation> findByStatusOrderByCreatedAtAsc(ReservationStatus status);

    List<Reservation> findByTableId(Long tableId);

    Optional<Reservation> findByConfirmationCode(String confirmationCode);

    Optional<Reservation> findByReservationCode(String reservationCode);

    long countByStatus(ReservationStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM Reservation r WHERE r.reservationCode = :code")
    Optional<Reservation> findByReservationCodeForUpdate(@Param("code") String code);



    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM Reservation r WHERE r.status = com.qrorder.entity.enums.ReservationStatus.BOOKED AND r.holdUntil < :now")
    List<Reservation> findExpiredBookingsForUpdate(@Param("now") java.time.LocalDateTime now);

    List<Reservation> findByReservationTimeBetween(LocalDateTime start, LocalDateTime end);

    List<Reservation> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    List<Reservation> findAllByOrderByCreatedAtDesc();

    @Query("SELECT r FROM Reservation r WHERE " +
           "(LOWER(r.reservationCode) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(r.phone) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(r.customerName) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(r.confirmationCode) LIKE LOWER(CONCAT('%', :q, '%'))) " +
           "ORDER BY r.createdAt DESC")
    List<Reservation> searchReservations(@Param("q") String q);
}

