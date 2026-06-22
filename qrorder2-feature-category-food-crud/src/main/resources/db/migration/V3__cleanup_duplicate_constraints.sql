-- Migration V3: Cleanup duplicate constraints and indexes safely

DROP PROCEDURE IF EXISTS CleanupDuplicateConstraints;

DELIMITER //

CREATE PROCEDURE CleanupDuplicateConstraints()
BEGIN
    -- 1. Drop duplicate FK on orders: FKjcfql8n80mxan8of04c8sd8k2
    IF EXISTS (
        SELECT * FROM information_schema.TABLE_CONSTRAINTS 
        WHERE CONSTRAINT_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'orders' 
        AND CONSTRAINT_NAME = 'FKjcfql8n80mxan8of04c8sd8k2' 
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE orders DROP FOREIGN KEY FKjcfql8n80mxan8of04c8sd8k2;
    END IF;

    -- 2. Drop duplicate FK on payments: FKbnclwwetqhl0wwr5ubgne2xt1
    IF EXISTS (
        SELECT * FROM information_schema.TABLE_CONSTRAINTS 
        WHERE CONSTRAINT_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'payments' 
        AND CONSTRAINT_NAME = 'FKbnclwwetqhl0wwr5ubgne2xt1' 
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE payments DROP FOREIGN KEY FKbnclwwetqhl0wwr5ubgne2xt1;
    END IF;

    -- 3. Drop duplicate FK on users: FK9o70sp9ku40077y38fk4wieyk
    IF EXISTS (
        SELECT * FROM information_schema.TABLE_CONSTRAINTS 
        WHERE CONSTRAINT_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'users' 
        AND CONSTRAINT_NAME = 'FK9o70sp9ku40077y38fk4wieyk' 
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE users DROP FOREIGN KEY FK9o70sp9ku40077y38fk4wieyk;
    END IF;

    -- 4. Drop duplicate FK on reservations: reservations_ibfk_1
    IF EXISTS (
        SELECT * FROM information_schema.TABLE_CONSTRAINTS 
        WHERE CONSTRAINT_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'reservations' 
        AND CONSTRAINT_NAME = 'reservations_ibfk_1' 
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE reservations DROP FOREIGN KEY reservations_ibfk_1;
    END IF;

    -- 5. Drop duplicate FK on table_sessions: FKcefqler1335aloruu1kmmvlcg
    IF EXISTS (
        SELECT * FROM information_schema.TABLE_CONSTRAINTS 
        WHERE CONSTRAINT_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'table_sessions' 
        AND CONSTRAINT_NAME = 'FKcefqler1335aloruu1kmmvlcg' 
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE table_sessions DROP FOREIGN KEY FKcefqler1335aloruu1kmmvlcg;
    END IF;

    -- 6. Drop duplicate index on restaurant_tables: UKchqs6k5mo5jqlikkt0skx5kdh
    IF EXISTS (
        SELECT * FROM information_schema.STATISTICS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'restaurant_tables' 
        AND INDEX_NAME = 'UKchqs6k5mo5jqlikkt0skx5kdh'
    ) THEN
        ALTER TABLE restaurant_tables DROP INDEX UKchqs6k5mo5jqlikkt0skx5kdh;
    END IF;

    -- 7. Drop duplicate index on reservations: idx_reservation_code
    IF EXISTS (
        SELECT * FROM information_schema.STATISTICS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'reservations' 
        AND INDEX_NAME = 'idx_reservation_code'
    ) THEN
        ALTER TABLE reservations DROP INDEX idx_reservation_code;
    END IF;

END //

DELIMITER ;

CALL CleanupDuplicateConstraints();

DROP PROCEDURE IF EXISTS CleanupDuplicateConstraints;
