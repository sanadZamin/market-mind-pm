#!/usr/bin/env node
// Pushes the tracked files to GitHub via the Git Data API + Replit Connectors proxy
import { ReplitConnectors } from "@replit/connectors-sdk";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const OWNER  = "sanadZamin";
const REPO   = "market-mind-pm";
const BRANCH = "main";
const ROOT   = resolve(import.meta.dirname, "..");

const connectors = new ReplitConnectors();
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function gh(method, path, body, retries = 3) {
  const opts = { method };
  if (body) opts.body = JSON.stringify(body);

  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await connectors.proxy("github", path, opts);
    const text = await res.text();

    // Rate limit — back off and retry
    if (res.status === 429) {
      const wait = parseInt(res.headers?.get?.("Retry-After") || "2", 10) * 1000 + 500;
      await sleep(wait);
      continue;
    }

    let json;
    try { json = JSON.parse(text); }
    catch { throw new Error(`Non-JSON ${res.status} from ${method} ${path}: ${text.slice(0, 200)}`); }

    if (!res.ok) throw new Error(`GitHub API ${method} ${path} → ${res.status}: ${JSON.stringify(json)}`);
    return json;
  }
  throw new Error(`Exhausted retries for ${method} ${path}`);
}

// Get tracked files (excluding nothing — git ls-files respects .gitignore)
const files = execSync("git ls-files", { cwd: ROOT }).toString().trim().split("\n").filter(Boolean);
console.log(`Pushing ${files.length} files to ${OWNER}/${REPO}…`);

// 0. Get or create the initial commit SHA so we have a parent to build on
let parentSha = null;
try {
  // Try to get existing HEAD
  const refData = await gh("GET", `/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`);
  parentSha = refData.object?.sha;
  console.log("  Existing HEAD:", parentSha?.slice(0, 8));
} catch {
  // Repo is empty — seed with a placeholder file
  try {
    const initRes = await connectors.proxy("github",
      `/repos/${OWNER}/${REPO}/contents/.gitkeep`, {
        method: "PUT",
        body: JSON.stringify({ message: "chore: init repo", content: btoa("") }),
      });
    const initData = await initRes.json();
    parentSha = initData.commit?.sha ?? null;
    console.log("  Initialized repo, seed commit:", parentSha?.slice(0, 8));
  } catch (e2) {
    console.log("  Init warning:", e2.message.slice(0, 80));
  }
}

await sleep(800);

// 1. Create blobs in small sequential batches to stay under 10 RPS
const BATCH = 5;
const treeItems = [];
for (let i = 0; i < files.length; i += BATCH) {
  const batch = files.slice(i, i + BATCH);
  process.stdout.write(`  Blobs ${i + 1}–${Math.min(i + BATCH, files.length)} / ${files.length}\r`);
  await Promise.all(batch.map(async (filePath) => {
    const absPath = resolve(ROOT, filePath);
    let content, encoding;
    try {
      const buf = readFileSync(absPath);
      // Skip files too large for the proxy (>300 KB raw)
      if (buf.length > 300_000) {
        console.log(`\n  ⚠ Skipping large file (${Math.round(buf.length/1024)}KB): ${filePath}`);
        return;
      }
      content  = buf.toString("base64");
      encoding = "base64";
    } catch {
      return; // skip unreadable files
    }
    const blob = await gh("POST", `/repos/${OWNER}/${REPO}/git/blobs`, { content, encoding });
    treeItems.push({ path: filePath, mode: "100644", type: "blob", sha: blob.sha });
  }));
  if (i + BATCH < files.length) await sleep(700); // stay under 10 RPS
}
console.log(`\n  Created ${treeItems.length} blobs`);

// 2. Create tree
const tree = await gh("POST", `/repos/${OWNER}/${REPO}/git/trees`, { tree: treeItems });
console.log("  Tree:", tree.sha.slice(0, 8));

// 3. Create commit
const commitMessage = execSync("git log -1 --pretty=%B", { cwd: ROOT }).toString().trim()
  || "Initial commit — Market Mind project management tool";

const commitBody = {
  message: commitMessage,
  tree: tree.sha,
  ...(parentSha ? { parents: [parentSha] } : {}),
};
const commit = await gh("POST", `/repos/${OWNER}/${REPO}/git/commits`, commitBody);
console.log("  Commit:", commit.sha.slice(0, 8));

// 4. Create (or force-update) the main branch ref
try {
  await gh("POST", `/repos/${OWNER}/${REPO}/git/refs`, {
    ref: `refs/heads/${BRANCH}`,
    sha: commit.sha,
  });
  console.log(`  Created refs/heads/${BRANCH}`);
} catch {
  await gh("PATCH", `/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, {
    sha: commit.sha,
    force: true,
  });
  console.log(`  Updated refs/heads/${BRANCH}`);
}

console.log(`\n✓ Done! https://github.com/${OWNER}/${REPO}`);
