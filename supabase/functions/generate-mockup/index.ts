import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import {
  authorizeDurableRateLimit,
  DurableRateLimitUnavailableError,
  isValidClientSessionId,
  type RateLimitRpcClient,
} from "../_shared/durable-rate-limit.ts";

const WIDTH = 480;
const HEIGHT = 640;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type RGBA = [number, number, number, number];

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function hexToRgba(hex: string): RGBA {
  const clean = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.slice(1) : "243447";
  return [parseInt(clean.slice(0, 2), 16), parseInt(clean.slice(2, 4), 16), parseInt(clean.slice(4, 6), 16), 255];
}

function mix(a: RGBA, b: RGBA, t: number): RGBA {
  return [
    clampByte(a[0] + (b[0] - a[0]) * t),
    clampByte(a[1] + (b[1] - a[1]) * t),
    clampByte(a[2] + (b[2] - a[2]) * t),
    clampByte(a[3] + (b[3] - a[3]) * t),
  ];
}

class Raster {
  readonly pixels: Uint8Array;

  constructor(readonly width: number, readonly height: number) {
    this.pixels = new Uint8Array(width * height * 4);
  }

  setPixel(x: number, y: number, color: RGBA) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    const i = (y * this.width + x) * 4;
    const alpha = color[3] / 255;
    const inv = 1 - alpha;
    this.pixels[i] = clampByte(color[0] * alpha + this.pixels[i] * inv);
    this.pixels[i + 1] = clampByte(color[1] * alpha + this.pixels[i + 1] * inv);
    this.pixels[i + 2] = clampByte(color[2] * alpha + this.pixels[i + 2] * inv);
    this.pixels[i + 3] = clampByte(255 * (alpha + (this.pixels[i + 3] / 255) * inv));
  }

  fillRect(x: number, y: number, width: number, height: number, color: RGBA) {
    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(this.width, Math.ceil(x + width));
    const y1 = Math.min(this.height, Math.ceil(y + height));
    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) this.setPixel(px, py, color);
    }
  }

  fillEllipse(cx: number, cy: number, rx: number, ry: number, color: RGBA) {
    const x0 = Math.max(0, Math.floor(cx - rx));
    const x1 = Math.min(this.width - 1, Math.ceil(cx + rx));
    const y0 = Math.max(0, Math.floor(cy - ry));
    const y1 = Math.min(this.height - 1, Math.ceil(cy + ry));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.setPixel(x, y, color);
      }
    }
  }

  fillPolygon(points: Array<[number, number]>, color: RGBA) {
    if (points.length < 3) return;
    const minY = Math.max(0, Math.floor(Math.min(...points.map((point) => point[1]))));
    const maxY = Math.min(this.height - 1, Math.ceil(Math.max(...points.map((point) => point[1]))));
    for (let y = minY; y <= maxY; y++) {
      const intersections: number[] = [];
      for (let i = 0; i < points.length; i++) {
        const [x1, y1] = points[i];
        const [x2, y2] = points[(i + 1) % points.length];
        if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) {
          intersections.push(x1 + ((y - y1) * (x2 - x1)) / (y2 - y1));
        }
      }
      intersections.sort((a, b) => a - b);
      for (let i = 0; i + 1 < intersections.length; i += 2) {
        for (let x = Math.ceil(intersections[i]); x <= Math.floor(intersections[i + 1]); x++) {
          this.setPixel(x, y, color);
        }
      }
    }
  }

  line(x0: number, y0: number, x1: number, y1: number, color: RGBA, thickness = 1) {
    const dx = Math.abs(Math.round(x1) - Math.round(x0));
    const sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(Math.round(y1) - Math.round(y0));
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    let x = Math.round(x0);
    let y = Math.round(y0);
    while (true) {
      const radius = Math.max(0, Math.floor(thickness / 2));
      for (let oy = -radius; oy <= radius; oy++) {
        for (let ox = -radius; ox <= radius; ox++) this.setPixel(x + ox, y + oy, color);
      }
      if (x === Math.round(x1) && y === Math.round(y1)) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
  }
}

function garmentType(name: string): "dress" | "shorts" | "jacket" | "shirt" | "pants" {
  const value = name.toLowerCase();
  if (/dirndl|dress|gown|skirt/.test(value)) return "dress";
  if (/lederhosen|short|trouser short/.test(value)) return "shorts";
  if (/jacket|janker|vest|waistcoat|suit|blazer|coat|biker|motorcycle/.test(value)) return "jacket";
  if (/pant|trouser|jean|denim/.test(value)) return "pants";
  return "shirt";
}

function drawBackground(raster: Raster) {
  const top: RGBA = [10, 15, 24, 255];
  const bottom: RGBA = [36, 43, 55, 255];
  for (let y = 0; y < raster.height; y++) {
    raster.fillRect(0, y, raster.width, 1, mix(top, bottom, y / (raster.height - 1)));
  }
  raster.fillEllipse(raster.width / 2, 570, 155, 28, [0, 0, 0, 85]);
  raster.line(28, 48, 150, 48, [199, 162, 83, 220], 2);
  raster.line(330, 48, 452, 48, [199, 162, 83, 220], 2);
  raster.fillRect(28, 590, 424, 1, [255, 255, 255, 35]);
}

function drawLogoMarker(raster: Raster, x: number, y: number, size = 28) {
  const border: RGBA = [246, 230, 190, 235];
  const fill: RGBA = [18, 24, 34, 205];
  raster.fillRect(x - size, y - size * 0.62, size * 2, size * 1.24, fill);
  raster.line(x - size, y - size * 0.62, x + size, y - size * 0.62, border, 2);
  raster.line(x + size, y - size * 0.62, x + size, y + size * 0.62, border, 2);
  raster.line(x + size, y + size * 0.62, x - size, y + size * 0.62, border, 2);
  raster.line(x - size, y + size * 0.62, x - size, y - size * 0.62, border, 2);
  raster.line(x - size * 0.55, y, x + size * 0.55, y, border, 2);
  raster.line(x, y - size * 0.32, x, y + size * 0.32, border, 2);
}

function addPattern(raster: Raster, presetId: string, box: { x: number; y: number; w: number; h: number }, accent: RGBA) {
  const id = presetId.toLowerCase();
  if (/plain|minimal|none/.test(id)) {
    raster.line(box.x + 12, box.y + box.h - 18, box.x + box.w - 12, box.y + box.h - 18, accent, 2);
    return;
  }
  if (/stripe|line|track/.test(id)) {
    for (let x = box.x + 22; x < box.x + box.w - 10; x += 22) {
      raster.line(x, box.y + 15, x, box.y + box.h - 15, accent, 2);
    }
    return;
  }
  if (/dot|sport|performance/.test(id)) {
    for (let y = box.y + 22; y < box.y + box.h - 12; y += 25) {
      for (let x = box.x + 18 + ((y / 25) % 2) * 10; x < box.x + box.w - 10; x += 25) {
        raster.fillEllipse(x, y, 3, 3, accent);
      }
    }
    return;
  }
  for (let y = box.y + 25; y < box.y + box.h - 15; y += 34) {
    for (let x = box.x + 28; x < box.x + box.w - 18; x += 42) {
      raster.line(x, y - 7, x + 7, y, accent, 2);
      raster.line(x + 7, y, x, y + 7, accent, 2);
      raster.line(x, y + 7, x - 7, y, accent, 2);
      raster.line(x - 7, y, x, y - 7, accent, 2);
    }
  }
}

function drawShirt(raster: Raster, base: RGBA, accent: RGBA, back: boolean, presetId: string) {
  const dark = mix(base, [0, 0, 0, 255], 0.24);
  raster.fillPolygon([[148, 185], [102, 220], [57, 320], [105, 343], [133, 292], [143, 520], [337, 520], [347, 292], [375, 343], [423, 320], [378, 220], [332, 185], [292, 166], [188, 166]], dark);
  raster.fillPolygon([[148, 185], [188, 166], [205, 194], [240, 209], [275, 194], [292, 166], [332, 185], [337, 520], [143, 520]], base);
  raster.fillEllipse(240, 168, 38, 23, [13, 18, 27, 255]);
  if (!back) {
    raster.line(240, 202, 240, 510, accent, 2);
    for (let y = 230; y <= 330; y += 25) raster.fillEllipse(240, y, 3, 3, accent);
  } else {
    raster.line(170, 215, 310, 215, accent, 2);
  }
  addPattern(raster, presetId, { x: 164, y: 235, w: 152, h: 210 }, [accent[0], accent[1], accent[2], 125]);
}

function drawDress(raster: Raster, base: RGBA, accent: RGBA, back: boolean, presetId: string) {
  const dark = mix(base, [0, 0, 0, 255], 0.22);
  raster.fillPolygon([[190, 158], [150, 185], [118, 300], [155, 315], [175, 250], [172, 335], [86, 530], [394, 530], [308, 335], [305, 250], [325, 315], [362, 300], [330, 185], [290, 158]], dark);
  raster.fillPolygon([[190, 158], [212, 190], [240, 202], [268, 190], [290, 158], [310, 325], [360, 520], [120, 520], [170, 325]], base);
  raster.fillEllipse(240, 162, 34, 20, [13, 18, 27, 255]);
  raster.fillRect(170, 315, 140, 18, accent);
  if (!back) {
    raster.fillPolygon([[195, 213], [240, 238], [285, 213], [275, 295], [205, 295]], mix(base, [255, 255, 255, 255], 0.12));
    raster.line(240, 238, 240, 300, accent, 2);
  } else {
    raster.line(190, 215, 290, 215, accent, 2);
  }
  addPattern(raster, presetId, { x: 145, y: 350, w: 190, h: 140 }, [accent[0], accent[1], accent[2], 145]);
}

function drawShorts(raster: Raster, base: RGBA, accent: RGBA, back: boolean, presetId: string) {
  const dark = mix(base, [0, 0, 0, 255], 0.28);
  raster.fillRect(145, 285, 190, 42, dark);
  raster.fillPolygon([[145, 325], [237, 325], [226, 505], [120, 505], [128, 380]], base);
  raster.fillPolygon([[243, 325], [335, 325], [352, 505], [246, 505], [254, 380]], base);
  if (!back) {
    raster.line(180, 288, 196, 160, accent, 8);
    raster.line(300, 288, 284, 160, accent, 8);
    raster.line(196, 160, 240, 205, accent, 8);
    raster.line(284, 160, 240, 205, accent, 8);
    raster.fillEllipse(240, 205, 10, 10, accent);
    raster.line(145, 355, 335, 355, accent, 2);
  } else {
    raster.line(180, 288, 200, 160, accent, 8);
    raster.line(300, 288, 280, 160, accent, 8);
    raster.line(200, 160, 280, 240, accent, 8);
    raster.line(280, 160, 200, 240, accent, 8);
    raster.line(145, 370, 335, 370, accent, 2);
  }
  addPattern(raster, presetId, { x: 155, y: 375, w: 170, h: 95 }, [accent[0], accent[1], accent[2], 145]);
}

function drawJacket(raster: Raster, base: RGBA, accent: RGBA, back: boolean, presetId: string) {
  const dark = mix(base, [0, 0, 0, 255], 0.28);
  raster.fillPolygon([[158, 170], [108, 204], [64, 430], [115, 442], [143, 290], [148, 525], [332, 525], [337, 290], [365, 442], [416, 430], [372, 204], [322, 170], [284, 150], [196, 150]], dark);
  raster.fillPolygon([[158, 170], [196, 150], [240, 215], [284, 150], [322, 170], [332, 525], [148, 525]], base);
  raster.fillPolygon([[196, 150], [240, 215], [210, 246], [176, 185]], mix(base, [255, 255, 255, 255], 0.1));
  raster.fillPolygon([[284, 150], [240, 215], [270, 246], [304, 185]], mix(base, [255, 255, 255, 255], 0.1));
  if (!back) {
    raster.line(240, 214, 240, 515, accent, 3);
    raster.line(167, 350, 218, 350, accent, 3);
    raster.line(262, 350, 313, 350, accent, 3);
  } else {
    raster.line(172, 225, 308, 225, accent, 2);
    raster.line(240, 225, 240, 515, [accent[0], accent[1], accent[2], 110], 2);
  }
  addPattern(raster, presetId, { x: 175, y: 270, w: 130, h: 190 }, [accent[0], accent[1], accent[2], 100]);
}

function drawPants(raster: Raster, base: RGBA, accent: RGBA, back: boolean, presetId: string) {
  raster.fillRect(156, 145, 168, 40, mix(base, [0, 0, 0, 255], 0.25));
  raster.fillPolygon([[156, 183], [238, 183], [225, 525], [135, 525], [145, 330]], base);
  raster.fillPolygon([[242, 183], [324, 183], [335, 525], [245, 525], [255, 330]], base);
  if (!back) {
    raster.line(240, 190, 240, 310, accent, 2);
    raster.line(165, 250, 215, 280, accent, 2);
    raster.line(315, 250, 265, 280, accent, 2);
  } else {
    raster.line(170, 235, 220, 235, accent, 2);
    raster.line(260, 235, 310, 235, accent, 2);
  }
  addPattern(raster, presetId, { x: 165, y: 330, w: 150, h: 130 }, [accent[0], accent[1], accent[2], 100]);
}

function drawPreview(productName: string, colorHex: string, presetId: string, placement: string, back: boolean, hasLogo: boolean): Raster {
  const raster = new Raster(WIDTH, HEIGHT);
  drawBackground(raster);
  const base = hexToRgba(colorHex);
  const accent: RGBA = [204, 171, 96, 255];
  switch (garmentType(productName)) {
    case "dress": drawDress(raster, base, accent, back, presetId); break;
    case "shorts": drawShorts(raster, base, accent, back, presetId); break;
    case "jacket": drawJacket(raster, base, accent, back, presetId); break;
    case "pants": drawPants(raster, base, accent, back, presetId); break;
    default: drawShirt(raster, base, accent, back, presetId); break;
  }
  if (hasLogo) {
    let x = 240;
    let y = back ? 275 : 280;
    const normalizedPlacement = placement.toLowerCase();
    if (!back && /left|chest/.test(normalizedPlacement)) { x = 205; y = 270; }
    if (!back && /right/.test(normalizedPlacement)) { x = 275; y = 270; }
    if (/back/.test(normalizedPlacement) || back) { x = 240; y = 275; }
    drawLogoMarker(raster, x, y, 24);
  }
  raster.fillRect(28, 606, 8, 8, accent);
  raster.fillRect(444, 606, 8, 8, accent);
  return raster;
}

function writeU32(value: number): Uint8Array {
  return new Uint8Array([(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255]);
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let checksum = n;
    for (let k = 0; k < 8; k++) checksum = (checksum & 1) ? 0xedb88320 ^ (checksum >>> 1) : checksum >>> 1;
    table[n] = checksum >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let checksum = 0xffffffff;
  for (const byte of bytes) checksum = crcTable[(checksum ^ byte) & 0xff] ^ (checksum >>> 8);
  return (checksum ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data = new Uint8Array()): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const payload = concatBytes([typeBytes, data]);
  return concatBytes([writeU32(data.length), payload, writeU32(crc32(payload))]);
}

async function encodePng(raster: Raster): Promise<Uint8Array> {
  const scanlines = new Uint8Array((raster.width * 4 + 1) * raster.height);
  for (let y = 0; y < raster.height; y++) {
    const target = y * (raster.width * 4 + 1);
    scanlines[target] = 0;
    scanlines.set(raster.pixels.subarray(y * raster.width * 4, (y + 1) * raster.width * 4), target + 1);
  }
  const stream = new Blob([scanlines]).stream().pipeThrough(new CompressionStream("deflate"));
  const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
  const ihdr = concatBytes([writeU32(raster.width), writeU32(raster.height), new Uint8Array([8, 6, 0, 0, 0])]);
  return concatBytes([
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND"),
  ]);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const size = 0x8000;
  for (let i = 0; i < bytes.length; i += size) binary += String.fromCharCode(...bytes.subarray(i, i + size));
  return btoa(binary);
}

const securityHeaders = {
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
  "Cross-Origin-Resource-Policy": "same-site",
};

const SITE_URL = "https://irhaapparels.com";

function isAllowedOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (url.protocol !== "https:" && !local) return false;
    return url.hostname === "irhaapparels.com" ||
      url.hostname === "www.irhaapparels.com" ||
      local ||
      url.hostname.endsWith(".lovable.app");
  } catch {
    return false;
  }
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && isAllowedOrigin(origin) ? origin : SITE_URL;
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
    ...securityHeaders,
  };
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  headers: Record<string, string>,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...headers,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Irha-Renderer": "deterministic-png-v1",
      ...extraHeaders,
    },
  });
}

type PreviewPayload = {
  productId?: unknown;
  productName?: unknown;
  color?: { label?: unknown; hex?: unknown };
  placement?: unknown;
  presetId?: unknown;
  presetLabel?: unknown;
  logoBase64?: unknown;
  clientSessionId?: unknown;
  rateLimitToken?: unknown;
};

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);
  const respond = (body: Record<string, unknown>, status = 200) => jsonResponse(body, status, headers);

  if (origin && !isAllowedOrigin(origin)) return respond({ error: "origin_not_allowed" }, 403);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return respond({ error: "method_not_allowed" }, 405);

  const declaredLength = Number(req.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > 2_500_000) {
    return respond({ error: "request_too_large" }, 413);
  }

  try {
    const raw = await req.text();
    if (raw.length > 2_500_000) return respond({ error: "request_too_large" }, 413);

    const payload = JSON.parse(raw) as PreviewPayload;
    const productName = typeof payload.productName === "string" ? payload.productName.trim().slice(0, 120) : "";
    const colorHex = typeof payload.color?.hex === "string" ? payload.color.hex.trim() : "";
    const placement = typeof payload.placement === "string" ? payload.placement.trim().slice(0, 60) : "center";
    const presetId = typeof payload.presetId === "string" ? payload.presetId.trim().slice(0, 80) : "minimal";
    const hasLogo = typeof payload.logoBase64 === "string" && payload.logoBase64.startsWith("data:image/") && payload.logoBase64.length <= 2_300_000;
    const clientSessionId = typeof payload.clientSessionId === "string" ? payload.clientSessionId : "";
    const rateLimitToken = typeof payload.rateLimitToken === "string" ? payload.rateLimitToken.slice(0, 2_000) : null;

    if (!productName || !/^#[0-9a-fA-F]{6}$/.test(colorHex) || !isValidClientSessionId(clientSessionId)) {
      return respond({ error: "invalid_preview_request" }, 400);
    }

    const designIdentity = {
      productId: typeof payload.productId === "string" ? payload.productId.slice(0, 120) : null,
      productName,
      colorHex: colorHex.toLowerCase(),
      placement,
      presetId,
      logo: hasLogo && typeof payload.logoBase64 === "string"
        ? {
          length: payload.logoBase64.length,
          prefix: payload.logoBase64.slice(0, 256),
          suffix: payload.logoBase64.slice(-256),
        }
        : null,
    };

    let limiter;
    try {
      limiter = await authorizeDurableRateLimit({
        client: service as unknown as RateLimitRpcClient,
        request: req,
        secret: SERVICE_ROLE_KEY,
        endpoint: "generate-mockup",
        policyKey: "generate-mockup.generate",
        clientSessionId,
        rateLimitToken,
        resourceValue: designIdentity,
        duplicateValue: designIdentity,
      });
    } catch (error) {
      if (error instanceof DurableRateLimitUnavailableError) {
        return respond({ error: "rate_limit_unavailable" }, 503);
      }
      throw error;
    }

    if (!limiter.allowed || limiter.duplicateSuppressed) {
      return jsonResponse(
        { error: "preview_rate_limited" },
        429,
        headers,
        { "Retry-After": String(Math.max(1, limiter.retryAfterSeconds || 1)) },
      );
    }

    const [frontPng, backPng] = await Promise.all([
      encodePng(drawPreview(productName, colorHex, presetId, placement, false, hasLogo)),
      encodePng(drawPreview(productName, colorHex, presetId, placement, true, hasLogo)),
    ]);

    const logoMessage = hasLogo
      ? "The uploaded logo is represented by a placement marker; exact artwork is applied after factory review."
      : "Add a logo in the Custom Lab to preview its intended placement.";

    return respond({
      frontUrl: `data:image/png;base64,${bytesToBase64(frontPng)}`,
      backUrl: `data:image/png;base64,${bytesToBase64(backPng)}`,
      fallback: false,
      message: `Instant non-binding concept preview. ${logoMessage}`,
      renderer: "irha-deterministic-png-v1",
      rateLimitToken: limiter.rateLimitToken,
    });
  } catch (error) {
    console.error("generate-mockup failed", error);
    return respond({ error: "preview_generation_failed" }, 500);
  }
});