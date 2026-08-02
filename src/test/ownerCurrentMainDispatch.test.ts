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

  it("creates one fresh exact-main Quality event for the owner release command while deduplicating active runs", () => {
    expect(workflow).toContain("active_count");
    expect(workflow).toContain("successful_count");
    expect(workflow).toContain("force_fresh_dispatch=false");
    expect(workflow).toContain('[ "$EVENT_NAME" = "issue_comment" ] && [ "$COMMENT_BODY" = "/deploy-current-main" ]');
    expect(workflow).toContain("pre_dispatch_run_number");
    expect(workflow).toContain('.run_number > $before');
    expect(workflow).toContain("Main advanced before Quality dispatch");
    expect(workflow).toContain("Quality REST dispatch did not return HTTP 204");
    expect(workflow).toContain("awaiting fresh exact run identity");
  });

  it("keeps non-owner scheduled/bootstrap checks idempotent when exact-main Quality is already successful", () => {
    expect(workflow).toContain('elif [ "$force_fresh_dispatch" = "true" ] || [ "$successful_count" -eq 0 ]; then');
    expect(workflow).toContain("gh workflow run quality.yml");
    expect(workflow).toContain("exact-main successful Quality Gate is missing");
    expect(workflow).toContain("exact-main Quality Gate already active");
  });
});
