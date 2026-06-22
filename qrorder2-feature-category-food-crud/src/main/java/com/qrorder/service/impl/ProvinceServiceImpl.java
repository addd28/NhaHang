package com.qrorder.service.impl;

import com.qrorder.dto.province.request.CreateProvinceRequest;
import com.qrorder.dto.province.request.UpdateProvinceRequest;
import com.qrorder.dto.province.response.ProvinceResponse;

import com.qrorder.entity.Province;

import com.qrorder.repository.BranchRepository;
import com.qrorder.repository.ProvinceRepository;

import com.qrorder.service.ProvinceService;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProvinceServiceImpl
        implements ProvinceService {

    private final ProvinceRepository provinceRepository;
    private final BranchRepository branchRepository;

    @Override
    public void createProvince(CreateProvinceRequest request) {
        String name = request.getName().trim();

        if (provinceRepository.existsByNameIgnoreCase(name)) {
            throw new RuntimeException("Province name already exists");
        }

        Province province = Province.builder()
                .name(name)
                .build();

        provinceRepository.save(province);
    }

    @Override
    public void updateProvince(Long id, UpdateProvinceRequest request) {
        Province province = provinceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Province not found"));

        String name = request.getName().trim();

        if (provinceRepository.existsByNameIgnoreCase(name)
                && !province.getName().equalsIgnoreCase(name)) {
            throw new RuntimeException("Province name already exists");
        }

        province.setName(name);
        provinceRepository.save(province);
    }

    @Override
    public void deleteProvince(Long id) {
        Province province = provinceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Province not found"));

        if (branchRepository.existsByProvinceId(id)) {
            throw new RuntimeException(
                    "Cannot delete province that still has branches"
            );
        }

        provinceRepository.delete(province);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProvinceResponse> getProvinces() {
        return provinceRepository.findAll()
                .stream()
                .map(province -> ProvinceResponse.builder()
                        .id(province.getId())
                        .name(province.getName())
                        .createdAt(province.getCreatedAt())
                        .branchCount(
                                (int) branchRepository.countByProvinceId(province.getId())
                        )
                        .build()
                )
                .toList();
    }
}
