-- Database Migration SQL - Production POS Option Groups System

-- 1. Create option_groups table
CREATE TABLE IF NOT EXISTS option_groups (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    selection_type VARCHAR(50) NOT NULL,
    required BOOLEAN NOT NULL DEFAULT FALSE,
    min_select INT,
    max_select INT,
    display_order INT NOT NULL DEFAULT 0,
    available BOOLEAN NOT NULL DEFAULT TRUE,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    version BIGINT DEFAULT 0,
    created_at DATETIME,
    updated_at DATETIME,
    menu_item_id BIGINT NOT NULL,
    CONSTRAINT fk_option_groups_menu_item FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
);

-- 2. Modify item_options table to align with new option_groups relationship
ALTER TABLE item_options DROP COLUMN IF EXISTS menu_item_id;
ALTER TABLE item_options DROP COLUMN IF EXISTS is_required;
ALTER TABLE item_options DROP COLUMN IF EXISTS is_multi;
ALTER TABLE item_options DROP COLUMN IF EXISTS option_group;

ALTER TABLE item_options ADD COLUMN IF NOT EXISTS option_group_id BIGINT NOT NULL;
ALTER TABLE item_options ADD COLUMN IF NOT EXISTS option_code VARCHAR(255) NOT NULL;
ALTER TABLE item_options ADD COLUMN IF NOT EXISTS display_order INT NOT NULL DEFAULT 0;
ALTER TABLE item_options ADD COLUMN IF NOT EXISTS deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE item_options ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;
ALTER TABLE item_options ADD COLUMN IF NOT EXISTS created_at DATETIME;
ALTER TABLE item_options ADD COLUMN IF NOT EXISTS updated_at DATETIME;

-- Add constraints
ALTER TABLE item_options ADD CONSTRAINT fk_item_options_option_group FOREIGN KEY (option_group_id) REFERENCES option_groups(id);
ALTER TABLE item_options ADD CONSTRAINT uq_option_group_code UNIQUE (option_group_id, option_code);

-- 3. Update order_item_options table with snapshot columns
ALTER TABLE order_item_options ADD COLUMN IF NOT EXISTS item_option_id BIGINT;
ALTER TABLE order_item_options ADD COLUMN IF NOT EXISTS option_code VARCHAR(255);
ALTER TABLE order_item_options ADD COLUMN IF NOT EXISTS option_group_id BIGINT;
ALTER TABLE order_item_options ADD COLUMN IF NOT EXISTS option_group_name VARCHAR(255);
ALTER TABLE order_item_options ADD COLUMN IF NOT EXISTS option_group_type VARCHAR(50);

-- 4. Add optimistic locking version and audit columns to menu_items
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS version BIGINT DEFAULT 0;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS created_at DATETIME;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS updated_at DATETIME;
