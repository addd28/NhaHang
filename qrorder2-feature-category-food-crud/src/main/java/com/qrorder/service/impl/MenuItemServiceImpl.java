package com.qrorder.service.impl;

import com.qrorder.dto.menu.MenuItemResponse;
import com.qrorder.dto.menu.request.CreateMenuItemRequest;
import com.qrorder.dto.menu.request.UpdateMenuItemRequest;
import com.qrorder.entity.Category;
import com.qrorder.entity.MenuItem;
import com.qrorder.exception.BusinessException;
import com.qrorder.repository.CategoryRepository;
import com.qrorder.repository.MenuItemRepository;
import com.qrorder.service.MenuItemService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MenuItemServiceImpl implements MenuItemService {

    private final MenuItemRepository menuItemRepository;
    private final CategoryRepository categoryRepository;

    @Override
    @Transactional
    public void createMenuItem(CreateMenuItemRequest request) {
        String name = request.getName().trim();
        if (menuItemRepository.existsByNameIgnoreCase(name)) {
            throw new BusinessException("DUPLICATE_NAME", "Tên món ăn đã tồn tại, vui lòng chọn tên khác.", HttpStatus.CONFLICT);
        }

        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new BusinessException("CATEGORY_NOT_FOUND", "Danh mục không tồn tại", HttpStatus.NOT_FOUND));

        if (request.getPrice() == null || request.getPrice() <= 0) {
            throw new BusinessException("INVALID_PRICE", "Giá món ăn không hợp lệ", HttpStatus.BAD_REQUEST);
        }

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
    @Transactional(readOnly = true)
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
    @Transactional(readOnly = true)
    public MenuItemResponse getMenuItemById(Long id, boolean isAdmin) {
        MenuItem menuItem = menuItemRepository.findByIdWithOptions(id)
                .orElseThrow(() -> new BusinessException("MENU_ITEM_NOT_FOUND", "Món ăn không tồn tại", HttpStatus.NOT_FOUND));

        if (!isAdmin && (menuItem.getAvailable() == null || !menuItem.getAvailable())) {
            throw new BusinessException("MENU_ITEM_NOT_READY", "Món ăn không sẵn sàng", HttpStatus.BAD_REQUEST);
        }

        return toResponse(menuItem, isAdmin);
    }

    @Override
    @Transactional
    public void updateMenuItem(Long id, UpdateMenuItemRequest request) {
        log.info("Update Menu Request: {}", request);
        MenuItem menuItem = menuItemRepository.findById(id)
                .orElseThrow(() -> new BusinessException("MENU_ITEM_NOT_FOUND", "Món ăn không tồn tại", HttpStatus.NOT_FOUND));

        // Check name uniqueness excluding self
        String newName = request.getName().trim();
        if (!newName.equalsIgnoreCase(menuItem.getName()) &&
                menuItemRepository.existsByNameIgnoreCaseAndIdNot(newName, id)) {
            throw new BusinessException("DUPLICATE_NAME", "Tên món ăn đã tồn tại, vui lòng chọn tên khác.", HttpStatus.CONFLICT);
        }

        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new BusinessException("CATEGORY_NOT_FOUND", "Danh mục không tồn tại", HttpStatus.NOT_FOUND));

        if (request.getPrice() == null || request.getPrice() <= 0) {
            throw new BusinessException("INVALID_PRICE", "Giá món ăn không hợp lệ", HttpStatus.BAD_REQUEST);
        }

        // Keep existing image if no new image provided
        String imageVal = request.getImageUrl() != null ? request.getImageUrl()
                : request.getImage() != null ? request.getImage()
                : menuItem.getImageUrl();

        menuItem.setName(newName);
        menuItem.setPrice(request.getPrice());
        menuItem.setDescription(request.getDescription());
        menuItem.setImageUrl(imageVal);
        menuItem.setType(request.getType());
        menuItem.setCategory(category);
        if (request.getAvailable() != null) {
            menuItem.setAvailable(request.getAvailable());
        }

        log.info("Entity Before Save - ID: {}, Name: {}, Price: {}, Description: {}, ImageUrl: {}, Type: {}, CategoryId: {}, Available: {}",
                menuItem.getId(), menuItem.getName(), menuItem.getPrice(), menuItem.getDescription(), menuItem.getImageUrl(), menuItem.getType(),
                menuItem.getCategory() != null ? menuItem.getCategory().getId() : null, menuItem.getAvailable());

        menuItemRepository.save(menuItem);
    }

    @Override
    @Transactional
    public void deleteMenuItem(Long id) {
        MenuItem menuItem = menuItemRepository.findById(id)
                .orElseThrow(() -> new BusinessException("MENU_ITEM_NOT_FOUND", "Món ăn không tồn tại", HttpStatus.NOT_FOUND));
        menuItem.setAvailable(false);
        menuItemRepository.save(menuItem);
    }

    @Override
    @Transactional
    public void toggleAvailable(Long id, boolean available) {
        MenuItem menuItem = menuItemRepository.findById(id)
                .orElseThrow(() -> new BusinessException("MENU_ITEM_NOT_FOUND", "Món ăn không tồn tại", HttpStatus.NOT_FOUND));
        menuItem.setAvailable(available);
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
