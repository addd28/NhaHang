package com.qrorder.dto.article.request;

import com.qrorder.entity.enums.ArticleStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateArticleRequest {

    @NotBlank(message = "Title is required")
    private String title;

    private String summary;

    @NotBlank(message = "Content is required")
    private String content;

    private String coverImage;

    private String author;

    @NotNull(message = "Status is required")
    private ArticleStatus status;
}
