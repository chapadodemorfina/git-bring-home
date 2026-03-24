DROP TRIGGER IF EXISTS check_product_plan_limit ON products;
CREATE TRIGGER trg_validate_product_plan_limit BEFORE INSERT ON products FOR EACH ROW EXECUTE FUNCTION trg_check_product_limit();
DROP TRIGGER IF EXISTS check_service_order_plan_limit ON service_orders;
CREATE TRIGGER trg_validate_service_order_plan_limit BEFORE INSERT ON service_orders FOR EACH ROW EXECUTE FUNCTION trg_check_service_order_limit();
DROP TRIGGER IF EXISTS check_user_plan_limit ON tenant_users;
CREATE TRIGGER trg_validate_user_plan_limit BEFORE INSERT ON tenant_users FOR EACH ROW EXECUTE FUNCTION trg_check_user_limit();