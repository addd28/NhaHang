package com.qrorder.service;


import com.qrorder.dto.payment.PaymentHistoryResponse;
import com.qrorder.dto.payment.PaymentResponse;
import com.qrorder.entity.enums.PaymentMethod;

import java.util.List;

public interface PaymentService {

    PaymentResponse getBill(Long sessionId);

    void payment(Long sessionId, PaymentMethod paymentMethod);

    List<PaymentHistoryResponse> getPaymentHistory();

    PaymentHistoryResponse getPaymentDetail(
            Long paymentId
    );

    List<PaymentHistoryResponse> getPaymentHistoryFiltered(
            String startDate,
            String endDate,
            String paymentMethod,
            String paymentStatus,
            Double minAmount,
            Double maxAmount,
            String search
    );

    java.util.Map<String, Object> getStatistics(
            String startDate,
            String endDate,
            String paymentMethod,
            String paymentStatus,
            Double minAmount,
            Double maxAmount,
            String search
    );

    List<java.util.Map<String, Object>> getTopItems(
            String startDate,
            String endDate,
            String paymentMethod,
            String paymentStatus,
            Double minAmount,
            Double maxAmount,
            String search
    );

    byte[] exportExcel(
            String startDate,
            String endDate,
            String paymentMethod,
            String paymentStatus,
            Double minAmount,
            Double maxAmount,
            String search
    );

    byte[] exportPdf(
            String startDate,
            String endDate,
            String paymentMethod,
            String paymentStatus,
            Double minAmount,
            Double maxAmount,
            String search
    );

    byte[] getInvoicePdf(Long paymentId);
}