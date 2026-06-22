package com.qrorder.repository;

import com.qrorder.entity.ItemOption;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ItemOptionRepository extends JpaRepository<ItemOption, Long> {
    List<ItemOption> findByOptionGroupIdAndDeletedFalseOrderByDisplayOrderAsc(Long optionGroupId);
    List<ItemOption> findByOptionGroupIdAndAvailableTrueAndDeletedFalseOrderByDisplayOrderAsc(Long optionGroupId);
    List<ItemOption> findByOptionGroupIdOrderByDisplayOrderAsc(Long optionGroupId);
}
