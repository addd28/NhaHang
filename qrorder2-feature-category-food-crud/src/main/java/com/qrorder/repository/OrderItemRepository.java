package com.qrorder.repository;

import com.qrorder.entity.OrderItem;
import com.qrorder.entity.enums.MenuItemType;
import com.qrorder.entity.enums.OrderItemStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OrderItemRepository
        extends JpaRepository<OrderItem, Long> {

    List<OrderItem>
    findByStatus(
            OrderItemStatus status
    );

    List<OrderItem>
    findByMenuItem_TypeAndStatusNotIn(

            MenuItemType type,

            List<OrderItemStatus> statuses
    );


    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT oi FROM OrderItem oi " +
           "JOIN FETCH oi.menuItem mi " +
           "JOIN FETCH oi.order o " +
           "LEFT JOIN FETCH oi.options " +
           "LEFT JOIN FETCH o.branch b " +
           "WHERE mi.type = :type " +
           "AND oi.status IN :statuses " +
           "AND (:branchId IS NULL OR b.id = :branchId)")
    List<OrderItem> findKitchenOrderItems(
            @org.springframework.data.repository.query.Param("type") MenuItemType type,
            @org.springframework.data.repository.query.Param("statuses") java.util.Collection<OrderItemStatus> statuses,
            @org.springframework.data.repository.query.Param("branchId") Long branchId
    );

    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT oi FROM OrderItem oi " +
           "JOIN FETCH oi.menuItem mi " +
           "LEFT JOIN FETCH oi.options " +
           "JOIN FETCH oi.order o " +
           "WHERE o.session.id = :sessionId")
    List<OrderItem> findByOrder_Session_Id(@org.springframework.data.repository.query.Param("sessionId") Long sessionId);

    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT oi FROM OrderItem oi " +
           "JOIN FETCH oi.menuItem mi " +
           "LEFT JOIN FETCH oi.options " +
           "JOIN FETCH oi.order o " +
           "JOIN FETCH o.session s " +
           "WHERE s.id IN :sessionIds")
    List<OrderItem> findByOrder_Session_IdIn(
            @org.springframework.data.repository.query.Param("sessionIds") java.util.Collection<Long> sessionIds
    );

    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT oi FROM OrderItem oi " +
           "JOIN FETCH oi.menuItem mi " +
           "LEFT JOIN FETCH oi.options " +
           "JOIN FETCH oi.order o " +
           "LEFT JOIN FETCH o.branch b " +
           "LEFT JOIN FETCH o.session s " +
           "LEFT JOIN FETCH s.table t " +
           "WHERE oi.status = :status " +
           "AND (:branchId IS NULL OR b.id = :branchId)")
    List<OrderItem> findByStatusAndBranchId(
            @org.springframework.data.repository.query.Param("status") OrderItemStatus status,
            @org.springframework.data.repository.query.Param("branchId") Long branchId
    );

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(oi) FROM OrderItem oi " +
           "JOIN oi.order o " +
           "LEFT JOIN o.branch b " +
           "WHERE oi.status IN :statuses " +
           "AND (:branchId IS NULL OR b.id = :branchId)")
    long countByStatusInAndBranchId(
            @org.springframework.data.repository.query.Param("statuses") java.util.Collection<OrderItemStatus> statuses,
            @org.springframework.data.repository.query.Param("branchId") Long branchId
    );

    long countByStatus(
            OrderItemStatus status
    );
}