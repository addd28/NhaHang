-- V9: Update obsolete reservation statuses in database
UPDATE reservations SET status = 'BOOKED' WHERE status = 'PENDING';
UPDATE reservations SET status = 'NO_SHOW' WHERE status = 'CANCELLED_NO_SHOW';
