-- Drop all existing overly permissive storage policies
DROP POLICY IF EXISTS "Anyone can view device photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view so attachments" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can delete device photos" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can delete so attachments" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can upload device photos" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can upload so attachments" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can view device photos" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can view so attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete device photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete so attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload device photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload so attachments" ON storage.objects;

-- ===== DEVICE PHOTOS =====
-- Path convention: {deviceId}/{filename}
-- Upload: admin, manager, front_desk
CREATE POLICY "dp_upload" ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'device-photos'
  AND public.has_any_role(auth.uid(), ARRAY['admin','manager','front_desk']::public.app_role[])
);

-- Select: operational roles + technicians assigned to related SO
CREATE POLICY "dp_select" ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'device-photos'
  AND (
    public.has_any_role(auth.uid(), ARRAY['admin','manager','front_desk','bench_technician','field_technician']::public.app_role[])
    OR (
      public.has_role(auth.uid(), 'customer'::public.app_role)
      AND EXISTS (
        SELECT 1 FROM public.devices d
        JOIN public.customers c ON c.id = d.customer_id
        WHERE d.id::text = (string_to_array(objects.name, '/'))[1]
          AND c.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
    )
  )
);

-- Delete: admin, manager only
CREATE POLICY "dp_delete" ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'device-photos'
  AND public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[])
);

-- ===== SERVICE ORDER ATTACHMENTS =====
-- Path convention: {serviceOrderId}/{filename} or logistics/{id}/{filename}
-- Upload: operational + technicians
CREATE POLICY "soa_upload" ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'service-order-attachments'
  AND public.has_any_role(auth.uid(), ARRAY['admin','manager','front_desk','bench_technician','field_technician']::public.app_role[])
);

-- Select: operational roles, technicians for assigned SOs, customers for own SOs, CP operators
CREATE POLICY "soa_select" ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'service-order-attachments'
  AND (
    public.has_any_role(auth.uid(), ARRAY['admin','manager','front_desk','bench_technician','field_technician']::public.app_role[])
    OR (
      public.has_role(auth.uid(), 'customer'::public.app_role)
      AND EXISTS (
        SELECT 1 FROM public.service_orders so
        JOIN public.customers c ON c.id = so.customer_id
        WHERE so.id::text = (string_to_array(objects.name, '/'))[1]
          AND c.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
    )
    OR (
      public.has_role(auth.uid(), 'collection_point_operator'::public.app_role)
      AND EXISTS (
        SELECT 1 FROM public.service_orders so
        JOIN public.collection_point_users cpu ON cpu.collection_point_id = so.collection_point_id
        WHERE so.id::text = (string_to_array(objects.name, '/'))[1]
          AND cpu.user_id = auth.uid() AND cpu.is_active = true
      )
    )
  )
);

-- Delete: admin, manager
CREATE POLICY "soa_delete" ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'service-order-attachments'
  AND public.has_any_role(auth.uid(), ARRAY['admin','manager']::public.app_role[])
);