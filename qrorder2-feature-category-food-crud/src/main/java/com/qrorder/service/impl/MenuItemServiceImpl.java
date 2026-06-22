package com.qrorder.service.impl;

import com.qrorder.dto.menu.MenuItemResponse;
import com.qrorder.dto.menu.request.CreateMenuItemRequest;
import com.qrorder.dto.menu.request.UpdateMenuItemRequest;
import com.qrorder.entity.Category;
import com.qrorder.entity.MenuItem;
import com.qrorder.repository.CategoryRepository;
import com.qrorder.repository.MenuItemRepository;
import com.qrorder.service.MenuItemService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MenuItemServiceImpl implements MenuItemService {

    private final MenuItemRepository menuItemRepository;
    private final CategoryRepository categoryRepository;

    @Override
    public void createMenuItem(CreateMenuItemRequest request) {
        String name = request.getName().trim();
        if (menuItemRepository.existsByNameIgnoreCase(name)) {
            throw new RuntimeException("Menu item already exists");
        }

        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new RuntimeException("Category not found"));

        String imageVal = request.getImageUrl() != null ? request.getImageUrl() : request.getImage();

        MenuItem menuItem = MenuItem.builder()
                .name(name)
                .price(request.getPrice())
                .description(request.getDescription())
                .imageUrl(imageVal)
                .type(request.getType())
                .category(category)
                .available(true)
                .build();

        menuItemRepository.save(menuItem);
    }

    @Override
    public List<MenuItemResponse> getMenuItems(boolean isAdmin) {
        List<MenuItem> items;
        if (isAdmin) {
            items = menuItemRepository.findAllWithOptions();
        } else {
            items = menuItemRepository.findByAvailableWithOptions(true);
        }
        return items.stream().map(item -> toResponse(item, isAdmin)).collect(Collectors.toList());
    }

    @Override
    public MenuItemResponse getMenuItemById(Long id, boolean isAdmin) {
        MenuItem menuItem = menuItemRepository.findByIdWithOptions(id)
                .orElseThrow(() -> new RuntimeException("Menu item not found"));

        if (!isAdmin && (menuItem.getAvailable() == null || !menuItem.getAvailable())) {
            throw new RuntimeException("Món ăn không sẵn sàng");
        }

        return toResponse(menuItem, isAdmin);
    }

    @Override
    public void updateMenuItem(Long id, UpdateMenuItemRequest request) {
        MenuItem menuItem = menuItemRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Menu item not found"));

        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new RuntimeException("Category not found"));

        String imageVal = request.getImageUrl() != null ? request.getImageUrl() : request.getImage();

        menuItem.setName(request.getName().trim());
        menuItem.setPrice(request.getPrice());
        menuItem.setDescription(request.getDescription());
        menuItem.setImageUrl(imageVal);
        menuItem.setType(request.getType());
        menuItem.setCategory(category);

        menuItemRepository.save(menuItem);
    }

    @Override
    public void deleteMenuItem(Long id) {
        MenuItem menuItem = menuItemRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Menu item not found"));
        menuItem.setAvailable(false);
        menuItemRepository.save(menuItem);
    }

    private MenuItemResponse toResponse(MenuItem item, boolean isAdmin) {
        List<MenuItemResponse.OptionGroupResponse> groupResponses = List.of();
        if (item.getOptionGroups() != null) {
            groupResponses = item.getOptionGroups().stream()
                    .filter(g -> isAdmin || ((g.getDeleted() == null || !g.getDeleted()) && (g.getAvailable() == null || g.getAvailable())))
                    .map(g -> {
                        List<MenuItemResponse.ItemOptionResponse> optionResponses = List.of();
                        if (g.getOptions() != null) {
                            optionResponses = g.getOptions().stream()
                                    .filter(o -> isAdmin || ((o.getDeleted() == null || !o.getDeleted()) && (o.getAvailable() == null || o.getAvailable())))
                                    .map(o -> MenuItemResponse.ItemOptionResponse.builder()
                                            .id(o.getId())
                                            .optionCode(o.getOptionCode())
                                            .name(o.getName())
                                            .price(o.getPrice())
                                            .displayOrder(o.getDisplayOrder())
                                            .available(o.getAvailable())
                                            .deleted(o.getDeleted() != null ? o.getDeleted() : false)
                                            .build())
                                    .collect(Collectors.toList());
                        }
                        return MenuItemResponse.OptionGroupResponse.builder()
                                .id(g.getId())
                                .name(g.getName())
                                .type(g.getType() != null ? g.getType().name() : null)
                                .selectionType(g.getSelectionType() != null ? g.getSelectionType().name() : null)
                                .required(g.getRequired())
                                .minSelect(g.getMinSelect())
                                .maxSelect(g.getMaxSelect())
                                .displayOrder(g.getDisplayOrder())
                                .available(g.getAvailable())
                                .deleted(g.getDeleted() != null ? g.getDeleted() : false)
                                .options(optionResponses)
                                .build();
                    })
                    .collect(Collectors.toList());
        }

        return MenuItemResponse.builder()
                .id(item.getId())
                .name(item.getName())
                .price(item.getPrice())
                .description(item.getDescription())
                .imageUrl(item.getImageUrl())
                .image(item.getImageUrl()) // compatibility
                .type(item.getType() != null ? item.getType().name() : null)
                .available(item.getAvailable())
                .categoryId(item.getCategory() != null ? item.getCategory().getId() : null)
                .categoryName(item.getCategory() != null ? item.getCategory().getName() : null)
                .optionGroups(groupResponses)
                .build();
    }
}
