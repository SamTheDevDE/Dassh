#!/usr/bin/env node
import { execSync } from "node:child_process";

function run(command) {
  execSync(command, { stdio: "inherit" });
}

function runQuiet(command) {
  return execSync(command, { stdio: ["ignore", "pipe", "pipe"] }).toString().trim();
}

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error("Usage: npm run release:tag -- <tag> [commit-message]");
  process.exit(1);
}

const tag = args[0].trim();
const commitMessage = (args[1] ?? `chore(release): ${tag}`).trim();

if (!tag) {
  console.error("Tag cannot be empty.");
  process.exit(1);
}

try {
  const existingTag = runQuiet(`git tag -l ${JSON.stringify(tag)}`);
  if (existingTag === tag) {
    console.error(`Tag '${tag}' already exists.`);
    process.exit(1);
  }

  run("git add -A");

  let hasStagedChanges = true;
  try {
    run("git diff --cached --quiet");
    hasStagedChanges = false;
  } catch {
    hasStagedChanges = true;
  }

  if (hasStagedChanges) {
    run(`git commit -m ${JSON.stringify(commitMessage)}`);
  } else {
    console.log("No staged changes found; skipping commit.");
  }

  // Create an annotated tag but explicitly avoid GPG-signing (some environments auto-sign tags)
  run(`git tag -a ${JSON.stringify(tag)} --no-sign -m ${JSON.stringify(tag)}`);

  console.log("\nRelease tag created successfully.");
  console.log(`Next: git push && git push origin ${tag}`);
} catch (error) {
  console.error("Failed to create release tag.");
  process.exit(1);
}
