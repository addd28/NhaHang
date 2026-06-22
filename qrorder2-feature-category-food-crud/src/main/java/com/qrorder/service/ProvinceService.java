package com.qrorder.service;

import com.qrorder.dto.province.request.CreateProvinceRequest;
import com.qrorder.dto.province.request.UpdateProvinceRequest;
import com.qrorder.dto.province.response.ProvinceResponse;

import java.util.List;

public interface ProvinceService {

    void createProvince(CreateProvinceRequest request);

    void updateProvince(Long id, UpdateProvinceRequest request);

    void deleteProvince(Long id);

    List<ProvinceResponse> getProvinces();
}
