package com.qrorder.repository;

import com.qrorder.entity.Article;
import com.qrorder.entity.enums.ArticleStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ArticleRepository extends JpaRepository<Article, Long> {
    List<Article> findAllByStatusOrderByCreatedAtDesc(ArticleStatus status);
    List<Article> findAllByOrderByCreatedAtDesc();
}
