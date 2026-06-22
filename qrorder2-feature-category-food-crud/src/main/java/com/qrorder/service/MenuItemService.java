package com.qrorder.service;

import com.qrorder.dto.menu.MenuItemResponse;
import com.qrorder.dto.menu.request.CreateMenuItemRequest;
import com.qrorder.dto.menu.request.UpdateMenuItemRequest;
import java.util.List;

public interface MenuItemService {

    void createMenuItem(CreateMenuItemRequest request);

    List<MenuItemResponse> getMenuItems(boolean isAdmin);

    MenuItemResponse getMenuItemById(Long id, boolean isAdmin);

    void updateMenuItem(Long id, UpdateMenuItemRequest request);

    void deleteMenuItem(Long id);
}
