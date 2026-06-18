// Trigger a file download. We use a direct anchor click (not fetch+blob)
// because some preview environments gate raw asset URLs behind auth and
// strip cookies from cross-context fetches, which causes spurious 404s.
// A native <a download> click navigates with normal cookies and either
// downloads the file or opens it in a new tab — both acceptable UX.
export async function forceDownload(url: string, filename?: string) {
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || url.split("/").pop() || "download";
    a.rel = "noopener noreferrer";
    // Some browsers ignore `download` for cross-origin or same-origin
    // application/pdf served inline — opening in a new tab is the safe fallback.
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
