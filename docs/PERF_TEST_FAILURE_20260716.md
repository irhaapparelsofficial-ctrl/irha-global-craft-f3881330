# Performance branch test diagnostic — 2026-07-16

- Test exit status: `1`

```text
 [32m✓[39m src/lib/__checks__/categoryTaxonomyConversion.test.ts[2m > [22mtaxonomy collection conversion journey[2m > [22mturns an empty collection into an assisted custom-review path[32m 0[2mms[22m[39m
 [32m✓[39m src/lib/__checks__/categoryTaxonomyConversion.test.ts[2m > [22mtaxonomy collection conversion journey[2m > [22mkeeps product detail routes and the existing taxonomy hierarchy intact[32m 0[2mms[22m[39m
 [31m×[39m src/lib/__checks__/catalogueConversionUpgrade.test.ts[2m > [22mcatalogue conversion upgrade[2m > [22muses published product imagery for catalogue group cards with safe fallbacks[32m 30[2mms[22m[39m
[31m   → expected 'import { Link } from "react-router-do…' to contain 'from("products")'[39m
 [32m✓[39m src/lib/__checks__/catalogueConversionUpgrade.test.ts[2m > [22mcatalogue conversion upgrade[2m > [22mshows buyer-facing manufacturing chips from real product fields[32m 1[2mms[22m[39m
 [32m✓[39m src/lib/__checks__/catalogueConversionUpgrade.test.ts[2m > [22mcatalogue conversion upgrade[2m > [22mpreserves exact selected-product context in catalogue lead handoff[32m 1[2mms[22m[39m
 [32m✓[39m src/lib/__checks__/catalogueConversionUpgrade.test.ts[2m > [22mcatalogue conversion upgrade[2m > [22muses clearer catalogue and bulk-requirement calls to action[32m 1[2mms[22m[39m
 [32m✓[39m src/test/cms.test.ts[2m > [22madmin CMS hero normalization[2m > [22mkeeps the current verified content as fallback[32m 3[2mms[22m[39m
 [32m✓[39m src/test/cms.test.ts[2m > [22madmin CMS hero normalization[2m > [22maccepts reviewed text and internal CTA paths[32m 1[2mms[22m[39m
 [32m✓[39m src/test/cms.test.ts[2m > [22madmin CMS hero normalization[2m > [22mrejects unsafe or protocol-relative CTA destinations[32m 1[2mms[22m[39m
 [32m✓[39m src/test/cms.test.ts[2m > [22madmin CMS hero normalization[2m > [22maccepts HTTPS external destinations but not HTTP[32m 0[2mms[22m[39m
 [32m✓[39m src/lib/indexNowCoverage.test.ts[2m > [22mIndexNow changed-URL coverage[2m > [22mcovers every audited buyer-intent page[32m 3[2mms[22m[39m
 [32m✓[39m src/lib/indexNowCoverage.test.ts[2m > [22mIndexNow changed-URL coverage[2m > [22mcovers the market hub and every country sourcing guide[32m 0[2mms[22m[39m
 [32m✓[39m src/lib/indexNowCoverage.test.ts[2m > [22mIndexNow changed-URL coverage[2m > [22mcovers the blog hub and every trusted article URL[32m 0[2mms[22m[39m
 [32m✓[39m src/lib/indexNowCoverage.test.ts[2m > [22mIndexNow changed-URL coverage[2m > [22mkeeps the default payload canonical and duplicate-free[32m 11[2mms[22m[39m
 [32m✓[39m src/test/productionWorkflow.test.ts[2m > [22msample and production workflow[2m > [22mmoves through the defined internal production sequence[32m 2[2mms[22m[39m
--
 [32m✓[39m src/test/weeklySchedule.test.ts[2m > [22mweekly schedule safety[2m > [22mreturns null for invalid dates[32m 0[2mms[22m[39m
 [32m✓[39m src/test/example.test.ts[2m > [22mexample[2m > [22mshould pass[32m 2[2mms[22m[39m

[31m⎯⎯⎯⎯⎯⎯⎯[39m[1m[41m Failed Tests 1 [49m[22m[31m⎯⎯⎯⎯⎯⎯⎯[39m

[41m[1m FAIL [22m[49m src/lib/__checks__/catalogueConversionUpgrade.test.ts[2m > [22mcatalogue conversion upgrade[2m > [22muses published product imagery for catalogue group cards with safe fallbacks
[31m[1mAssertionError[22m: expected 'import { Link } from "react-router-do…' to contain 'from("products")'[39m

[32m- Expected[39m
[31m+ Received[39m

[32m- from("products")[39m
[31m+ import { Link } from "react-router-dom";[39m
[31m+ import { ArrowUpRight, MessageCircle, Send, Share2 } from "lucide-react";[39m
[31m+ import { useState } from "react";[39m
[31m+ import SEO from "@/components/SEO";[39m
[31m+ import CatalogueLeadForm from "@/components/CatalogueLeadForm";[39m
[31m+ import HeroMediaSlideshow from "@/components/HeroMediaSlideshow";[39m
[31m+ import ThumbnailImage from "@/components/ThumbnailImage";[39m
--
[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯[22m[39m


[2m Test Files [22m [1m[31m1 failed[39m[22m[2m | [22m[1m[32m109 passed[39m[22m[90m (110)[39m
[2m      Tests [22m [1m[31m1 failed[39m[22m[2m | [22m[1m[32m507 passed[39m[22m[90m (508)[39m
[2m   Start at [22m 23:25:28
[2m   Duration [22m 30.15s[2m (transform 2.01s, setup 7.59s, import 4.45s, tests 2.24s, environment 54.55s)[22m

```
