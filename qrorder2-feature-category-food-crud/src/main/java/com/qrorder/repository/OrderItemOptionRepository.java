package com.qrorder.repository;

import com.qrorder.entity.OrderItemOption;
import com.qrorder.dto.dashboard.OptionReportResponse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface OrderItemOptionRepository extends JpaRepository<OrderItemOption, Long> {

    @Query("SELECT new com.qrorder.dto.dashboard.OptionReportResponse(" +
           "oio.itemOptionId, MAX(oio.optionName), MAX(oio.optionGroupName), oio.optionGroupType, " +
           "SUM(oio.quantity), SUM(oio.subtotal)) " +
           "FROM OrderItemOption oio " +
           "JOIN oio.orderItem oi " +
           "JOIN oi.order o " +
           "WHERE (:branchId IS NULL OR o.branch.id = :branchId) " +
           "AND (:from IS NULL OR o.createdAt >= :from) " +
           "AND (:to IS NULL OR o.createdAt <= :to) " +
           "GROUP BY oio.itemOptionId, oio.optionGroupType")
    List<OptionReportResponse> getOptionsReport(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            @Param("branchId") Long branchId
    );
}
