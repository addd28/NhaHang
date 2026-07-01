package com.qrorder.service;

import com.qrorder.dto.table.request.CreateTableRequest;
import com.qrorder.dto.table.request.UpdateTableRequest;
import com.qrorder.dto.table.request.ReserveTableRequest;
import com.qrorder.dto.table.response.CheckInByCodeResponse;
import com.qrorder.dto.table.response.TableResponse;
import com.qrorder.entity.TableSession;

import java.util.List;
import java.util.Map;

public interface TableService {

    void createTable(CreateTableRequest request);

    void updateTable(Long id, UpdateTableRequest request);

    void deleteTable(Long id);

    Map<String, Object> reserveTable(
            Long tableId,
            ReserveTableRequest request
    );

    Map<String, Object> reserveSlot(ReserveTableRequest request);

    List<com.qrorder.dto.table.response.ReservationResponse> getReservations();


    Long checkIn(Long tableId);

    CheckInByCodeResponse checkInByCode(String confirmationCode);

    List<TableResponse> getTables();

    void resetTable(Long tableId);

    TableSession getActiveSessionByTableKey(String tableKey);

    TableSession getSessionById(Long sessionId);

    com.qrorder.dto.table.response.AdminLookupResponse adminLookup(String code);

    com.qrorder.dto.table.response.AdminCheckInResponse adminCheckIn(String code);

    void cancelReservation(Long id);

    com.qrorder.dto.table.response.AdminCheckInResponse checkInReservation(Long id, Long tableId);

    List<com.qrorder.dto.table.response.ReservationResponse> getHistoryReservations();

    List<com.qrorder.dto.table.response.ReservationResponse> searchReservations(String q);

    Map<String, Object> getReservationDashboardStats();

    Map<String, Object> getOccupancy(java.time.LocalDateTime dateTime);
}