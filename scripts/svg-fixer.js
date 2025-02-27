#!/usr/bin/env node

/**
 * SVG Fixer
 *
 * This script automatically fixes SVG files to meet the project's formatting rules:
 * 1. Converts double quotes to single quotes
 * 2. Adds required attributes to the root SVG element
 * 3. Removes redundant stroke attributes from individual paths
 * 4. Preserves path data
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { promisify } from "util";
import { execSync } from "child_process";

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

// Required attributes for root SVG element
const REQUIRED_ATTRIBUTES = {
  xmlns: "http://www.w3.org/2000/svg",
  fill: "none",
  stroke: "#fff",
  "fill-rule": "evenodd",
  "stroke-linecap": "round",
  "stroke-linejoin": "round",
};

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

function extractAttributes(tag) {
  const attributes = {};
  const regex = /(\w+[-\w]*)\s*=\s*(['"])((?:(?!\2).)*)\2/g;
  let match;

  while ((match = regex.exec(tag)) !== null) {
    const [, name, , value] = match;
    attributes[name] = value;
  }

  return attributes;
}

async function fixSvg(filePath) {
  try {
    const fullPath = path.resolve(rootDir, filePath);
    const content = await readFile(fullPath, "utf8");

    // Extract SVG tag
    const svgMatch = content.match(/<svg[^>]*>/);
    if (!svgMatch) {
      console.error(`Could not find SVG tag in ${filePath}`);
      return false;
    }

    const originalSvgTag = svgMatch[0];
    const attributes = extractAttributes(originalSvgTag);

    // Preserve width, height, viewBox
    const preservedAttributes = ["width", "height", "viewBox"];

    // Add required attributes
    for (const [key, value] of Object.entries(REQUIRED_ATTRIBUTES)) {
      attributes[key] = value;
    }

    // Preserve stroke-width if it exists, otherwise default to '1'
    if (!attributes["stroke-width"]) {
      attributes["stroke-width"] = "1";
    }

    // Build new SVG tag
    let newSvgTag = "<svg";
    for (const [key, value] of Object.entries(attributes)) {
      newSvgTag += ` ${key}='${value}'`;
    }
    newSvgTag += ">";

    // Replace SVG tag
    let newContent = content.replace(originalSvgTag, newSvgTag);

    // Remove stroke attributes from paths
    newContent = newContent.replace(/<path[^>]*>/g, (pathTag) => {
      return pathTag
        .replace(/\sstroke=['"][^'"]*['"]/g, "")
        .replace(/\sstroke-width=['"][^'"]*['"]/g, "");
    });

    // Convert all remaining double quotes to single quotes
    newContent = newContent.replace(/"/g, "'");

    // Write the fixed content back to the file
    await writeFile(fullPath, newContent, "utf8");

    return true;
  } catch (error) {
    console.error(`Error fixing ${filePath}:`, error.message);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const specificFiles = args.filter((arg) => arg.endsWith(".svg"));

  let svgFiles;
  if (specificFiles.length > 0) {
    svgFiles = specificFiles;
    console.log(`Fixing ${svgFiles.length} specified SVG files...`);
  } else {
    svgFiles = await findSvgFiles();
    console.log(`Found ${svgFiles.length} SVG files to check...`);
  }

  if (svgFiles.length === 0) {
    console.log("No SVG files to fix");
    process.exit(0);
  }

  let fixedCount = 0;
  let errorCount = 0;

  for (const file of svgFiles) {
    process.stdout.write(`Fixing ${file}... `);
    const success = await fixSvg(file);

    if (success) {
      process.stdout.write("✓\n");
      fixedCount++;
    } else {
      process.stdout.write("✗\n");
      errorCount++;
    }
  }

  console.log(`\nFixed ${fixedCount} SVG files`);
  if (errorCount > 0) {
    console.error(`Failed to fix ${errorCount} SVG files`);
    process.exit(1);
  }

  process.exit(0);
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
