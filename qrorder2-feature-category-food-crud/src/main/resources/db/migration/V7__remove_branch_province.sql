-- ============================================================
-- V7: Remove Branch & Province – Single Restaurant MVP
-- Uses IF EXISTS to be idempotent on fresh databases
-- ============================================================

-- 1. Drop branch FK & column from payment_requests (if exists)
ALTER TABLE payment_requests
    DROP FOREIGN KEY IF EXISTS fk_payment_request_branch;
ALTER TABLE payment_requests
    DROP COLUMN IF EXISTS branch_id;

-- 2. Drop branch FK & column from payments
ALTER TABLE payments
    DROP FOREIGN KEY IF EXISTS fk_payment_branch;
ALTER TABLE payments
    DROP COLUMN IF EXISTS branch_id;

-- 3. Drop branch FK & column from orders
ALTER TABLE orders
    DROP FOREIGN KEY IF EXISTS fk_order_branch;
ALTER TABLE orders
    DROP COLUMN IF EXISTS branch_id;

-- 4. Drop branch FK & column from table_sessions
ALTER TABLE table_sessions
    DROP FOREIGN KEY IF EXISTS fk_table_session_branch;
ALTER TABLE table_sessions
    DROP COLUMN IF EXISTS branch_id;

-- 5. Drop branch FK & column from reservations
ALTER TABLE reservations
    DROP FOREIGN KEY IF EXISTS fk_reservation_branch;
ALTER TABLE reservations
    DROP COLUMN IF EXISTS branch_id;

-- 6. Drop branch FK & column from restaurant_tables
ALTER TABLE restaurant_tables
    DROP FOREIGN KEY IF EXISTS fk_table_branch;
ALTER TABLE restaurant_tables
    DROP COLUMN IF EXISTS branch_id;

-- 7. Drop branch FK & column from users
ALTER TABLE users
    DROP FOREIGN KEY IF EXISTS fk_user_branch;
ALTER TABLE users
    DROP COLUMN IF EXISTS branch_id;

-- 8. Drop branches table
DROP TABLE IF EXISTS branches;

-- 9. Drop provinces table
DROP TABLE IF EXISTS provinces;
