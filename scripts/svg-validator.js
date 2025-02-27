#!/usr/bin/env node

/**
 * SVG Validator
 *
 * This script validates SVG files according to the project's formatting rules:
 * 1. Use single quotes (') instead of double quotes (")
 * 2. Include required attributes in the root SVG element
 * 3. Remove redundant stroke attributes from individual paths
 * 4. Keep path data unchanged
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { promisify } from "util";
import { execSync } from "child_process";

const readFile = promisify(fs.readFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

// Required attributes for root SVG element
const REQUIRED_ATTRIBUTES = [
  "xmlns='http://www.w3.org/2000/svg'",
  "fill='none'",
  "stroke='#fff'",
  "fill-rule='evenodd'",
  "stroke-linecap='round'",
  "stroke-linejoin='round'",
  "stroke-width='1'",
  "stroke-width='2'",
];

// At least one of these stroke-width values must be present
const STROKE_WIDTH_OPTIONS = ["stroke-width='1'", "stroke-width='2'"];

async function findSvgFiles() {
  try {
    // Use git to find all tracked SVG files
    const output = execSync('git ls-files "*.svg"', { encoding: "utf8" });
    return output.trim().split("\n").filter(Boolean);
  } catch (error) {
    console.error("Error finding SVG files:", error.message);
    return [];
  }
}

async function validateSvg(filePath) {
  try {
    const content = await readFile(path.resolve(rootDir, filePath), "utf8");
    const issues = [];

    // Check for double quotes
    if (content.includes('"')) {
      issues.push("Contains double quotes instead of single quotes");
    }

    // Check for root SVG element attributes
    const svgOpeningTag = content.match(/<svg[^>]*>/);
    if (svgOpeningTag) {
      const svgTag = svgOpeningTag[0];

      // Check required attributes
      const missingAttributes = REQUIRED_ATTRIBUTES.filter((attr) => {
        // Special handling for stroke-width which has options
        if (attr.startsWith("stroke-width=")) {
          return !STROKE_WIDTH_OPTIONS.some((option) =>
            svgTag.includes(option)
          );
        }
        return !svgTag.includes(attr);
      });

      // Filter out stroke-width duplicates from missing attributes
      const filteredMissingAttributes = missingAttributes.filter(
        (attr) =>
          !attr.startsWith("stroke-width=") ||
          (attr.startsWith("stroke-width=") &&
            !missingAttributes.some(
              (a) => a !== attr && a.startsWith("stroke-width=")
            ))
      );

      if (filteredMissingAttributes.length > 0) {
        issues.push(
          `Missing required attributes in root SVG: ${filteredMissingAttributes.join(
            ", "
          )}`
        );
      }
    } else {
      issues.push("Could not find SVG opening tag");
    }

    // Check for redundant stroke attributes in paths
    const pathTags = content.match(/<path[^>]*>/g) || [];
    for (const pathTag of pathTags) {
      if (pathTag.includes("stroke=")) {
        issues.push("Path element contains redundant stroke attribute");
        break;
      }
    }

    return {
      file: filePath,
      valid: issues.length === 0,
      issues,
    };
  } catch (error) {
    return {
      file: filePath,
      valid: false,
      issues: [`Error reading or parsing file: ${error.message}`],
    };
  }
}

async function main() {
  console.log("Validating SVG files...");

  const svgFiles = await findSvgFiles();
  if (svgFiles.length === 0) {
    console.log("No SVG files found");
    process.exit(0);
  }

  console.log(`Found ${svgFiles.length} SVG files`);

  const results = await Promise.all(svgFiles.map(validateSvg));
  const invalidResults = results.filter((result) => !result.valid);

  if (invalidResults.length === 0) {
    console.log("All SVG files are valid!");
    process.exit(0);
  } else {
    console.error(`Found ${invalidResults.length} invalid SVG files:`);

    for (const result of invalidResults) {
      console.error(`\n${result.file}:`);
      for (const issue of result.issues) {
        console.error(`  - ${issue}`);
      }
    }

    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
