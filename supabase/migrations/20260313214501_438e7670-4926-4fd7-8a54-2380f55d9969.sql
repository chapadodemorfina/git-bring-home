
-- Fix infinite recursion between customers and service_orders RLS policies
-- The problem: cp_operator_select_customers queries service_orders, 
-- and customer_select_own_so queries customers, creating a circular dependency.

-- Step 1: Create security definer helper functions to break recursion

CREATE OR REPLACE FUNCTION public.get_cp_operator_customer_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT so.customer_id
  FROM service_orders so
  WHERE so.collection_point_id IN (
    SELECT cpu.collection_point_id
    FROM collection_point_users cpu
    WHERE cpu.user_id = _user_id AND cpu.is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.get_customer_ids_for_email(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id
  FROM customers c
  WHERE c.email = (SELECT email FROM auth.users WHERE id = _user_id)::text;
$$;

CREATE OR REPLACE FUNCTION public.get_cp_operator_device_customer_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT so.customer_id
  FROM service_orders so
  WHERE so.collection_point_id IN (
    SELECT cpu.collection_point_id
    FROM collection_point_users cpu
    WHERE cpu.user_id = _user_id AND cpu.is_active = true
  );
$$;

-- Step 2: Drop and recreate the problematic policies

-- Fix cp_operator_select_customers (customers table → was querying service_orders)
DROP POLICY IF EXISTS "cp_operator_select_customers" ON customers;
CREATE POLICY "cp_operator_select_customers" ON customers
  FOR SELECT USING (
    has_role(auth.uid(), 'collection_point_operator'::app_role)
    AND id IN (SELECT get_cp_operator_customer_ids(auth.uid()))
  );

-- Fix customer_select_own_so (service_orders table → was querying customers)
DROP POLICY IF EXISTS "customer_select_own_so" ON service_orders;
CREATE POLICY "customer_select_own_so" ON service_orders
  FOR SELECT USING (
    has_role(auth.uid(), 'customer'::app_role)
    AND customer_id IN (SELECT get_customer_ids_for_email(auth.uid()))
  );

-- Fix cp_operator_select_devices (devices table → was querying service_orders → customers)
DROP POLICY IF EXISTS "cp_operator_select_devices" ON devices;
CREATE POLICY "cp_operator_select_devices" ON devices
  FOR SELECT USING (
    has_role(auth.uid(), 'collection_point_operator'::app_role)
    AND customer_id IN (SELECT get_cp_operator_device_customer_ids(auth.uid()))
  );

-- Fix customer_select_devices (devices table → was querying customers)
DROP POLICY IF EXISTS "customer_select_devices" ON devices;
CREATE POLICY "customer_select_devices" ON devices
  FOR SELECT USING (
    has_role(auth.uid(), 'customer'::app_role)
    AND customer_id IN (SELECT get_customer_ids_for_email(auth.uid()))
  );
