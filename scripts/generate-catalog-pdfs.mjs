#!/usr/bin/env node

import { copyFile, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const THUMB_DIR = path.join(ROOT, "public", "catalogs", "thumbs");
const OUTPUT_DIR = path.join(ROOT, "public", "catalogs");
const LEGACY_MASTER_PATH = path.join(ROOT, "public", "Irha-Apparels-Catalog-2026.pdf");
const A4 = Object.freeze({ width: 595.28, height: 841.89 });
const SOF_MARKERS = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);

function parseJpegDimensions(buffer, filename) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    throw new Error(`${filename} is not a valid JPEG thumbnail`);
  }

  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    while (offset < buffer.length && buffer[offset] === 0xff) offset += 1;
    const marker = buffer[offset];
    offset += 1;

    if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      continue;
    }

    if (offset + 1 >= buffer.length) break;
    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > buffer.length) break;

    if (SOF_MARKERS.has(marker)) {
      const height = buffer.readUInt16BE(offset + 3);
      const width = buffer.readUInt16BE(offset + 5);
      const components = buffer[offset + 7];
      if (!width || !height) throw new Error(`${filename} has invalid JPEG dimensions`);
      return { width, height, components };
    }

    offset += segmentLength;
  }

  throw new Error(`Could not read JPEG dimensions for ${filename}`);
}

function pdfString(value) {
  return Buffer.from(value, "binary");
}

function streamObject(dictionary, payload) {
  return Buffer.concat([
    pdfString(`<< ${dictionary} /Length ${payload.length} >>\nstream\n`),
    payload,
    pdfString("\nendstream"),
  ]);
}

function buildPdf(images) {
  if (images.length === 0) throw new Error("Cannot build an empty catalogue PDF");

  const objects = new Map();
  const pageIds = images.map((_, index) => 5 + index * 3);

  objects.set(1, pdfString("<< /Type /Catalog /Pages 2 0 R >>"));
  objects.set(2, pdfString(`<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] >>`));

  images.forEach((image, index) => {
    const imageId = 3 + index * 3;
    const contentId = 4 + index * 3;
    const pageId = 5 + index * 3;
    const scale = Math.min(A4.width / image.width, A4.height / image.height);
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    const x = (A4.width - drawWidth) / 2;
    const y = (A4.height - drawHeight) / 2;
    const colorSpace = image.components === 1 ? "/DeviceGray" : image.components === 4 ? "/DeviceCMYK" : "/DeviceRGB";
    const decode = image.components === 4 ? " /Decode [1 0 1 0 1 0 1 0]" : "";

    objects.set(
      imageId,
      streamObject(
        `/Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace ${colorSpace} /BitsPerComponent 8 /Filter /DCTDecode${decode}`,
        image.buffer,
      ),
    );

    const content = pdfString(
      `q\n${drawWidth.toFixed(3)} 0 0 ${drawHeight.toFixed(3)} ${x.toFixed(3)} ${y.toFixed(3)} cm\n/Im0 Do\nQ`,
    );
    objects.set(contentId, streamObject("", content));
    objects.set(
      pageId,
      pdfString(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4.width} ${A4.height}] /Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`,
      ),
    );
  });

  const maxId = Math.max(...objects.keys());
  const chunks = [pdfString("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n")];
  const offsets = new Array(maxId + 1).fill(0);
  let byteOffset = chunks[0].length;

  for (let id = 1; id <= maxId; id += 1) {
    const body = objects.get(id);
    if (!body) throw new Error(`Missing PDF object ${id}`);
    offsets[id] = byteOffset;
    const objectBuffer = Buffer.concat([pdfString(`${id} 0 obj\n`), body, pdfString("\nendobj\n")]);
    chunks.push(objectBuffer);
    byteOffset += objectBuffer.length;
  }

  const xrefOffset = byteOffset;
  const xrefLines = ["xref", `0 ${maxId + 1}`, "0000000000 65535 f "];
  for (let id = 1; id <= maxId; id += 1) {
    xrefLines.push(`${String(offsets[id]).padStart(10, "0")} 00000 n `);
  }
  chunks.push(pdfString(`${xrefLines.join("\n")}\ntrailer\n<< /Size ${maxId + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`));

  return Buffer.concat(chunks);
}

async function discoverCatalogues() {
  const files = await readdir(THUMB_DIR);
  const catalogues = new Map();

  for (const filename of files) {
    const match = filename.match(/^(.+)-(\d+)\.jpg$/i);
    if (!match) continue;
    const [, base, pageText] = match;
    const page = Number.parseInt(pageText, 10);
    if (!Number.isSafeInteger(page) || page < 1) continue;
    const pages = catalogues.get(base) ?? [];
    pages.push({ filename, page });
    catalogues.set(base, pages);
  }

  if (!catalogues.has("master-catalogue-2026")) {
    throw new Error("Master catalogue thumbnails are missing");
  }

  return catalogues;
}

async function generateCatalogues() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const catalogues = await discoverCatalogues();
  const generated = [];

  for (const [base, pages] of [...catalogues.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    pages.sort((a, b) => a.page - b.page);
    pages.forEach((entry, index) => {
      const expected = index + 1;
      if (entry.page !== expected) {
        throw new Error(`${base} is missing page ${expected}; found page ${entry.page} instead`);
      }
    });

    const images = [];
    for (const entry of pages) {
      const filePath = path.join(THUMB_DIR, entry.filename);
      const buffer = await readFile(filePath);
      images.push({ ...parseJpegDimensions(buffer, entry.filename), buffer });
    }

    const pdf = buildPdf(images);
    const outputPath = path.join(OUTPUT_DIR, `${base}.pdf`);
    await writeFile(outputPath, pdf);
    const outputStat = await stat(outputPath);
    if (outputStat.size < 10_000) throw new Error(`${base}.pdf is unexpectedly small`);
    generated.push({ base, pages: pages.length, bytes: outputStat.size, outputPath });
  }

  const masterPath = path.join(OUTPUT_DIR, "master-catalogue-2026.pdf");
  await copyFile(masterPath, LEGACY_MASTER_PATH);

  for (const item of generated) {
    console.log(`generated ${path.relative(ROOT, item.outputPath)} (${item.pages} pages, ${item.bytes} bytes)`);
  }
  console.log(`mirrored ${path.relative(ROOT, LEGACY_MASTER_PATH)}`);
}

generateCatalogues().catch((error) => {
  console.error("Catalogue PDF generation failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
