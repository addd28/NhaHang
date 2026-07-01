package com.qrorder.service;

import com.qrorder.dto.payment.PaymentRequestResponse;
import com.qrorder.entity.enums.PaymentMethod;

import java.util.List;

public interface PaymentRequestService {

    /**
     * Khách gửi yêu cầu thanh toán.
     *
     * @param sessionId    ID phiên bàn
     * @param method       Hình thức thanh toán
     * @param alreadyPaid  true khi PayPal đã thanh toán thành công trước đó
     */
    PaymentRequestResponse createRequest(Long sessionId, PaymentMethod method, boolean alreadyPaid);

    List<PaymentRequestResponse> getPendingRequests();

    /**
     * Cashier xác nhận đã nhận tiền → tạo Payment, đóng session, giải phóng bàn.
     */
    PaymentRequestResponse confirmRequest(Long requestId, Long cashierUserId);

    /**
     * Kiểm tra xem session đã có PENDING request chưa.
     */
    boolean hasPendingRequest(Long sessionId);

    PaymentRequestResponse cancelRequest(Long requestId, Long cashierUserId);

    java.util.Optional<PaymentRequestResponse> getActiveRequest(Long sessionId);

    PaymentRequestResponse getRequest(Long id);
}
