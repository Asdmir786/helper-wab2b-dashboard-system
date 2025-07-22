/**
 * Script to generate SHA256 hashes for Tauri build artifacts
 *
 * This script is designed to be run after the Tauri build process completes.
 * It generates SHA256 hashes for all build artifacts and creates a checksums.txt file
 * that can be included in GitHub releases.
 *
 * Usage:
 *   npm run tauri build
 *   node scripts/generate-checksums.js
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default paths for Tauri build artifacts
const TAURI_TARGET_DIR = path.join(
  __dirname,
  "../src-tauri/target/release/bundle"
);
const OUTPUT_FILE = path.join(
  __dirname,
  "../src-tauri/target/release/checksums.txt"
);

/**
 * Calculate SHA256 hash for a file
 * @param {string} filePath Path to the file
 * @returns {Promise<string>} SHA256 hash
 */
async function calculateSHA256(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);

    stream.on("error", (err) => reject(err));
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

/**
 * Find all build artifacts in the Tauri output directories
 * @returns {Promise<Array<{path: string, relativePath: string}>>} List of file paths
 */
async function findTauriBuildArtifacts() {
  const artifacts = [];

  // Check if the target directory exists
  if (!fs.existsSync(TAURI_TARGET_DIR)) {
    console.error(`Tauri build directory not found: ${TAURI_TARGET_DIR}`);
    console.error('Please run "npm run tauri build" first.');
    process.exit(1);
  }

  // Define subdirectories to check based on platform types
  const platformDirs = [
    path.join(TAURI_TARGET_DIR, "msi"),
    path.join(TAURI_TARGET_DIR, "nsis"),
    path.join(TAURI_TARGET_DIR, "deb"),
    path.join(TAURI_TARGET_DIR, "appimage"),
    path.join(TAURI_TARGET_DIR, "dmg"),
    path.join(TAURI_TARGET_DIR, "macos"),
    path.join(TAURI_TARGET_DIR, "bundle"),
  ];

  // Scan each platform directory
  for (const dir of platformDirs) {
    if (fs.existsSync(dir)) {
      const files = await fs.promises.readdir(dir);

      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = await fs.promises.stat(filePath);

        if (stats.isFile()) {
          // Store both the full path and the relative path (for the checksums file)
          artifacts.push({
            path: filePath,
            relativePath: path.relative(path.dirname(OUTPUT_FILE), filePath),
          });
        }
      }
    }
  }

  return artifacts;
}

/**
 * Generate checksums for all Tauri build artifacts
 */
async function generateChecksums() {
  // Using original filenames from Tauri build
  try {
    console.log("Looking for Tauri build artifacts...");

    // Find all build artifacts
    const artifacts = await findTauriBuildArtifacts();

    if (artifacts.length === 0) {
      console.log(
        'No build artifacts found. Make sure you have run "npm run tauri build" first.'
      );
      return;
    }

    console.log(`Found ${artifacts.length} build artifacts.`);

    // No renaming - use original filenames
    for (const artifact of artifacts) {
      console.log(`Using original filename: ${path.basename(artifact.path)}`);
    }

    // Calculate hash for each artifact
    const checksums = [];

    for (const artifact of artifacts) {
      const fileName = path.basename(artifact.path);
      console.log(`Calculating SHA256 for ${fileName}...`);

      const hash = await calculateSHA256(artifact.path);
      checksums.push(`${hash}  ${artifact.relativePath}`);
    }

    // Create the output directory if it doesn't exist
    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
      await fs.promises.mkdir(outputDir, { recursive: true });
    }

    // Write checksums to file
    await fs.promises.writeFile(OUTPUT_FILE, checksums.join("\n") + "\n");

    console.log(`Checksums written to ${OUTPUT_FILE}`);
    console.log("You can now include this file in your GitHub release.");

    // Provide a command to help with GitHub releases
    console.log("\nTo create a GitHub release with these files:");
    console.log("1. Create a new release on GitHub");
    console.log("2. Upload the build artifacts and the checksums.txt file");
    console.log("3. Include the SHA256 hashes in the release notes");
  } catch (error) {
    console.error("Error generating checksums:", error);
    process.exit(1);
  }
}

// Run the script
generateChecksums();
