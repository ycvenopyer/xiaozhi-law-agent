UPDATE storage.buckets
SET allowed_mime_types = array_append(allowed_mime_types, 'application/msword')
WHERE id = 'private-files'
  AND allowed_mime_types IS NOT NULL
  AND NOT 'application/msword' = ANY (allowed_mime_types);
