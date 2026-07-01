package com.qrorder.scheduler;

import com.qrorder.entity.Reservation;
import com.qrorder.entity.RestaurantTable;
import com.qrorder.entity.enums.ReservationStatus;
import com.qrorder.entity.enums.TableStatus;
import com.qrorder.repository.ReservationRepository;
import com.qrorder.repository.RestaurantTableRepository;
import com.qrorder.service.TableService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
public class ReservationScheduler {

    private final ReservationRepository reservationRepository;
    private final RestaurantTableRepository tableRepository;
    private final TableService tableService;

    @Scheduled(fixedRate = 60000)
    @Transactional
    public void autoCancelReservation() {
        LocalDateTime now = LocalDateTime.now();
        List<Reservation> expiredBookings = reservationRepository.findExpiredBookingsForUpdate(now);

        for (Reservation reservation : expiredBookings) {
            reservation.setStatus(ReservationStatus.NO_SHOW);
            RestaurantTable table = reservation.getTable();

            if (table != null) {
                RestaurantTable lockedTable = tableRepository.findByIdForUpdate(table.getId()).orElse(null);
                if (lockedTable != null && lockedTable.getStatus() == TableStatus.RESERVED) {
                    lockedTable.setStatus(TableStatus.EMPTY);
                    tableRepository.save(lockedTable);
                }
            }
            reservationRepository.save(reservation);
        }
    }
}