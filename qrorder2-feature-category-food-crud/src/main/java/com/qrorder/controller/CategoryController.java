package com.qrorder.controller;

import com.qrorder.dto.category.request.CreateCategoryRequest;
import com.qrorder.dto.category.request.UpdateCategoryRequest;
import com.qrorder.dto.category.response.CategoryResponse;

import com.qrorder.service.CategoryService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/categories")
@RequiredArgsConstructor

public class CategoryController {

    private final CategoryService
            categoryService;

    @PostMapping
    public Map<String, String> createCategory(

            @Valid
            @RequestBody
            CreateCategoryRequest request
    ) {

        categoryService
                .createCategory(
                        request
                );

        return Map.of(
                "message",
                "Create category success"
        );
    }

    @GetMapping
    public List<CategoryResponse>
    getCategories() {

        return categoryService
                .getCategories();
    }

    @PutMapping("/{id}")
    public Map<String, String> updateCategory(

            @PathVariable
            Long id,

            @Valid
            @RequestBody
            UpdateCategoryRequest request
    ) {

        categoryService
                .updateCategory(
                        id,
                        request
                );

        return Map.of(
                "message",
                "Update category success"
        );
    }

    @DeleteMapping("/{id}")
    public Map<String, String> deleteCategory(

            @PathVariable
            Long id
    ) {

        categoryService
                .deleteCategory(
                        id
                );

        return Map.of(
                "message",
                "Delete category success"
        );
    }
}