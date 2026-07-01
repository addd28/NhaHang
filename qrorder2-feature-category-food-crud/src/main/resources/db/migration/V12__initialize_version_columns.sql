-- Update existing NULL values in version columns to 0
UPDATE menu_items SET version = 0 WHERE version IS NULL;
UPDATE option_groups SET version = 0 WHERE version IS NULL;
UPDATE item_options SET version = 0 WHERE version IS NULL;

-- Set default to 0 and NOT NULL for version columns
ALTER TABLE menu_items MODIFY version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE option_groups MODIFY version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE item_options MODIFY version BIGINT NOT NULL DEFAULT 0;
