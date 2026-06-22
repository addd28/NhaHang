package com.qrorder.controller;

import com.qrorder.dto.branch.request.CreateBranchRequest;
import com.qrorder.dto.branch.request.UpdateBranchRequest;
import com.qrorder.dto.branch.response.BranchResponse;

import com.qrorder.service.BranchService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/branches")
@RequiredArgsConstructor
public class BranchController {

    private final BranchService branchService;

    @PostMapping
    public Map<String, String> createBranch(
            @Valid
            @RequestBody
            CreateBranchRequest request
    ) {
        branchService.createBranch(request);

        return Map.of(
                "message",
                "Create branch success"
        );
    }

    @GetMapping
    public List<BranchResponse> getBranches() {
        return branchService.getBranches();
    }

    @PutMapping("/{id}")
    public Map<String, String> updateBranch(
            @PathVariable Long id,
            @Valid
            @RequestBody
            UpdateBranchRequest request
    ) {
        branchService.updateBranch(id, request);

        return Map.of(
                "message",
                "Update branch success"
        );
    }

    @DeleteMapping("/{id}")
    public Map<String, String> deleteBranch(
            @PathVariable Long id
    ) {
        branchService.deleteBranch(id);

        return Map.of(
                "message",
                "Delete branch success"
        );
    }
}
