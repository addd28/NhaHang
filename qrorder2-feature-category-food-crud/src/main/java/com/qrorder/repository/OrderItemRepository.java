package com.qrorder.repository;

import com.qrorder.entity.OrderItem;
import com.qrorder.entity.enums.MenuItemType;
import com.qrorder.entity.enums.OrderItemStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface OrderItemRepository
        extends JpaRepository<OrderItem, Long> {

    List<OrderItem> findByStatus(OrderItemStatus status);

    List<OrderItem> findByMenuItem_TypeAndStatusNotIn(
            MenuItemType type,
            List<OrderItemStatus> statuses
    );

    @Query("SELECT DISTINCT oi FROM OrderItem oi " +
           "JOIN FETCH oi.menuItem mi " +
           "JOIN FETCH oi.order o " +
           "LEFT JOIN FETCH oi.options " +
           "WHERE mi.type = :type " +
           "AND oi.status IN :statuses")
    List<OrderItem> findKitchenOrderItems(
            @Param("type") MenuItemType type,
            @Param("statuses") Collection<OrderItemStatus> statuses
    );

    @Query("SELECT DISTINCT oi FROM OrderItem oi " +
           "JOIN FETCH oi.menuItem mi " +
           "LEFT JOIN FETCH oi.options " +
           "JOIN FETCH oi.order o " +
           "WHERE o.session.id = :sessionId")
    List<OrderItem> findByOrder_Session_Id(@Param("sessionId") Long sessionId);

    @Query("SELECT DISTINCT oi FROM OrderItem oi " +
           "JOIN FETCH oi.menuItem mi " +
           "LEFT JOIN FETCH oi.options " +
           "JOIN FETCH oi.order o " +
           "JOIN FETCH o.session s " +
           "WHERE s.id IN :sessionIds")
    List<OrderItem> findByOrder_Session_IdIn(
            @Param("sessionIds") Collection<Long> sessionIds
    );

    @Query("SELECT DISTINCT oi FROM OrderItem oi " +
           "JOIN FETCH oi.menuItem mi " +
           "LEFT JOIN FETCH oi.options " +
           "JOIN FETCH oi.order o " +
           "LEFT JOIN FETCH o.session s " +
           "LEFT JOIN FETCH s.table t " +
           "WHERE oi.status = :status")
    List<OrderItem> findByStatusForWaiter(
            @Param("status") OrderItemStatus status
    );

    @Query("SELECT COUNT(oi) FROM OrderItem oi " +
           "WHERE oi.status IN :statuses")
    long countByStatusIn(
            @Param("statuses") Collection<OrderItemStatus> statuses
    );

    long countByStatus(OrderItemStatus status);
}