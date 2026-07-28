type PaintWindow = Pick<Window, "setTimeout"> & Partial<Pick<Window, "requestAnimationFrame">>;

export function allowStaticShellPaint(target: PaintWindow = window) {
  return new Promise<void>((resolve) => {
    const scheduleFrame = typeof target.requestAnimationFrame === "function"
      ? target.requestAnimationFrame.bind(target)
      : null;

    if (!scheduleFrame) {
      target.setTimeout(resolve, 0);
      return;
    }

    scheduleFrame(() => scheduleFrame(() => resolve()));
  });
}
