-- ============================================================
-- V8: Remove branch_id columns and constraints safely (idempotent)
-- ============================================================

DROP PROCEDURE IF EXISTS DropColumnSafely;

DELIMITER //

CREATE PROCEDURE DropColumnSafely(
    IN p_table_name VARCHAR(64),
    IN p_column_name VARCHAR(64)
)
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE fk_name VARCHAR(64);
    DECLARE idx_name VARCHAR(64);
    DECLARE col_exists INT DEFAULT 0;

    -- Cursor to find and drop all foreign key constraints referencing the column in the table
    DECLARE fk_cursor CURSOR FOR
        SELECT CONSTRAINT_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = p_table_name
          AND COLUMN_NAME = p_column_name
          AND REFERENCED_TABLE_NAME IS NOT NULL;

    -- Cursor to find and drop all indexes built on this column (excluding PRIMARY index)
    DECLARE idx_cursor CURSOR FOR
        SELECT DISTINCT INDEX_NAME
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = p_table_name
          AND COLUMN_NAME = p_column_name
          AND INDEX_NAME <> 'PRIMARY';

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    -- 1. Drop Foreign Keys
    OPEN fk_cursor;
    fk_loop: LOOP
        FETCH fk_cursor INTO fk_name;
        IF done THEN
            LEAVE fk_loop;
        END IF;
        
        SET @sql_str = CONCAT('ALTER TABLE ', p_table_name, ' DROP FOREIGN KEY ', fk_name);
        PREPARE stmt FROM @sql_str;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END LOOP;
    CLOSE fk_cursor;

    SET done = FALSE;

    -- 2. Drop Indexes
    OPEN idx_cursor;
    idx_loop: LOOP
        FETCH idx_cursor INTO idx_name;
        IF done THEN
            LEAVE idx_loop;
        END IF;
        
        -- Check if index still exists (might have been dropped with FK)
        SET @index_count = 0;
        SELECT COUNT(*) INTO @index_count
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = p_table_name
          AND INDEX_NAME = idx_name;
          
        IF @index_count > 0 THEN
            SET @sql_str = CONCAT('ALTER TABLE ', p_table_name, ' DROP INDEX ', idx_name);
            PREPARE stmt FROM @sql_str;
            EXECUTE stmt;
            DEALLOCATE PREPARE stmt;
        END IF;
    END LOOP;
    CLOSE idx_cursor;

    -- 3. Drop Column
    SELECT COUNT(*) INTO col_exists
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table_name
      AND COLUMN_NAME = p_column_name;

    IF col_exists > 0 THEN
        SET @sql_str = CONCAT('ALTER TABLE ', p_table_name, ' DROP COLUMN ', p_column_name);
        PREPARE stmt FROM @sql_str;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END //

DELIMITER ;

-- Execute drops for all tables
CALL DropColumnSafely('reservations', 'branch_id');
CALL DropColumnSafely('restaurant_tables', 'branch_id');
CALL DropColumnSafely('orders', 'branch_id');
CALL DropColumnSafely('payments', 'branch_id');
CALL DropColumnSafely('payment_requests', 'branch_id');
CALL DropColumnSafely('table_sessions', 'branch_id');
CALL DropColumnSafely('users', 'branch_id');

-- Cleanup stored procedure
DROP PROCEDURE IF EXISTS DropColumnSafely;

-- Drop obsolete tables if they exist
DROP TABLE IF EXISTS branches;
DROP TABLE IF EXISTS provinces;
