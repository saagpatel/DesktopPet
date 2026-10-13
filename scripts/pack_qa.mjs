#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const packsDir = path.join(repoRoot, "src", "pets", "packs");
const spritesDir = path.join(repoRoot, "src", "pets", "sprites");
const artifactsDir = path.join(repoRoot, "artifacts");
const supportedSchemaVersion = 1;

const requiredVerbs = ["pet", "feed", "play", "nap", "clean", "train"];
const supportedPostures = new Set(["settle", "hover", "curl"]);

function isSlug(value) {
  return typeof value === "string" && /^[a-z0-9_-]+$/.test(value);
}

function inBounds(anchor) {
  return (
    anchor &&
    typeof anchor.x === "number" &&
    typeof anchor.y === "number" &&
    anchor.x >= 0 &&
    anchor.x <= 200 &&
    anchor.y >= 0 &&
    anchor.y <= 200
  );
}

function addCheck(checks, id, pass, detail) {
  checks.push({ id, pass, detail });
}

function validatePack(pack, fileName, spriteFiles) {
  const checks = [];

  addCheck(
    checks,
    "schema-version",
    pack.schemaVersion === supportedSchemaVersion,
    `v${pack.schemaVersion}`,
  );
  addCheck(checks, "id-slug", isSlug(pack.id), String(pack.id ?? ""));
  addCheck(
    checks,
    "stage-names",
    Array.isArray(pack.stageNames) && pack.stageNames.length === 3,
    `${Array.isArray(pack.stageNames) ? pack.stageNames.length : 0} names`,
  );

  const thresholds = Array.isArray(pack.evolutionThresholds)
    ? pack.evolutionThresholds
    : [];
  const thresholdsValid =
    thresholds.length === 3 &&
    thresholds[0] === 0 &&
    typeof thresholds[1] === "number" &&
    typeof thresholds[2] === "number" &&
    thresholds[1] >= 1 &&
    thresholds[2] > thresholds[1];
  addCheck(checks, "thresholds", thresholdsValid, thresholds.join(" / "));

  const stageSprites = Array.isArray(pack.stageSpriteFiles)
    ? pack.stageSpriteFiles
    : [];
  const spritesPresent =
    stageSprites.length === 3 &&
    stageSprites.every(
      (file) => typeof file === "string" && spriteFiles.has(file),
    );
  addCheck(
    checks,
    "sprites",
    spritesPresent,
    `${stageSprites.length} sprite assets`,
  );

  const blink = pack.idleBehavior?.blinkIntervalMs;
  const blinkValid =
    Array.isArray(blink) &&
    blink.length === 2 &&
    blink[0] >= 1200 &&
    blink[1] > blink[0];
  addCheck(
    checks,
    "blink-window",
    blinkValid,
    Array.isArray(blink) ? `${blink[0]}-${blink[1]}ms` : "",
  );

  const anchors = pack.accessoryAnchors ?? {};
  addCheck(
    checks,
    "anchors",
    inBounds(anchors.head) &&
      inBounds(anchors.neck) &&
      inBounds(anchors.left) &&
      inBounds(anchors.right),
    "head/neck/left/right",
  );

  const verbs = new Set(
    Array.isArray(pack.interactionVerbs)
      ? pack.interactionVerbs.map((verb) => verb.id)
      : [],
  );
  addCheck(
    checks,
    "verbs",
    requiredVerbs.every((verb) => verbs.has(verb)),
    `${verbs.size} verbs`,
  );

  const cadence = pack.behaviorProfile?.interactionCadenceMs;
  const posture = pack.behaviorProfile?.chillPosture;
  const behaviorValid =
    Array.isArray(cadence) &&
    cadence.length === 2 &&
    cadence[0] >= 250 &&
    cadence[1] >= cadence[0] &&
    cadence[1] <= 5000 &&
    supportedPostures.has(posture);
  addCheck(
    checks,
    "behavior-profile",
    behaviorValid,
    Array.isArray(cadence) ? `${cadence[0]}-${cadence[1]}ms / ${posture}` : "",
  );

  const failed = checks.filter((check) => !check.pass);
  return {
    fileName,
    id: pack.id,
    pass: failed.length === 0,
    checks,
    failedChecks: failed.map((check) => check.id),
  };
}

function buildMarkdownReport(report) {
  const lines = [
    "# Pack QA Report",
    "",
    `Generated: ${report.generatedAt}`,
    `Supported schema: v${report.supportedSchemaVersion}`,
    "",
    `Summary: ${report.summary.passed}/${report.summary.total} packs passed`,
    "",
    "| Pack | Status | Failed Checks |",
    "| --- | --- | --- |",
  ];

  for (const pack of report.packs) {
    lines.push(
      `| ${pack.id} (${pack.fileName}) | ${pack.pass ? "PASS" : "FAIL"} | ${
        pack.failedChecks.length > 0 ? pack.failedChecks.join(", ") : "-"
      } |`,
    );
  }

  return `${lines.join("\n")}\n`;
}

function main() {
  const packFiles = fs
    .readdirSync(packsDir)
    .filter((file) => file.endsWith(".json"))
    .sort();
  const spriteFiles = new Set(fs.readdirSync(spritesDir));

  const packs = packFiles.map((fileName) => {
    const raw = fs.readFileSync(path.join(packsDir, fileName), "utf8");
    return { fileName, pack: JSON.parse(raw) };
  });

  const results = packs.map(({ fileName, pack }) =>
    validatePack(pack, fileName, spriteFiles),
  );
  const failed = results.filter((pack) => !pack.pass);

  const report = {
    generatedAt: new Date().toISOString(),
    supportedSchemaVersion,
    summary: {
      total: results.length,
      passed: results.length - failed.length,
      failed: failed.length,
    },
    packs: results,
  };

  fs.mkdirSync(artifactsDir, { recursive: true });
  const jsonPath = path.join(artifactsDir, "pack-qa-report.json");
  const mdPath = path.join(artifactsDir, "pack-qa-report.md");
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(mdPath, buildMarkdownReport(report));

  if (failed.length > 0) {
    console.error(
      "Pack QA failed. See artifacts/pack-qa-report.md for details.",
    );
    process.exit(1);
  }

  console.log(
    `Pack QA passed (${report.summary.passed}/${report.summary.total}).`,
  );
  console.log(`Report: ${path.relative(repoRoot, mdPath)}`);
}

main();
