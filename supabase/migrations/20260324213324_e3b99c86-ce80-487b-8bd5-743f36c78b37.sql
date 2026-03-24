DROP TRIGGER IF EXISTS trg_order_number ON public.service_orders;

CREATE TRIGGER trg_zz_order_number
BEFORE INSERT ON public.service_orders
FOR EACH ROW
EXECUTE FUNCTION public.trg_set_order_number();