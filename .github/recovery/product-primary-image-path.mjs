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

const normalizeReferenceCode = (value) =>
  String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/^IRHA-/, "");

const normalizePathname = (value) => {
  try {
    return decodeURIComponent(String(value ?? "").trim()).replace(/\/{2,}/g, "/");
  } catch {
    return "";
  }
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function isDeterministicProductPrimaryPath(referenceCode, pathname) {
  const reference = normalizeReferenceCode(referenceCode);
  if (!/^P\d{3}$/.test(reference)) return false;

  const referencePrefix = reference.toLowerCase();
  const normalizedPath = normalizePathname(pathname);
  const escapedPrefix = escapeRegExp(referencePrefix);

  const legacyFrontPattern = new RegExp(
    `(?:^|/)catalog/products/${escapedPrefix}-[^/]+/${escapedPrefix}-[^/]*-front\\.(?:avif|jpe?g|png|webp)$`,
    "i",
  );
  if (legacyFrontPattern.test(normalizedPath)) return true;

  if (!IA_MEDIA_E001_REFERENCE_CODES.has(reference)) return false;

  const verifiedHeroPattern = new RegExp(
    `(?:^|/)catalog/products/${escapedPrefix}-[^/]+/${IA_MEDIA_E001_RELEASE}/01-hero-[A-Za-z0-9_-]{20,}\\.webp$`,
    "i",
  );
  return verifiedHeroPattern.test(normalizedPath);
}
