package com.qrorder.controller;

import com.qrorder.entity.Review;
import com.qrorder.entity.TableSession;
import com.qrorder.repository.ReviewRepository;
import com.qrorder.repository.TableSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewRepository reviewRepository;
    private final TableSessionRepository tableSessionRepository;

    @GetMapping
    public List<Review> getAllReviews() {
        return reviewRepository.findAllByOrderByCreatedAtDesc();
    }

    @PostMapping
    public ResponseEntity<?> createReview(@RequestBody Review review) {
        if (review.getRating() == null || review.getRating() < 1 || review.getRating() > 5) {
            return ResponseEntity.badRequest().body(Map.of("message", "Rating must be between 1 and 5 stars"));
        }

        // If sessionId is provided, try to find customer name from the table session
        if (review.getSessionId() != null) {
            Optional<TableSession> sessionOpt = tableSessionRepository.findById(review.getSessionId());
            if (sessionOpt.isPresent()) {
                TableSession session = sessionOpt.get();
                if (review.getCustomerName() == null || review.getCustomerName().trim().isEmpty()) {
                    if (session.getCustomerName() != null && !session.getCustomerName().trim().isEmpty()) {
                        review.setCustomerName(session.getCustomerName());
                    } else {
                        review.setCustomerName("Bàn " + session.getTable().getTableNumber());
                    }
                }
            }
        }

        if (review.getCustomerName() == null || review.getCustomerName().trim().isEmpty()) {
            review.setCustomerName("Khách hàng");
        }

        if (review.getCreatedAt() == null) {
            review.setCreatedAt(LocalDateTime.now());
        }

        Review savedReview = reviewRepository.save(review);
        return ResponseEntity.ok(Map.of(
                "message", "Review submitted successfully",
                "id", savedReview.getId()
        ));
    }
}
