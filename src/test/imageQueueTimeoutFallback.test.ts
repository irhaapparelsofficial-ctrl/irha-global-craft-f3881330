import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "scripts/image-ai/run_queue.py"),
  "utf8",
);

describe("AI image queue timeout recovery", () => {
  it("retries only a timed-out primary processor through a bounded fast source", () => {
    const timeoutGuard = source.indexOf("except subprocess.TimeoutExpired as primary_error");
    const fastSource = source.indexOf("prepare_fast_source(source, fast_source)");
    const fallbackRun = source.indexOf("run_processor(fallback_command, FALLBACK_TIMEOUT)");

    expect(timeoutGuard).toBeGreaterThan(0);
    expect(fastSource).toBeGreaterThan(timeoutGuard);
    expect(fallbackRun).toBeGreaterThan(fastSource);
    expect(source).toContain('IRHA_IMAGE_FALLBACK_MAX_EDGE", "960"');
    expect(source).toContain('IRHA_IMAGE_FALLBACK_REMBG_MODEL", "u2netp"');
  });

  it("preserves the downloaded original and forces fallback outputs into review", () => {
    expect(source).toContain('source = temp_dir / "source-image"');
    expect(source).toContain('fast_source = temp_dir / "source-fast.png"');
    expect(source).toContain('manifest["status"] = "review_required"');
    expect(source).toContain("fast fallback used after primary processor exceeded");
    expect(source).not.toContain("source.unlink");
    expect(source).not.toContain("source.write_bytes(target");
  });

  it("keeps a second timeout explicit instead of silently publishing", () => {
    expect(source).toContain("Primary processor timed out after {PRIMARY_TIMEOUT}s and bounded fallback timed out after {FALLBACK_TIMEOUT}s");
    expect(source).toContain("return 1 if failed else 0");
  });
});
