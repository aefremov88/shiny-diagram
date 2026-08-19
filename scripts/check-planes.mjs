/**
 * Checks generated management planes and UI catalog annotation contracts.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectComponents } from "./planes/ui-catalog.mjs";
import { collectWritebackEntries } from "./planes/writeback-catalog.mjs";
import { planes } from "./planes/registry.mjs";
import { analyzeModifierUtilization } from "./modifier-utilization.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const violations = [];
const components = await collectComponents({ repoRoot });
const writebackEntries = await collectWritebackEntries({ repoRoot });

// MIGRATION SWITCH: flip to true once the translator annotation backfill is complete.
const WRITEBACK_ANNOTATION_PRESENCE_IS_VIOLATION = true;

await checkPlaneStaleness();
checkUiCatalogAnnotations();
checkWritebackAnnotations();
await checkModifierUtilization();

if (violations.length > 0) {
  console.error(`Plane checks failed with ${violations.length} violation(s):\n`);
  for (const violation of violations) {
    console.error(`${violation.location} [${violation.rule}] ${violation.subject}`);
    console.error(`  ${violation.message}`);
    console.error(`  Fix: ${violation.fix}\n`);
  }
  process.exitCode = 1;
} else {
  console.log(`Plane checks passed (${planes.length} plane(s), annotation contracts valid).`);
}

async function checkPlaneStaleness() {
  for (const plane of planes) {
    const outputFile = path.resolve(repoRoot, plane.outputPath);
    const expected = await plane.generate({ repoRoot, planes });
    let actual;
    try {
      actual = await readFile(outputFile, "utf8");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      addViolation({
        location: plane.outputPath,
        rule: "plane staleness",
        subject: JSON.stringify(plane.name),
        message: "The committed plane output is missing.",
        fix: "Run `npm run planes` and commit the generated output.",
      });
      continue;
    }

    if (actual !== expected) {
      addViolation({
        location: plane.outputPath,
        rule: "plane staleness",
        subject: JSON.stringify(plane.name),
        message: "The committed plane output does not match its sources.",
        fix: "Run `npm run planes` and commit the generated output.",
      });
    }
  }
}

function checkUiCatalogAnnotations() {
  for (const component of components) {
    checkPresence(component);
    checkStructure(component);
    checkSummaryPurity(component);
    checkPropCoverage(component);
    checkReverseDrift(component);
    for (const boundaryType of component.boundaryTypes) {
      checkBoundaryTypeStructure(component, boundaryType);
    }
  }
}

function checkWritebackAnnotations() {
  for (const entry of writebackEntries) {
    if (entry.annotation === null) {
      const issue = {
        location: entry.filePath,
        rule: "write-back annotation presence",
        subject: JSON.stringify(entry.commandName),
        message: "No translator annotation was found; the catalog renders a placeholder.",
        fix: "Add the write-rule TSDoc immediately before the exported translator function, then run `npm run planes`.",
      };
      if (WRITEBACK_ANNOTATION_PRESENCE_IS_VIOLATION) addViolation(issue);
      else console.warn(`${issue.location} [${issue.rule}] ${issue.subject}: ${issue.message}`);
      continue;
    }

    const header = entry.annotation.split("\n", 1)[0];
    if (
      /^Makes one write:/.test(header) ||
      /^Makes (?:\d+|two|three|four|five|six|seven|eight|nine|ten) writes:/.test(header) ||
      /^Makes one group of writes(?:\s|:)/.test(header) ||
      /^Makes (?:\d+|one|two|three|four|five|six|seven|eight|nine|ten) groups of writes(?:\s|:)/.test(
        header
      ) ||
      /^Makes one of (?:\d+|one|two|three|four|five|six|seven|eight|nine|ten) write options:/.test(
        header
      )
    ) {
      continue;
    }
    addViolation({
      location: entry.filePath,
      rule: "write-back annotation header",
      subject: JSON.stringify(entry.commandName),
      message: `Annotation opens with an invalid header: ${JSON.stringify(header)}.`,
      fix: "Use one of the header sentence formats in docs/system/layers/write-back-pipeline.md §7.2, then run `npm run planes`.",
    });
  }
}

async function checkModifierUtilization() {
  const reports = await analyzeModifierUtilization({ repoRoot, components });
  for (const report of reports) {
    if (report.verdict === "skipped") {
      console.warn(
        `${report.filePath} [modifier utilization] ${JSON.stringify(report.component)} has zero consumers; skipping factorization (dead-component territory).`
      );
      continue;
    }
    if (report.verdict === "invalid") {
      const details = report.modifierProps
        .filter((prop) => prop.error !== null)
        .map((prop) => `${prop.name}: ${prop.error}`)
        .join("; ");
      componentUtilizationViolation(
        report,
        "modifier utilization schema",
        `The Modifiers surface cannot be measured: ${details}.`,
        "Use a boolean or a local closed literal union for every modifier prop."
      );
      continue;
    }
    if (report.verdict !== "fail") continue;
    const counts = Object.entries(report.valueCounts)
      .map(([name, count]) => `${name}=${count}`)
      .join(", ");
    componentUtilizationViolation(
      report,
      "modifier utilization",
      `P=${report.product} exceeds 2·|U|=${2 * report.utilization} (|U|=${report.utilization}; ${counts}).`,
      "Collapse the surface to one role modifier per the Modifier design law."
    );
  }
}

function componentUtilizationViolation(report, rule, message, fix) {
  addViolation({
    location: report.filePath,
    rule,
    subject: JSON.stringify(report.component),
    message,
    fix,
  });
}

function checkBoundaryTypeStructure(component, boundaryType) {
  if (boundaryType.annotation?.contentLines.some((line) => line.trim().length > 0)) return;
  addViolation({
    location: component.filePath,
    rule: "boundary-type annotation structure",
    subject: `${JSON.stringify(component.name)} boundary type ${JSON.stringify(boundaryType.name)}`,
    message: "The exported boundary type has an empty TSDoc block.",
    fix: "Document what the boundary shape's fields mean to a consumer, then run `npm run planes`.",
  });
}

function checkPresence(component) {
  if (component.documentation !== null) return;
  componentViolation(
    component,
    "annotation presence",
    "No complete catalog annotation was found; this component would render a placeholder.",
    "Add or repair the TSDoc block immediately before the default export, then run `npm run planes`."
  );
}

function checkStructure(component) {
  if (component.annotation === null) return;
  const lines = component.annotation.contentLines;
  const gestureTargetsIndex = lines.indexOf("Gesture targets:");
  const lifecycleIndex = lines.indexOf("Lifecycle:");
  const modifiersIndex = lines.indexOf("Modifiers:");
  const sectionIndexes = [gestureTargetsIndex, lifecycleIndex, modifiersIndex].filter(
    (index) => index >= 0
  );
  const paragraphEnd = sectionIndexes.length === 0 ? lines.length : Math.min(...sectionIndexes);
  const hasSummary = lines[0]?.trim().length > 0;
  const hasBlankAfterSummary = lines[1] !== undefined && lines[1].trim() === "";
  const hasParagraph = lines.slice(2, paragraphEnd).some((line) => line.trim().length > 0);

  if (!hasSummary || !hasBlankAfterSummary || !hasParagraph) {
    componentViolation(
      component,
      "annotation structure",
      "The block must start with one summary line, a blank line, and at least one contract paragraph.",
      "Restore the required annotation structure, then run `npm run planes`."
    );
  }

  if (lifecycleIndex >= 0 && modifiersIndex >= 0 && lifecycleIndex > modifiersIndex) {
    componentViolation(
      component,
      "annotation section order",
      "`Lifecycle:` must precede `Modifiers:` when both sections are present.",
      "Move the lifecycle section before the modifiers section, then run `npm run planes`."
    );
  }

  if (
    gestureTargetsIndex >= 0 &&
    [lifecycleIndex, modifiersIndex].some(
      (sectionIndex) => sectionIndex >= 0 && gestureTargetsIndex > sectionIndex
    )
  ) {
    componentViolation(
      component,
      "annotation section order",
      "`Gesture targets:` must precede `Lifecycle:` and `Modifiers:` when present.",
      "Move the gesture-target section before lifecycle and modifier sections, then run `npm run planes`."
    );
  }

  checkGestureTargets(component, lines);

  for (const heading of ["Lifecycle:", "Modifiers:"]) {
    const entries = sectionEntries(lines, heading);
    if (entries === null) continue;
    if (entries.length === 0 || entries.some((entry) => entry.subject === null)) {
      componentViolation(
        component,
        "annotation structure",
        `Every top-level entry under \`${heading}\` must be a bullet beginning with one backticked subject.`,
        `Make each \`${heading}\` entry a dash bullet whose first token is one backticked prop name, then run \`npm run planes\`.`
      );
    }
  }

  checkAnchorFormat(component, lines);
}

function checkGestureTargets(component, lines) {
  const range = gestureTargetSectionRange(lines);
  if (range === null) return;
  const targetLines = lines
    .slice(range.start, range.end)
    .filter((line) => line.trim().length > 0 && !/^\s/.test(line));
  const parsed = targetLines.map((line) => /^- `([^`]+)` — `([^`]+)`$/.exec(line));

  if (targetLines.length === 0 || parsed.some((target) => target === null)) {
    componentViolation(
      component,
      "gesture-target structure",
      "Every top-level entry under `Gesture targets:` must exactly match `- `<address>` — `<query>`` and the section must contain at least one entry.",
      "Add one or more exact gesture-target entries, then run `npm run planes`."
    );
  }

  const addresses = parsed.filter((target) => target !== null).map((target) => target[1]);
  if (new Set(addresses).size !== addresses.length) {
    componentViolation(
      component,
      "gesture-target address uniqueness",
      "The component declares the same gesture-target Address more than once.",
      "Keep one entry per local Address, then run `npm run planes`."
    );
  }
}

function gestureTargetSectionRange(lines) {
  const headingIndex = lines.indexOf("Gesture targets:");
  if (headingIndex < 0) return null;
  let end = headingIndex + 1;
  while (
    end < lines.length &&
    lines[end].trim().length > 0 &&
    !isUiAnnotationSectionHeading(lines[end])
  ) {
    end += 1;
  }
  return { start: headingIndex + 1, end };
}

function checkAnchorFormat(component, lines) {
  const lifecycle = sectionRange(lines, "Lifecycle:");
  if (lifecycle !== null) {
    for (const entry of topLevelBulletRanges(lines, lifecycle.start, lifecycle.end)) {
      const text = lines.slice(entry.start, entry.end).join(" ");
      if (!text.includes("Used by:")) continue;
      componentViolation(
        component,
        "lifecycle anchor format",
        `Lifecycle subject ${JSON.stringify(entry.subject)} carries a \`Used by:\` anchor.`,
        "Remove the lifecycle anchor, then run `npm run planes`."
      );
    }
  }

  const modifiers = sectionRange(lines, "Modifiers:");
  if (modifiers !== null) {
    for (const entry of topLevelBulletRanges(lines, modifiers.start, modifiers.end)) {
      const values = nestedBulletRanges(lines, entry.start + 1, entry.end);
      if (values.length > 0 && values.every((value) => value.text.includes("Used by:"))) continue;
      componentViolation(
        component,
        "modifier value anchor format",
        `Modifier subject ${JSON.stringify(entry.subject)} must enumerate every value as a nested bullet ending with \`Used by:\`.`,
        "Add one anchored nested bullet per value, then run `npm run planes`."
      );
    }
    return;
  }

  const standaloneAnchor = lines.some(
    (line, index) => /^Used by:\s+\S/.test(line) && index > 0 && lines[index - 1] === ""
  );
  if (standaloneAnchor) return;
  componentViolation(
    component,
    "component anchor format",
    "A component without a `Modifiers:` section must carry a standalone `Used by:` paragraph.",
    "Move the product anchor into its own paragraph after the contract paragraph, then run `npm run planes`."
  );
}

function checkSummaryPurity(component) {
  const summary = component.annotation?.contentLines[0];
  if (summary === undefined || !summary.includes("`")) return;
  componentViolation(
    component,
    "summary purity",
    "The summary line contains a backticked member reference.",
    "Move member references into the contract paragraph or options, then run `npm run planes`."
  );
}

function checkPropCoverage(component) {
  if (component.annotation === null) return;
  for (const propName of component.propsMemberNames) {
    if (component.annotation.block.includes(`\`${propName}\``)) continue;
    componentViolation(
      component,
      "prop coverage",
      `Prop ${JSON.stringify(propName)} is not documented as a backticked member.`,
      `Document \`${propName}\` in the annotation, then run \`npm run planes\`.`
    );
  }
}

function checkReverseDrift(component) {
  if (component.annotation === null) return;
  const lines = component.annotation.contentLines;
  const props = new Set(component.propsMemberNames);
  for (const heading of ["Lifecycle:", "Modifiers:"]) {
    for (const entry of sectionEntries(lines, heading) ?? []) {
      if (entry.subject === null || props.has(entry.subject)) continue;
      componentViolation(
        component,
        "section reverse drift",
        `${heading.slice(0, -1)} subject ${JSON.stringify(entry.subject)} is not a member of the props type.`,
        "Remove the stale entry or name the real prop member, then run `npm run planes`."
      );
    }
  }
}

function sectionEntries(lines, heading) {
  const sectionIndex = lines.indexOf(heading);
  if (sectionIndex < 0) return null;
  const entries = [];
  for (const line of lines.slice(sectionIndex + 1)) {
    if (isUiAnnotationSectionHeading(line)) break;
    if (line.trim().length === 0 || /^\s/.test(line)) continue;
    const match = /^- `([^`]+)`(?:\s|$)/.exec(line);
    entries.push({ line, subject: match?.[1] ?? null });
  }
  return entries;
}

function sectionRange(lines, heading) {
  const headingIndex = lines.indexOf(heading);
  if (headingIndex < 0) return null;
  let end = lines.length;
  for (let index = headingIndex + 1; index < lines.length; index += 1) {
    if (isUiAnnotationSectionHeading(lines[index])) {
      end = index;
      break;
    }
  }
  return { start: headingIndex + 1, end };
}

function isUiAnnotationSectionHeading(line) {
  return line === "Gesture targets:" || line === "Lifecycle:" || line === "Modifiers:";
}

function topLevelBulletRanges(lines, start, end) {
  const entries = [];
  for (let index = start; index < end; index += 1) {
    const match = /^- `([^`]+)`(?:\s|$)/.exec(lines[index]);
    if (match === null) continue;
    const next = lines.findIndex(
      (line, candidate) => candidate > index && candidate < end && /^- `([^`]+)`(?:\s|$)/.test(line)
    );
    entries.push({ subject: match[1], start: index, end: next < 0 ? end : next });
    if (next >= 0) index = next - 1;
  }
  return entries;
}

function nestedBulletRanges(lines, start, end) {
  const starts = [];
  for (let index = start; index < end; index += 1) {
    if (/^\s+- `[^`]+`(?:\s|$)/.test(lines[index])) starts.push(index);
  }
  return starts.map((valueStart, index) => ({
    text: lines.slice(valueStart, starts[index + 1] ?? end).join(" "),
  }));
}

function componentViolation(component, rule, message, fix) {
  addViolation({
    location: component.filePath,
    rule,
    subject: JSON.stringify(component.name),
    message,
    fix,
  });
}

function addViolation(violation) {
  violations.push(violation);
}
