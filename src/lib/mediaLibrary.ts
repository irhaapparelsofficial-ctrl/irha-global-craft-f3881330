export const SITE_MEDIA_BUCKET = "site-media";
export const MAX_MEDIA_BYTES = 10 * 1024 * 1024;

export const ALLOWED_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "application/pdf",
] as const;

export type AllowedMediaType = (typeof ALLOWED_MEDIA_TYPES)[number];

export type MediaValidation = {
  ok: boolean;
  message: string | null;
  mimeType: AllowedMediaType | null;
};

export function validateMediaFile(file: Pick<File, "name" | "size" | "type">): MediaValidation {
  if (!file.name || !file.name.trim()) {
    return { ok: false, message: "File name is required.", mimeType: null };
  }
  if (file.size <= 0) {
    return { ok: false, message: "Empty files cannot be uploaded.", mimeType: null };
  }
  if (file.size > MAX_MEDIA_BYTES) {
    return { ok: false, message: "Maximum upload size is 10 MB.", mimeType: null };
  }
  if (!ALLOWED_MEDIA_TYPES.includes(file.type as AllowedMediaType)) {
    return { ok: false, message: "Use JPG, PNG, WebP, AVIF or PDF files only.", mimeType: null };
  }
  return { ok: true, message: null, mimeType: file.type as AllowedMediaType };
}

export function sanitizeMediaBaseName(name: string) {
  const withoutExtension = name.replace(/\.[^.]+$/, "");
  const cleaned = withoutExtension
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
  return cleaned || "media";
}

export function extensionForMime(mimeType: AllowedMediaType) {
  switch (mimeType) {
    case "image/jpeg": return "jpg";
    case "image/png": return "png";
    case "image/webp": return "webp";
    case "image/avif": return "avif";
    case "application/pdf": return "pdf";
  }
}

export function createMediaStoragePath(file: Pick<File, "name" | "type">, now = new Date(), nonce = crypto.randomUUID()) {
  const mimeType = file.type as AllowedMediaType;
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const safeNonce = nonce.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 40) || "asset";
  return `${year}/${month}/${sanitizeMediaBaseName(file.name)}-${safeNonce}.${extensionForMime(mimeType)}`;
}

export function splitMediaTags(value: string) {
  return Array.from(new Set(
    value
      .split(/[,\n]/)
      .map((item) => item.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 60))
      .filter(Boolean),
  )).slice(0, 30);
}

export function formatMediaBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const amount = value / 1024 ** index;
  return `${amount >= 10 || index === 0 ? amount.toFixed(0) : amount.toFixed(1)} ${units[index]}`;
}

export function readImageDimensions(file: File): Promise<{ width: number | null; height: number | null }> {
  if (!file.type.startsWith("image/")) return Promise.resolve({ width: null, height: null });

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth || null, height: image.naturalHeight || null });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: null, height: null });
    };
    image.src = url;
  });
}
