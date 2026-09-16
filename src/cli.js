import { runPipeline } from "./pipeline.js";

function issueFromArgs(args) {
  const index = args.findIndex((arg) => arg === "--issue" || arg === "-i");
  if (index < 0 || !args[index + 1]) throw new Error("Usage: npm run pipeline -- --issue <number>");
  const issue = Number.parseInt(args[index + 1], 10);
  if (!Number.isInteger(issue) || issue <= 0) throw new Error("Issue number must be a positive integer");
  return issue;
}

runPipeline(issueFromArgs(process.argv.slice(2))).catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
