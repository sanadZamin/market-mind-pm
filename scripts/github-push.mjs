#!/usr/bin/env node
// Incremental push: only uploads files changed since last successful push.
// Tracks last push state in .local/github-push-state.json
import { ReplitConnectors } from "@replit/connectors-sdk";
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const OWNER     = "sanadZamin";
const REPO      = "market-mind-pm";
const BRANCH    = "main";
const ROOT      = resolve(import.meta.dirname, "..");
const STATE_FILE = resolve(ROOT, ".local/github-push-state.json");

const connectors = new ReplitConnectors();
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function gh(method, path, body, retries = 5) {
  const opts = { method };
  if (body) opts.body = JSON.stringify(body);

  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await connectors.proxy("github", path, opts);
    const text = await res.text();

    if (res.status === 429 || res.status === 502 || res.status === 503) {
      const wait = res.status === 429
        ? parseInt(res.headers?.get?.("Retry-After") || "2", 10) * 1000 + 500
        : 1500 * (attempt + 1);
      console.log(`\n  ${res.status} — retrying in ${Math.round(wait/1000)}s (attempt ${attempt+1}/${retries})`);
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

// Load saved state (last local commit we pushed from + remote commit SHA)
let state = { localSha: null, remoteSha: null };
if (existsSync(STATE_FILE)) {
  try { state = JSON.parse(readFileSync(STATE_FILE, "utf8")); } catch {}
}

// Get current local HEAD
const localHead = execSync("git rev-parse HEAD", { cwd: ROOT }).toString().trim();

// Get remote HEAD
let remoteSha = null;
try {
  const refData = await gh("GET", `/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`);
  remoteSha = refData.object?.sha;
  console.log(`  Remote HEAD: ${remoteSha?.slice(0, 8)}`);
} catch {
  console.log("  No remote HEAD — will do full push");
}

// Decide which files to push
let files;
const savedLocalSha = state.localSha;
const savedRemoteSha = state.remoteSha;

if (savedLocalSha && remoteSha && savedRemoteSha === remoteSha) {
  // Remote hasn't been tampered with — diff from last push
  try {
    const changed = execSync(`git diff --name-only ${savedLocalSha} ${localHead}`, { cwd: ROOT })
      .toString().trim().split("\n").filter(Boolean);
    if (changed.length === 0) {
      console.log("  Nothing to push — already up to date.");
      process.exit(0);
    }
    files = changed;
    console.log(`  Incremental: pushing ${files.length} changed file(s)…`);
  } catch {
    files = execSync("git ls-files", { cwd: ROOT }).toString().trim().split("\n").filter(Boolean);
    console.log(`  Full push of ${files.length} files…`);
  }
} else {
  if (!remoteSha) {
    // Seed empty repo
    try {
      const initRes = await connectors.proxy("github",
        `/repos/${OWNER}/${REPO}/contents/.gitkeep`, {
          method: "PUT",
          body: JSON.stringify({ message: "chore: init repo", content: btoa("") }),
        });
      const initData = await initRes.json();
      remoteSha = initData.commit?.sha ?? null;
      console.log("  Initialized repo, seed commit:", remoteSha?.slice(0, 8));
    } catch (e2) {
      console.log("  Init warning:", e2.message.slice(0, 80));
    }
  }
  files = execSync("git ls-files", { cwd: ROOT }).toString().trim().split("\n").filter(Boolean);
  console.log(`  Full push of ${files.length} files to ${OWNER}/${REPO}…`);
}

await sleep(300);

// Upload blobs in batches of 8
const BATCH = 8;
const treeItems = [];
for (let i = 0; i < files.length; i += BATCH) {
  const batch = files.slice(i, i + BATCH);
  process.stdout.write(`  Blobs ${i + 1}–${Math.min(i + BATCH, files.length)} / ${files.length}\r`);
  await Promise.all(batch.map(async (filePath) => {
    const absPath = resolve(ROOT, filePath);
    try {
      const buf = readFileSync(absPath);
      if (buf.length > 300_000) {
        process.stdout.write(`\n  ⚠ Skipping large file (${Math.round(buf.length/1024)}KB): ${filePath}\n`);
        return;
      }
      const blob = await gh("POST", `/repos/${OWNER}/${REPO}/git/blobs`, {
        content: buf.toString("base64"),
        encoding: "base64",
      });
      treeItems.push({ path: filePath, mode: "100644", type: "blob", sha: blob.sha });
    } catch {
      return;
    }
  }));
  if (i + BATCH < files.length) await sleep(500);
}
console.log(`\n  Created ${treeItems.length} blobs`);

// Build tree (base_tree preserves all unmodified files)
const tree = await gh("POST", `/repos/${OWNER}/${REPO}/git/trees`, {
  tree: treeItems,
  ...(remoteSha ? { base_tree: remoteSha } : {}),
});
console.log("  Tree:", tree.sha.slice(0, 8));

// Create commit
const commitMessage = execSync("git log -1 --pretty=%B", { cwd: ROOT }).toString().trim()
  || "Update — Market Mind";

const commit = await gh("POST", `/repos/${OWNER}/${REPO}/git/commits`, {
  message: commitMessage,
  tree: tree.sha,
  ...(remoteSha ? { parents: [remoteSha] } : {}),
});
console.log("  Commit:", commit.sha.slice(0, 8));

// Update branch ref
try {
  await gh("POST", `/repos/${OWNER}/${REPO}/git/refs`, {
    ref: `refs/heads/${BRANCH}`,
    sha: commit.sha,
  });
} catch {
  await gh("PATCH", `/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, {
    sha: commit.sha,
    force: true,
  });
}
console.log(`  Updated refs/heads/${BRANCH}`);

// Save state for next incremental push
writeFileSync(STATE_FILE, JSON.stringify({ localSha: localHead, remoteSha: commit.sha }, null, 2));

console.log(`\n✓ Done! https://github.com/${OWNER}/${REPO}`);
