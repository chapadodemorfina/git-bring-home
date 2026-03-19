-- Add missing enum values to stock_movement_type
ALTER TYPE public.stock_movement_type ADD VALUE IF NOT EXISTS 'sale';
ALTER TYPE public.stock_movement_type ADD VALUE IF NOT EXISTS 'sale_return';
ALTER TYPE public.stock_movement_type ADD VALUE IF NOT EXISTS 'scrap_recovery';