-- Proven duplicate: both indexes cover (product_drive_folder_id, role, role_index),
-- neither backs a constraint. Keep the more-used catalog_drive_files_product_role_idx.
drop index if exists public.catalog_drive_files_product_idx;
