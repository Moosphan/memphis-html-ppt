import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import process from "node:process";

const rootDir = process.cwd();
const packageName = "memphis-html-ppt";
const distRoot = path.join(rootDir, "dist");
const codexSource = path.join(distRoot, "codex", packageName);
const claudeSource = path.join(distRoot, "claude", packageName);
const codexTarget = path.join(os.homedir(), ".codex", "skills", packageName);
const claudeTarget = path.join(os.homedir(), ".claude", "skills", packageName);

async function main() {
  await ensureBuilt();
  await syncDir(codexSource, codexTarget);
  await syncDir(claudeSource, claudeTarget);
  console.log(`Installed to:\n- ${codexTarget}\n- ${claudeTarget}`);
}

async function ensureBuilt() {
  try {
    await fs.access(codexSource);
    await fs.access(claudeSource);
  } catch {
    await import("./build-release.js");
  }
}

async function syncDir(source, destination) {
  await fs.rm(destination, { recursive: true, force: true });
  await fs.mkdir(destination, { recursive: true });
  await copyRecursive(source, destination);
}

async function copyRecursive(source, destination) {
  const entries = await fs.readdir(source, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === ".DS_Store") {
      continue;
    }
    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);
    if (entry.isDirectory()) {
      await fs.mkdir(to, { recursive: true });
      await copyRecursive(from, to);
    } else {
      await fs.copyFile(from, to);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
