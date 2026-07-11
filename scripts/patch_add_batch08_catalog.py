from pathlib import Path

path = Path("src/hooks/usePublicCatalog.ts")
content = path.read_text(encoding="utf-8")

import_line = 'import { createSupplementalBatch08ProductsForSubcategory } from "@/lib/supplementalCatalogBatch08";'
if import_line not in content:
    needle = 'import { createSupplementalBatch07ProductsForSubcategory } from "@/lib/supplementalCatalogBatch07";\n'
    if content.count(needle) != 1:
        raise RuntimeError("Batch 07 import insertion point not found exactly once")
    content = content.replace(needle, needle + import_line + "\n", 1)

call_line = '    ...createSupplementalBatch08ProductsForSubcategory(top.slug, sub.slug, sub.name, sub.id),'
if call_line not in content:
    needle = '    ...createSupplementalBatch07ProductsForSubcategory(top.slug, sub.slug, sub.name, sub.id),\n'
    if content.count(needle) != 1:
        raise RuntimeError("Batch 07 catalog insertion point not found exactly once")
    content = content.replace(needle, needle + call_line + "\n", 1)

path.write_text(content, encoding="utf-8")
print("Registered supplemental catalog Batch 08.")
