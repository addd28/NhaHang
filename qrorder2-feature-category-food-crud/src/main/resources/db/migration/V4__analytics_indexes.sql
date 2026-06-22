-- Migration V4: Add indexes to order_item_options for analytics optimization

DROP PROCEDURE IF EXISTS AddAnalyticsIndexes;

DELIMITER //

CREATE PROCEDURE AddAnalyticsIndexes()
BEGIN
    -- 1. Create index idx_oio_item_option_id
    IF NOT EXISTS (
        SELECT * FROM information_schema.STATISTICS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'order_item_options' 
        AND INDEX_NAME = 'idx_oio_item_option_id'
    ) THEN
        CREATE INDEX idx_oio_item_option_id ON order_item_options(item_option_id);
    END IF;

    -- 2. Create index idx_oio_option_group_id
    IF NOT EXISTS (
        SELECT * FROM information_schema.STATISTICS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'order_item_options' 
        AND INDEX_NAME = 'idx_oio_option_group_id'
    ) THEN
        CREATE INDEX idx_oio_option_group_id ON order_item_options(option_group_id);
    END IF;

    -- 3. Create index idx_oio_option_code
    IF NOT EXISTS (
        SELECT * FROM information_schema.STATISTICS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'order_item_options' 
        AND INDEX_NAME = 'idx_oio_option_code'
    ) THEN
        CREATE INDEX idx_oio_option_code ON order_item_options(option_code);
    END IF;

END //

DELIMITER ;

CALL AddAnalyticsIndexes();

DROP PROCEDURE IF EXISTS AddAnalyticsIndexes;
