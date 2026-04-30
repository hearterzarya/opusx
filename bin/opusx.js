#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const https = require("node:https");
const { spawnSync } = require("node:child_process");
const readline = require("node:readline/promises");
const { stdin: input, stdout: output } = require("node:process");

const cwd = process.cwd();
const command = process.argv[2] || "wizard";

const IDE_OPTIONS = [
  { id: "claude-cli", label: "Claude Code (CLI)" },
  { id: "vscode", label: "VS Code (Claude Extension)" },
  { id: "cursor", label: "Cursor" },
  { id: "windsurf", label: "Windsurf" },
  { id: "cline", label: "Cline (VS Code Extension)" },
  { id: "roo", label: "Roo Code (VS Code Extension)" },
];

function printHeader(title) {
  const width = Math.max(40, title.length + 6);
  const top = `┌${"─".repeat(width)}┐`;
  const bottom = `└${"─".repeat(width)}┘`;
  const line = `│ ${title}${" ".repeat(width - title.length - 1)}│`;
  console.log(top);
  console.log(line);
  console.log(bottom);
}

function printSuccessBox(lines) {
  const contentWidth = Math.max(...lines.map((line) => line.length), 24);
  console.log(`┌${"─".repeat(contentWidth + 2)}┐`);
  lines.forEach((line) => {
    const pad = " ".repeat(contentWidth - line.length);
    console.log(`│ ${line}${pad} │`);
  });
  console.log(`└${"─".repeat(contentWidth + 2)}┘`);
}

function validateApiKey(apiKey) {
  return /^sk-ant-ox-[a-zA-Z0-9]+$/.test(apiKey);
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function readJsonSafe(filePath) {
  if (!fs.existsSync(filePath)) return {};
  try {
    const raw = fs.readFileSync(filePath, "utf8").trim();
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeJsonPretty(filePath, obj) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(obj, null, 2)}\n`, "utf8");
}

function deepMerge(target, source) {
  const out = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      out[key] = deepMerge(target[key] && typeof target[key] === "object" ? target[key] : {}, value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

function upsertJsonFile(filePath, patch) {
  const existing = readJsonSafe(filePath);
  const merged = deepMerge(existing, patch);
  writeJsonPretty(filePath, merged);
}

function formatPathForLog(filePath) {
  return filePath.replaceAll("/", "\\");
}

function configureClaudeCli(apiKey) {
  const settingsPath = path.join(os.homedir(), ".claude", "settings.json");
  upsertJsonFile(settingsPath, {
    env: {
      ANTHROPIC_BASE_URL: "https://opusx.vercel.app/api",
      ANTHROPIC_API_KEY: apiKey,
    },
  });
  return settingsPath;
}

function configureCursor(apiKey) {
  const settingsPath = path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "Cursor", "User", "settings.json");
  upsertJsonFile(settingsPath, {
    "openai.apiKey": apiKey,
    "openai.baseURL": "https://opusx.vercel.app/v1",
    "opusx.baseUrl": "https://opusx.vercel.app/v1",
  });
  return settingsPath;
}

function configureVsCode(apiKey) {
  const settingsPath = path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "Code", "User", "settings.json");
  upsertJsonFile(settingsPath, {
    "anthropic.apiKey": apiKey,
    "anthropic.baseUrl": "https://opusx.vercel.app/api",
    "opusx.baseUrl": "https://opusx.vercel.app/v1",
  });
  return settingsPath;
}

function configureWindsurf(apiKey) {
  const settingsPath = path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "Windsurf", "User", "settings.json");
  upsertJsonFile(settingsPath, {
    "openai.apiKey": apiKey,
    "openai.baseURL": "https://opusx.vercel.app/v1",
    "opusx.baseUrl": "https://opusx.vercel.app/v1",
  });
  return settingsPath;
}

function configureCline(apiKey) {
  const settingsPath = path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "Code", "User", "settings.json");
  upsertJsonFile(settingsPath, {
    "cline.apiProvider": "openai",
    "cline.openAiApiKey": apiKey,
    "cline.openAiBaseUrl": "https://opusx.vercel.app/v1",
  });
  return settingsPath;
}

function configureRoo(apiKey) {
  const settingsPath = path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "Code", "User", "settings.json");
  upsertJsonFile(settingsPath, {
    "roo-cline.apiProvider": "openai",
    "roo-cline.openAiApiKey": apiKey,
    "roo-cline.openAiBaseUrl": "https://opusx.vercel.app/v1",
  });
  return settingsPath;
}

function configureSelectedIdes(selected, apiKey) {
  const handlers = {
    "claude-cli": configureClaudeCli,
    vscode: configureVsCode,
    cursor: configureCursor,
    windsurf: configureWindsurf,
    cline: configureCline,
    roo: configureRoo,
  };

  selected.forEach((id) => {
    const ide = IDE_OPTIONS.find((item) => item.id === id);
    if (!ide) return;
    console.log("");
    console.log(`Configuring ${ide.label}...`);

    const handler = handlers[id];
    if (!handler) {
      console.log("! No configuration handler found.");
      return;
    }

    try {
      const outputPath = handler(apiKey);
      console.log(`✓ Wrote ${formatPathForLog(outputPath)}`);
    } catch (error) {
      console.log(`! Could not write config: ${error.message}`);
    }
  });
}

function verifyApiConnection(apiKey) {
  return new Promise((resolve) => {
    const req = https.request(
      "https://opusx.vercel.app/api/v1/models",
      {
        method: "GET",
        headers: {
          "x-api-key": apiKey,
        },
        timeout: 8000,
      },
      (res) => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ ok: true, message: "Connected - API key is valid." });
          return;
        }
        resolve({ ok: false, message: `Gateway returned ${res.statusCode ?? "unknown"} status.` });
      },
    );

    req.on("timeout", () => {
      req.destroy(new Error("Request timed out"));
    });

    req.on("error", (err) => {
      resolve({ ok: false, message: `Could not verify live API (${err.message}).` });
    });

    req.end();
  });
}

function parseIdeSelection(raw) {
  const trimmed = (raw || "").trim().toLowerCase();
  if (!trimmed) return [];
  if (trimmed === "a" || trimmed === "all") return IDE_OPTIONS.map((item) => item.id);

  const selectedIndexes = new Set(
    trimmed
      .split(/\s+/)
      .map((part) => Number.parseInt(part, 10))
      .filter((num) => Number.isInteger(num) && num >= 1 && num <= IDE_OPTIONS.length),
  );

  return [...selectedIndexes].map((idx) => IDE_OPTIONS[idx - 1].id);
}

function upsertEnvVar(content, key, value) {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  if (pattern.test(content)) return content.replace(pattern, line);
  return content.endsWith("\n") || content.length === 0 ? `${content}${line}\n` : `${content}\n${line}\n`;
}

function isWritableDirectory(dirPath) {
  try {
    fs.accessSync(dirPath, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function resolveEnvTargetPath() {
  const looksLikeProjectDir = fs.existsSync(path.join(cwd, "package.json")) || fs.existsSync(path.join(cwd, ".env.example"));
  if (looksLikeProjectDir && isWritableDirectory(cwd)) {
    return {
      envPath: path.join(cwd, ".env"),
      envExamplePath: path.join(cwd, ".env.example"),
      scopeLabel: "project",
    };
  }

  const globalDir = path.join(os.homedir(), ".opusx");
  if (!fs.existsSync(globalDir)) fs.mkdirSync(globalDir, { recursive: true });

  return {
    envPath: path.join(globalDir, ".env"),
    envExamplePath: "",
    scopeLabel: "global",
  };
}

function configureLocalEnv(apiKey) {
  const { envPath, envExamplePath, scopeLabel } = resolveEnvTargetPath();

  if (envExamplePath && !fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log("Created .env from .env.example");
  }

  let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  content = upsertEnvVar(content, "ANTHROPIC_BASE_URL", "https://opusx.vercel.app/api");
  content = upsertEnvVar(content, "ANTHROPIC_API_KEY", apiKey);
  fs.writeFileSync(envPath, content, "utf8");
  console.log(`Updated ${scopeLabel} .env with OpusX API settings`);
  console.log(`Saved at: ${envPath}`);
}

async function wizard() {
  const rl = readline.createInterface({ input, output });
  console.log("");
  printHeader("✦ OpusX Setup");
  console.log("");

  const apiKey = (await rl.question("Enter your OpusX API key: ")).trim();
  if (!apiKey) {
    rl.close();
    console.error("API key is required.");
    process.exit(1);
  }

  console.log("");
  console.log("Select IDEs to configure (space-separated numbers, or 'a' for all):");
  console.log("");
  IDE_OPTIONS.forEach((item, index) => {
    console.log(`[${index + 1}] ${item.label}`);
  });
  console.log("");

  const choiceRaw = await rl.question("Your choice: ");
  rl.close();

  const selected = parseIdeSelection(choiceRaw);
  if (selected.length === 0) {
    console.error("No valid IDE selected. Aborting.");
    process.exit(1);
  }

  configureLocalEnv(apiKey);
  configureSelectedIdes(selected, apiKey);

  console.log("");
  console.log("Verifying connection to OpusX API...");
  const verification = await verifyApiConnection(apiKey);
  if (verification.ok) {
    console.log(`✓ ${verification.message}`);
  } else if (validateApiKey(apiKey)) {
    console.log(`! ${verification.message}`);
    console.log("✓ API key format is valid.");
  } else {
    console.log(`! ${verification.message}`);
    console.log("! API key format looks unusual, but setup is saved.");
  }

  console.log("");
  printSuccessBox(["✓ Setup complete!", "Restart your IDE(s) to apply."]);
}

function setup() {
  const envPath = path.join(cwd, ".env");
  const envExamplePath = path.join(cwd, ".env.example");

  if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log("Created .env from .env.example");
  } else if (!fs.existsSync(envPath)) {
    console.log("No .env.example found. Create .env before running the app.");
  }

  console.log("Installing dependencies...");
  const installResult = spawnSync("pnpm", ["install"], { cwd, stdio: "inherit", shell: process.platform === "win32" });
  if (installResult.status !== 0) process.exit(installResult.status ?? 1);

  console.log("Generating Prisma client...");
  const prismaResult = spawnSync("pnpm", ["prisma", "generate"], { cwd, stdio: "inherit", shell: process.platform === "win32" });
  if (prismaResult.status !== 0) process.exit(prismaResult.status ?? 1);

  console.log("Running database seed...");
  const seedResult = spawnSync("pnpm", ["db:seed"], { cwd, stdio: "inherit", shell: process.platform === "win32" });
  if (seedResult.status !== 0) process.exit(seedResult.status ?? 1);

  console.log("");
  console.log("OpusX setup complete.");
  console.log("Next step: pnpm dev");
}

if (command === "help" || command === "--help" || command === "-h") {
  console.log("OpusX CLI");
  console.log("Usage: opusx [wizard|setup]");
  console.log("");
  console.log("Commands:");
  console.log("  wizard   Interactive API key + IDE setup");
  console.log("  setup    Project bootstrap (install, prisma generate, seed)");
} else if (command === "wizard") {
  wizard().catch((error) => {
    console.error(error);
    process.exit(1);
  });
} else if (command === "setup") {
  setup();
} else {
  console.error(`Unknown command: ${command}`);
  console.error("Usage: opusx [wizard|setup]");
  process.exit(1);
}
