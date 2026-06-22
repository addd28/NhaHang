-- Migration V2: Ensure price_at_order and menu_item_name columns exist in order_items

-- Procedure to add columns if they do not exist
DROP PROCEDURE IF EXISTS AddSnapshotColumns;

DELIMITER //

CREATE PROCEDURE AddSnapshotColumns()
BEGIN
    -- Check and add price_at_order column
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'order_items' 
        AND COLUMN_NAME = 'price_at_order'
    ) THEN
        ALTER TABLE order_items ADD COLUMN price_at_order DOUBLE DEFAULT NULL;
    END IF;

    -- Check and add menu_item_name column
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'order_items' 
        AND COLUMN_NAME = 'menu_item_name'
    ) THEN
        ALTER TABLE order_items ADD COLUMN menu_item_name VARCHAR(255) DEFAULT NULL;
    END IF;
END //

DELIMITER ;

CALL AddSnapshotColumns();

DROP PROCEDURE IF EXISTS AddSnapshotColumns;
