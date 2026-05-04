CREATE TABLE IF NOT EXISTS public._hotfix_audit (n int, name text, expected_fail boolean, passed boolean, detail text, at timestamptz default now());
TRUNCATE public._hotfix_audit;

DO $outer$
DECLARE
  _tenant uuid; _cust uuid; _qid uuid; _created_cust boolean := false;
BEGIN
  SELECT id, tenant_id INTO _cust, _tenant FROM customers WHERE is_active=true LIMIT 1;
  IF _cust IS NULL THEN
    _tenant := '00000000-0000-0000-0000-000000000001';
    INSERT INTO customers (tenant_id, full_name, is_active) VALUES (_tenant, '__test_cust__', true) RETURNING id INTO _cust;
    _created_cust := true;
  END IF;

  INSERT INTO quotes (tenant_id, customer_id, title, status) VALUES (_tenant, _cust, '__hotfix_test_A__', 'draft') RETURNING id INTO _qid;

  BEGIN UPDATE quotes SET status='sent' WHERE id=_qid; INSERT INTO _hotfix_audit VALUES (1,'draft->sent',false,true,'ok');
  EXCEPTION WHEN OTHERS THEN INSERT INTO _hotfix_audit VALUES (1,'draft->sent',false,false,SQLERRM); END;

  BEGIN UPDATE quotes SET title='hack' WHERE id=_qid; INSERT INTO _hotfix_audit VALUES (2,'sent material lock title',true,false,'no exception');
  EXCEPTION WHEN OTHERS THEN INSERT INTO _hotfix_audit VALUES (2,'sent material lock title',true,true,SQLERRM); END;

  BEGIN UPDATE quotes SET discount_amount=99 WHERE id=_qid; INSERT INTO _hotfix_audit VALUES (3,'sent material lock discount',true,false,'no exception');
  EXCEPTION WHEN OTHERS THEN INSERT INTO _hotfix_audit VALUES (3,'sent material lock discount',true,true,SQLERRM); END;

  BEGIN UPDATE quotes SET status='approved' WHERE id=_qid; INSERT INTO _hotfix_audit VALUES (4,'sent->approved',false,true,'ok');
  EXCEPTION WHEN OTHERS THEN INSERT INTO _hotfix_audit VALUES (4,'sent->approved',false,false,SQLERRM); END;

  BEGIN UPDATE quotes SET title='x' WHERE id=_qid; INSERT INTO _hotfix_audit VALUES (5,'approved locked title',true,false,'no exception');
  EXCEPTION WHEN OTHERS THEN INSERT INTO _hotfix_audit VALUES (5,'approved locked title',true,true,SQLERRM); END;

  BEGIN UPDATE quotes SET status='draft' WHERE id=_qid; INSERT INTO _hotfix_audit VALUES (6,'approved->draft blocked',true,false,'no exception');
  EXCEPTION WHEN OTHERS THEN INSERT INTO _hotfix_audit VALUES (6,'approved->draft blocked',true,true,SQLERRM); END;

  BEGIN UPDATE quotes SET status='converted' WHERE id=_qid; INSERT INTO _hotfix_audit VALUES (7,'approved->converted',false,true,'ok');
  EXCEPTION WHEN OTHERS THEN INSERT INTO _hotfix_audit VALUES (7,'approved->converted',false,false,SQLERRM); END;

  BEGIN UPDATE quotes SET title='y' WHERE id=_qid; INSERT INTO _hotfix_audit VALUES (8,'converted immutable',true,false,'no exception');
  EXCEPTION WHEN OTHERS THEN INSERT INTO _hotfix_audit VALUES (8,'converted immutable',true,true,SQLERRM); END;

  BEGIN DELETE FROM quotes WHERE id=_qid; INSERT INTO _hotfix_audit VALUES (9,'delete converted blocked',true,false,'no exception');
  EXCEPTION WHEN OTHERS THEN INSERT INTO _hotfix_audit VALUES (9,'delete converted blocked',true,true,SQLERRM); END;

  INSERT INTO quotes (tenant_id, customer_id, title, status) VALUES (_tenant, _cust, '__hotfix_test_B__', 'draft') RETURNING id INTO _qid;
  UPDATE quotes SET status='sent' WHERE id=_qid;

  BEGIN UPDATE quotes SET status='rejected', rejection_reason='r' WHERE id=_qid; INSERT INTO _hotfix_audit VALUES (10,'sent->rejected w/reason',false,true,'ok');
  EXCEPTION WHEN OTHERS THEN INSERT INTO _hotfix_audit VALUES (10,'sent->rejected w/reason',false,false,SQLERRM); END;

  BEGIN UPDATE quotes SET status='draft' WHERE id=_qid; INSERT INTO _hotfix_audit VALUES (11,'rejected->draft blocked',true,false,'no exception');
  EXCEPTION WHEN OTHERS THEN INSERT INTO _hotfix_audit VALUES (11,'rejected->draft blocked',true,true,SQLERRM); END;

  BEGIN UPDATE quotes SET status='revised' WHERE id=_qid; INSERT INTO _hotfix_audit VALUES (12,'rejected->revised',false,true,'ok');
  EXCEPTION WHEN OTHERS THEN INSERT INTO _hotfix_audit VALUES (12,'rejected->revised',false,false,SQLERRM); END;

  BEGIN UPDATE quotes SET status='draft' WHERE id=_qid; INSERT INTO _hotfix_audit VALUES (13,'revised->draft blocked',true,false,'no exception');
  EXCEPTION WHEN OTHERS THEN INSERT INTO _hotfix_audit VALUES (13,'revised->draft blocked',true,true,SQLERRM); END;

  INSERT INTO quotes (tenant_id, customer_id, title, status) VALUES (_tenant, _cust, '__hotfix_test_C__', 'draft') RETURNING id INTO _qid;
  INSERT INTO quote_items (quote_id, item_type, description, quantity, unit_cost, unit_price) VALUES (_qid, 'part', 'p', 1, 5, 10);

  BEGIN UPDATE quotes SET discount_amount=999 WHERE id=_qid; INSERT INTO _hotfix_audit VALUES (14,'discount > subtotal blocked',true,false,'no exception');
  EXCEPTION WHEN OTHERS THEN INSERT INTO _hotfix_audit VALUES (14,'discount > subtotal blocked',true,true,SQLERRM); END;

  -- Cleanup using session_replication_role to bypass triggers
  SET LOCAL session_replication_role = 'replica';
  DELETE FROM quote_history WHERE quote_id IN (SELECT id FROM quotes WHERE title LIKE '__hotfix_test_%');
  DELETE FROM quote_items   WHERE quote_id IN (SELECT id FROM quotes WHERE title LIKE '__hotfix_test_%');
  DELETE FROM quotes        WHERE title LIKE '__hotfix_test_%';
  IF _created_cust THEN DELETE FROM customers WHERE full_name='__test_cust__'; END IF;
  SET LOCAL session_replication_role = 'origin';
END $outer$;