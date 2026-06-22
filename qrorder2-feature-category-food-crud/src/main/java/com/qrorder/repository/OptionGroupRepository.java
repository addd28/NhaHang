package com.qrorder.repository;

import com.qrorder.entity.OptionGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface OptionGroupRepository extends JpaRepository<OptionGroup, Long> {
    List<OptionGroup> findByMenuItemIdAndDeletedFalseOrderByDisplayOrderAsc(Long menuItemId);
    List<OptionGroup> findByMenuItemIdAndAvailableTrueAndDeletedFalseOrderByDisplayOrderAsc(Long menuItemId);
    List<OptionGroup> findByMenuItemIdOrderByDisplayOrderAsc(Long menuItemId);
}
