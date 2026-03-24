DROP TRIGGER IF EXISTS trg_sale_number ON public.sales;

CREATE TRIGGER trg_zz_sale_number
BEFORE INSERT ON public.sales
FOR EACH ROW
EXECUTE FUNCTION public.trg_set_sale_number();