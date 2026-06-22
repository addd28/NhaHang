package com.qrorder.service.impl;

import com.qrorder.dto.article.request.CreateArticleRequest;
import com.qrorder.dto.article.request.UpdateArticleRequest;
import com.qrorder.dto.article.response.ArticleResponse;
import com.qrorder.entity.Article;
import com.qrorder.entity.enums.ArticleStatus;
import com.qrorder.repository.ArticleRepository;
import com.qrorder.service.ArticleService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ArticleServiceImpl implements ArticleService {

    private final ArticleRepository articleRepository;

    @Override
    public List<ArticleResponse> getAllArticles(String status) {
        List<Article> articles;
        if (status != null && !status.isEmpty()) {
            try {
                ArticleStatus articleStatus = ArticleStatus.valueOf(status.toUpperCase());
                articles = articleRepository.findAllByStatusOrderByCreatedAtDesc(articleStatus);
            } catch (IllegalArgumentException e) {
                articles = articleRepository.findAllByOrderByCreatedAtDesc();
            }
        } else {
            articles = articleRepository.findAllByOrderByCreatedAtDesc();
        }
        return articles.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Override
    public ArticleResponse getArticleById(Long id) {
        Article article = articleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Article not found"));
        return mapToResponse(article);
    }

    @Override
    public void createArticle(CreateArticleRequest request) {
        Article article = Article.builder()
                .title(request.getTitle())
                .summary(request.getSummary())
                .content(request.getContent())
                .coverImage(request.getCoverImage())
                .author(request.getAuthor())
                .status(request.getStatus())
                .build();
        articleRepository.save(article);
    }

    @Override
    public void updateArticle(Long id, UpdateArticleRequest request) {
        Article article = articleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Article not found"));

        article.setTitle(request.getTitle());
        article.setSummary(request.getSummary());
        article.setContent(request.getContent());
        article.setCoverImage(request.getCoverImage());
        article.setAuthor(request.getAuthor());
        article.setStatus(request.getStatus());

        articleRepository.save(article);
    }

    @Override
    public void deleteArticle(Long id) {
        Article article = articleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Article not found"));
        articleRepository.delete(article);
    }

    private ArticleResponse mapToResponse(Article article) {
        return ArticleResponse.builder()
                .id(article.getId())
                .title(article.getTitle())
                .summary(article.getSummary())
                .content(article.getContent())
                .coverImage(article.getCoverImage())
                .author(article.getAuthor())
                .status(article.getStatus())
                .createdAt(article.getCreatedAt())
                .updatedAt(article.getUpdatedAt())
                .build();
    }
}
