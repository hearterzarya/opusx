#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const cwd = process.cwd();
const command = process.argv[2] || "setup";

function run(commandName, args) {
  const result = spawnSync(commandName, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
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
  run("pnpm", ["install"]);

  console.log("Generating Prisma client...");
  run("pnpm", ["prisma", "generate"]);

  console.log("Running database seed...");
  run("pnpm", ["db:seed"]);

  console.log("");
  console.log("OpusX setup complete.");
  console.log("Next step: pnpm dev");
}

if (command === "setup") {
  setup();
} else {
  console.error(`Unknown command: ${command}`);
  console.error("Usage: opusx setup");
  process.exit(1);
}
