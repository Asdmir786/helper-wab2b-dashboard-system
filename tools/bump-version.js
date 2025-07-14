#!/usr/bin/env node
/**
 * Synchronise version from wab2b-helper/package.json to other manifests.
 * Runs automatically via the npm `version` lifecycle.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pkgPath = path.join(root, 'wab2b-helper', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const version = pkg.version;

function write(file, content) {
  fs.writeFileSync(file, content, 'utf8');
  console.log(`✓ updated ${path.relative(root, file)}`);
}

// 1. Cargo.toml
(() => {
  const cargoPath = path.join(root, 'wab2b-helper', 'backend', 'Cargo.toml');
  if (!fs.existsSync(cargoPath)) return;
  const cargo = fs.readFileSync(cargoPath, 'utf8').replace(/^(version\s*=\s*")([^"]+)(")/m, `$1${version}$3`);
  write(cargoPath, cargo);
})();

// 2. tauri.conf.json
(() => {
  const confPath = path.join(root, 'wab2b-helper', 'backend', 'tauri.conf.json');
  if (!fs.existsSync(confPath)) return;
  const conf = JSON.parse(fs.readFileSync(confPath, 'utf8'));
  conf.version = version;
  write(confPath, JSON.stringify(conf, null, 2) + '\n');
})();

// 3. GitHub release workflow (optional)
(() => {
  const workflowPath = path.join(root, '.github', 'workflows', 'release.yml');
  if (!fs.existsSync(workflowPath)) return;
  const content = fs.readFileSync(workflowPath, 'utf8').replace(/VERSION:\s*["']?v?\d+\.\d+\.\d+["']?/m, `VERSION: \"v${version}\"`);
  write(workflowPath, content);
})();

// Done
console.log(`Version synchronised to ${version}`);
