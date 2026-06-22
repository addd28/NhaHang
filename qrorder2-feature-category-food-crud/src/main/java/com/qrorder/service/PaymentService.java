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
}