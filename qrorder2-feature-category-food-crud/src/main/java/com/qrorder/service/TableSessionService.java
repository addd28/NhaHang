package com.qrorder.service;

import com.qrorder.entity.TableSession;

public interface TableSessionService {

    TableSession openSession(Long tableId);
    TableSession openSession(Long tableId, Long userId);
    TableSession getActiveSession(Long tableId);
    void closeSession(Long sessionId);
    void closeSession(Long sessionId, Long userId);
}