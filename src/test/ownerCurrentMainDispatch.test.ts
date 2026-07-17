import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(
  resolve(process.cwd(), ".github/workflows/secret-bootstrap-controller.yml"),
  "utf8",
);

describe("owner exact-main dispatch command", () => {
  it("accepts only the documented command on the production control issue", () => {
    expect(workflow).toContain("issue_comment:");
    expect(workflow).toContain("types: [created]");
    expect(workflow).toContain("github.event.issue.number == 375");
    expect(workflow).toContain("github.event.comment.body == '/deploy-current-main'");
  });

  it("authorizes the exact repository owner login and trusted repository relationships", () => {
    expect(workflow).toContain("github.actor == 'irhaapparelsofficial-ctrl'");
    expect(workflow).toContain("github.event.comment.user.login == 'irhaapparelsofficial-ctrl'");
    expect(workflow).toContain("github.event.comment.author_association == 'OWNER'");
    expect(workflow).toContain("github.event.comment.author_association == 'MEMBER'");
    expect(workflow).toContain("github.event.comment.author_association == 'COLLABORATOR'");
    expect(workflow).toContain("issues: read");
  });

  it("still deduplicates existing exact-main quality runs before dispatch", () => {
    expect(workflow).toContain("active_count");
    expect(workflow).toContain("successful_count");
    expect(workflow).toContain("gh workflow run quality.yml");
    expect(workflow).toContain("exact-main Quality Gate already active");
  });
});
