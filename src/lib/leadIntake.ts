export type LeadIntakeRow = {
  sourceRow: number;
  companyName: string;
  country: string;
  city: string;
  email: string;
  phone: string;
  whatsapp: string;
  website: string;
  buyerType: string;
  productFit: string[];
  sourceUrl: string;
  sourceTitle: string;
  sourceConfidence: string;
  emailVerification: string;
  linkedinUrl: string;
  instagramUrl: string;
  facebookUrl: string;
  priority: string;
  notes: string;
  blockers: string[];
  fingerprint: string;
};

export type LeadIntakeSheet = {
  name: string;
  rows: LeadIntakeRow[];
  rawRowCount: number;
  headerRow: number;
  headers: string[];
};

export type LeadWorkbook = {
  filename: string;
  sheets: LeadIntakeSheet[];
};

type RawSheet = { name: string; rows: string[][] };
type ZipEntry = { method: number; compressedSize: number; dataOffset: number };

const HEADER_ALIASES: Record<string, string[]> = {
  companyName: ["company", "company name", "business", "business name"],
  country: ["country", "market"],
  city: ["city", "city region", "city/region", "region", "city / region"],
  email: ["email", "professional email", "email contact route", "email / contact route", "email/contact route"],
  phone: ["phone", "phone whatsapp", "phone / whatsapp", "phone/whatsapp", "telephone", "mobile"],
  whatsapp: ["whatsapp", "whatsapp mobile", "whatsapp / mobile", "whatsapp/mobile"],
  website: ["website", "website url", "domain", "primary domain"],
  buyerType: ["buyer type", "buyer type segment", "buyer type / segment", "lead type", "category"],
  productFit: ["target category", "product fit", "product fit best offer", "product fit / best offer", "relevant bavarian products", "offer to pitch"],
  sourceUrl: ["source url", "verification source"],
  sourceConfidence: ["source confidence", "data confidence", "contact confidence"],
  emailVerification: ["email verification"],
  linkedinUrl: ["linkedin", "linkedin url", "social profile url"],
  instagramUrl: ["instagram", "instagram social", "instagram / social"],
  facebookUrl: ["facebook", "facebook url"],
  priority: ["priority", "lead priority"],
  notes: ["notes", "verification notes", "why this lead fits", "next action notes", "next action / notes"],
};

const KNOWN_HEADERS = new Set(Object.values(HEADER_ALIASES).flat());

export async function parseLeadWorkbook(file: File): Promise<LeadWorkbook> {
  const lower = file.name.toLowerCase();
  let rawSheets: RawSheet[];
  if (lower.endsWith(".csv") || file.type.includes("csv")) {
    rawSheets = [{ name: file.name.replace(/\.csv$/i, "") || "CSV", rows: parseCsv(await file.text()) }];
  } else if (lower.endsWith(".xlsx") || file.type.includes("spreadsheetml")) {
    rawSheets = await parseXlsx(await file.arrayBuffer());
  } else {
    throw new Error("Only .xlsx and .csv lead files are supported.");
  }

  const sheets = rawSheets
    .map((sheet) => normalizeSheet(sheet))
    .filter((sheet): sheet is LeadIntakeSheet => Boolean(sheet));
  if (!sheets.length) throw new Error("No recognizable lead table was found. A company column plus at least two contact/source columns are required.");
  return { filename: file.name, sheets };
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { cell += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ",") { row.push(cell); cell = ""; }
    else if (char === "\n") { row.push(cell.replace(/\r$/, "")); rows.push(row); row = []; cell = ""; }
    else cell += char;
  }
  if (cell || row.length) { row.push(cell.replace(/\r$/, "")); rows.push(row); }
  return rows.filter((values) => values.some((value) => value.trim()));
}

export function normalizeSheet(sheet: RawSheet): LeadIntakeSheet | null {
  const headerIndex = findHeaderRow(sheet.rows);
  if (headerIndex < 0) return null;
  const headers = sheet.rows[headerIndex].map(normalizeHeader);
  const columnMap = buildColumnMap(headers);
  if (columnMap.companyName === undefined) return null;

  const rows = sheet.rows.slice(headerIndex + 1).map((values, offset) => normalizeRow(values, columnMap, headerIndex + offset + 2)).filter(Boolean) as LeadIntakeRow[];
  if (!rows.length) return null;
  return { name: sheet.name, rows, rawRowCount: Math.max(0, sheet.rows.length - headerIndex - 1), headerRow: headerIndex + 1, headers };
}

export function normalizeHeader(value: string) {
  return clean(value, 120).toLowerCase().replace(/[\n\r]+/g, " ").replace(/[_–—-]+/g, " ").replace(/[^a-z0-9/ ]+/g, " ").replace(/\s+/g, " ").trim();
}

export function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function firstEmail(value: string) {
  const match = clean(value, 600).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  return match ? match.toLowerCase() : "";
}

export function firstUrl(value: string) {
  const source = clean(value, 1200);
  const explicit = source.match(/https?:\/\/[^\s|;,]+/i)?.[0] || source.split(/[|;,]/)[0]?.trim() || "";
  if (!explicit || !/[a-z0-9]\.[a-z]{2,}/i.test(explicit)) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(explicit) ? explicit : `https://${explicit}`);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return "";
    url.hash = "";
    return url.toString();
  } catch { return ""; }
}

export function websiteDomain(value: string) {
  const url = firstUrl(value);
  if (!url) return "";
  try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; }
}

function findHeaderRow(rows: string[][]) {
  let best = -1;
  let bestScore = 0;
  for (let index = 0; index < Math.min(rows.length, 30); index += 1) {
    const normalized = rows[index].map(normalizeHeader);
    const hits = normalized.filter((value) => KNOWN_HEADERS.has(value));
    const hasCompany = normalized.some((value) => HEADER_ALIASES.companyName.includes(value));
    const score = hits.length + (hasCompany ? 3 : 0);
    if (hasCompany && score > bestScore) { best = index; bestScore = score; }
  }
  return bestScore >= 5 ? best : -1;
}

function buildColumnMap(headers: string[]) {
  const map: Record<string, number> = {};
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    const index = headers.findIndex((header) => aliases.includes(header));
    if (index >= 0) map[field] = index;
  }
  return map;
}

function normalizeRow(values: string[], columns: Record<string, number>, sourceRow: number): LeadIntakeRow | null {
  const read = (field: string, max = 500) => clean(values[columns[field] ?? -1], max);
  const companyName = read("companyName", 240);
  if (!companyName || /^(company|company name)$/i.test(companyName)) return null;
  const website = firstUrl(read("website", 1200));
  const sourceUrl = firstUrl(read("sourceUrl", 1600)) || website;
  const email = firstEmail(read("email", 600));
  const phoneRaw = read("phone", 180);
  const whatsappRaw = read("whatsapp", 180);
  const phone = normalizePhone(phoneRaw || whatsappRaw);
  const whatsapp = normalizePhone(whatsappRaw || (/whats\s*app/i.test(phoneRaw) ? phoneRaw : ""));
  const productFit = splitList(read("productFit", 1000));
  const country = read("country", 100);
  const buyerType = read("buyerType", 240);
  const blockers: string[] = [];
  if (!sourceUrl) blockers.push("website or source URL");
  if (!email) blockers.push("valid business email");
  if (!buyerType) blockers.push("buyer type");
  if (!productFit.length) blockers.push("product fit");
  const domain = websiteDomain(website || sourceUrl);
  const fingerprint = [email || "", domain, normalizeKey(companyName), normalizeKey(country)].join("|");

  return {
    sourceRow,
    companyName,
    country,
    city: read("city", 160),
    email,
    phone,
    whatsapp,
    website,
    buyerType,
    productFit,
    sourceUrl,
    sourceTitle: companyName,
    sourceConfidence: read("sourceConfidence", 80),
    emailVerification: read("emailVerification", 120),
    linkedinUrl: firstUrl(read("linkedinUrl", 800)),
    instagramUrl: firstUrl(read("instagramUrl", 800)),
    facebookUrl: firstUrl(read("facebookUrl", 800)),
    priority: read("priority", 40),
    notes: read("notes", 1500),
    blockers,
    fingerprint,
  };
}

function splitList(value: string) {
  return [...new Set(value.split(/\s*[|;,]\s*|\s+\/\s+/).map((item) => clean(item, 160)).filter(Boolean))].slice(0, 20);
}

function normalizePhone(value: string) {
  const text = clean(value, 180);
  const match = text.match(/(?:\+|00)?\d[\d\s()./-]{6,}\d/)?.[0] || "";
  if (!match) return "";
  const compact = match.replace(/\s+/g, " ").trim();
  const digits = compact.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 16 ? compact : "";
}

function normalizeKey(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function clean(value: unknown, max = 500) {
  return typeof value === "string" ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").replace(/\s+/g, " ").trim().slice(0, max) : "";
}

async function parseXlsx(buffer: ArrayBuffer): Promise<RawSheet[]> {
  const archive = await openZip(buffer);
  const workbookXml = await archive.text("xl/workbook.xml");
  const relsXml = await archive.text("xl/_rels/workbook.xml.rels");
  const sharedStrings = archive.has("xl/sharedStrings.xml") ? parseSharedStrings(await archive.text("xl/sharedStrings.xml")) : [];
  const workbook = new DOMParser().parseFromString(workbookXml, "application/xml");
  const rels = new DOMParser().parseFromString(relsXml, "application/xml");
  assertXml(workbook, "workbook");
  assertXml(rels, "workbook relationships");
  const targets = new Map<string, string>();
  for (const rel of Array.from(rels.getElementsByTagNameNS("*", "Relationship"))) {
    const id = rel.getAttribute("Id") || "";
    const target = rel.getAttribute("Target") || "";
    if (id && target) targets.set(id, normalizeZipPath(`xl/${target}`));
  }
  const output: RawSheet[] = [];
  for (const sheet of Array.from(workbook.getElementsByTagNameNS("*", "sheet"))) {
    const name = sheet.getAttribute("name") || `Sheet ${output.length + 1}`;
    const relId = sheet.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id") || sheet.getAttribute("r:id") || "";
    const path = targets.get(relId);
    if (!path || !archive.has(path)) continue;
    output.push({ name, rows: parseWorksheet(await archive.text(path), sharedStrings) });
  }
  if (!output.length) throw new Error("The XLSX file does not contain readable worksheets.");
  return output;
}

function parseSharedStrings(xml: string) {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  assertXml(doc, "shared strings");
  return Array.from(doc.getElementsByTagNameNS("*", "si")).map((item) => Array.from(item.getElementsByTagNameNS("*", "t")).map((node) => node.textContent || "").join(""));
}

function parseWorksheet(xml: string, sharedStrings: string[]) {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  assertXml(doc, "worksheet");
  const rows: string[][] = [];
  for (const rowNode of Array.from(doc.getElementsByTagNameNS("*", "row"))) {
    const row: string[] = [];
    for (const cell of Array.from(rowNode.getElementsByTagNameNS("*", "c"))) {
      const reference = cell.getAttribute("r") || "A1";
      const column = columnIndex(reference);
      const type = cell.getAttribute("t") || "";
      const valueNode = cell.getElementsByTagNameNS("*", "v")[0];
      const inline = Array.from(cell.getElementsByTagNameNS("*", "t")).map((node) => node.textContent || "").join("");
      const raw = valueNode?.textContent || inline || "";
      row[column] = type === "s" ? sharedStrings[Number(raw)] || "" : type === "b" ? (raw === "1" ? "TRUE" : "FALSE") : raw;
    }
    rows.push(row.map((value) => value || ""));
  }
  return rows;
}

function columnIndex(reference: string) {
  const letters = reference.match(/^[A-Z]+/i)?.[0]?.toUpperCase() || "A";
  let value = 0;
  for (const char of letters) value = value * 26 + char.charCodeAt(0) - 64;
  return Math.max(0, value - 1);
}

function assertXml(doc: Document, label: string) {
  if (doc.getElementsByTagName("parsererror").length) throw new Error(`Invalid ${label} XML in workbook.`);
}

function normalizeZipPath(path: string) {
  const output: string[] = [];
  for (const part of path.replace(/\\/g, "/").split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") output.pop(); else output.push(part);
  }
  return output.join("/");
}

async function openZip(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  let eocd = -1;
  for (let offset = Math.max(0, bytes.length - 65_557); offset <= bytes.length - 22; offset += 1) {
    if (view.getUint32(offset, true) === 0x06054b50) eocd = offset;
  }
  if (eocd < 0) throw new Error("Invalid XLSX ZIP archive.");
  const entryCount = view.getUint16(eocd + 10, true);
  const directoryOffset = view.getUint32(eocd + 16, true);
  const entries = new Map<string, ZipEntry>();
  let cursor = directoryOffset;
  const decoder = new TextDecoder();
  for (let index = 0; index < entryCount; index += 1) {
    if (view.getUint32(cursor, true) !== 0x02014b50) throw new Error("Invalid XLSX central directory.");
    const method = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const name = normalizeZipPath(decoder.decode(bytes.slice(cursor + 46, cursor + 46 + nameLength)));
    if (view.getUint32(localOffset, true) !== 0x04034b50) throw new Error("Invalid XLSX local file header.");
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    entries.set(name, { method, compressedSize, dataOffset: localOffset + 30 + localNameLength + localExtraLength });
    cursor += 46 + nameLength + extraLength + commentLength;
  }

  const read = async (path: string) => {
    const entry = entries.get(normalizeZipPath(path));
    if (!entry) throw new Error(`Workbook entry missing: ${path}`);
    const compressed = bytes.slice(entry.dataOffset, entry.dataOffset + entry.compressedSize);
    if (entry.method === 0) return compressed;
    if (entry.method !== 8 || typeof DecompressionStream === "undefined") throw new Error("This browser cannot decompress the XLSX file. Export it as CSV and retry.");
    const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  };
  return {
    has: (path: string) => entries.has(normalizeZipPath(path)),
    text: async (path: string) => new TextDecoder().decode(await read(path)),
  };
}
