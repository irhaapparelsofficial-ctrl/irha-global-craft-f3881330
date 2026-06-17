// Force file download even when browsers (or sandboxed iframes) would
// otherwise open the file inline. Falls back to a normal navigation.
export async function forceDownload(url: string, filename?: string) {
  try {
    const res = await fetch(url, { credentials: "same-origin" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename || url.split("/").pop() || "download";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
  } catch (e) {
    // Fallback: open in new tab so user can save manually
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
