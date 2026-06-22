package com.qrorder.controller;

import com.qrorder.dto.menu.MenuItemResponse.OptionGroupResponse;
import com.qrorder.dto.menu.MenuItemResponse.ItemOptionResponse;
import com.qrorder.dto.menu.request.CreateOptionGroupRequest;
import com.qrorder.entity.MenuItem;
import com.qrorder.entity.OptionGroup;
import com.qrorder.repository.MenuItemRepository;
import com.qrorder.repository.OptionGroupRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping
@RequiredArgsConstructor
@Transactional
public class OptionGroupController {

    private final MenuItemRepository menuItemRepository;
    private final OptionGroupRepository optionGroupRepository;

    @GetMapping("/menu-items/{menuItemId}/option-groups")
    public ResponseEntity<?> getOptionGroups(@PathVariable Long menuItemId) {
        List<OptionGroup> groups = optionGroupRepository.findByMenuItemIdAndDeletedFalseOrderByDisplayOrderAsc(menuItemId);
        List<OptionGroupResponse> responses = groups.stream().map(g -> {
            List<ItemOptionResponse> optionResponses = List.of();
            if (g.getOptions() != null) {
                optionResponses = g.getOptions().stream()
                        .filter(o -> o.getDeleted() != null && !o.getDeleted())
                        .map(o -> ItemOptionResponse.builder()
                                .id(o.getId())
                                .optionCode(o.getOptionCode())
                                .name(o.getName())
                                .price(o.getPrice())
                                .displayOrder(o.getDisplayOrder())
                                .available(o.getAvailable())
                                .build())
                        .collect(Collectors.toList());
            }
            return OptionGroupResponse.builder()
                    .id(g.getId())
                    .name(g.getName())
                    .type(g.getType() != null ? g.getType().name() : null)
                    .selectionType(g.getSelectionType() != null ? g.getSelectionType().name() : null)
                    .required(g.getRequired())
                    .minSelect(g.getMinSelect())
                    .maxSelect(g.getMaxSelect())
                    .displayOrder(g.getDisplayOrder())
                    .available(g.getAvailable())
                    .options(optionResponses)
                    .build();
        }).collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }

    @PostMapping("/menu-items/{menuItemId}/option-groups")
    public ResponseEntity<?> createOptionGroup(
            @PathVariable Long menuItemId,
            @Valid @RequestBody CreateOptionGroupRequest request
    ) {
        MenuItem menuItem = menuItemRepository.findById(menuItemId)
                .orElseThrow(() -> new RuntimeException("Menu item not found"));

        OptionGroup group = OptionGroup.builder()
                .name(request.getName())
                .type(request.getType())
                .selectionType(request.getSelectionType())
                .required(request.getRequired() != null ? request.getRequired() : false)
                .minSelect(request.getMinSelect())
                .maxSelect(request.getMaxSelect())
                .displayOrder(request.getDisplayOrder() != null ? request.getDisplayOrder() : 0)
                .available(request.getAvailable() != null ? request.getAvailable() : true)
                .deleted(false)
                .menuItem(menuItem)
                .build();

        OptionGroup saved = optionGroupRepository.save(group);
        return ResponseEntity.ok(Map.of("message", "Create option group success", "id", saved.getId()));
    }

    @PutMapping("/option-groups/{id}")
    public ResponseEntity<?> updateOptionGroup(
            @PathVariable Long id,
            @Valid @RequestBody CreateOptionGroupRequest request
    ) {
        OptionGroup group = optionGroupRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Option group not found"));

        group.setName(request.getName());
        group.setType(request.getType());
        group.setSelectionType(request.getSelectionType());
        group.setRequired(request.getRequired() != null ? request.getRequired() : false);
        group.setMinSelect(request.getMinSelect());
        group.setMaxSelect(request.getMaxSelect());
        group.setDisplayOrder(request.getDisplayOrder() != null ? request.getDisplayOrder() : 0);
        if (request.getAvailable() != null) {
            group.setAvailable(request.getAvailable());
            if (request.getAvailable()) {
                group.setDeleted(false);
            }
        }

        optionGroupRepository.save(group);
        return ResponseEntity.ok(Map.of("message", "Update option group success"));
    }

    @PatchMapping("/option-groups/{id}/toggle")
    public ResponseEntity<?> toggleOptionGroup(@PathVariable Long id) {
        OptionGroup group = optionGroupRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Option group not found"));

        group.setAvailable(group.getAvailable() == null || !group.getAvailable());
        if (group.getAvailable()) {
            group.setDeleted(false);
        }
        optionGroupRepository.save(group);
        return ResponseEntity.ok(Map.of("message", "Toggle option group success", "available", group.getAvailable()));
    }

    @DeleteMapping("/option-groups/{id}")
    public ResponseEntity<?> deleteOptionGroup(@PathVariable Long id) {
        OptionGroup group = optionGroupRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Option group not found"));

        group.setDeleted(true);
        group.setAvailable(false); // soft deleted is also unavailable
        optionGroupRepository.save(group);
        return ResponseEntity.ok(Map.of("message", "Delete option group success"));
    }
}
