package com.qrorder.service.impl;

import com.qrorder.dto.branch.request.CreateBranchRequest;
import com.qrorder.dto.branch.request.UpdateBranchRequest;
import com.qrorder.dto.branch.response.BranchResponse;

import com.qrorder.entity.Branch;
import com.qrorder.entity.Province;
import com.qrorder.repository.BranchRepository;
import com.qrorder.repository.ProvinceRepository;
import com.qrorder.service.BranchService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BranchServiceImpl
        implements BranchService {

    private final BranchRepository branchRepository;
    private final ProvinceRepository provinceRepository;

    @Override
    public void createBranch(
            CreateBranchRequest request
    ) {

        String name = request.getName().trim();

        if (branchRepository
                .existsByNameIgnoreCase(name)) {

            throw new RuntimeException(
                    "Branch name already exists"
            );
        }

        Province province = null;
        if (request.getProvinceId() != null) {
            province = provinceRepository.findById(request.getProvinceId())
                    .orElseThrow(() -> new RuntimeException("Province not found"));
        }

        Branch branch = Branch.builder()
                .name(name)
                .address(request.getAddress())
                .phone(request.getPhone())
                .province(province)
                .build();

        branchRepository.save(branch);
    }

    @Override
    public void updateBranch(
            Long id,
            UpdateBranchRequest request
    ) {

        Branch branch = branchRepository
                .findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Branch not found"
                        )
                );

        String name = request.getName().trim();

        if (branchRepository
                .existsByNameIgnoreCase(name)
                &&
                !branch.getName()
                        .equalsIgnoreCase(name)) {

            throw new RuntimeException(
                    "Branch name already exists"
            );
        }

        Province province = null;
        if (request.getProvinceId() != null) {
            province = provinceRepository.findById(request.getProvinceId())
                    .orElseThrow(() -> new RuntimeException("Province not found"));
        }

        branch.setName(name);
        branch.setAddress(request.getAddress());
        branch.setPhone(request.getPhone());
        branch.setProvince(province);

        branchRepository.save(branch);
    }

    @Override
    public void deleteBranch(Long id) {

        Branch branch = branchRepository
                .findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Branch not found"
                        )
                );

        branchRepository.delete(branch);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BranchResponse> getBranches() {

        return branchRepository.findAll()
                .stream()
                .map(branch ->
                        BranchResponse.builder()
                                .id(branch.getId())
                                .name(branch.getName())
                                .address(branch.getAddress())
                                .phone(branch.getPhone())
                                .provinceId(branch.getProvince() != null ? branch.getProvince().getId() : null)
                                .provinceName(branch.getProvince() != null ? branch.getProvince().getName() : null)
                                .createdAt(branch.getCreatedAt())
                                .build()
                )
                .toList();
    }
}
