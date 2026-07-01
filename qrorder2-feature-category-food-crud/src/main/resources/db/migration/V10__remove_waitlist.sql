-- V10: Migrate any legacy WAITLIST reservations to CANCELLED since WAITLIST is removed
UPDATE reservations SET status = 'CANCELLED' WHERE status = 'WAITLIST';
