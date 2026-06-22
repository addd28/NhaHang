package com.qrorder.service;

import com.qrorder.dto.menu.MenuItemResponse;
import com.qrorder.dto.menu.request.CreateMenuItemRequest;
import com.qrorder.dto.menu.request.UpdateMenuItemRequest;
import com.qrorder.entity.Category;
import com.qrorder.entity.MenuItem;
import com.qrorder.entity.enums.MenuItemType;
import com.qrorder.repository.CategoryRepository;
import com.qrorder.repository.MenuItemRepository;
import com.qrorder.service.impl.MenuItemServiceImpl;

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
@DisplayName("MenuItemServiceImpl Tests")
class MenuItemServiceImplTest {

    @Mock
    private MenuItemRepository menuItemRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @InjectMocks
    private MenuItemServiceImpl menuItemService;

    private Category category;
    private MenuItem menuItem;

    @BeforeEach
    void setUp() {
        category = Category.builder()
                .id(1L)
                .name("Đồ uống")
                .description("Các loại nước uống")
                .build();

        menuItem = MenuItem.builder()
                .id(1L)
                .name("Cà phê sữa")
                .type(MenuItemType.INSTANT)
                .price(25000.0)
                .description("Cà phê sữa đá")
                .imageUrl("cafe.jpg")
                .available(true)
                .category(category)
                .build();
    }

    // ==================== createMenuItem ====================

    @Test
    @DisplayName("createMenuItem - Tạo món ăn thành công")
    void createMenuItem_success() {
        CreateMenuItemRequest request = new CreateMenuItemRequest();
        request.setName("Cà phê sữa");
        request.setPrice(25000.0);
        request.setCategoryId(1L);
        request.setType(MenuItemType.INSTANT);
        request.setDescription("Cà phê sữa đá");
        request.setImageUrl("cafe.jpg");

        when(menuItemRepository.existsByNameIgnoreCase("Cà phê sữa")).thenReturn(false);
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));
        when(menuItemRepository.save(any(MenuItem.class))).thenReturn(menuItem);

        assertThatNoException().isThrownBy(() -> menuItemService.createMenuItem(request));

        verify(menuItemRepository).existsByNameIgnoreCase("Cà phê sữa");
        verify(categoryRepository).findById(1L);
        verify(menuItemRepository).save(any(MenuItem.class));
    }

    @Test
    @DisplayName("createMenuItem - Lỗi khi tên món đã tồn tại")
    void createMenuItem_throwsException_whenNameAlreadyExists() {
        CreateMenuItemRequest request = new CreateMenuItemRequest();
        request.setName("Cà phê sữa");
        request.setPrice(25000.0);
        request.setCategoryId(1L);
        request.setType(MenuItemType.INSTANT);

        when(menuItemRepository.existsByNameIgnoreCase("Cà phê sữa")).thenReturn(true);

        assertThatThrownBy(() -> menuItemService.createMenuItem(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Menu item already exists");

        verify(menuItemRepository, never()).save(any());
        verify(categoryRepository, never()).findById(any());
    }

    @Test
    @DisplayName("createMenuItem - Lỗi khi category không tồn tại")
    void createMenuItem_throwsException_whenCategoryNotFound() {
        CreateMenuItemRequest request = new CreateMenuItemRequest();
        request.setName("Món mới");
        request.setPrice(30000.0);
        request.setCategoryId(99L);
        request.setType(MenuItemType.KITCHEN);

        when(menuItemRepository.existsByNameIgnoreCase("Món mới")).thenReturn(false);
        when(categoryRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> menuItemService.createMenuItem(request))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Category not found");

        verify(menuItemRepository, never()).save(any());
    }

    // ==================== getMenuItems ====================

    @Test
    @DisplayName("getMenuItems - Trả về danh sách món ăn available")
    void getMenuItems_returnsAvailableItems() {
        when(menuItemRepository.findByAvailableWithOptions(true)).thenReturn(List.of(menuItem));

        List<MenuItemResponse> result = menuItemService.getMenuItems(false);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo(1L);
        assertThat(result.get(0).getName()).isEqualTo("Cà phê sữa");
        assertThat(result.get(0).getPrice()).isEqualTo(25000.0);
        assertThat(result.get(0).getCategoryName()).isEqualTo("Đồ uống");
        assertThat(result.get(0).getAvailable()).isTrue();
    }

    @Test
    @DisplayName("getMenuItems - Trả về danh sách rỗng khi không có món nào")
    void getMenuItems_returnsEmptyList_whenNoItemsAvailable() {
        when(menuItemRepository.findByAvailableWithOptions(true)).thenReturn(List.of());

        List<MenuItemResponse> result = menuItemService.getMenuItems(false);

        assertThat(result).isEmpty();
    }

    // ==================== getMenuItemById ====================

    @Test
    @DisplayName("getMenuItemById - Tìm món ăn theo id thành công")
    void getMenuItemById_success() {
        when(menuItemRepository.findByIdWithOptions(1L)).thenReturn(Optional.of(menuItem));

        MenuItemResponse result = menuItemService.getMenuItemById(1L, false);

        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getName()).isEqualTo("Cà phê sữa");
        assertThat(result.getCategoryId()).isEqualTo(1L);
        assertThat(result.getCategoryName()).isEqualTo("Đồ uống");
    }

    @Test
    @DisplayName("getMenuItemById - Lỗi khi không tìm thấy món")
    void getMenuItemById_throwsException_whenNotFound() {
        when(menuItemRepository.findByIdWithOptions(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> menuItemService.getMenuItemById(99L, false))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Menu item not found");
    }

    // ==================== updateMenuItem ====================

    @Test
    @DisplayName("updateMenuItem - Cập nhật món ăn thành công")
    void updateMenuItem_success() {
        UpdateMenuItemRequest request = new UpdateMenuItemRequest();
        request.setName("Cà phê đen");
        request.setPrice(20000.0);
        request.setDescription("Cà phê đen đá");
        request.setCategoryId(1L);
        request.setType(MenuItemType.INSTANT);
        request.setImageUrl("cafe_den.jpg");

        when(menuItemRepository.findById(1L)).thenReturn(Optional.of(menuItem));
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));
        when(menuItemRepository.save(any(MenuItem.class))).thenReturn(menuItem);

        assertThatNoException().isThrownBy(() -> menuItemService.updateMenuItem(1L, request));

        verify(menuItemRepository).save(any(MenuItem.class));
    }

    @Test
    @DisplayName("updateMenuItem - Lỗi khi không tìm thấy món")
    void updateMenuItem_throwsException_whenNotFound() {
        UpdateMenuItemRequest request = new UpdateMenuItemRequest();
        request.setName("Món mới");
        request.setPrice(30000.0);
        request.setCategoryId(1L);
        request.setType(MenuItemType.KITCHEN);

        when(menuItemRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> menuItemService.updateMenuItem(99L, request))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Menu item not found");

        verify(menuItemRepository, never()).save(any());
    }

    @Test
    @DisplayName("updateMenuItem - Lỗi khi category không tồn tại")
    void updateMenuItem_throwsException_whenCategoryNotFound() {
        UpdateMenuItemRequest request = new UpdateMenuItemRequest();
        request.setName("Cà phê đen");
        request.setPrice(20000.0);
        request.setCategoryId(99L);
        request.setType(MenuItemType.INSTANT);

        when(menuItemRepository.findById(1L)).thenReturn(Optional.of(menuItem));
        when(categoryRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> menuItemService.updateMenuItem(1L, request))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Category not found");

        verify(menuItemRepository, never()).save(any());
    }

    // ==================== deleteMenuItem ====================

    @Test
    @DisplayName("deleteMenuItem - Xóa mềm món ăn (set available = false)")
    void deleteMenuItem_setsAvailableToFalse() {
        when(menuItemRepository.findById(1L)).thenReturn(Optional.of(menuItem));
        when(menuItemRepository.save(any(MenuItem.class))).thenReturn(menuItem);

        menuItemService.deleteMenuItem(1L);

        assertThat(menuItem.getAvailable()).isFalse();
        verify(menuItemRepository).save(menuItem);
    }

    @Test
    @DisplayName("deleteMenuItem - Lỗi khi không tìm thấy món")
    void deleteMenuItem_throwsException_whenNotFound() {
        when(menuItemRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> menuItemService.deleteMenuItem(99L))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Menu item not found");

        verify(menuItemRepository, never()).save(any());
    }
}
