package com.qrorder.service;

import com.qrorder.dto.category.request.CreateCategoryRequest;
import com.qrorder.dto.category.request.UpdateCategoryRequest;
import com.qrorder.dto.category.response.CategoryResponse;

import java.util.List;

public interface CategoryService {

    void createCategory(
            CreateCategoryRequest request
    );

    void updateCategory(

            Long id,

            UpdateCategoryRequest request
    );

    void deleteCategory(
            Long id
    );

    List<CategoryResponse>
    getCategories();
}