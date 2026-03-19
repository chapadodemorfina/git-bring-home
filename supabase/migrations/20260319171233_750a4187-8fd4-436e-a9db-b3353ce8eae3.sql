
-- Fix search_path on trigger functions
CREATE OR REPLACE FUNCTION public.trg_protect_closed_cash_register()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status = 'open' AND NEW.status = 'closed' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'closed' THEN
    RAISE EXCEPTION 'Não é possível editar um caixa já fechado.' USING ERRCODE = 'P0001';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Não é permitido excluir registros de caixa.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_protect_closed_movements()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE _status text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT status::text INTO _status FROM cash_registers WHERE id = NEW.cash_register_id;
    IF _status <> 'open' THEN
      RAISE EXCEPTION 'Não é possível adicionar movimentação em caixa fechado.' USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
  END IF;
  SELECT status::text INTO _status FROM cash_registers WHERE id = OLD.cash_register_id;
  IF _status = 'closed' THEN
    RAISE EXCEPTION 'Não é possível alterar movimentações de caixa já fechado.' USING ERRCODE = 'P0001';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
