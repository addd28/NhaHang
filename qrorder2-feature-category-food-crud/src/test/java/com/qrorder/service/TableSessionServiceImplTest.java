package com.qrorder.service;

import com.qrorder.entity.RestaurantTable;
import com.qrorder.entity.TableSession;
import com.qrorder.entity.enums.SessionStatus;
import com.qrorder.entity.enums.TableStatus;
import com.qrorder.repository.RestaurantTableRepository;
import com.qrorder.repository.TableSessionRepository;
import com.qrorder.service.impl.TableSessionServiceImpl;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("TableSessionServiceImpl Tests")
class TableSessionServiceImplTest {

    @Mock
    private TableSessionRepository sessionRepository;

    @Mock
    private RestaurantTableRepository tableRepository;

    @InjectMocks
    private TableSessionServiceImpl tableSessionService;

    private RestaurantTable table;
    private TableSession openSession;

    @BeforeEach
    void setUp() {
        table = RestaurantTable.builder()
                .id(1L)
                .status(TableStatus.EMPTY)
                .build();

        openSession = TableSession.builder()
                .id(1L)
                .table(table)
                .status(SessionStatus.OPEN)
                .startTime(LocalDateTime.now())
                .build();
    }

    // ==================== openSession ====================

    @Test
    @DisplayName("openSession - Mở phiên bàn thành công")
    void openSession_success() {
        when(tableRepository.findById(1L)).thenReturn(Optional.of(table));
        when(sessionRepository.findByTableIdAndStatus(1L, SessionStatus.OPEN))
                .thenReturn(Optional.empty());
        when(sessionRepository.save(any(TableSession.class))).thenReturn(openSession);

        TableSession result = tableSessionService.openSession(1L);

        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo(SessionStatus.OPEN);
        assertThat(table.getStatus()).isEqualTo(TableStatus.OCCUPIED);
        verify(tableRepository).save(table);
        verify(sessionRepository).save(any(TableSession.class));
    }

    @Test
    @DisplayName("openSession - Lỗi khi bàn đã có phiên đang mở")
    void openSession_throwsException_whenSessionAlreadyOpen() {
        when(tableRepository.findById(1L)).thenReturn(Optional.of(table));
        when(sessionRepository.findByTableIdAndStatus(1L, SessionStatus.OPEN))
                .thenReturn(Optional.of(openSession));

        assertThatThrownBy(() -> tableSessionService.openSession(1L))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("SESSION_ALREADY_OPEN: Bàn này đã có phiên đang mở.");

        verify(sessionRepository, never()).save(any());
    }

    @Test
    @DisplayName("openSession - Lỗi khi bàn không tồn tại")
    void openSession_throwsException_whenTableNotFound() {
        when(tableRepository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> tableSessionService.openSession(1L))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Table not found");

        verify(sessionRepository, never()).save(any());
    }

    // ==================== getActiveSession ====================

    @Test
    @DisplayName("getActiveSession - Lấy phiên đang mở thành công")
    void getActiveSession_success() {
        when(sessionRepository.findFirstByTableIdAndStatus(1L, SessionStatus.OPEN))
                .thenReturn(Optional.of(openSession));

        TableSession result = tableSessionService.getActiveSession(1L);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getStatus()).isEqualTo(SessionStatus.OPEN);
    }

    @Test
    @DisplayName("getActiveSession - Lỗi khi không có phiên đang mở")
    void getActiveSession_throwsException_whenNoActiveSession() {
        when(sessionRepository.findFirstByTableIdAndStatus(1L, SessionStatus.OPEN))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> tableSessionService.getActiveSession(1L))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("No active session");
    }
}
