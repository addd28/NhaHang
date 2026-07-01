-- Migration V11: Add VietQR integration columns to payment_requests and payments tables

DROP PROCEDURE IF EXISTS AlterPaymentRequestsTable;

DELIMITER //

CREATE PROCEDURE AlterPaymentRequestsTable()
BEGIN
    -- Add transaction_code
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'payment_requests' 
        AND COLUMN_NAME = 'transaction_code'
    ) THEN
        ALTER TABLE payment_requests ADD COLUMN transaction_code VARCHAR(100) NULL;
    END IF;

    -- Add unique index on transaction_code
    IF NOT EXISTS (
        SELECT * FROM information_schema.STATISTICS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'payment_requests' 
        AND INDEX_NAME = 'uq_transaction_code'
    ) THEN
        CREATE UNIQUE INDEX uq_transaction_code ON payment_requests(transaction_code);
    END IF;

    -- Add qr_content
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'payment_requests' 
        AND COLUMN_NAME = 'qr_content'
    ) THEN
        ALTER TABLE payment_requests ADD COLUMN qr_content VARCHAR(1000) NULL;
    END IF;

    -- Add bank_name
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'payment_requests' 
        AND COLUMN_NAME = 'bank_name'
    ) THEN
        ALTER TABLE payment_requests ADD COLUMN bank_name VARCHAR(100) NULL;
    END IF;

    -- Add bank_account
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'payment_requests' 
        AND COLUMN_NAME = 'bank_account'
    ) THEN
        ALTER TABLE payment_requests ADD COLUMN bank_account VARCHAR(100) NULL;
    END IF;

    -- Add account_name
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'payment_requests' 
        AND COLUMN_NAME = 'account_name'
    ) THEN
        ALTER TABLE payment_requests ADD COLUMN account_name VARCHAR(100) NULL;
    END IF;

    -- Add payment_status
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'payment_requests' 
        AND COLUMN_NAME = 'payment_status'
    ) THEN
        ALTER TABLE payment_requests ADD COLUMN payment_status VARCHAR(50) NULL;
    END IF;

    -- Add qr_url
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'payment_requests' 
        AND COLUMN_NAME = 'qr_url'
    ) THEN
        ALTER TABLE payment_requests ADD COLUMN qr_url VARCHAR(500) NULL;
    END IF;

    -- Add transfer_content
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'payment_requests' 
        AND COLUMN_NAME = 'transfer_content'
    ) THEN
        ALTER TABLE payment_requests ADD COLUMN transfer_content VARCHAR(200) NULL;
    END IF;

    -- Add created_at
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'payment_requests' 
        AND COLUMN_NAME = 'created_at'
    ) THEN
        ALTER TABLE payment_requests ADD COLUMN created_at DATETIME NULL;
    END IF;

    -- Add expired_at
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'payment_requests' 
        AND COLUMN_NAME = 'expired_at'
    ) THEN
        ALTER TABLE payment_requests ADD COLUMN expired_at DATETIME NULL;
    END IF;

    -- Add confirmed_by
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'payment_requests' 
        AND COLUMN_NAME = 'confirmed_by'
    ) THEN
        ALTER TABLE payment_requests ADD COLUMN confirmed_by VARCHAR(100) NULL;
    END IF;

    -- Add transaction_code to payments
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'payments' 
        AND COLUMN_NAME = 'transaction_code'
    ) THEN
        ALTER TABLE payments ADD COLUMN transaction_code VARCHAR(100) NULL;
    END IF;

    -- Add payment_request_id to payments
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'payments' 
        AND COLUMN_NAME = 'payment_request_id'
    ) THEN
        ALTER TABLE payments ADD COLUMN payment_request_id BIGINT NULL;
    END IF;
END //

DELIMITER ;

CALL AlterPaymentRequestsTable();

DROP PROCEDURE IF EXISTS AlterPaymentRequestsTable;
