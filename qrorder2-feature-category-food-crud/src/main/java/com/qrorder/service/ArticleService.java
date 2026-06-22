package com.qrorder.service;

import com.qrorder.dto.article.request.CreateArticleRequest;
import com.qrorder.dto.article.request.UpdateArticleRequest;
import com.qrorder.dto.article.response.ArticleResponse;

import java.util.List;

public interface ArticleService {
    List<ArticleResponse> getAllArticles(String status);
    ArticleResponse getArticleById(Long id);
    void createArticle(CreateArticleRequest request);
    void updateArticle(Long id, UpdateArticleRequest request);
    void deleteArticle(Long id);
}
