package com.qrorder.controller;

import com.qrorder.dto.menu.request.CreateMenuItemRequest;
import com.qrorder.dto.menu.request.UpdateMenuItemRequest;
import com.qrorder.dto.menu.MenuItemResponse;
import com.qrorder.service.MenuItemService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping
@RequiredArgsConstructor
public class MenuItemController {

    private final MenuItemService menuItemService;

    // Admin endpoints
    @GetMapping("/admin/menu-items")
    public List<MenuItemResponse> getAdminMenuItems() {
        return menuItemService.getMenuItems(true);
    }

    @GetMapping("/admin/menu-items/{id}")
    public MenuItemResponse getAdminMenuItemById(@PathVariable Long id) {
        return menuItemService.getMenuItemById(id, true);
    }

    // Customer endpoints
    @GetMapping("/customer/menu-items")
    public List<MenuItemResponse> getCustomerMenuItems() {
        return menuItemService.getMenuItems(false);
    }

    @GetMapping("/customer/menu-items/{id}")
    public MenuItemResponse getCustomerMenuItemById(@PathVariable Long id) {
        return menuItemService.getMenuItemById(id, false);
    }

    // Backward compatibility endpoints
    @GetMapping("/menu-items")
    public List<MenuItemResponse> getMenuItems() {
        return menuItemService.getMenuItems(false);
    }

    @GetMapping("/menu-items/{id}")
    public MenuItemResponse getMenuItemById(@PathVariable Long id) {
        return menuItemService.getMenuItemById(id, false);
    }

    // Modify operations (Admin only)
    @PostMapping("/menu-items")
    public Map<String, String> createMenuItem(
            @Valid @RequestBody CreateMenuItemRequest request
    ) {
        menuItemService.createMenuItem(request);
        return Map.of("message", "Create menu item success");
    }

    @PutMapping("/menu-items/{id}")
    public Map<String, String> updateMenuItem(
            @PathVariable Long id,
            @Valid @RequestBody UpdateMenuItemRequest request
    ) {
        menuItemService.updateMenuItem(id, request);
        return Map.of("message", "Update menu item success");
    }

    @DeleteMapping("/menu-items/{id}")
    public Map<String, String> deleteMenuItem(@PathVariable Long id) {
        menuItemService.deleteMenuItem(id);
        return Map.of("message", "Delete menu item success");
    }
}
