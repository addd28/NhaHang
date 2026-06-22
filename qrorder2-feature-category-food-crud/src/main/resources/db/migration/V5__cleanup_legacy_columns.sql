-- Migration V5: Cleanup legacy columns from database
ALTER TABLE `menu_items` DROP COLUMN `base_price`;
ALTER TABLE `menu_items` DROP COLUMN `stock`;
ALTER TABLE `menu_items` DROP COLUMN `is_active`;

ALTER TABLE `item_options` DROP COLUMN `additional_price`;

ALTER TABLE `payments` DROP COLUMN `method`;
ALTER TABLE `payments` DROP COLUMN `payment_type`;
ALTER TABLE `payments` DROP COLUMN `status`;
