
-- Drop and recreate INSERT policy using the same pattern as working uploads
DROP POLICY IF EXISTS "Authenticated upload company assets" ON storage.objects;

CREATE POLICY "Authenticated upload company assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-assets' 
  AND has_any_role(auth.uid(), ARRAY['admin'::app_role, 'manager'::app_role])
);
