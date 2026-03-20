
-- 1. Link the operator user to their collection point via profiles
UPDATE profiles 
SET collection_point_id = '6536f7bb-0c24-472a-afe4-a0454cd03392'
WHERE id = '48f70a04-369d-415e-9a41-1f145e7de707';

-- 2. Also add to collection_point_users for dual-link safety
INSERT INTO collection_point_users (user_id, collection_point_id, tenant_id, is_active)
SELECT 
  '48f70a04-369d-415e-9a41-1f145e7de707',
  '6536f7bb-0c24-472a-afe4-a0454cd03392',
  cp.tenant_id,
  true
FROM collection_points cp 
WHERE cp.id = '6536f7bb-0c24-472a-afe4-a0454cd03392'
ON CONFLICT DO NOTHING;

-- 3. Update check_cp_permission to also check collection_point_users fallback
CREATE OR REPLACE FUNCTION public.check_cp_permission(_permission text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT (cp.settings ->> _permission)::boolean
     FROM profiles p
     JOIN collection_points cp ON cp.id = p.collection_point_id
     WHERE p.id = auth.uid()
       AND cp.is_active = true),
    (SELECT (cp.settings ->> _permission)::boolean
     FROM collection_point_users cpu
     JOIN collection_points cp ON cp.id = cpu.collection_point_id
     WHERE cpu.user_id = auth.uid() 
       AND cpu.is_active = true
       AND cp.is_active = true
     LIMIT 1),
    false
  );
$$;
