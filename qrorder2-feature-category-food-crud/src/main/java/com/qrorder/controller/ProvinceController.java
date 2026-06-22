package com.qrorder.controller;

import com.qrorder.dto.province.request.CreateProvinceRequest;
import com.qrorder.dto.province.request.UpdateProvinceRequest;
import com.qrorder.dto.province.response.ProvinceResponse;

import com.qrorder.service.ProvinceService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/provinces")
@RequiredArgsConstructor
public class ProvinceController {

    private final ProvinceService provinceService;

    @PostMapping
    public Map<String, String> createProvince(
            @Valid @RequestBody CreateProvinceRequest request
    ) {
        provinceService.createProvince(request);
        return Map.of("message", "Create province success");
    }

    @GetMapping
    public List<ProvinceResponse> getProvinces() {
        return provinceService.getProvinces();
    }

    @PutMapping("/{id}")
    public Map<String, String> updateProvince(
            @PathVariable Long id,
            @Valid @RequestBody UpdateProvinceRequest request
    ) {
        provinceService.updateProvince(id, request);
        return Map.of("message", "Update province success");
    }

    @DeleteMapping("/{id}")
    public Map<String, String> deleteProvince(
            @PathVariable Long id
    ) {
        provinceService.deleteProvince(id);
        return Map.of("message", "Delete province success");
    }
}
