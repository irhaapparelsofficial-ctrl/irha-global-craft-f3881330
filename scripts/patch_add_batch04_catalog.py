from pathlib import Path

path = Path("src/hooks/usePublicCatalog.ts")
content = path.read_text(encoding="utf-8")

import_line = 'import { createSupplementalBatch04ProductsForSubcategory } from "@/lib/supplementalCatalogBatch04";'
if import_line not in content:
    needle = 'import { createSupplementalBatch03ProductsForSubcategory } from "@/lib/supplementalCatalogBatch03";\n'
    if content.count(needle) != 1:
        raise RuntimeError("Batch 03 import insertion point not found exactly once")
    content = content.replace(needle, needle + import_line + "\n", 1)

call_line = '    ...createSupplementalBatch04ProductsForSubcategory(top.slug, sub.slug, sub.name, sub.id),'
if call_line not in content:
    needle = '    ...createSupplementalBatch03ProductsForSubcategory(top.slug, sub.slug, sub.name, sub.id),\n'
    if content.count(needle) != 1:
        raise RuntimeError("Batch 03 catalog insertion point not found exactly once")
    content = content.replace(needle, needle + call_line + "\n", 1)

path.write_text(content, encoding="utf-8")
print("Registered supplemental catalog Batch 04.")
