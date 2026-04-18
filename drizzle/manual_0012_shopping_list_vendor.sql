-- Add vendor and aisle fields to shopping_list_items for vendor grouping
ALTER TABLE "shopping_list_items" ADD COLUMN IF NOT EXISTS "vendor" varchar(120);
ALTER TABLE "shopping_list_items" ADD COLUMN IF NOT EXISTS "aisle" varchar(50);

CREATE INDEX IF NOT EXISTS "shopping_list_items_vendor_idx" ON "shopping_list_items" ("vendor");
