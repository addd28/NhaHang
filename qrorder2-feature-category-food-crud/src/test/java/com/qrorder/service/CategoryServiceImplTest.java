package com.qrorder.service;

import com.qrorder.dto.category.request.CreateCategoryRequest;
import com.qrorder.dto.category.request.UpdateCategoryRequest;
import com.qrorder.dto.category.response.CategoryResponse;
import com.qrorder.entity.Category;
import com.qrorder.repository.CategoryRepository;
import com.qrorder.repository.MenuItemRepository;
import com.qrorder.service.impl.CategoryServiceImpl;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("CategoryServiceImpl Tests")
class CategoryServiceImplTest {

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private MenuItemRepository menuItemRepository;

    @InjectMocks
    private CategoryServiceImpl categoryService;

    private Category category;

    @BeforeEach
    void setUp() {
        category = Category.builder()
                .id(1L)
                .name("Đồ uống")
                .description("Các loại nước uống")
                .build();
    }

    // ==================== createCategory ====================

    @Test
    @DisplayName("createCategory - Tạo danh mục thành công")
    void createCategory_success() {
        CreateCategoryRequest request = new CreateCategoryRequest();
        request.setName("Đồ uống");
        request.setDescription("Các loại nước uống");

        when(categoryRepository.existsByNameIgnoreCase("Đồ uống")).thenReturn(false);
        when(categoryRepository.save(any(Category.class))).thenReturn(category);

        assertThatNoException().isThrownBy(() -> categoryService.createCategory(request));

        verify(categoryRepository).existsByNameIgnoreCase("Đồ uống");
        verify(categoryRepository).save(any(Category.class));
    }

    @Test
    @DisplayName("createCategory - Lỗi khi tên danh mục đã tồn tại")
    void createCategory_throwsException_whenNameAlreadyExists() {
        CreateCategoryRequest request = new CreateCategoryRequest();
        request.setName("Đồ uống");
        request.setDescription("Nước uống các loại");

        when(categoryRepository.existsByNameIgnoreCase("Đồ uống")).thenReturn(true);

        assertThatThrownBy(() -> categoryService.createCategory(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Category already exists");

        verify(categoryRepository, never()).save(any());
    }

    @Test
    @DisplayName("createCategory - Tên bị trim trước khi kiểm tra")
    void createCategory_trimsNameBeforeCheck() {
        CreateCategoryRequest request = new CreateCategoryRequest();
        request.setName("  Đồ uống  ");
        request.setDescription("Nước uống");

        when(categoryRepository.existsByNameIgnoreCase("Đồ uống")).thenReturn(false);
        when(categoryRepository.save(any(Category.class))).thenReturn(category);

        assertThatNoException().isThrownBy(() -> categoryService.createCategory(request));

        verify(categoryRepository).existsByNameIgnoreCase("Đồ uống");
    }

    // ==================== updateCategory ====================

    @Test
    @DisplayName("updateCategory - Cập nhật danh mục thành công với tên mới")
    void updateCategory_success_withNewName() {
        UpdateCategoryRequest request = new UpdateCategoryRequest();
        request.setName("Đồ ăn");
        request.setDescription("Các loại đồ ăn");

        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));
        when(categoryRepository.existsByNameIgnoreCase("Đồ ăn")).thenReturn(false);
        when(categoryRepository.save(any(Category.class))).thenReturn(category);

        assertThatNoException().isThrownBy(() -> categoryService.updateCategory(1L, request));

        verify(categoryRepository).save(any(Category.class));
    }

    @Test
    @DisplayName("updateCategory - Cập nhật thành công với cùng tên (không đổi tên)")
    void updateCategory_success_withSameName() {
        UpdateCategoryRequest request = new UpdateCategoryRequest();
        request.setName("Đồ uống"); // Giữ nguyên tên
        request.setDescription("Mô tả mới");

        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));
        when(categoryRepository.existsByNameIgnoreCase("Đồ uống")).thenReturn(true); // Tên trùng nhưng là chính nó
        when(categoryRepository.save(any(Category.class))).thenReturn(category);

        assertThatNoException().isThrownBy(() -> categoryService.updateCategory(1L, request));

        verify(categoryRepository).save(any(Category.class));
    }

    @Test
    @DisplayName("updateCategory - Lỗi khi không tìm thấy danh mục")
    void updateCategory_throwsException_whenCategoryNotFound() {
        UpdateCategoryRequest request = new UpdateCategoryRequest();
        request.setName("Mới");
        request.setDescription("Mô tả");

        when(categoryRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> categoryService.updateCategory(99L, request))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Category not found");

        verify(categoryRepository, never()).save(any());
    }

    @Test
    @DisplayName("updateCategory - Lỗi khi tên mới đã được dùng bởi danh mục khác")
    void updateCategory_throwsException_whenNewNameUsedByOtherCategory() {
        UpdateCategoryRequest request = new UpdateCategoryRequest();
        request.setName("Đồ ăn"); // Tên của danh mục khác
        request.setDescription("Mô tả");

        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));
        when(categoryRepository.existsByNameIgnoreCase("Đồ ăn")).thenReturn(true);

        assertThatThrownBy(() -> categoryService.updateCategory(1L, request))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Category already exists");

        verify(categoryRepository, never()).save(any());
    }

    // ==================== deleteCategory ====================

    @Test
    @DisplayName("deleteCategory - Xóa danh mục thành công")
    void deleteCategory_success() {
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));
        when(menuItemRepository.existsByCategoryId(1L)).thenReturn(false);

        assertThatNoException().isThrownBy(() -> categoryService.deleteCategory(1L));

        verify(categoryRepository).delete(category);
    }

    @Test
    @DisplayName("deleteCategory - Lỗi khi không tìm thấy danh mục")
    void deleteCategory_throwsException_whenCategoryNotFound() {
        when(categoryRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> categoryService.deleteCategory(99L))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Category not found");

        verify(categoryRepository, never()).delete(any());
    }

    @Test
    @DisplayName("deleteCategory - Lỗi khi danh mục còn chứa món ăn")
    void deleteCategory_throwsException_whenCategoryContainsFoods() {
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));
        when(menuItemRepository.existsByCategoryId(1L)).thenReturn(true);

        assertThatThrownBy(() -> categoryService.deleteCategory(1L))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Category contains menu items");

        verify(categoryRepository, never()).delete(any());
    }

    // ==================== getCategories ====================

    @Test
    @DisplayName("getCategories - Trả về danh sách danh mục")
    void getCategories_returnsAllCategories() {
        Category cat2 = Category.builder()
                .id(2L)
                .name("Đồ ăn")
                .description("Đồ ăn mặn")
                .build();

        when(categoryRepository.findAll()).thenReturn(List.of(category, cat2));

        List<CategoryResponse> result = categoryService.getCategories();

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getId()).isEqualTo(1L);
        assertThat(result.get(0).getName()).isEqualTo("Đồ uống");
        assertThat(result.get(1).getId()).isEqualTo(2L);
        assertThat(result.get(1).getName()).isEqualTo("Đồ ăn");
    }

    @Test
    @DisplayName("getCategories - Trả về danh sách rỗng khi không có danh mục")
    void getCategories_returnsEmptyList_whenNoCategories() {
        when(categoryRepository.findAll()).thenReturn(List.of());

        List<CategoryResponse> result = categoryService.getCategories();

        assertThat(result).isEmpty();
    }
}
