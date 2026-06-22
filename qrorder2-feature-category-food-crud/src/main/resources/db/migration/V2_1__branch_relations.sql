-- Migration V2_1: Setup branch_id columns and foreign key constraints safely

DROP PROCEDURE IF EXISTS SetupBranchRelations;

DELIMITER //

CREATE PROCEDURE SetupBranchRelations()
BEGIN
    -- 1. reservations
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'reservations' 
        AND COLUMN_NAME = 'branch_id'
    ) THEN
        ALTER TABLE reservations ADD COLUMN branch_id BIGINT;
    END IF;

    UPDATE reservations r 
    JOIN restaurant_tables t ON r.table_id = t.id 
    SET r.branch_id = t.branch_id 
    WHERE r.branch_id IS NULL;

    UPDATE reservations 
    SET branch_id = (SELECT id FROM branches LIMIT 1) 
    WHERE branch_id IS NULL;

    -- Make sure we have at least one branch to avoid NOT NULL constraint failure
    IF EXISTS (SELECT * FROM branches LIMIT 1) THEN
        ALTER TABLE reservations MODIFY branch_id BIGINT NOT NULL;
    END IF;

    -- 2. table_sessions
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'table_sessions' 
        AND COLUMN_NAME = 'branch_id'
    ) THEN
        ALTER TABLE table_sessions ADD COLUMN branch_id BIGINT;
    END IF;

    UPDATE table_sessions s 
    JOIN restaurant_tables t ON s.table_id = t.id 
    SET s.branch_id = t.branch_id 
    WHERE s.branch_id IS NULL;

    UPDATE table_sessions 
    SET branch_id = (SELECT id FROM branches LIMIT 1) 
    WHERE branch_id IS NULL;

    IF EXISTS (SELECT * FROM branches LIMIT 1) THEN
        ALTER TABLE table_sessions MODIFY branch_id BIGINT NOT NULL;
    END IF;

    -- 3. orders
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'orders' 
        AND COLUMN_NAME = 'branch_id'
    ) THEN
        ALTER TABLE orders ADD COLUMN branch_id BIGINT;
    END IF;

    UPDATE orders o 
    JOIN table_sessions s ON o.session_id = s.id 
    SET o.branch_id = s.branch_id 
    WHERE o.branch_id IS NULL;

    UPDATE orders 
    SET branch_id = (SELECT id FROM branches LIMIT 1) 
    WHERE branch_id IS NULL;

    IF EXISTS (SELECT * FROM branches LIMIT 1) THEN
        ALTER TABLE orders MODIFY branch_id BIGINT NOT NULL;
    END IF;

    -- 4. payments
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'payments' 
        AND COLUMN_NAME = 'branch_id'
    ) THEN
        ALTER TABLE payments ADD COLUMN branch_id BIGINT;
    END IF;

    UPDATE payments p 
    JOIN table_sessions s ON p.session_id = s.id 
    SET p.branch_id = s.branch_id 
    WHERE p.branch_id IS NULL;

    UPDATE payments 
    SET branch_id = (SELECT id FROM branches LIMIT 1) 
    WHERE branch_id IS NULL;

    IF EXISTS (SELECT * FROM branches LIMIT 1) THEN
        ALTER TABLE payments MODIFY branch_id BIGINT NOT NULL;
    END IF;

    -- 5. users
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'users' 
        AND COLUMN_NAME = 'branch_id'
    ) THEN
        ALTER TABLE users ADD COLUMN branch_id BIGINT;
    END IF;

    -- Add constraints if they do not exist
    IF NOT EXISTS (
        SELECT * FROM information_schema.TABLE_CONSTRAINTS 
        WHERE CONSTRAINT_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'reservations' 
        AND CONSTRAINT_NAME = 'fk_reservation_branch'
    ) THEN
        ALTER TABLE reservations ADD CONSTRAINT fk_reservation_branch FOREIGN KEY (branch_id) REFERENCES branches(id);
    END IF;

    IF NOT EXISTS (
        SELECT * FROM information_schema.TABLE_CONSTRAINTS 
        WHERE CONSTRAINT_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'table_sessions' 
        AND CONSTRAINT_NAME = 'fk_table_session_branch'
    ) THEN
        ALTER TABLE table_sessions ADD CONSTRAINT fk_table_session_branch FOREIGN KEY (branch_id) REFERENCES branches(id);
    END IF;

    IF NOT EXISTS (
        SELECT * FROM information_schema.TABLE_CONSTRAINTS 
        WHERE CONSTRAINT_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'orders' 
        AND CONSTRAINT_NAME = 'fk_order_branch'
    ) THEN
        ALTER TABLE orders ADD CONSTRAINT fk_order_branch FOREIGN KEY (branch_id) REFERENCES branches(id);
    END IF;

    IF NOT EXISTS (
        SELECT * FROM information_schema.TABLE_CONSTRAINTS 
        WHERE CONSTRAINT_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'payments' 
        AND CONSTRAINT_NAME = 'fk_payment_branch'
    ) THEN
        ALTER TABLE payments ADD CONSTRAINT fk_payment_branch FOREIGN KEY (branch_id) REFERENCES branches(id);
    END IF;

    IF NOT EXISTS (
        SELECT * FROM information_schema.TABLE_CONSTRAINTS 
        WHERE CONSTRAINT_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'users' 
        AND CONSTRAINT_NAME = 'fk_user_branch'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT fk_user_branch FOREIGN KEY (branch_id) REFERENCES branches(id);
    END IF;

END //

DELIMITER ;

CALL SetupBranchRelations();

DROP PROCEDURE IF EXISTS SetupBranchRelations;
