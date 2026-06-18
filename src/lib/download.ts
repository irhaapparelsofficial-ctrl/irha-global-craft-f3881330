// Trigger a file download using a native anchor click.
// We avoid `target="_blank"` because preview iframes (and some popup
// blockers) silently drop the new window, leaving the user with no file.
// A same-window anchor with the `download` attribute either downloads
// the file directly (same-origin) or navigates to the PDF, which the
// browser then renders inline — both are acceptable outcomes.
export async function forceDownload(url: string, filename?: string) {
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || url.split("/").pop() || "download";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch {
    // Last-resort fallback: navigate the top window to the file.
    try {
      window.top?.location.assign(url);
    } catch {
      window.location.assign(url);
    }
  }
}
