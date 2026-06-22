package com.qrorder.controller;

import com.qrorder.dto.article.request.CreateArticleRequest;
import com.qrorder.dto.article.request.UpdateArticleRequest;
import com.qrorder.dto.article.response.ArticleResponse;
import com.qrorder.service.ArticleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/articles")
@RequiredArgsConstructor
public class ArticleController {

    private final ArticleService articleService;

    @GetMapping
    public List<ArticleResponse> getAllArticles(
            @RequestParam(required = false) String status
    ) {
        return articleService.getAllArticles(status);
    }

    @GetMapping("/{id}")
    public ArticleResponse getArticleById(@PathVariable Long id) {
        return articleService.getArticleById(id);
    }

    @PostMapping
    public Map<String, String> createArticle(
            @Valid @RequestBody CreateArticleRequest request
    ) {
        articleService.createArticle(request);
        return Map.of("message", "Create article success");
    }

    @PutMapping("/{id}")
    public Map<String, String> updateArticle(
            @PathVariable Long id,
            @Valid @RequestBody UpdateArticleRequest request
    ) {
        articleService.updateArticle(id, request);
        return Map.of("message", "Update article success");
    }

    @DeleteMapping("/{id}")
    public Map<String, String> deleteArticle(@PathVariable Long id) {
        articleService.deleteArticle(id);
        return Map.of("message", "Delete article success");
    }
}
