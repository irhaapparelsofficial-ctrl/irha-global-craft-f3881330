import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(
  resolve(process.cwd(), ".github/workflows/quality.yml"),
  "utf8",
);

describe("Quality Gate concurrency", () => {
  it("keeps one latest-wins main lane while isolating each pull request", () => {
    expect(workflow).toContain(
      "group: quality-${{ github.event_name == 'pull_request' && format('pr-{0}', github.event.pull_request.number) || 'main' }}",
    );
    expect(workflow).toContain("cancel-in-progress: true");
    expect(workflow).toContain("production-dist-${{ github.sha }}");
  });
});
