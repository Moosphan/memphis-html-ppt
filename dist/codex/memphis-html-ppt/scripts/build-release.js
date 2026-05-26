import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const rootDir = process.cwd();
const distDir = path.join(rootDir, "dist");
const packageName = "memphis-html-ppt";
const dryRun = process.argv.includes("--dry-run");

const sharedEntries = [
  "SKILL.md",
  "assets",
  "references",
  "scripts"
];

const codexEntries = [
  "agents"
];

async function main() {
  await fs.rm(distDir, { recursive: true, force: true });
  await fs.mkdir(path.join(distDir, "codex", packageName), { recursive: true });
  await fs.mkdir(path.join(distDir, "claude", packageName), { recursive: true });

  await copySet(path.join(distDir, "codex", packageName), [...sharedEntries, ...codexEntries]);
  await copySet(path.join(distDir, "claude", packageName), sharedEntries);

  const manifest = {
    generatedAt: new Date().toISOString(),
    packageName,
    bundles: {
      codex: `dist/codex/${packageName}`,
      claude: `dist/claude/${packageName}`
    }
  };

  await fs.writeFile(path.join(distDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");

  if (!dryRun) {
    console.log(`Built release bundles in ${distDir}`);
  }
}

async function copySet(destinationRoot, entries) {
  for (const entry of entries) {
    if (!(await exists(entry))) {
      continue;
    }
    await copyEntry(entry, path.join(destinationRoot, entry));
  }
}

async function exists(sourceRelative) {
  try {
    await fs.stat(path.join(rootDir, sourceRelative));
    return true;
  } catch {
    return false;
  }
}

async function copyEntry(sourceRelative, destination) {
  const source = path.join(rootDir, sourceRelative);
  const stat = await fs.stat(source);
  if (stat.isDirectory()) {
    await copyDirectory(sourceRelative, destination);
    return;
  }
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.copyFile(source, destination);
}

async function copyDirectory(sourceRelative, destination) {
  const source = path.join(rootDir, sourceRelative);
  await fs.mkdir(destination, { recursive: true });
  const entries = await fs.readdir(source, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === ".DS_Store") {
      continue;
    }
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);
    if (entry.isDirectory()) {
      await copyDirectory(path.relative(rootDir, sourcePath), destinationPath);
    } else {
      await fs.copyFile(sourcePath, destinationPath);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
