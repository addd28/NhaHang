package com.qrorder.dto.article.response;

import com.qrorder.entity.enums.ArticleStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ArticleResponse {
    private Long id;
    private String title;
    private String summary;
    private String content;
    private String coverImage;
    private String author;
    private ArticleStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
