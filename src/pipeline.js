import fs from "node:fs/promises";
import path from "node:path";
import { loadConfig } from "./config.js";
import { GithubClient } from "./github.js";
import { OpenAIClient } from "./openai.js";
import { repositorySnapshot } from "./repository.js";
import { git, run } from "./lib/exec.js";
import { extractJson } from "./lib/json.js";
import { assertSafeRelativePath } from "./lib/paths.js";
import {
  finalizerInstructions,
  implementerInstructions,
  plannerInstructions,
  reviewerInstructions,
  securityReviewerInstructions
} from "./agents/prompts.js";

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function writeArtifact(dir, name, content) {
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), content, "utf8");
}

export async function runPipeline(issueNumber, cwd = process.cwd()) {
  const config = loadConfig();
  const github = new GithubClient(config.githubToken, config.githubRepository);
  const ai = new OpenAIClient(config.openAiApiKey, config.openAiModel);
  const issue = await github.getIssue(issueNumber);

  const baseBranch = (await git(["rev-parse", "--abbrev-ref", "HEAD"], cwd)) || "main";
  const workingTree = await git(["status", "--porcelain"], cwd);
  if (workingTree.trim()) throw new Error("Working tree must be clean before running the pipeline.");

  const snapshot = await repositorySnapshot(cwd, {
    maxFiles: config.maxFiles,
    maxFileChars: config.maxFileChars,
    maxContextChars: config.maxContextChars
  });

  const runId = `issue-${issueNumber}-${timestamp()}`;
  const artifactDir = path.join(cwd, ".ai-pipeline", "runs", runId);
  const requirement = `GitHub issue #${issue.number}: ${issue.title}\n\n${issue.body}`;
  await writeArtifact(artifactDir, "00-requirement.md", requirement);

  console.log("[1/7] Planner Agent");
  const initialPlan = await ai.complete(plannerInstructions, `${requirement}\n\n--- REPOSITORY SNAPSHOT ---\n${snapshot}`);
  await writeArtifact(artifactDir, "01-initial-plan.md", initialPlan);

  console.log("[2/7] Independent Reviewer Agent (fresh model request)");
  const independentReview = await ai.complete(
    reviewerInstructions,
    `${requirement}\n\n--- REPOSITORY SNAPSHOT ---\n${snapshot}\n\n--- PLAN TO REVIEW ---\n${initialPlan}`
  );
  await writeArtifact(artifactDir, "02-independent-review.md", independentReview);

  console.log("[3/7] Finalizer Agent");
  const finalPlan = await ai.complete(
    finalizerInstructions,
    `${requirement}\n\n--- REPOSITORY SNAPSHOT ---\n${snapshot}\n\n--- INITIAL PLAN ---\n${initialPlan}\n\n--- INDEPENDENT REVIEW ---\n${independentReview}`
  );
  await writeArtifact(artifactDir, "03-final-plan.md", finalPlan);

  console.log("[4/7] Implementation Agent");
  const implementationRaw = await ai.complete(
    implementerInstructions,
    `${requirement}\n\n--- REPOSITORY SNAPSHOT ---\n${snapshot}\n\n--- FINAL APPROVED PLAN ---\n${finalPlan}`
  );
  await writeArtifact(artifactDir, "04-implementation-response.txt", implementationRaw);
  const implementation = extractJson(implementationRaw);
  if (!Array.isArray(implementation.changes) || implementation.changes.length === 0) {
    throw new Error(`Implementation agent returned no changes: ${implementation.summary || "no explanation"}`);
  }

  if (config.dryRun) {
    await writeArtifact(artifactDir, "04-implementation.json", JSON.stringify(implementation, null, 2));
    console.log(`DRY_RUN=true: proposed changes saved to ${artifactDir}`);
    return;
  }

  const branch = `ai/issue-${issueNumber}-${Date.now()}`;
  await git(["checkout", "-b", branch], cwd);

  try {
    for (const change of implementation.changes) {
      if (typeof change?.path !== "string" || typeof change?.content !== "string") {
        throw new Error("Implementation output contains an invalid change object");
      }
      const safePath = assertSafeRelativePath(change.path);
      const absolute = path.join(cwd, safePath);
      await fs.mkdir(path.dirname(absolute), { recursive: true });
      await fs.writeFile(absolute, change.content, "utf8");
    }

    console.log("[5/7] Tests");
    const testResult = await run(config.testCommand, cwd);
    await writeArtifact(artifactDir, "05-tests.txt", `${testResult.stdout}\n${testResult.stderr}`);

    console.log("[6/7] Security Reviewer Agent");
    const diff = await git(["diff", "--no-ext-diff"], cwd);
    if (!diff.trim()) throw new Error("Implementation produced no git diff");
    const securityRaw = await ai.complete(
      securityReviewerInstructions,
      `${requirement}\n\n--- FINAL PLAN ---\n${finalPlan}\n\n--- GIT DIFF ---\n${diff}`
    );
    await writeArtifact(artifactDir, "06-security-review.json", securityRaw);
    const security = extractJson(securityRaw);
    if (security.verdict === "BLOCK") {
      throw new Error(`Security review blocked the PR. See ${artifactDir}/06-security-review.json`);
    }
    if (security.verdict !== "APPROVED") {
      throw new Error(`Unexpected security verdict: ${security.verdict}`);
    }

    console.log("[7/7] Commit, push, and PR");
    await git(["add", "-A"], cwd);
    const commitMessage = typeof implementation.commitMessage === "string" && implementation.commitMessage.trim()
      ? implementation.commitMessage.trim()
      : `Implement issue #${issueNumber}`;
    await git(["commit", "-m", commitMessage], cwd);
    await git(["push", "-u", "origin", branch], cwd);

    const pr = await github.createPullRequest({
      title: `AI: ${issue.title}`,
      body: [
        `Closes #${issueNumber}`,
        "",
        "## Pipeline",
        "- Planner Agent produced an implementation plan",
        "- Independent Reviewer Agent reviewed it in a fresh model request",
        "- Finalizer reconciled the plan",
        "- Implementation Agent produced bounded text-file changes",
        `- Tests passed: \`${config.testCommand}\``,
        "- Security Reviewer approved the diff"
      ].join("\n"),
      head: branch,
      base: baseBranch
    });
    console.log(`PR created: ${pr.htmlUrl}`);
  } catch (error) {
    console.error("Pipeline failed; branch/working tree left for inspection.");
    throw error;
  }
}
