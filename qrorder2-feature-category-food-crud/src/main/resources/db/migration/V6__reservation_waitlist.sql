-- Migration V6: Support 10-minute hold reservation system & waitlist

DROP PROCEDURE IF EXISTS AlterReservationsTable;

DELIMITER //

CREATE PROCEDURE AlterReservationsTable()
BEGIN
    -- 1. Modify status column (always safe)
    ALTER TABLE reservations MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'PENDING';

    -- 2. Add reservation_code if not exists
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'reservations' 
        AND COLUMN_NAME = 'reservation_code'
    ) THEN
        ALTER TABLE reservations ADD COLUMN reservation_code VARCHAR(20) NULL;
    END IF;

    -- 3. Add time_slot_start if not exists
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'reservations' 
        AND COLUMN_NAME = 'time_slot_start'
    ) THEN
        ALTER TABLE reservations ADD COLUMN time_slot_start DATETIME NULL;
    END IF;

    -- 4. Add time_slot_end if not exists
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'reservations' 
        AND COLUMN_NAME = 'time_slot_end'
    ) THEN
        ALTER TABLE reservations ADD COLUMN time_slot_end DATETIME NULL;
    END IF;

    -- 5. Add confirmed_at if not exists
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'reservations' 
        AND COLUMN_NAME = 'confirmed_at'
    ) THEN
        ALTER TABLE reservations ADD COLUMN confirmed_at DATETIME NULL;
    END IF;

    -- 6. Add hold_until if not exists
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'reservations' 
        AND COLUMN_NAME = 'hold_until'
    ) THEN
        ALTER TABLE reservations ADD COLUMN hold_until DATETIME NULL;
    END IF;

    -- 7. Add checked_in_at if not exists
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'reservations' 
        AND COLUMN_NAME = 'checked_in_at'
    ) THEN
        ALTER TABLE reservations ADD COLUMN checked_in_at DATETIME NULL;
    END IF;

    -- 8. Add unique index if it doesn't exist
    IF NOT EXISTS (
        SELECT * FROM information_schema.STATISTICS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'reservations' 
        AND INDEX_NAME = 'uq_reservation_code'
    ) THEN
        CREATE UNIQUE INDEX uq_reservation_code ON reservations(reservation_code);
    END IF;
END //

DELIMITER ;

CALL AlterReservationsTable();

DROP PROCEDURE IF EXISTS AlterReservationsTable;

