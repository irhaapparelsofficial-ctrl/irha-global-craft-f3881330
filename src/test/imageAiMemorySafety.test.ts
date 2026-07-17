import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const processor = readFileSync(resolve(process.cwd(), "scripts/image-ai/process_image.py"), "utf8");
const queue = readFileSync(resolve(process.cwd(), "scripts/image-ai/run_queue.py"), "utf8");

describe("AI image processing resource safety", () => {
  it("bounds source, segmentation and EDSR dimensions", () => {
    expect(processor).toContain("SOURCE_MAX_EDGE = 2400");
    expect(processor).toContain("SEGMENT_MAX_EDGE = 1600");
    expect(processor).toContain("EDSR_MAX_EDGE = 700");
    expect(processor).toContain("working = resize_to_max_edge(source, SEGMENT_MAX_EDGE)");
    expect(processor).toContain("if max(working.size) <= EDSR_MAX_EDGE");
    expect(processor).not.toContain("upscale_steps = 2");
  });

  it("does not allocate full-master NumPy mesh grids", () => {
    expect(processor).not.toContain("np.mgrid");
    expect(processor).not.toContain("np.repeat(gradient, width");
    expect(processor).toContain("one-pixel-wide vertical gradient");
    expect(processor).toContain("quarter resolution");
  });

  it("closes large image buffers and uses bounded WebP effort", () => {
    expect(processor).toContain('method=4');
    expect(processor).toContain("variant.close()");
    expect(processor).toContain("master.close()");
    expect(processor).toContain("source.close()");
  });

  it("retains per-job failure reporting and a hard processor timeout", () => {
    expect(queue).toContain("report_failure(job, message)");
    expect(queue).toContain("timeout=900");
    expect(queue).toContain("return 1 if failed else 0");
  });
});
