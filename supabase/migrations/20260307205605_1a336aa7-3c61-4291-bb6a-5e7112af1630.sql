
-- ============================================
-- BUSINESS AUTOMATION MIGRATION
-- ============================================

-- 1. ADD 'expired' TO quote_status ENUM
ALTER TYPE quote_status ADD VALUE IF NOT EXISTS 'expired';
