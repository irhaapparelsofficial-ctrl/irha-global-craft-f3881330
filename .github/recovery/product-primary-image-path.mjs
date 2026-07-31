const LEGACY_FRONT_FILENAME = /-front\.(?:avif|jpe?g|png|webp)$/i;
const IA_MEDIA_E001_REFERENCE_CODES = new Set([
  "P001",
  "P002",
  "P003",
  "P004",
  "P005",
  "P006",
  "P007",
]);
const IA_MEDIA_E001_RELEASE = "ia-media-e001-20260730";
const IA_MEDIA_E001_HERO_FILENAME = /^01-hero-[A-Za-z0-9_-]{20,}\.webp$/;

export function isDeterministicProductPrimaryPath(referenceCode, pathname) {
  const reference = String(referenceCode || "").toUpperCase();
  const referencePrefix = reference.toLowerCase();
  const segments = String(pathname || "").split("/").filter(Boolean);
  const catalogIndex = segments.findIndex(
    (segment, index) => segment === "catalog" && segments[index + 1] === "products",
  );
  if (catalogIndex < 0) return false;

  const productDirectory = segments[catalogIndex + 2] || "";
  const tail = segments.slice(catalogIndex + 3);
  if (!productDirectory.startsWith(`${referencePrefix}-`)) return false;

  if (tail.length === 1) {
    const filename = tail[0];
    return filename.startsWith(`${referencePrefix}-`) && LEGACY_FRONT_FILENAME.test(filename);
  }

  return IA_MEDIA_E001_REFERENCE_CODES.has(reference)
    && tail.length === 2
    && tail[0] === IA_MEDIA_E001_RELEASE
    && IA_MEDIA_E001_HERO_FILENAME.test(tail[1]);
}
