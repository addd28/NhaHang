package com.qrorder.service;

import com.qrorder.dto.branch.request.CreateBranchRequest;
import com.qrorder.dto.branch.request.UpdateBranchRequest;
import com.qrorder.dto.branch.response.BranchResponse;

import java.util.List;

public interface BranchService {

    void createBranch(
            CreateBranchRequest request
    );

    void updateBranch(
            Long id,
            UpdateBranchRequest request
    );

    void deleteBranch(
            Long id
    );

    List<BranchResponse> getBranches();
}
