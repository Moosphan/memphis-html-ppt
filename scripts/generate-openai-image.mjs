import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith("--")) continue;
    out[key.slice(2)] = argv[i + 1];
    i += 1;
  }
  return out;
}

function parseDotEnv(content) {
  const env = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
  }
  return env;
}

async function loadEnv() {
  const envPath = path.join(process.env.HOME || "", ".baoyu-skills", ".env");
  const content = await fs.readFile(envPath, "utf8");
  const localEnv = parseDotEnv(content);
  for (const [key, value] of Object.entries(localEnv)) {
    if (!process.env[key]) process.env[key] = value;
  }
}

function aspectRatioToSize(ar, quality) {
  if (!ar || ar === "1:1") {
    return quality === "2k" ? "2048x2048" : "1024x1024";
  }
  const [wRaw, hRaw] = ar.split(":").map(Number);
  const ratio = wRaw / hRaw;
  const longEdge = quality === "2k" ? 2048 : 1024;
  let width;
  let height;

  if (ratio > 1) {
    width = longEdge;
    height = Math.max(16, Math.round((width / ratio) / 16) * 16);
  } else {
    height = longEdge;
    width = Math.max(16, Math.round((height * ratio) / 16) * 16);
  }

  while (width * height < 655360) {
    if (ratio > 1) {
      width += 16;
      height = Math.round((width / ratio) / 16) * 16;
    } else {
      height += 16;
      width = Math.round((height * ratio) / 16) * 16;
    }
  }

  return `${width}x${height}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.prompt || !args.output) {
    throw new Error("Usage: node scripts/generate-openai-image.mjs --prompt <text> --output <file> [--ar 16:9] [--quality 2k]");
  }

  await loadEnv();

  const apiKey = process.env.OPENAI_API_KEY;
  const baseURL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";
  const quality = args.quality || "2k";
  const size = args.size || aspectRatioToSize(args.ar || "16:9", quality);

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing.");
  }

  const response = await fetch(`${baseURL}/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      prompt: args.prompt,
      size,
      quality: quality === "2k" ? "high" : "medium",
      response_format: "b64_json",
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Image API error: ${text}`);
  }

  const json = await response.json();
  const image = json?.data?.[0]?.b64_json || json?.data?.[0]?.url || json?.b64_json;
  if (!image) {
    throw new Error(`No image returned from API. Response: ${JSON.stringify(json).slice(0, 400)}`);
  }

  const output = path.resolve(args.output);
  await fs.mkdir(path.dirname(output), { recursive: true });
  if (image.startsWith("http")) {
    const img = await fetch(image);
    if (!img.ok) throw new Error(`Failed to download image: ${img.status}`);
    await fs.writeFile(output, Buffer.from(await img.arrayBuffer()));
  } else {
    await fs.writeFile(output, Buffer.from(image, "base64"));
  }
  console.log(`Generated ${output}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
