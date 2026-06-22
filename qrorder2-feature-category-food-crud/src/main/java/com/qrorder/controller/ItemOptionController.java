package com.qrorder.controller;

import com.qrorder.dto.menu.MenuItemResponse.ItemOptionResponse;
import com.qrorder.dto.menu.request.CreateItemOptionRequest;
import com.qrorder.entity.ItemOption;
import com.qrorder.entity.OptionGroup;
import com.qrorder.repository.ItemOptionRepository;
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
public class ItemOptionController {

    private final OptionGroupRepository optionGroupRepository;
    private final ItemOptionRepository itemOptionRepository;

    @GetMapping("/option-groups/{optionGroupId}/options")
    public ResponseEntity<?> getOptions(@PathVariable Long optionGroupId) {
        List<ItemOption> options = itemOptionRepository.findByOptionGroupIdAndDeletedFalseOrderByDisplayOrderAsc(optionGroupId);
        List<ItemOptionResponse> responses = options.stream().map(o -> ItemOptionResponse.builder()
                .id(o.getId())
                .optionCode(o.getOptionCode())
                .name(o.getName())
                .price(o.getPrice())
                .displayOrder(o.getDisplayOrder())
                .available(o.getAvailable())
                .build()).collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }

    @PostMapping("/option-groups/{optionGroupId}/options")
    public ResponseEntity<?> createOption(
            @PathVariable Long optionGroupId,
            @Valid @RequestBody CreateItemOptionRequest request
    ) {
        OptionGroup group = optionGroupRepository.findById(optionGroupId)
                .orElseThrow(() -> new RuntimeException("Option group not found"));

        // Check unique optionCode per option group
        List<ItemOption> existing = itemOptionRepository.findByOptionGroupIdAndDeletedFalseOrderByDisplayOrderAsc(optionGroupId);
        boolean duplicate = existing.stream().anyMatch(o -> o.getOptionCode().equalsIgnoreCase(request.getOptionCode().trim()));
        if (duplicate) {
            throw new RuntimeException("Mã tùy chọn đã tồn tại trong nhóm này!");
        }

        ItemOption option = ItemOption.builder()
                .optionGroup(group)
                .optionCode(request.getOptionCode().trim())
                .name(request.getName().trim())
                .price(request.getPrice())
                .displayOrder(request.getDisplayOrder() != null ? request.getDisplayOrder() : 0)
                .available(request.getAvailable() != null ? request.getAvailable() : true)
                .deleted(false)
                .build();

        ItemOption saved = itemOptionRepository.save(option);
        return ResponseEntity.ok(Map.of("message", "Create item option success", "id", saved.getId()));
    }

    @PutMapping("/item-options/{id}")
    public ResponseEntity<?> updateOption(
            @PathVariable Long id,
            @Valid @RequestBody CreateItemOptionRequest request
    ) {
        ItemOption option = itemOptionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Option not found"));

        // Check unique optionCode if changed
        if (!option.getOptionCode().equalsIgnoreCase(request.getOptionCode().trim())) {
            List<ItemOption> existing = itemOptionRepository.findByOptionGroupIdAndDeletedFalseOrderByDisplayOrderAsc(option.getOptionGroup().getId());
            boolean duplicate = existing.stream().anyMatch(o -> o.getOptionCode().equalsIgnoreCase(request.getOptionCode().trim()));
            if (duplicate) {
                throw new RuntimeException("Mã tùy chọn đã tồn tại trong nhóm này!");
            }
        }

        option.setOptionCode(request.getOptionCode().trim());
        option.setName(request.getName().trim());
        option.setPrice(request.getPrice());
        option.setDisplayOrder(request.getDisplayOrder() != null ? request.getDisplayOrder() : 0);
        if (request.getAvailable() != null) {
            option.setAvailable(request.getAvailable());
            if (request.getAvailable()) {
                option.setDeleted(false);
            }
        }

        itemOptionRepository.save(option);
        return ResponseEntity.ok(Map.of("message", "Update item option success"));
    }

    @PatchMapping("/item-options/{id}/toggle")
    public ResponseEntity<?> toggleOption(@PathVariable Long id) {
        ItemOption option = itemOptionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Option not found"));

        option.setAvailable(option.getAvailable() == null || !option.getAvailable());
        if (option.getAvailable()) {
            option.setDeleted(false);
        }
        itemOptionRepository.save(option);
        return ResponseEntity.ok(Map.of("message", "Toggle item option success", "available", option.getAvailable()));
    }

    @DeleteMapping("/item-options/{id}")
    public ResponseEntity<?> deleteOption(@PathVariable Long id) {
        ItemOption option = itemOptionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Option not found"));

        option.setDeleted(true);
        option.setAvailable(false); // soft deleted is also unavailable
        itemOptionRepository.save(option);
        return ResponseEntity.ok(Map.of("message", "Delete item option success"));
    }
}
