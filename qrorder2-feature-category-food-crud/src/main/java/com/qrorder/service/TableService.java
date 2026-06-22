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

    List<TableResponse> getTables(Long branchId);

    void resetTable(Long tableId);

    TableSession getActiveSessionByTableKey(String tableKey);

    TableSession getSessionById(Long sessionId);

    com.qrorder.dto.table.response.AdminLookupResponse adminLookup(String code);

    com.qrorder.dto.table.response.AdminCheckInResponse adminCheckIn(String code);

    void promoteWaitlist();

    List<com.qrorder.dto.table.response.WaitlistResponse> getWaitlist();
}