const MEDIA_URL = "https://pvzjiozismyxqrzmtfbi.supabase.co/storage/v1/object/public/site-media/factory/irha-apparels-factory-capability-2026.mp4";
const POSTER_URL = "https://pvzjiozismyxqrzmtfbi.supabase.co/storage/v1/object/public/site-media/factory/irha-apparels-factory-capability-poster.webp";
const EXPECTED_SIZE = 7_181_131;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function fetchChecked(url, init = {}) {
  const response = await fetch(url, {
    ...init,
    redirect: "follow",
    signal: AbortSignal.timeout(20_000),
    headers: {
      "User-Agent": "Mozilla/5.0 GP-4V-R1 media acceptance",
      ...(init.headers || {}),
    },
  });
  return response;
}

function parseContentRange(value) {
  const match = /^bytes\s+(\d+)-(\d+)\/(\d+)$/.exec(value || "");
  if (!match) return null;
  return { start: Number(match[1]), end: Number(match[2]), total: Number(match[3]) };
}

async function checkRange(start, end, label) {
  const response = await fetchChecked(MEDIA_URL, {
    headers: { Range: `bytes=${start}-${end}` },
  });
  const contentType = response.headers.get("content-type") || "";
  const contentRange = parseContentRange(response.headers.get("content-range"));
  const bytes = new Uint8Array(await response.arrayBuffer());

  assert(response.status === 206, `${label}: expected HTTP 206, got ${response.status}`);
  assert(contentType.toLowerCase().startsWith("video/mp4"), `${label}: unexpected Content-Type ${contentType}`);
  assert(contentRange, `${label}: missing or invalid Content-Range`);
  assert(contentRange.start === start, `${label}: range starts at ${contentRange.start}, expected ${start}`);
  assert(contentRange.end === end, `${label}: range ends at ${contentRange.end}, expected ${end}`);
  assert(contentRange.total === EXPECTED_SIZE, `${label}: total size ${contentRange.total}, expected ${EXPECTED_SIZE}`);
  assert(bytes.byteLength === end - start + 1, `${label}: payload ${bytes.byteLength} bytes, expected ${end - start + 1}`);

  console.log(JSON.stringify({
    check: label,
    status: response.status,
    contentType,
    contentLength: response.headers.get("content-length"),
    contentRange: response.headers.get("content-range"),
    acceptRanges: response.headers.get("accept-ranges"),
    cacheControl: response.headers.get("cache-control"),
    contentEncoding: response.headers.get("content-encoding"),
    accessControlAllowOrigin: response.headers.get("access-control-allow-origin"),
  }));
}

async function main() {
  const head = await fetchChecked(MEDIA_URL, { method: "HEAD" });
  const headType = head.headers.get("content-type") || "";
  const headLength = Number(head.headers.get("content-length") || 0);
  assert(head.ok, `media HEAD failed with ${head.status}`);
  assert(headType.toLowerCase().startsWith("video/mp4"), `media HEAD Content-Type is ${headType}`);
  if (headLength) assert(headLength === EXPECTED_SIZE, `media HEAD Content-Length ${headLength}, expected ${EXPECTED_SIZE}`);

  console.log(JSON.stringify({
    check: "head",
    status: head.status,
    contentType: headType,
    contentLength: head.headers.get("content-length"),
    acceptRanges: head.headers.get("accept-ranges"),
    cacheControl: head.headers.get("cache-control"),
    contentEncoding: head.headers.get("content-encoding"),
  }));

  await checkRange(0, 1023, "initial-range");
  await checkRange(3_000_000, 3_001_023, "seek-range");

  const poster = await fetchChecked(POSTER_URL, { method: "HEAD" });
  assert(poster.ok, `poster HEAD failed with ${poster.status}`);
  assert((poster.headers.get("content-type") || "").toLowerCase().startsWith("image/webp"), `poster Content-Type is ${poster.headers.get("content-type")}`);
  console.log(JSON.stringify({
    check: "poster",
    status: poster.status,
    contentType: poster.headers.get("content-type"),
    contentLength: poster.headers.get("content-length"),
  }));

  console.log("GP-4V-R1 media HTTP contract: PASS");
}

main().catch((error) => {
  console.error(`GP-4V-R1 media HTTP contract: FAIL — ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
