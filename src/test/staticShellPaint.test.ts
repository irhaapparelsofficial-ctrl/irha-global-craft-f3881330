import { describe, expect, it } from "vitest";
import { allowStaticShellPaint } from "@/lib/staticShellPaint";

describe("allowStaticShellPaint", () => {
  it("renders after a timer when requestAnimationFrame is unavailable", async () => {
    let scheduled: (() => void) | undefined;
    const target = {
      setTimeout: (callback: TimerHandler) => {
        scheduled = callback as () => void;
        return 1;
      },
    } as unknown as Parameters<typeof allowStaticShellPaint>[0];

    const painted = allowStaticShellPaint(target);
    expect(scheduled).toBeTypeOf("function");
    scheduled?.();
    await expect(painted).resolves.toBeUndefined();
  });

  it("allows two animation frames when the API is available", async () => {
    const frames: FrameRequestCallback[] = [];
    const target = {
      setTimeout: window.setTimeout.bind(window),
      requestAnimationFrame: (callback: FrameRequestCallback) => {
        frames.push(callback);
        return frames.length;
      },
    } as Parameters<typeof allowStaticShellPaint>[0];

    const painted = allowStaticShellPaint(target);
    expect(frames).toHaveLength(1);
    frames.shift()?.(0);
    expect(frames).toHaveLength(1);
    frames.shift()?.(16);
    await expect(painted).resolves.toBeUndefined();
  });
});
