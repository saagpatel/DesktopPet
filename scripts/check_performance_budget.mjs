#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const distAssetsDir = path.join(repoRoot, "dist", "assets");
const artifactsDir = path.join(repoRoot, "artifacts");
const baselinePath = path.join(
  repoRoot,
  "docs",
  "performance-budget-baseline.json",
);

const budgetConfig = [
  {
    id: "speciesJs",
    prefixes: ["species-", "ErrorBoundary-"],
    suffix: ".js",
    thresholdGzipDeltaBytes: 25 * 1024,
  },
  {
    id: "petCss",
    prefixes: ["pet-"],
    suffix: ".css",
    thresholdGzipDeltaBytes: 8 * 1024,
  },
  {
    id: "panelJs",
    prefixes: ["panel-"],
    suffix: ".js",
    thresholdGzipDeltaBytes: 12 * 1024,
  },
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function findAssetFile(files, prefixes, suffix) {
  for (const prefix of prefixes) {
    const matches = files
      .filter((file) => file.startsWith(prefix) && file.endsWith(suffix))
      .sort();
    if (matches.length > 0) {
      return matches[matches.length - 1];
    }
  }
  const pattern = prefixes.map((prefix) => `${prefix}*${suffix}`).join(" or ");
  throw new Error(`Missing dist asset for pattern ${pattern}`);
}

function calculateSizes(filePath) {
  const content = fs.readFileSync(filePath);
  return {
    rawBytes: content.length,
    gzipBytes: zlib.gzipSync(content).length,
  };
}

function formatKiB(bytes) {
  return `${(bytes / 1024).toFixed(2)} KiB`;
}

function buildMarkdown(results) {
  const lines = [
    "# Performance Budget Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "| Target | Baseline (gzip) | Current (gzip) | Delta | Threshold | Status |",
    "| --- | --- | --- | --- | --- | --- |",
  ];

  for (const row of results) {
    lines.push(
      `| ${row.id} | ${formatKiB(row.baselineGzipBytes)} | ${formatKiB(row.currentGzipBytes)} | ${formatKiB(
        row.deltaGzipBytes,
      )} | ${formatKiB(row.thresholdGzipDeltaBytes)} | ${row.pass ? "PASS" : "FAIL"} |`,
    );
  }

  return `${lines.join("\n")}\n`;
}

function main() {
  if (!fs.existsSync(baselinePath)) {
    throw new Error("Missing docs/performance-budget-baseline.json");
  }
  if (!fs.existsSync(distAssetsDir)) {
    throw new Error(
      "Missing dist/assets. Run `npm run build` before this check.",
    );
  }

  const baseline = readJson(baselinePath);
  const distFiles = fs.readdirSync(distAssetsDir);

  const rows = budgetConfig.map((entry) => {
    const baselineTarget = baseline.targets?.[entry.id];
    if (!baselineTarget || typeof baselineTarget.gzipBytes !== "number") {
      throw new Error(
        `Missing baseline target ${entry.id} in ${path.relative(repoRoot, baselinePath)}`,
      );
    }

    const fileName = findAssetFile(distFiles, entry.prefixes, entry.suffix);
    const sizes = calculateSizes(path.join(distAssetsDir, fileName));
    const delta = sizes.gzipBytes - baselineTarget.gzipBytes;
    const pass = delta <= entry.thresholdGzipDeltaBytes;

    return {
      id: entry.id,
      fileName,
      baselineGzipBytes: baselineTarget.gzipBytes,
      currentGzipBytes: sizes.gzipBytes,
      deltaGzipBytes: delta,
      thresholdGzipDeltaBytes: entry.thresholdGzipDeltaBytes,
      pass,
    };
  });

  fs.mkdirSync(artifactsDir, { recursive: true });
  const jsonPath = path.join(artifactsDir, "performance-budget-report.json");
  const mdPath = path.join(artifactsDir, "performance-budget-report.md");
  fs.writeFileSync(jsonPath, `${JSON.stringify({ rows }, null, 2)}\n`);
  fs.writeFileSync(mdPath, buildMarkdown(rows));

  const failed = rows.filter((row) => !row.pass);
  if (failed.length > 0) {
    const failedIds = failed.map((row) => row.id).join(", ");
    console.error(`Performance budget check failed for: ${failedIds}`);
    console.error(`Report: ${path.relative(repoRoot, mdPath)}`);
    process.exit(1);
  }

  console.log("Performance budget check passed.");
  console.log(`Report: ${path.relative(repoRoot, mdPath)}`);
}

main();
