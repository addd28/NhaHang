package com.qrorder.service.impl;

import com.qrorder.dto.category.request.CreateCategoryRequest;
import com.qrorder.dto.category.request.UpdateCategoryRequest;
import com.qrorder.dto.category.response.CategoryResponse;

import com.qrorder.entity.Category;

import com.qrorder.repository.CategoryRepository;
import com.qrorder.repository.MenuItemRepository;

import com.qrorder.service.CategoryService;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor

public class CategoryServiceImpl
        implements CategoryService {

    private final CategoryRepository
            categoryRepository;

    private final MenuItemRepository
            menuItemRepository;

    @Override
    public void createCategory(

            CreateCategoryRequest request
    ) {

        String name =

                request.getName()
                        .trim();

        if(categoryRepository
                .existsByNameIgnoreCase(
                        name
                )) {

            throw new RuntimeException(
                    "Category already exists"
            );
        }

        Category category =

                Category.builder()

                        .name(
                                name
                        )

                        .description(
                                request.getDescription()
                        )

                        .build();

        categoryRepository.save(
                category
        );
    }

    @Override
    public void updateCategory(

            Long id,

            UpdateCategoryRequest request
    ) {

        Category category =

                categoryRepository
                        .findById(id)
                        .orElseThrow(() ->

                                new RuntimeException(
                                        "Category not found"
                                )
                        );

        String name =

                request.getName()
                        .trim();

        if(categoryRepository
                .existsByNameIgnoreCase(
                        name
                )

                &&

                !category.getName()
                        .equalsIgnoreCase(
                                name
                        )) {

            throw new RuntimeException(
                    "Category already exists"
            );
        }

        category.setName(
                name
        );

        category.setDescription(
                request.getDescription()
        );

        categoryRepository.save(
                category
        );
    }

    @Override
    public void deleteCategory(
            Long id
    ) {

        Category category =

                categoryRepository
                        .findById(id)
                        .orElseThrow(() ->

                                new RuntimeException(
                                        "Category not found"
                                )
                        );

        if(menuItemRepository
                .existsByCategoryId(
                        id
                )) {

            throw new RuntimeException(
                    "Category contains menu items"
            );
        }

        categoryRepository.delete(
                category
        );
    }

    @Override
    public List<CategoryResponse>
    getCategories() {

        return categoryRepository

                .findAll()

                .stream()

                .map(category ->

                        CategoryResponse
                                .builder()

                                .id(
                                        category.getId()
                                )

                                .name(
                                        category.getName()
                                )

                                .description(
                                        category.getDescription()
                                )

                                .build()
                )

                .toList();
    }
}
